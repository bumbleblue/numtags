# numtags

Barbershop tags (short 4-voice a cappella snippets) in a custom numeric notation. Installable PWA, mobile-first, offline-capable. **FABLE_SPEC.md is the source of truth** — when this file and the spec disagree, the spec wins; read the relevant section before changing notation/import/catalog behavior. **PROGRESS.md tracks build status and where the last session left off** — read it at the start of a session.

## Commands

- `npm run dev` — generate tags JSON + dev server
- `npm run build` — generate + production build (Cloudflare adapter)
- `npm run test` — vitest unit tests (parser, normalizer, encoder, golden round-trips)
- `npm run check` — svelte-check
- `npm run generate-tags` — compile `data/tags/*.md` → `src/lib/generated-tags.ts`

## Architecture (spec §5)

Everything except OMR is client-side and offline. SvelteKit 2 + **Svelte 5 (runes)** + Tailwind + Cloudflare adapter. Theme: warm "field recordings" dark palette — the `nord-*` Tailwind slots are remapped to it (see tailwind.config.js), and `app.css` exposes it as CSS vars (`--paper-*`, `--ink*`, `--brass`, `--rust`) for the notation components. Page background `#1a1714` (also the PWA theme_color).

- `src/lib/notation/` — the canonical notation core:
  - `types.ts` — semantic `Beat` token model (spec §4.4). Octave/subdivision are **integers, not glyphs**.
  - `normalize.ts` — legacy Unicode (`5̣` `–` `⁀` `♭`) → canonical ASCII. Leniency/migration only.
  - `parse.ts` — canonical ASCII body → staffs/measures/`Beat` tokens + beat-aligned lyrics.
- `src/lib/score/` — import pipeline:
  - `types.ts` — `ScoreModel` (spec §4.2), the convergence point of all import paths.
  - `musicxml.ts`, `midi.ts` — file → `ScoreModel` (deterministic, offline).
  - `encode.ts` — `ScoreModel` → ASCII notation body (spec §6.4). Pure function, the testable core.
- `src/lib/library/` — IndexedDB local library (private imports/drafts, id namespace ≥ 1_000_000).
- `src/lib/components/` — UI. `NotationRenderer` draws octave dots + subdivision marks **via CSS from semantic tokens** — never font combining marks.
- `data/tags/*.md` — the catalog (YAML frontmatter + ASCII notation body). The 5 hand-transcribed tags are the **golden test set**: any encoder/parser change that alters them must be deliberate.
- `services/` — backend scaffolds (homr OMR + catalog Git bot). Not deployed; run locally/Docker.

## Notation canon (spec §3 — the short version)

Canonical storage is **ASCII shorthand**: `#2` sharp, `b3` flat, `5'`/`5,` octave up/down (stacking), `3/` eighth `3//` sixteenth, `3.` dotted, `~4` tie, `-` hold (the ONLY hold token), `0` rest, `X` posted, `|` barline, `_` held lyric beat. Voice order is always Tenor, Lead, Baritone, Bass; lyric line below. Glyphs (`♯ ♭ ⁀`, octave dots) are **presentation only**, drawn by the renderer.

Rhythm is a deliberately crude beat grid (§3.2) — cells need not sum to the time signature. Don't "fix" that.

## Conventions

- Tags are CC0; code is MIT. Keep source links to barbershoptags.com.
- Never auto-save conversion output — every import lands in the review screen (§6.1).
- Never lose work: persist drafts locally before any network call (§7.1).
- New Svelte components use runes (`$state`, `$derived`, `$props`); ported legacy components may keep Svelte 4 syntax until touched.
