"""POST /omr — image/GIF/PDF → MusicXML via the homr CLI (spec §6.3).

homr is NOT a Python dependency of this service: it runs as a subprocess
(HOMR_CMD, default `uvx homr`). If the binary is missing the endpoint
returns 503 with a clear JSON detail instead of crashing — the scaffold
imports and runs without homr installed.
"""

from __future__ import annotations

import asyncio
import io
import re
import shlex
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile

from .catalog import write_rate_limit
from .config import Settings

router = APIRouter(tags=["omr"])

MUSICXML_MEDIA_TYPE = "application/vnd.recordare.musicxml+xml"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


class HomrUnavailable(Exception):
    pass


class HomrFailed(Exception):
    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


# --------------------------------------------------------------------------- #
# Input conversion                                                             #
# --------------------------------------------------------------------------- #

def sniff_kind(data: bytes) -> str | None:
    """Magic-byte detection: 'png' | 'jpeg' | 'gif' | 'pdf' | None."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if data.startswith(b"%PDF"):
        return "pdf"
    return None


def gif_first_frame_to_png(data: bytes) -> bytes:
    """homr doesn't eat GIFs; convert the first frame to PNG (Pillow)."""
    from PIL import Image

    with Image.open(io.BytesIO(data)) as im:
        im.seek(0)
        out = io.BytesIO()
        im.convert("RGB").save(out, format="PNG")
        return out.getvalue()


def pdf_first_page_to_png(data: bytes, scale: float = 3.0) -> tuple[bytes, int]:
    """Rasterize page 1 via pypdfium2; return (png_bytes, total_pages).

    Tags are nearly always single-page; multi-page PDFs are processed
    first-page-only for now (page count is surfaced in X-Pdf-Pages).
    """
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(data)
    try:
        n_pages = len(pdf)
        if n_pages == 0:
            raise HTTPException(status_code=422, detail="PDF has no pages.")
        bitmap = pdf[0].render(scale=scale)
        out = io.BytesIO()
        bitmap.to_pil().convert("RGB").save(out, format="PNG")
        return out.getvalue(), n_pages
    finally:
        pdf.close()


# --------------------------------------------------------------------------- #
# homr subprocess                                                              #
# --------------------------------------------------------------------------- #

_CONFIDENCE_RE = re.compile(r"confidence\D{0,10}([0-9]*\.?[0-9]+)", re.IGNORECASE)


def run_homr(cmd: str, image_path: Path, timeout_seconds: int) -> tuple[str, str | None]:
    """Run the homr CLI on `image_path`; return (musicxml, confidence-or-None)."""
    args = [*shlex.split(cmd), str(image_path)]
    try:
        proc = subprocess.run(
            args,
            cwd=image_path.parent,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except FileNotFoundError as exc:
        raise HomrUnavailable from exc
    except subprocess.TimeoutExpired as exc:
        raise HomrFailed(f"homr timed out after {timeout_seconds}s") from exc

    combined = f"{proc.stdout}\n{proc.stderr}"
    if proc.returncode != 0:
        # `uvx` present but the homr package itself can't be resolved/installed.
        if re.search(r"(no such package|not found|failed to (resolve|download))", combined, re.I):
            raise HomrUnavailable
        raise HomrFailed(f"homr exited with code {proc.returncode}: {proc.stderr.strip()[-500:]}")

    # homr writes the MusicXML next to its input; pick up whatever XML appeared.
    outputs = [
        p for p in image_path.parent.iterdir()
        if p.suffix.lower() in {".musicxml", ".xml", ".mxl"} and p != image_path
    ]
    if not outputs:
        raise HomrFailed("homr produced no MusicXML output")
    musicxml = outputs[0].read_text(encoding="utf-8")

    m = _CONFIDENCE_RE.search(combined)
    confidence = m.group(1) if m else None
    return musicxml, confidence


# --------------------------------------------------------------------------- #
# Endpoint                                                                     #
# --------------------------------------------------------------------------- #

def _settings(request: Request) -> Settings:
    return request.app.state.settings


@router.post("/omr", dependencies=[Depends(write_rate_limit)])
async def omr(file: UploadFile, settings: Settings = Depends(_settings)) -> Response:
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Upload exceeds 20MB limit.")

    kind = sniff_kind(data)
    if kind is None:
        raise HTTPException(status_code=415, detail="Unsupported file type; send PNG, JPEG, GIF or PDF.")

    extra_headers: dict[str, str] = {}
    if kind == "gif":
        data = gif_first_frame_to_png(data)
    elif kind == "pdf":
        data, n_pages = pdf_first_page_to_png(data)
        extra_headers["X-Pdf-Pages"] = str(n_pages)
    suffix = ".jpg" if kind == "jpeg" else ".png"

    with tempfile.TemporaryDirectory(prefix="omr-") as tmp:
        image_path = Path(tmp) / f"input{suffix}"
        image_path.write_bytes(data)
        try:
            musicxml, confidence = await asyncio.to_thread(
                run_homr, settings.homr_cmd, image_path, settings.homr_timeout_seconds
            )
        except HomrUnavailable:
            raise HTTPException(
                status_code=503,
                detail=(
                    "OMR engine (homr) is not installed on this server. "
                    f"Install it or adjust HOMR_CMD (currently: {settings.homr_cmd!r})."
                ),
            ) from None
        except HomrFailed as exc:
            raise HTTPException(status_code=502, detail=f"OMR failed: {exc.detail}") from None

    if confidence is not None:
        extra_headers["X-Confidence"] = confidence
    return Response(content=musicxml, media_type=MUSICXML_MEDIA_TYPE, headers=extra_headers)
