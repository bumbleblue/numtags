"""Git-backed wiki endpoints for the tag catalog (spec §6.8).

GitHub IS the database: every edit is a commit made by the bot token on the
editor's behalf, history is the moderation system, revert is the safety net.
Optimistic concurrency rides on the Contents API blob SHA.

The bot token never leaves this process — errors are re-phrased, never
forwarded raw from GitHub.
"""

from __future__ import annotations

import base64
import re
import time
from typing import Any, Protocol

import httpx
import yaml
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .config import Settings

router = APIRouter(prefix="/catalog", tags=["catalog"])

GITHUB_API = "https://api.github.com"
MAX_DOCUMENT_BYTES = 64 * 1024
INDEX_TTL_SECONDS = 300.0


# --------------------------------------------------------------------------- #
# GitHub client                                                                #
# --------------------------------------------------------------------------- #

class ConflictError(Exception):
    """The blob SHA we were given no longer matches HEAD."""


class GitHubAPI(Protocol):
    """The minimal Contents-API surface; tests swap in a fake."""

    async def list_dir(self, path: str) -> list[dict[str, Any]]: ...
    async def get_file(self, path: str, ref: str | None = None) -> tuple[str, str]: ...
    async def put_file(self, path: str, message: str, content: str, sha: str | None) -> dict[str, Any]: ...
    async def list_commits(self, path: str) -> list[dict[str, Any]]: ...


class GitHubClient:
    def __init__(self, token: str, repo: str, branch: str, base_url: str = GITHUB_API) -> None:
        self._repo = repo
        self._branch = branch
        self._base_url = base_url
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        async with httpx.AsyncClient(timeout=30.0) as client:
            return await client.request(method, url, headers=self._headers, **kwargs)

    def _url(self, path: str) -> str:
        return f"{self._base_url}/repos/{self._repo}/contents/{path}"

    @staticmethod
    def _upstream_error(resp: httpx.Response) -> HTTPException:
        # Deliberately vague: never forward GitHub's response (could echo auth detail).
        return HTTPException(status_code=502, detail=f"GitHub API error (status {resp.status_code})")

    async def list_dir(self, path: str) -> list[dict[str, Any]]:
        resp = await self._request("GET", self._url(path), params={"ref": self._branch})
        if resp.status_code == 404:
            return []
        if resp.status_code != 200:
            raise self._upstream_error(resp)
        return [{"name": e["name"], "path": e["path"], "sha": e["sha"]}
                for e in resp.json() if e.get("type") == "file"]

    async def get_file(self, path: str, ref: str | None = None) -> tuple[str, str]:
        """Return (text, blob_sha) of `path` at `ref` (default: catalog branch)."""
        resp = await self._request("GET", self._url(path), params={"ref": ref or self._branch})
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        if resp.status_code != 200:
            raise self._upstream_error(resp)
        data = resp.json()
        text = base64.b64decode(data["content"]).decode("utf-8")
        return text, data["sha"]

    async def put_file(self, path: str, message: str, content: str, sha: str | None) -> dict[str, Any]:
        body: dict[str, Any] = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            "branch": self._branch,
        }
        if sha is not None:
            body["sha"] = sha
        resp = await self._request("PUT", self._url(path), json=body)
        if resp.status_code == 409 or (resp.status_code == 422 and "sha" in resp.text.lower()):
            raise ConflictError(path)
        if resp.status_code not in (200, 201):
            raise self._upstream_error(resp)
        data = resp.json()
        return {"commit_sha": data["commit"]["sha"], "content_sha": data["content"]["sha"]}

    async def list_commits(self, path: str) -> list[dict[str, Any]]:
        resp = await self._request(
            "GET",
            f"{self._base_url}/repos/{self._repo}/commits",
            params={"sha": self._branch, "path": path, "per_page": 100},
        )
        if resp.status_code != 200:
            raise self._upstream_error(resp)
        return [
            {
                "sha": c["sha"],
                "date": c["commit"]["author"]["date"],
                "message": c["commit"]["message"],
                "author": c["commit"]["author"]["name"],
            }
            for c in resp.json()
        ]


# --------------------------------------------------------------------------- #
# Dependencies                                                                 #
# --------------------------------------------------------------------------- #

def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_github(request: Request) -> GitHubAPI:
    s: Settings = request.app.state.settings
    if not s.github_token or not s.github_repo:
        raise HTTPException(
            status_code=503,
            detail="Catalog service not configured: set GITHUB_TOKEN and GITHUB_REPO.",
        )
    return GitHubClient(s.github_token, s.github_repo, s.catalog_branch)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def read_rate_limit(request: Request) -> None:
    if not request.app.state.read_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Rate limit exceeded; slow down.")


def write_rate_limit(request: Request) -> None:
    if not request.app.state.write_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Write rate limit exceeded; slow down.")


# --------------------------------------------------------------------------- #
# Tag document helpers                                                         #
# --------------------------------------------------------------------------- #

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)


def split_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Split a tag .md document into (frontmatter dict, body). Raises ValueError."""
    m = _FRONTMATTER_RE.match(content)
    if not m:
        raise ValueError("document must start with a `---` YAML frontmatter block")
    meta = yaml.safe_load(m.group(1))
    if not isinstance(meta, dict):
        raise ValueError("frontmatter must be a YAML mapping")
    return meta, m.group(2)


def validate_tag_document(content: str) -> tuple[dict[str, Any], str]:
    """Sanity checks before any commit (spec §6.8). Raises HTTPException(422)."""
    if len(content.encode("utf-8")) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=422, detail=f"Document exceeds {MAX_DOCUMENT_BYTES // 1024}KB limit.")
    try:
        meta, body = split_frontmatter(content)
    except (ValueError, yaml.YAMLError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid frontmatter: {exc}") from exc
    if not body.strip():
        raise HTTPException(status_code=422, detail="Notation body is empty.")
    return meta, body


def clean_editor_name(name: str) -> str:
    name = " ".join(name.split())  # collapse whitespace/newlines
    if not name:
        raise HTTPException(status_code=422, detail="editor_name must not be empty.")
    return name[:80]


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "tag"


def set_frontmatter_tag_id(content: str, tag_id: int) -> str:
    """Force `tag_id:` in the frontmatter block to the assigned id."""
    m = _FRONTMATTER_RE.match(content)
    assert m is not None  # validated upstream
    block = m.group(1)
    if re.search(r"^tag_id\s*:", block, re.MULTILINE):
        block = re.sub(r"^tag_id\s*:.*$", f"tag_id: {tag_id}", block, count=1, flags=re.MULTILINE)
    else:
        block = f"tag_id: {tag_id}\n{block}"
    return f"---\n{block}\n---\n{m.group(2)}"


# --------------------------------------------------------------------------- #
# tag_id -> file path index (in-memory, TTL'd, invalidated on writes)          #
# --------------------------------------------------------------------------- #

_index_cache: dict[str, tuple[float, dict[int, str]]] = {}


def clear_index_cache() -> None:
    _index_cache.clear()


async def tag_index(gh: GitHubAPI, settings: Settings, fresh: bool = False) -> dict[int, str]:
    key = f"{settings.github_repo}@{settings.catalog_branch}/{settings.catalog_path}"
    cached = _index_cache.get(key)
    if not fresh and cached and time.monotonic() - cached[0] < INDEX_TTL_SECONDS:
        return cached[1]
    index: dict[int, str] = {}
    for entry in await gh.list_dir(settings.catalog_path):
        if not entry["name"].endswith(".md"):
            continue
        try:
            text, _ = await gh.get_file(entry["path"])
            meta, _ = split_frontmatter(text)
        except (HTTPException, ValueError, yaml.YAMLError):
            continue  # skip unreadable/malformed files; they just aren't addressable
        tid = meta.get("tag_id")
        if isinstance(tid, int):
            index[tid] = entry["path"]
    _index_cache[key] = (time.monotonic(), index)
    return index


async def resolve_tag_path(gh: GitHubAPI, settings: Settings, tag_id: int) -> str:
    index = await tag_index(gh, settings)
    if tag_id not in index:  # cache may be stale — rebuild once before 404ing
        index = await tag_index(gh, settings, fresh=True)
    if tag_id not in index:
        raise HTTPException(status_code=404, detail=f"No tag with tag_id {tag_id}.")
    return index[tag_id]


# --------------------------------------------------------------------------- #
# Request models                                                               #
# --------------------------------------------------------------------------- #

class EditRequest(BaseModel):
    content: str
    base_sha: str = Field(min_length=1)
    editor_name: str


class CreateRequest(BaseModel):
    content: str
    editor_name: str
    proposed_tag_id: int | None = None


class RevertRequest(BaseModel):
    to_sha: str = Field(min_length=7)
    editor_name: str


# --------------------------------------------------------------------------- #
# Endpoints                                                                    #
# --------------------------------------------------------------------------- #

@router.get("/tags", dependencies=[Depends(read_rate_limit)])
async def list_tags(
    gh: GitHubAPI = Depends(get_github),
    settings: Settings = Depends(get_settings),
) -> list[dict[str, str]]:
    return [e for e in await gh.list_dir(settings.catalog_path) if e["name"].endswith(".md")]


@router.get("/tags/{tag_id}", dependencies=[Depends(read_rate_limit)])
async def get_tag(
    tag_id: int,
    gh: GitHubAPI = Depends(get_github),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    path = await resolve_tag_path(gh, settings, tag_id)
    text, sha = await gh.get_file(path)
    return {"tag_id": tag_id, "path": path, "sha": sha, "content": text}


@router.put("/tags/{tag_id}", dependencies=[Depends(write_rate_limit)])
async def edit_tag(
    tag_id: int,
    req: EditRequest,
    gh: GitHubAPI = Depends(get_github),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    editor = clean_editor_name(req.editor_name)
    meta, _ = validate_tag_document(req.content)
    path = await resolve_tag_path(gh, settings, tag_id)

    _, current_sha = await gh.get_file(path)
    if current_sha != req.base_sha:
        raise HTTPException(
            status_code=409,
            detail="This tag changed since you loaded it — reload and re-apply your edit.",
        )
    title = meta.get("title", "untitled")
    message = f"Edit tag {tag_id}: {title} (by {editor})"
    try:
        result = await gh.put_file(path, message, req.content, sha=req.base_sha)
    except ConflictError:
        raise HTTPException(
            status_code=409,
            detail="This tag changed since you loaded it — reload and re-apply your edit.",
        ) from None
    clear_index_cache()
    return {"tag_id": tag_id, "path": path, **result}


@router.post("/tags", status_code=201, dependencies=[Depends(write_rate_limit)])
async def create_tag(
    req: CreateRequest,
    gh: GitHubAPI = Depends(get_github),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    editor = clean_editor_name(req.editor_name)
    meta, _ = validate_tag_document(req.content)

    index = await tag_index(gh, settings, fresh=True)
    proposed = req.proposed_tag_id or meta.get("tag_id")
    if isinstance(proposed, int) and proposed > 0:
        if proposed in index:
            raise HTTPException(status_code=409, detail=f"tag_id {proposed} already exists.")
        tag_id = proposed
    else:
        tag_id = max(index, default=0) + 1

    content = set_frontmatter_tag_id(req.content, tag_id)
    title = meta.get("title", "untitled")
    existing = {e["name"] for e in await gh.list_dir(settings.catalog_path)}
    name = f"{slugify(str(title))}.md"
    if name in existing:
        name = f"{slugify(str(title))}-{tag_id}.md"
    path = f"{settings.catalog_path}/{name}"

    message = f"Add tag {tag_id}: {title} (by {editor})"
    try:
        result = await gh.put_file(path, message, content, sha=None)
    except ConflictError:
        raise HTTPException(status_code=409, detail=f"A file named {name} already exists.") from None
    clear_index_cache()
    return {"tag_id": tag_id, "path": path, **result}


_BY_RE = re.compile(r"\(by (.+)\)\s*$")


@router.get("/tags/{tag_id}/history", dependencies=[Depends(read_rate_limit)])
async def tag_history(
    tag_id: int,
    gh: GitHubAPI = Depends(get_github),
    settings: Settings = Depends(get_settings),
) -> list[dict[str, str]]:
    path = await resolve_tag_path(gh, settings, tag_id)
    commits = await gh.list_commits(path)
    out = []
    for c in commits:
        m = _BY_RE.search(c["message"])
        out.append({
            "sha": c["sha"],
            "date": c["date"],
            "message": c["message"],
            "editor": m.group(1) if m else c["author"],
        })
    return out


@router.post("/tags/{tag_id}/revert", dependencies=[Depends(write_rate_limit)])
async def revert_tag(
    tag_id: int,
    req: RevertRequest,
    gh: GitHubAPI = Depends(get_github),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    editor = clean_editor_name(req.editor_name)
    path = await resolve_tag_path(gh, settings, tag_id)
    old_text, _ = await gh.get_file(path, ref=req.to_sha)
    validate_tag_document(old_text)  # never commit something that fails sanity, even via revert
    _, current_sha = await gh.get_file(path)
    message = f"Revert tag {tag_id} to {req.to_sha[:7]} (by {editor})"
    try:
        result = await gh.put_file(path, message, old_text, sha=current_sha)
    except ConflictError:
        raise HTTPException(
            status_code=409,
            detail="This tag changed while reverting — reload history and try again.",
        ) from None
    clear_index_cache()
    return {"tag_id": tag_id, "path": path, **result}
