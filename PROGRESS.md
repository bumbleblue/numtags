# numtags — build status

Tracks the Fable rebuild against [FABLE_SPEC.md](FABLE_SPEC.md) §12 milestones.
Last updated: 2026-09-11 (branch `claude/safari-ios-visibility-4509f7`).

## Where we left off (session of 2026-09-11, iOS Safari crash on the library page)

- **Symptom:** iOS Safari showed "A problem repeatedly occurred on
  https://numtags.app/" while desktop browsers were fine. Cause: once the
  catalog reached 335 tags, `/` server-rendered every card *with* its
  notation preview — a 12.6 MB page, ~180k DOM nodes, 52k BeatCells
  hydrated as components, ~400 MB JS heap in Chromium and a ~2.2 GB WebKit
  content process in desktop Safari. iOS caps a page at roughly 1–2 GB
  (device-dependent) and kills it; two kills in a row give that message.
  Ruled out: service-worker reload loops, ResizeObserver oscillation,
  compositing-heavy CSS — it was pure volume.
- **Fix:** `src/lib/components/TagGrid.svelte` pages both library grids
  (24 cards, "Show 24 more", paging restarts whenever the result list
  changes); `TagCard` mounts its `NotationRenderer` only when the card comes
  within a screen of the viewport (IntersectionObserver; `eager` for the
  first 6 so the first paint has previews). The preview box is a fixed
  150 px (was max-height) so the placeholder → preview swap never shifts
  the grid. Library page now: ~5.2k DOM nodes, 6 previews at load, ~33 MB
  JS heap, SSR HTML well under 0.5 MB. Tests 1229 green, svelte-check
  clean, build green.
- **Also found on phones:** a dozen MIDI-converted tags have a barline-less
  opening "measure" of 256–576 beats (`what-ll-i-do.md` 576,
  `the-next-ten-minutes.md` 384, six at 256). Because the mobile grid
  column was `auto`, one such card stretched the whole library page to
  ~15,700 px wide. The grid is now `grid-cols-1` (minmax(0, 1fr)) so the
  measure scrolls inside its card; the data itself still needs fixing in
  the MIDI importer/encoder (the tag page renders such a measure as one
  15k px row).
- **Keep in mind as the catalog grows:** the list is now O(page), but the
  search index (Fuse) and `allTags` still load the whole bundle — the note
  below about moving the snapshot out of the JS bundle still applies before
  OMR adds thousands of tags.

## Where we left off (session of 2026-09-10, catalog populated)

- **The catalog now has 335 tags: the 5 golden hand-transcriptions plus 330
  auto-generated entries** — every tag on barbershoptags.com with a
  MusicXML (68) or MIDI (262) source, walked with
  `npm run bbstags -- --catalog --all` (7,067 tags on the site; 6,491 are
  image-only and wait for OMR; 243 have no files). Eileen's call: populate
  now, flag as `status: auto-generated`, and let humans flip entries to
  `checked` (review → Details → "Mark as checked" checkbox; badge on cards
  and tag pages). This deliberately relaxes §6.1 ("every import lands in
  review") for machine drafts that are labelled as such.
- **Encoder fixes the population surfaced:** double accidentals relative
  to the key (`##4`, `bb7`) are now respelled on the neighbouring letter
  with ≤ 1 accidental (`respellSingle` in encode.ts — the notation only has
  single accidentals, §3); lyric text is one token per beat (whitespace
  inside a syllable → `_`, so a CRLF inside a MusicXML lyric can't split
  the line any more). `serializeTag` folds newlines in values (the site's
  multi-line Notes went into `comments` raw). Tests: 1229 vitest (the new
  "whole catalog" suite checks every non-golden file is flagged, canonical
  ASCII, 4 voices, zero parse warnings), svelte-check clean, build green.
- Script hardening from the run: `--all` (paged walk, 100/req — the per-id
  path crawled at ~14 s/record), fetch timeouts, `--catalog` skips ids
  already present and never writes skeletons into data/tags, report goes
  to `out/bbstags/report.json`, `origin` stays `catalog` for catalog
  entries (provenance lives in the report), `<?PDFtoMusic?>` processing
  instructions stripped (happy-dom rejects them; recovered 4 tags),
  "four part files" are full-mix learning tracks — the Lead file is used
  whole rather than merged.
- **Known limits of the auto-generated set:** `difficulty` is the default
  "Easy" everywhere (the site has no such field); MIDI voice assignment is
  by pitch order on 134 tags (crossings will be wrong); 125 tags got the
  "home the lead" octave shift. Bundle: generated-tags.ts is 331 KB
  (≈284 KB chunk) — fine at 335 tags, but the snapshot should move out of
  the JS bundle before OMR adds thousands more.
- **Next:** the OMR run — homr locally (`--omr http://localhost:8000`)
  against the 6,491 image-only tags is the only way to grow further; 509
  MuseScore `.mscz` files could also be converted via the MuseScore CLI.

## Where we left off (session of 2026-09-10, bulk conversion script)

- **`scripts/bbstags-to-numeric.ts`** (`npm run bbstags -- <ids|urls>` or
  `--search "…"`): barbershoptags.com API record → best machine-readable
  source → the app's own importers (`src/lib/score/*`) → catalog-format
  `.md` drafts in `out/bbstags/` (gitignored; never `data/tags`, §6.1) +
  `report.json` with per-tag warnings. Sources in priority order: MusicXML
  `<Notation type="xml">`, MIDI (`AllParts`/`Notation`, or four part files
  merged by role), then sheet-music image/PDF via `--omr <service>`;
  otherwise a metadata-only skeleton. Runs under **vite-node, not tsx**
  (`@tonejs/midi` is a UMD bundle Node's ESM loader can't see through);
  happy-dom stands in for `DOMParser`.
- **Reality check from a 400-tag API sample:** ~99% of tags offer only
  images + MP3s (MIDI ≈1%, MusicXML 1 tag, 25 MuseScore `.mscz` we can't
  read). Bulk conversion is therefore an OMR job — the homr evaluation
  (§14) is now the gating item, and this script is the harness for it
  (`--omr http://localhost:8000` against a local service with homr).
- **Octave convention, settled empirically:** the catalog notates written
  pitch (treble 8vb: tag 24 has lead `1`, bass `1,` in B); MIDI is
  sounding pitch, one octave lower. The script shifts the whole score by
  whole octaves so the lead's median lands nearest the octave-4 tonic
  ("home the lead", `--no-octave-shift` to disable). Worth porting into
  `midi.ts`/the review screen so in-app MIDI imports match too.
- Verified end to end on #7561 (MIDI, "Get Low"), #4074 (MusicXML) and
  image-only tags (skeleton); same-title tags get id-suffixed filenames.

## Where we left off (session of 2026-09-08, catalog service live)

- **The catalog service is fully live**: `api.numtags.app` serves reads,
  history, and (untested but token-ready) writes; `/healthz` now reports
  `catalog_configured: true` from the container's own env. The July
  "production reality check" is resolved — GITHUB_TOKEN is set as a
  secret on the `numtags-services` Worker (via dashboard; wrangler OAuth
  login fails on this machine with a dash CSRF-cookie error).
- **Deployment gotcha that cost a day:** Cloudflare Containers pass env
  vars **only at container start**. A running instance survives Worker
  deploys (secret adds included) and can outlive its `sleepAfter` idle
  window for hours, so a new/changed secret does NOT reach the app until
  the instance is replaced. Reliable lever: change the image (any app/
  Dockerfile edit) and push — the CI `deploy-services` job rebuilds and
  rolls the instance. Check `/healthz.catalog_configured` after.
- The one `deploy-services` CI failure in this saga was transient
  (re-run succeeded). The temporary `/debug/env` Worker route used for
  diagnosis has been removed again.
- **Next:** a real Publish write-test through the UI (exercises the CC0
  modal + bot commit + the publish→CI→site-rebuild loop), then the
  remaining M5 tail: homr accuracy/licensing evaluation before enabling
  OMR (§14; `HOMR_CMD` still deliberately disabled).

## Where we left off (session of 2026-07-30, M5 history)

- **M5 shipped (worktree branch `m5-history`): History screen, recent-changes
  feed, CC0 gate.** Service additions in `services/app/catalog.py`:
  `GET /catalog/tags/{id}` gained `?ref=<commit sha>` (hex-validated; returns
  that version — its `sha` is a blob sha, never a `base_sha`), and
  `GET /catalog/recent` serves the catalog-wide feed (editor + `tag_id`
  parsed from the bot's commit-message format; `tag_id: null` for foreign
  commits like the initial import). 20 pytest green.
- **Frontend:** `/tag/id/[id]/history` (version list with a `current` badge;
  expand → rendered preview + "what changes if you revert" line diff vs HEAD;
  revert with editor name + confirm; §7.1 states: private-tag guard,
  no-service, offline, retry, "No edits yet", "Identical to the current
  version"), `/changes` (global feed, titles resolved from the bundled
  snapshot, in the main nav), a History button on catalog tag pages, and the
  **CC0 first-publish affirmation as a real modal** in review
  (`localStorage numtags-cc0-affirmed`; Escape/cancel abort, affirm re-enters
  `publish()`). New `src/lib/catalog.ts` (service client) and `src/lib/diff.ts`
  (LCS line diff, tested). 232 vitest, svelte-check, build all green; flows
  browser-verified against a local stub of the service.
- **Production reality check:** `api.numtags.app` is live but answers `503 —
  set GITHUB_TOKEN and GITHUB_REPO` on every catalog route: the bot's
  fine-grained PAT was never configured. Eileen: create the PAT (Contents RW
  on bumbleblue/numtags only, per services/README §security), then
  `cd services && npx wrangler secret put GITHUB_TOKEN` and set `GITHUB_REPO`;
  the new endpoints deploy with the next push to `main` (CI does both jobs).
- **Adversarial review pass** (multi-agent, 7 findings confirmed & fixed):
  revert now carries `base_sha` end to end — HEAD's blob sha as the client
  rendered the diff; the service 409s if the tag moved (no-silent-clobber,
  matching edits); the history page reloads keyed on the route `id` (a reused
  component across two tags' history pages previously kept the old tag's
  versions — revert-the-wrong-tag risk); freshly published tags now resolve
  **live from the service** on the tag page and in review's `?catalog=` branch
  (the /changes feed links them immediately; previously a 404 until the next
  deploy) with a "freshly published" note; the CC0 dialog got real modal
  behavior (initial focus on Cancel so a held Enter can't affirm, Tab trap,
  focus restore on close); abandoned version-expansion fetches no longer
  collapse the newly opened row; network-level fetch failures read as
  "couldn't reach the catalog service" instead of raw "Failed to fetch"
  (`CatalogError` carries the status so 409 is distinguishable); editor names
  capped (maxlength=80) and truncated in feed/history rows.
- Dev harness note: the tonk-site session's `.claude/launch.json` gained a
  `numtags-m5` config (port 5180 — allowed by the service's CORS list; 5173
  is usually the human's dev server).

## Where we left off (session of 2026-06-11, hosting)

- **Frontend hosting wired up (Cloudflare Workers + GitHub Actions).**
  New `wrangler.jsonc`: Worker `numtags`, static assets served from
  `.svelte-kit/cloudflare` with the `ASSETS` binding; `static/.assetsignore`
  keeps `_worker.js`/`_routes.json` out of the public asset upload.
  `.github/workflows/deploy.yml` replaced (it was a stale GitHub Pages
  deploy from the pre-Cloudflare era): PRs and pushes to `main` run
  vitest + svelte-check + build; pushes to `main` additionally deploy via
  `cloudflare/wrangler-action`. Verified locally with
  `wrangler deploy --dry-run`.
- **Needs two GitHub repo secrets before the first deploy works:**
  `CLOUDFLARE_API_TOKEN` (token with the "Edit Cloudflare Workers"
  template) and `CLOUDFLARE_ACCOUNT_ID` — Settings → Secrets and
  variables → Actions. First successful run lands at
  `numtags.<account>.workers.dev`; custom domain attaches in the
  Cloudflare dash under the Worker's Domains & Routes.
- **Catalog service deploys to Cloudflare Containers** (Eileen's host
  pick; site is `numtags.app`, service is `api.numtags.app`). New
  `services/worker.mjs` (Container DO shim, `@cloudflare/containers`,
  scale-to-zero via `sleepAfter: 10m`) + `services/wrangler.jsonc`
  (basic instance, custom domain route, vars) + `services/.dockerignore`.
  **Catalog + proxy only:** `HOMR_CMD=homr-not-installed` keeps
  `POST /omr` at its clean 503 until homr licensing is cleared (§14).
  `deploy-services` job added to the workflow — the GitHub runner builds
  the Docker image (no local Docker on this Mac; `wrangler deploy
  --dry-run` needs Docker too, so config was validated by bundle-only).
  Main Worker now ships `PUBLIC_SERVICE_URL=https://api.numtags.app` as
  a runtime var (`$env/dynamic/public` reads Worker vars — no rebuild).
- **Before the first service deploy works:** Workers Paid plan active
  (Containers requirement); the Actions `CLOUDFLARE_API_TOKEN` may need
  Account → Containers:Edit added; create the bot's fine-grained PAT
  (Contents RW on bumbleblue/numtags only, per services/README §security)
  and `cd services && npx wrangler secret put GITHUB_TOKEN`; numtags.app
  DNS didn't resolve from here yet — custom domain `api.numtags.app`
  is created by the deploy once the zone is active.
- Note: catalog publishes commit to `main` → every publish triggers CI →
  site redeploys with the new catalog snapshot (generated-tags.ts).
  That's the intended §6.8 "live on next sync" loop.
- npm-version gotcha (hit twice now): the lock must stay npm-10-valid
  (Node 22 bundles npm 10; Cloudflare + Actions use it). After changing
  deps: `npx npm@10.9.2 install` and don't let npm 11 rewrite the lock.

## Where we left off (session of 2026-06-11, playback)

- **Notation playback shipped (spec §6.9, a deliberate post-v1 scope
  addition).** New `src/lib/audio/` module: `pitch.ts` (Beat → MIDI via the
  §6.4 convention, reusing encode.ts key math), `schedule.ts` (ParsedTag →
  column-aligned note timeline; pure, tested), `synth.ts` (dependency-free
  piano-ish Web Audio voice), `player.svelte.ts` (runes singleton; one tag
  at a time, solo or full mix, rAF-driven playhead).
- UI: tag detail gets a **Play/Stop** button beside the layout toggle; the
  renderer's **voice labels are solo play buttons** (glyphs revealed on
  staff hover; always faintly visible under `hover: none`); the sounding
  column gets an ink-wash **follow-along highlight** (one row when solo).
  Leaving the page stops audio.
- Decisions locked with Eileen: include highlight in v1; solo + all only
  (no part-predominant yet); fixed ~90 BPM; piano-like accuracy-over-beauty
  timbre. Later niceties listed at the end of §6.9.
- Gotchas encountered (worth remembering): Svelte 5 deep-proxy breaks
  `===` identity on `$state` objects — the player uses `$state.raw`; a
  suspended AudioContext (no user activation) is handled by bailing out of
  `play()` after a 500 ms resume race. `vite.config.ts` now honors `PORT`
  for preview harnesses. Dev console handle: `window.__player`.
- 211 vitest green (18 new audio tests), svelte-check clean.

## Where we left off (session of 2026-06-11, editor UX)

- Branch `claude/clever-meitner-af7559` (fast-forwarded onto `fable-rebuild`).
- **Review & edit restructured (§6.5):** input and live preview are side by
  side on desktop (≥ lg); below that an Input ⟷ Preview toggle switches
  panes on mobile. The Notation source ⟷ Details tabs live in the input
  pane, so metadata can be edited with the preview in view.
- **Syntax errors moved to the input:** new
  `src/lib/components/notation/SourceEditor.svelte` draws red wavy
  underlines under invalid tokens inside the textarea (mirror-backdrop
  technique) and lists each error below it — clicking an error selects the
  offending token. `BeatCell` now renders invalid tokens muted (dotted
  underline + tooltip), no longer alarmed — the preview shows what it can,
  the input owns the errors.
- **Error messages teach the notation:** `src/lib/notation/diagnose.ts`
  turns "Unparseable token" into what-to-type-instead hints (accidental
  after the digit, octave mark before it, letter note names, degree 8/9,
  legacy Unicode, wrong mark order, …). The parser now records
  line/col/length for invalid tokens (`ParseWarning.col/length/token`,
  `Beat.col`). 206 vitest green, svelte-check clean.
- **Round 2 (same session):** lowercase `x` is valid posted input (parser
  accepts `[xX]+`; normalize uppercases on blur; the renderer always draws
  X). Glyph toolbar grouped semantically — notes (`# b ' ,`), rhythm
  (`- . / 0 |`), holds (`~ x _`) — with per-glyph tooltips. Tag detail
  page: text buttons replaced by an icon rail beside the notation
  (wrapped/scroll toggle, edit, share-image, share-link, delete), and
  "Back to Library" replaced by a bottom "Search library…" bar that lands
  on `/?q=…` (the library page now reads `?q=`). `.claude/launch.json`
  gained a `dev-alt` config on port 5180 (5173 is often taken by the main
  checkout's dev server).
- **Round 3 (same session):** tag-page rail regrouped — sharing on top,
  then a bordered view-settings cluster: wrapped/scroll, three notation
  sizes (A buttons; `settings.fontScale` 0.85/1/1.15), and a `#`
  "sharps only" toggle (`settings.sharpsOnly`, persisted). Sharps-only is
  **display-only**: `flatAsSharp()` in `src/lib/notation/transform.ts`
  maps b5→#4 (b1→#7 an octave down) at render time in NotationRenderer;
  stored text never changes. Edit/Delete moved out of the rail to below
  Tag Information. The Settings page is gone (nav entry, route, sw shell
  — cache bumped to v3); view settings live where they're used. Measures
  no longer alternate backgrounds — uniform block + gap marks the bar.
- **Round 4 (same session):** merged `fable-rebuild` (Base16 Default Dark
  palette, octave-direction colors, Quattro ss02) and adopted the semantic
  Tailwind tokens across every component (`paper-*`/`ink*`/`accent-*`/
  status names — the main checkout's in-progress rename pass, ported here
  and applied to the new screens too). Fixed two strays the palette swap
  exposed: the lyric-input focus color (`--amber` no longer exists →
  `--lyric`) and share-as-image's hardcoded `#2e3440` background (now
  read live from `--paper-0`). The rename pass was meanwhile committed
  upstream as `4fb188e`; the merge below reconciles the two copies.

## Where we left off (session of 2026-06-11, brand pass)

- Branch `fable-rebuild`; latest is the brand-consistency commit on top of
  `1a70b1b` (Base16 Default Dark palette + octave-direction colors +
  Quattro ss02). **Not yet merged to `main`.**
- The theme pass is **done and committed**: Base16 Default Dark under
  role-named Tailwind tokens (`paper-*`/`ink*`/`accent-*`/status — swap
  hexes in tailwind.config.js + app.css only, components reference roles),
  iA Writer Quattro as the only typeface, JD box layout. Logo is the
  user-designed "v1" hollow sharp on the octave-gradient squircle
  (static/numtag-logo.svg, stroke 10); favicon.png is its filled 32px
  export. Header wordmark: text-2xl ink-bright, tracking -0.045em.
- svelte-check clean and production build passing after the token rename;
  `npm test && npm run build` re-run at commit time.
- The **review screen lyric editor** is recent (`d5edb0e`): source textarea =
  voice lines only; lyrics are per-beat inputs in the preview (Tab =
  hyphenate + advance, Space = next word). Helpers in
  `src/lib/notation/lyrics.ts`; renderer edit mode in `NotationRenderer`.
- Next candidates: merge to `main`; then the M5 items below (deploy
  `services/`, History screen). A `/dev/notation` torture-test route exists
  for renderer work.

## Done

- **M1 — Core read app.** Library (search/filter over catalog + your local
  tags), Tag detail with both layout modes + Wrapped|Scroll toggle (§8),
  notation guide rewritten for canonical ASCII, dark theme, PWA (manifest,
  icons, offline service worker). The renderer draws octave dots,
  subdivision ticks, and tie arcs via CSS from semantic tokens — no font
  combining marks (§9).
- **M2 — Manual authoring.** Import → "Write it yourself" opens the shared
  Review & edit surface (§6.5/§6.6): live preview, glyph toolbar,
  normalize-on-paste, validation that warns but never blocks, private
  IndexedDB library (§4.3).
- **M3 — MusicXML import.** `.xml`/`.musicxml`/`.mxl` → ScoreModel →
  encoder (§6.4) → review. Deterministic, offline, golden-tested.
- **M4 — MIDI import** (offline: track/polyphonic voice assignment, key
  inference + diatonic spelling, "set the key in review" warnings) **and
  the image path UI** (photo/GIF/PDF → OMR service → MusicXML → same
  pipeline, §6.3) with §7.1 states (cold-start patience, keep-the-file
  retry, disabled-when-offline).
- **Catalog data** migrated to canonical ASCII (§3); the 5 hand-transcribed
  tags are the golden test set (§13). ~180 unit tests across parser,
  normalizer, encoder, transforms, library, golden round-trips.
- **Backend scaffolds** (`services/`): FastAPI app with `POST /omr` (homr)
  and the Git-backed catalog endpoints (bot commits with editor name,
  optimistic concurrency, history, revert, barbershoptags proxy; §6.8).
  Deployed on Cloudflare Containers (`api.numtags.app`) — catalog routes
  answer 503 until the bot token is configured (see Remaining).

- **M5 — Collaborative catalog surfaces.** History screen (versions, preview,
  diff, revert), `/changes` recent-changes feed, CC0 first-publish gate as a
  modal; service `?ref=` + `/recent` endpoints. See the 2026-07-30 session
  notes above.

## Remaining (operations and evaluation)

- **Configure the catalog bot** (user action): fine-grained PAT + `wrangler
  secret put GITHUB_TOKEN` + `GITHUB_REPO` var — until then every
  `/catalog/*` route on api.numtags.app answers 503 and the UI stays in its
  degraded no-service states. Then push `main` so CI deploys the new
  endpoints.
- A "report" button (§6.8's last cheap defense) — trivially a mailto/issue
  link once there's a place to point it at.
- Evaluate homr accuracy on real barbershoptags GIFs; confirm homr +
  weights licensing (§14) — `POST /omr` stays a clean 503 until cleared.
- Learning-track MP3s remain a non-goal; **notation playback is now in**
  (§6.9 — see the playback session notes above).
