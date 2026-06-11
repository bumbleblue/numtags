# numtags — build status

Tracks the Fable rebuild against [FABLE_SPEC.md](FABLE_SPEC.md) §12 milestones.
Last updated: 2026-06-11 (branch `fable-rebuild` + playback worktree branch).

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
  Tested offline (pytest), **not deployed**.

## Remaining (M5 and deployment)

- Deploy the `services/` backend (scale-to-zero host + GitHub bot token),
  set `PUBLIC_SERVICE_URL` — this switches on image import, barbershoptags
  autofill, and Publish/Update catalog (the UI already degrades gracefully
  without it).
- History screen (per-tag versions + revert, recent-changes feed) — §6.8;
  needs the live service.
- First-contribution CC0 affirmation as a real gate (currently static text).
- Evaluate homr accuracy on real barbershoptags GIFs; confirm homr +
  weights licensing (§14).
- Learning-track MP3s remain a non-goal; **notation playback is now in**
  (§6.9 — see the playback session notes above).
