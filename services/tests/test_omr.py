"""OMR endpoint tests — no homr installed, by design."""

from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app
from app.omr import gif_first_frame_to_png, sniff_kind


@pytest.fixture()
def client() -> TestClient:
    settings = Settings(
        homr_cmd="definitely-not-a-real-binary-homr-xyz",
        rate_limit_requests=10_000,
        rate_limit_write_requests=10_000,
    )
    return TestClient(create_app(settings))


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), "white").save(buf, format="PNG")
    return buf.getvalue()


def _gif_bytes(frames: int = 2) -> bytes:
    buf = io.BytesIO()
    imgs = [Image.new("P", (8, 8), i) for i in range(frames)]
    imgs[0].save(buf, format="GIF", save_all=True, append_images=imgs[1:])
    return buf.getvalue()


def test_omr_returns_503_with_detail_when_homr_missing(client: TestClient) -> None:
    resp = client.post("/omr", files={"file": ("tag.png", _png_bytes(), "image/png")})
    assert resp.status_code == 503
    detail = resp.json()["detail"]
    assert "homr" in detail
    assert "definitely-not-a-real-binary-homr-xyz" in detail


def test_omr_rejects_unknown_file_type(client: TestClient) -> None:
    resp = client.post("/omr", files={"file": ("tag.txt", b"not an image", "text/plain")})
    assert resp.status_code == 415


def test_gif_first_frame_to_png() -> None:
    png = gif_first_frame_to_png(_gif_bytes())
    assert png.startswith(b"\x89PNG\r\n\x1a\n")
    with Image.open(io.BytesIO(png)) as im:
        assert im.format == "PNG"
        assert im.size == (8, 8)


def test_sniff_kind() -> None:
    assert sniff_kind(_png_bytes()) == "png"
    assert sniff_kind(_gif_bytes()) == "gif"
    assert sniff_kind(b"%PDF-1.7 ...") == "pdf"
    assert sniff_kind(b"\xff\xd8\xff\xe0junk") == "jpeg"
    assert sniff_kind(b"hello") is None
