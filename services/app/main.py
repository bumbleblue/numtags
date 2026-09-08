"""FastAPI app factory: OMR + catalog bot + bbstags proxy on one service (spec §5)."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import catalog, omr, proxy
from .config import Settings, load_settings
from .ratelimit import SlidingWindowRateLimiter


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(
        title="numtags services",
        description="homr OMR, Git-backed catalog bot, and barbershoptags.com proxy.",
        version="0.1.0",
    )
    app.state.settings = settings
    app.state.read_limiter = SlidingWindowRateLimiter(
        settings.rate_limit_requests, settings.rate_limit_window_seconds
    )
    app.state.write_limiter = SlidingWindowRateLimiter(
        settings.rate_limit_write_requests, settings.rate_limit_window_seconds
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["*"],
        expose_headers=["X-Confidence", "X-Pdf-Pages"],
    )

    app.include_router(omr.router)
    app.include_router(catalog.router)
    app.include_router(proxy.router)

    @app.get("/healthz")
    def healthz() -> dict[str, str | bool]:
        # catalog_configured shows the *container's* view of its env — the
        # Worker can hold a secret the running instance never received
        # (env vars are applied only at container start).
        return {
            "status": "ok",
            "catalog_configured": bool(settings.github_token and settings.github_repo),
        }

    return app


app = create_app()
