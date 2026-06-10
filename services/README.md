# numtags services

**Status: scaffold — NOT deployed yet.** Runs locally and in Docker; no hosted instance exists.

One small FastAPI service (spec §5: the same scale-to-zero backend) hosting:

| Area | Endpoints | Spec |
|---|---|---|
| **OMR** | `POST /omr` — image/GIF/PDF → MusicXML via the [homr](https://pypi.org/project/homr/) CLI | §6.3 |
| **Catalog bot** | `GET/PUT/POST /catalog/tags…` — wiki-style edits committed to the GitHub catalog repo, history, revert | §6.8 |
| **bbstags proxy** | `GET /proxy/bbstags`, `GET /proxy/media` — CORS proxy for barbershoptags.com metadata + media | §6.7 |
| Health | `GET /healthz` | — |

Everything else in numtags is client-side and offline; this service exists only because
OMR is too heavy for the browser and the GitHub write token can't live in the client.

## Run locally

```sh
cd services
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in GITHUB_TOKEN / GITHUB_REPO
set -a; . ./.env; set +a      # or use your favorite dotenv runner
uvicorn app.main:app --reload --port 8000
```

Interactive docs at `http://localhost:8000/docs`.

**OMR engine:** homr is *not* a Python dependency of this service — it's run as a
subprocess via `HOMR_CMD` (default `uvx homr`, which needs [uv](https://docs.astral.sh/uv/)
installed and downloads homr + model weights on first call). Without it, `POST /omr`
returns a clean `503` with a JSON `detail`; everything else still works. Verify homr's
and its weights' license before any public deploy (spec §14).

**Tests:**

```sh
pip install pytest
python -m pytest tests/ -q
```

Tests run fully offline (fake GitHub backend, no homr needed).

## Environment variables

See [.env.example](.env.example) — `GITHUB_TOKEN`, `GITHUB_REPO`, `CATALOG_BRANCH`
(default `main`), `CATALOG_PATH` (default `data/tags`), `RATE_LIMIT_REQUESTS` /
`RATE_LIMIT_WINDOW_SECONDS` / `RATE_LIMIT_WRITE_REQUESTS`, `HOMR_CMD`,
`HOMR_TIMEOUT_SECONDS`, `ALLOWED_ORIGINS`.

## Security model (spec §14 decisions)

- **Bot token scope:** a fine-grained GitHub PAT on a dedicated bot account with
  **Contents: read & write on the catalog repo only**. Nothing else — no admin, no
  workflows, no other repos.
- **The token never reaches the client.** It exists only as a server env var; GitHub
  error responses are re-phrased server-side, never forwarded. The SvelteKit app talks
  to this service, never to GitHub directly for writes.
- **Commit target:** default is **direct to `main`** (wiki-style, edits go live on next
  sync; Git history + one-tap revert is the moderation system, per §6.8). Set
  `CATALOG_BRANCH=catalog` (or anything) to commit to a separate branch instead — no
  code change needed.
- **`tag_id` assignment on Publish:** server-side — next id = max(existing) + 1, unless
  the client proposes a free one (`proposed_tag_id`); a taken id is a `409`.
- **Abuse defenses (cheap, per §6.8/§14):** per-IP sliding-window rate limits (separate
  read/write budgets), pre-commit sanity checks (< 64KB, YAML frontmatter parses,
  non-empty body → `422`), optimistic concurrency on the blob SHA (`409` on stale),
  and `/proxy/media` is host-locked to barbershoptags.com (no open proxy).

## API quick reference

| Method & path | Body | Returns |
|---|---|---|
| `POST /omr` (multipart `file`: png/jpg/gif/pdf) | — | MusicXML (`application/vnd.recordare.musicxml+xml`), `X-Confidence` header when homr reports one, `X-Pdf-Pages` for PDFs (first page only is processed). `503` if homr missing. |
| `GET /catalog/tags` | — | `[{name, path, sha}]` |
| `GET /catalog/tags/{tag_id}` | — | `{tag_id, path, sha, content}` — `sha` is the `base_sha` for edits |
| `PUT /catalog/tags/{tag_id}` | `{content, base_sha, editor_name}` | `{tag_id, path, commit_sha, content_sha}` · `409` stale sha · `422` sanity check |
| `POST /catalog/tags` | `{content, editor_name, proposed_tag_id?}` | `201 {tag_id, path, commit_sha, content_sha}` |
| `GET /catalog/tags/{tag_id}/history` | — | `[{sha, date, message, editor}]` |
| `POST /catalog/tags/{tag_id}/revert` | `{to_sha, editor_name}` | `{tag_id, path, commit_sha, content_sha}` |
| `GET /proxy/bbstags?…` | — | barbershoptags API XML (params passed through) |
| `GET /proxy/media?url=…` | — | streamed GIF/MIDI/MP3 (barbershoptags.com hosts only) |

Commit messages: `Edit tag {id}: {title} (by {editor_name})`,
`Add tag {id}: {title} (by {editor_name})`, `Revert tag {id} to {short_sha} (by {editor_name})`.

## Pointing the SvelteKit app at this service

Set `PUBLIC_SERVICE_URL` in the app's env (e.g. `.env`: `PUBLIC_SERVICE_URL=http://localhost:8000`)
and add the app's origin to this service's `ALLOWED_ORIGINS`. The client builds requests as
`${PUBLIC_SERVICE_URL}/omr`, `${PUBLIC_SERVICE_URL}/catalog/tags/7`, etc.

## Deploy notes (when the time comes — not done yet)

Any scale-to-zero container host works; the service is stateless (in-memory caches only,
GitHub is the store). Give it ≥ 2GB RAM and generous request timeouts (≥ 300s) for homr.

- **Cloud Run:** `gcloud run deploy numtags-services --source services/ --memory 2Gi --timeout 600 --min-instances 0`; set env vars via `--set-env-vars`, the token via Secret Manager.
- **Fly.io:** `fly launch` in `services/` (Dockerfile is picked up); `fly secrets set GITHUB_TOKEN=…`; `min_machines_running = 0` for scale-to-zero.
- **Modal:** wrap the ASGI app with `@modal.asgi_app()`; nice fit if homr later wants a GPU.

For production, bake homr into the image (`pip install homr`, `HOMR_CMD=homr`) instead of
relying on `uvx`'s first-call download — model weights are large and cold starts are
already the tax of scale-to-zero.
