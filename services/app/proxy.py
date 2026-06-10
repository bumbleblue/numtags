"""CORS proxy for barbershoptags.com (spec §6.7).

- GET /proxy/bbstags?{params} -> forwards to the official API (api.php), XML out.
- GET /proxy/media?url=...    -> streams a barbershoptags.com-hosted GIF/MIDI/MP3.

NOT an open proxy: /proxy/media only fetches from barbershoptags.com hosts,
re-validated on every redirect hop.
"""

from __future__ import annotations

from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from starlette.background import BackgroundTask

from .catalog import read_rate_limit

router = APIRouter(prefix="/proxy", tags=["proxy"])

BBSTAGS_API_URL = "https://www.barbershoptags.com/api.php"
ALLOWED_MEDIA_HOSTS = {"barbershoptags.com", "www.barbershoptags.com"}
MAX_REDIRECTS = 3
API_CACHE = "public, max-age=3600"
MEDIA_CACHE = "public, max-age=86400"


@router.get("/bbstags", dependencies=[Depends(read_rate_limit)])
async def bbstags(request: Request) -> Response:
    """Pass query params through to the barbershoptags API; return its XML."""
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        try:
            upstream = await client.get(BBSTAGS_API_URL, params=dict(request.query_params))
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"barbershoptags.com unreachable: {type(exc).__name__}") from None
    if upstream.status_code != 200:
        raise HTTPException(status_code=502, detail=f"barbershoptags.com returned {upstream.status_code}")
    return Response(
        content=upstream.content,
        media_type=upstream.headers.get("content-type", "text/xml"),
        headers={"Cache-Control": API_CACHE},
    )


def _validate_media_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=422, detail="url must be http(s).")
    if parsed.hostname not in ALLOWED_MEDIA_HOSTS:
        raise HTTPException(status_code=403, detail="Only barbershoptags.com media can be proxied.")
    return url


@router.get("/media", dependencies=[Depends(read_rate_limit)])
async def media(url: str) -> StreamingResponse:
    """Stream a barbershoptags-hosted binary (GIF sheet music, MIDI, MP3)."""
    target = _validate_media_url(url)
    client = httpx.AsyncClient(timeout=60.0)
    try:
        for _ in range(MAX_REDIRECTS + 1):
            req = client.build_request("GET", target)
            upstream = await client.send(req, stream=True)
            if upstream.status_code in (301, 302, 303, 307, 308):
                await upstream.aclose()
                location = upstream.headers.get("location", "")
                target = _validate_media_url(str(httpx.URL(target).join(location)))
                continue
            break
        else:
            raise HTTPException(status_code=502, detail="Too many redirects from barbershoptags.com.")
        if upstream.status_code != 200:
            await upstream.aclose()
            raise HTTPException(status_code=502, detail=f"barbershoptags.com returned {upstream.status_code}")
    except httpx.HTTPError as exc:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"barbershoptags.com unreachable: {type(exc).__name__}") from None
    except HTTPException:
        await client.aclose()
        raise

    async def cleanup() -> None:
        await upstream.aclose()
        await client.aclose()

    headers = {"Cache-Control": MEDIA_CACHE}
    if length := upstream.headers.get("content-length"):
        headers["Content-Length"] = length
    return StreamingResponse(
        upstream.aiter_bytes(),
        media_type=upstream.headers.get("content-type", "application/octet-stream"),
        headers=headers,
        background=BackgroundTask(cleanup),
    )
