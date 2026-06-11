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

## Where we left off (session of 2026-06-10/11)

- Branch `fable-rebuild`, 14 commits ahead of the `9edb17e` baseline; latest
  is `d5edb0e` (beat-anchored lyric editor). **Not yet merged to `main`.**
- 193 vitest green, svelte-check clean, production build passing at the last
  commit. Run `npm test && npm run build` after finishing the theme pass.
- **Uncommitted in the working tree (in-progress theme iteration, second
  round):** `app.css`, `app.html`, `tailwind.config.js`, `BeatCell.svelte`,
  `TagCard.svelte`, `OriginBadge.svelte`, `+layout.svelte`, `+page.svelte`,
  `manifest.json`, `static/fonts/` changes (CutiveMono-Regular.woff2 deleted
  — if the notation font changes, update the `@font-face` + the preload in
  `app.html`, which currently points at CutiveMono).
- The **review screen lyric editor** is new (`d5edb0e`): source textarea =
  voice lines only; lyrics are per-beat inputs in the preview (Tab =
  hyphenate + advance, Space = next word). Helpers in
  `src/lib/notation/lyrics.ts`; renderer edit mode in `NotationRenderer`.
- Next candidates: finish/commit the theme; merge to `main`; then the M5
  items below (deploy `services/`, History screen). A `/dev/notation`
  torture-test route exists for renderer work.

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
