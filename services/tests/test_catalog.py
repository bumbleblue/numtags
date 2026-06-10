"""Catalog endpoint tests with a fake GitHub backend (no network)."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import catalog
from app.catalog import get_github
from app.config import Settings
from app.main import create_app

TAG_DOC = """---
title: "Sleepy Time"
tag_id: 7
arranger: "unknown"
---

|  3  5  4  - |
|  1  1  1  - |
Sleep-y time now
"""


class FakeGitHub:
    """In-memory stand-in for the GitHub Contents API."""

    def __init__(self, files: dict[str, tuple[str, str]] | None = None) -> None:
        # path -> (text, blob_sha)
        self.files = dict(files or {})
        self.commits: list[dict[str, Any]] = []  # recorded put_file calls
        self.history: dict[str, list[dict[str, Any]]] = {}
        self.at_ref: dict[tuple[str, str], str] = {}  # (path, ref) -> text

    async def list_dir(self, path: str) -> list[dict[str, Any]]:
        return [
            {"name": p.rsplit("/", 1)[-1], "path": p, "sha": sha}
            for p, (_, sha) in self.files.items()
            if p.startswith(path + "/")
        ]

    async def get_file(self, path: str, ref: str | None = None) -> tuple[str, str]:
        if ref is not None and (path, ref) in self.at_ref:
            return self.at_ref[(path, ref)], f"blob-at-{ref}"
        if path not in self.files:
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        return self.files[path]

    async def put_file(self, path: str, message: str, content: str, sha: str | None) -> dict[str, Any]:
        if sha is not None:
            current = self.files.get(path)
            if current is None or current[1] != sha:
                raise catalog.ConflictError(path)
        new_sha = f"sha-{len(self.commits) + 1}"
        self.files[path] = (content, new_sha)
        self.commits.append({"path": path, "message": message, "content": content})
        return {"commit_sha": f"commit-{len(self.commits)}", "content_sha": new_sha}

    async def list_commits(self, path: str) -> list[dict[str, Any]]:
        return self.history.get(path, [])


@pytest.fixture()
def gh() -> FakeGitHub:
    return FakeGitHub({"data/tags/sleepy-time.md": (TAG_DOC, "base-sha-1")})


@pytest.fixture()
def client(gh: FakeGitHub) -> TestClient:
    catalog.clear_index_cache()
    settings = Settings(github_token="test-token", github_repo="user/numtags",
                        rate_limit_requests=10_000, rate_limit_write_requests=10_000)
    app = create_app(settings)
    app.dependency_overrides[get_github] = lambda: gh
    return TestClient(app)


# --------------------------------------------------------------------------- #
# Reads                                                                        #
# --------------------------------------------------------------------------- #

def test_list_tags(client: TestClient) -> None:
    resp = client.get("/catalog/tags")
    assert resp.status_code == 200
    assert resp.json() == [{"name": "sleepy-time.md", "path": "data/tags/sleepy-time.md", "sha": "base-sha-1"}]


def test_get_tag_by_tag_id(client: TestClient) -> None:
    resp = client.get("/catalog/tags/7")
    assert resp.status_code == 200
    body = resp.json()
    assert body["path"] == "data/tags/sleepy-time.md"
    assert body["sha"] == "base-sha-1"
    assert "Sleep-y time" in body["content"]


def test_get_unknown_tag_is_404(client: TestClient) -> None:
    assert client.get("/catalog/tags/999").status_code == 404


# --------------------------------------------------------------------------- #
# Edit: optimistic concurrency + commit message                                #
# --------------------------------------------------------------------------- #

def test_edit_with_stale_sha_is_409(client: TestClient, gh: FakeGitHub) -> None:
    resp = client.put("/catalog/tags/7", json={
        "content": TAG_DOC.replace("3  5  4", "3  5  5"),
        "base_sha": "STALE",
        "editor_name": "Casey",
    })
    assert resp.status_code == 409
    assert "reload" in resp.json()["detail"].lower()
    assert gh.commits == []  # nothing was committed


def test_edit_commit_message_format(client: TestClient, gh: FakeGitHub) -> None:
    resp = client.put("/catalog/tags/7", json={
        "content": TAG_DOC.replace("3  5  4", "3  5  5"),
        "base_sha": "base-sha-1",
        "editor_name": "Casey",
    })
    assert resp.status_code == 200
    assert gh.commits[0]["message"] == "Edit tag 7: Sleepy Time (by Casey)"
    assert resp.json()["commit_sha"] == "commit-1"


# --------------------------------------------------------------------------- #
# Sanity checks (422)                                                          #
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("bad_content", [
    "no frontmatter at all\n| 1 2 3 |",                 # missing frontmatter
    "---\ntitle: [unclosed\n---\n| 1 2 3 |",            # invalid YAML
    "---\ntitle: Empty\ntag_id: 7\n---\n\n   \n",       # empty body
    TAG_DOC + ("x" * (64 * 1024)),                      # > 64KB
])
def test_edit_sanity_checks_422(client: TestClient, gh: FakeGitHub, bad_content: str) -> None:
    resp = client.put("/catalog/tags/7", json={
        "content": bad_content, "base_sha": "base-sha-1", "editor_name": "Casey",
    })
    assert resp.status_code == 422
    assert gh.commits == []


# --------------------------------------------------------------------------- #
# Create                                                                       #
# --------------------------------------------------------------------------- #

def test_create_assigns_next_tag_id_and_message(client: TestClient, gh: FakeGitHub) -> None:
    new_doc = '---\ntitle: "New Tag"\n---\n\n| 1 2 3 |\n'
    resp = client.post("/catalog/tags", json={"content": new_doc, "editor_name": "Robin"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["tag_id"] == 8  # max existing (7) + 1
    assert body["path"] == "data/tags/new-tag.md"
    assert gh.commits[0]["message"] == "Add tag 8: New Tag (by Robin)"
    assert "tag_id: 8" in gh.commits[0]["content"]


def test_create_with_taken_proposed_id_is_409(client: TestClient, gh: FakeGitHub) -> None:
    new_doc = '---\ntitle: "Dup"\n---\n\n| 1 |\n'
    resp = client.post("/catalog/tags", json={
        "content": new_doc, "editor_name": "Robin", "proposed_tag_id": 7,
    })
    assert resp.status_code == 409
    assert gh.commits == []


# --------------------------------------------------------------------------- #
# History + revert                                                             #
# --------------------------------------------------------------------------- #

def test_history_extracts_editor_from_message(client: TestClient, gh: FakeGitHub) -> None:
    gh.history["data/tags/sleepy-time.md"] = [
        {"sha": "abc1234def", "date": "2026-06-01T10:00:00Z",
         "message": "Edit tag 7: Sleepy Time (by Casey)", "author": "numtags-bot"},
        {"sha": "0001111aaa", "date": "2026-05-01T10:00:00Z",
         "message": "import catalog", "author": "Eileen"},
    ]
    resp = client.get("/catalog/tags/7/history")
    assert resp.status_code == 200
    entries = resp.json()
    assert entries[0]["editor"] == "Casey"
    assert entries[1]["editor"] == "Eileen"  # falls back to commit author


def test_revert_flow(client: TestClient, gh: FakeGitHub) -> None:
    old_version = TAG_DOC.replace("3  5  4", "9  9  9")
    gh.at_ref[("data/tags/sleepy-time.md", "abc1234def")] = old_version

    resp = client.post("/catalog/tags/7/revert", json={
        "to_sha": "abc1234def", "editor_name": "Casey",
    })
    assert resp.status_code == 200
    commit = gh.commits[0]
    assert commit["message"] == "Revert tag 7 to abc1234 (by Casey)"
    assert commit["content"] == old_version
    assert gh.files["data/tags/sleepy-time.md"][0] == old_version
