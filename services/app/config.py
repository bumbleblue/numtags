"""Environment-driven settings. No secrets ever leave this process."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    github_token: str = ""
    github_repo: str = ""  # "owner/repo"
    catalog_branch: str = "main"
    catalog_path: str = "data/tags"
    homr_cmd: str = "uvx homr"
    homr_timeout_seconds: int = 300
    allowed_origins: list[str] = field(default_factory=lambda: ["http://localhost:5173"])
    rate_limit_requests: int = 60
    rate_limit_window_seconds: float = 60.0
    rate_limit_write_requests: int = 10


def load_settings() -> Settings:
    env = os.environ
    origins = [o.strip() for o in env.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    return Settings(
        github_token=env.get("GITHUB_TOKEN", ""),
        github_repo=env.get("GITHUB_REPO", ""),
        catalog_branch=env.get("CATALOG_BRANCH", "main"),
        catalog_path=env.get("CATALOG_PATH", "data/tags").strip("/"),
        homr_cmd=env.get("HOMR_CMD", "uvx homr"),
        homr_timeout_seconds=int(env.get("HOMR_TIMEOUT_SECONDS", "300")),
        allowed_origins=origins,
        rate_limit_requests=int(env.get("RATE_LIMIT_REQUESTS", "60")),
        rate_limit_window_seconds=float(env.get("RATE_LIMIT_WINDOW_SECONDS", "60")),
        rate_limit_write_requests=int(env.get("RATE_LIMIT_WRITE_REQUESTS", "10")),
    )
