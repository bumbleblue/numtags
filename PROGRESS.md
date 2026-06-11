# numtags — build status

Tracks the Fable rebuild against [FABLE_SPEC.md](FABLE_SPEC.md) §12 milestones.
Last updated: 2026-06-11 (branch `fable-rebuild`).

## Where we left off (session of 2026-06-11)

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
- Audio playback / learning tracks remain non-goals for v1 (§1).
