# numtags — Fable Build Spec

A spec for rebuilding **numtags** fresh with Claude Fable. numtags displays barbershop *tags* (short, harmonically rich 4-voice a cappella snippets) in a custom **numeric notation**, and — the headline new feature — **imports an image (photo or GIF), MIDI, or MusicXML of a tag and converts it into that numeric notation**.

This document is the source of truth for the rebuild. It assumes no prior knowledge of the old codebase, but Section 11 lists assets worth carrying over verbatim.

---

## 1. Goals

1. **Browse** the existing catalog of hand-transcribed tags — search, filter, read on a phone.
2. **Convert** a tag from an image (photo/scan/GIF of sheet music), a MIDI file, or a MusicXML file into numeric notation. *This is the biggest feature.*
3. **Read well on mobile** — solve the long-standing question of how a 4-voice, many-measure tag lays out on a narrow screen.
4. **Own your tags** — imported tags save to a private on-device library, with an optional path to publish them to the public catalog.
5. **Collaborate** — edit *any* catalog tag in-app (the §6.6 surface). Every change is Git-tracked and one-tap **revertable**, so the catalog improves wiki-style without fear.

### Non-goals (for v1)
- User accounts / login, and personal cross-device sync. *(Catalog editing is name-only — no auth; the shared catalog is Git-backed, but your **private** library stays local-only.)*
- Audio playback (learning-track MP3, MIDI/notation playback). *MIDI as an **import source** is in scope — see §6.2; this non-goal is only about playing audio.*
- Authoring original music (all tags are CC0 translations of barbershoptags.com sources).

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| App target | **Installable PWA**, mobile-first, offline-capable |
| Import inputs | **MusicXML** + **MIDI** (deterministic, offline) **+ image/GIF/PDF via OMR (homr → MusicXML)**. No paid AI vision in v1 (§14). |
| Manual authoring | **First-class.** Type a tag in **ASCII shorthand**, which **is** the canonical stored text (what you type is what's stored). Shares the review/edit surface with imports (§6.5–§6.6). |
| Notation storage | Octave & subdivision are **semantic data drawn by the renderer via CSS**, not stored font combining marks; canonical body = ASCII shorthand — so numtags has **no font combining-mark dependency** (§3, §9). |
| Mobile layout | **Both** wrapped-systems and continuous-scroll, with a **user toggle** (default: wrapped) |
| Tag storage | **Local-first** on-device library (private drafts/imports) + a **Git-backed public catalog** anyone can edit. |
| Catalog editing | **Collaborative & wiki-style.** Anyone edits any catalog tag via the §6.6 surface; a **backend bot commits** to the GitHub repo with the editor's name; edits go **live immediately**, with full history + one-tap **revert** as the safety net (§4.3, §6.8). |
| Conversion UX | **AI/parse drafts → human reviews & corrects → saves.** Never silent auto-save. |

---

## 3. The numeric notation system (canonical reference)

The encoder's output and the renderer's input. Movable-Do: numbers are **scale degrees relative to the tonic**, so the notation is key-independent.

**Canonical storage is ASCII shorthand** (`#`/`b`, `'`/`,`, `/`, `~`, `.`). Octave dots and subdivision are **semantic data the renderer draws via CSS** — the notation never depends on font combining-mark behavior; glyphs like `♯ ♭ ⁀` and the dots are presentation only (§9).

### 3.1 Pitch
- **Degree:** `1`–`7` (1 = Do/root … 7 = Ti).
- **Accidental:** `#` (sharp) / `b` (flat) **immediately before** the digit in canonical text — `#2`, `b3` — shown as `♯2`/`♭3`. No natural sign: every note is spelled explicitly every time (three sharp-twos are `#2 #2 #2`, not `#2 2 2`).
  - Enharmonic choice prefers continuity with the previous note, else whatever best explains the note against the chord/key. (`#2` and `b3` are the same pitch.)
- **Octave:** a `'` (up) or `,` (down) suffix per octave, **relative to the key, not the previous note**; stored as a signed integer and **drawn as dots** above/below the digit by the renderer (CSS), not as combining marks.
  - `5'` = one octave up, `5''` = two; `5,` = one down, `5,,` = two.
  - Home octave = the window starting at the tonic. In key of C4, bare `5` = G4, `5,` = G3, `5'` = G5.

### 3.2 Rhythm (deliberately crude)
The notation is a **beat grid, not an engraving**: each space-separated token is one cell, read as roughly one beat (a quarter note). It is intentionally loose — a memory aid for singers who already half-know the tune — so cells need not sum exactly to the time signature. Get the pitches and contour right; precise rhythm is the reader's job.

| Canonical token | Renders as | Meaning |
|---|---|---|
| bare digit (`3`) | `3` | a note onset — one beat |
| `-` | `-` | **hold**: sustain the previous note one more beat. Repeat for longer: `3 - -` = three beats. **The only hold token.** |
| `3/` | digit + subdivision mark | **halved** note (eighth); `//` = sixteenth. Two fast notes are two cells (`6/ 5/`), never packed into one. |
| `3.` | `3·` | **dotted** — lengthen by half |
| `0` | `0` | a beat of rest |
| `~4` | `⁀4` (tie arc) | **tie** — the cell continues the previous note's pitch and lyric syllable across a beat/barline without re-articulating |
| `X` (one or more) | `X` | **posted** — hold until the director cuts (the final chord); replaces beat-counting |

**One hold token.** Earlier drafts allowed `-`/`–`/`—` interchangeably; the visually-confusable **en-dash `–` is dropped**. Canonical is a single `-`; legacy tags using `–`/`—` normalize to `-` on import. *(This supersedes the old guide's "`-` = quarter, `–` = half" wording — update the guide.)*

### 3.3 Structure
- `|` = barline (measure boundary).
- **Voice order, top to bottom: Tenor, Lead, Baritone, Bass.** Always. *(v1 assumes exactly these 4 voices; the `parts` field/filter is forward-compat.)*
- **Lyrics** go on a line below the four voices.
  - In the lyric line: a single space = advance to the next beat; `_` = a held/rest beat (no syllable); a hyphen = a syllable break across consecutive beats. (A double space is still honored as a held beat for legacy tags, but `_` is canonical — it's unambiguous and survives editors/formatters that collapse runs of spaces.)
- A **staff** = 4 voice lines + its lyric line(s). Staffs are separated by a blank line. A lyric-only block immediately after a staff attaches to it (allows stacked alternate-lyric rows).
- A **pickup** = beats before the first `|`; they right-align into the beat(s) before measure 1.

### 3.4 Worked example (key-independent, then realized in C and F)
```
Tenor:     3 - 3 - | 4 ~4 3 - |
Lead:      1 - 1 - | 1 ~7, 1 - |
Baritone:  5, - b7, - | 6, ~5, 5, - |
Bass:      1, - 5, - | 4, ~2, 1, - |
           "My town, my town."
```
In C: `Tenor E - E - | F ~F E - |`. In F: `Tenor A - A - | bB ~bB A- |`.

---

## 4. Data model

### 4.1 Tag (canonical, the exchange + storage format)
Keep the existing **Markdown + YAML-frontmatter** format. It's human-editable, diffable, ideal for catalog submission (PRs), and already matches the public catalog.

```yaml
---
title: "When it's sleepy time"
tag_id: 7                 # catalog id; local imports get a local id namespace
arranger: "unknown"
difficulty: "Easy"        # Easy | Medium | Hard
source_url: "https://www.barbershoptags.com/tag-7-..."
date_added: "2008-12-08"
parts: 4
lyrics: "When it's sleepy time down south"
comments: "Short version"
original_key: "C"
origin: "catalog"          # catalog | imported-musicxml | imported-midi | imported-image | authored
---

1  2  |  3  3  3 ~2  | b3 ~2  |  3  -  |
1  2  |  1  1  1  -  |  1  -  |  1  -  |
1  7, |  6, 6, 6, -  | b6, ~5, |  5,  -  |
1  7, |  6, 5, #4, - |  4,  -  |  1,  -  |
When it's
        slee-py time   down -   south.
```

Add one field, `origin`. The body is canonical **ASCII shorthand** (§3); octave/subdivision render as CSS-drawn marks. Everything else matches the existing format.

### 4.2 ScoreModel (intermediate — the convergence point)
The three import paths (MusicXML, MIDI, OMR-from-image) all produce this normalized structure; the single **encoder** (§6.4) turns it into the numeric body. Manual authoring (§6.6) skips it, producing a Tag directly. This type is the spine of the feature - keep it explicit and well-typed.

```ts
interface ScoreModel {
  tonicPitchClass: number;   // 0=C … 11=B; the movable-Do reference
  mode: 'major' | 'minor';
  keyName: string;           // e.g. "C", "F", "Bb" — for original_key
  timeSignature: { beats: number; beatType: number }; // e.g. 4/4
  voices: Voice[];           // length 4, order: Tenor, Lead, Baritone, Bass
  confidence?: number;       // image path only: 0–1, drives review urgency
}
interface Voice {
  role: 'tenor' | 'lead' | 'baritone' | 'bass';
  measures: NoteEvent[][];   // [measureIndex][eventIndex]
}
interface NoteEvent {
  kind: 'note' | 'rest';
  step?: 'A'|'B'|'C'|'D'|'E'|'F'|'G'; // spelled letter — preserves ♯2 vs ♭3 intent
  alter?: -2|-1|0|1|2;                 // semitone alteration as written
  octave?: number;                     // scientific octave
  durationBeats: number;               // in quarter-beats
  tiedFromPrev?: boolean;
  fermata?: boolean;                   // → candidate for posted (X)
  lyric?: { text: string; syllabic: 'single'|'begin'|'middle'|'end' };
}
```

### 4.3 Storage
- **Bundled snapshot:** the catalog's markdown compiled to JSON at build time (a point-in-time snapshot of the Git catalog), shipped for instant **offline first-load**; the app syncs the latest when online.
- **Local library:** user imports persist in **IndexedDB** as the same Tag objects (`origin: imported-*`, local id namespace e.g. `≥ 1_000_000`). Library is the union of bundled catalog + local imports.
- **Public catalog (Git-backed):** the repo's `data/tags/*.md` is the source of truth and full history. Creating or editing a tag writes back through the **catalog service** (§5, §6.8) — a backend bot that commits with the editor's display name. The local library (private) stays regardless; **Publish** promotes a local draft into the catalog (a commit).


### 4.4 Parsed notation model (renderer input)
The parser reads a tag's canonical ASCII body into **semantic tokens** — octave and subdivision are integers, not embedded glyphs — so the renderer draws marks via CSS and never depends on font combining-mark behavior.

```ts
interface Beat {
  kind: 'note' | 'hold' | 'rest' | 'posted' | 'empty';
  degree?: 1|2|3|4|5|6|7;
  accidental?: 'sharp' | 'flat';   // from `#` / `b`
  octave?: number;                 // signed offset from home octave (`'` up / `,` down)
  subdivision?: number;            // 0=quarter, 1=eighth, 2=sixteenth (`/`)
  dotted?: boolean;                // `.`
  tiedFromPrev?: boolean;          // `~`
}
// A staff = Beat[][] (per voice) + beat-aligned lyric syllables, as today.
```

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PWA (mobile-first, installable, offline via SW)         │
│                                                          │
│  Screens ── Library · Tag detail · Import · Review ·     │
│             Notation guide · About · Settings            │
│                                                          │
│  Core (all client-side, offline):                        │
│   • parser: ASCII body → semantic Beat tokens (§4.4)     │
│   • NotationRenderer (wrapped | continuous):             │
│       CSS-drawn octave dots + subdivision, no glyphs     │
│   • legacy normalizer: Unicode/variant → canonical ASCII │
│   • MusicXML / MIDI → ScoreModel   (deterministic)       │
│   • ScoreModel → numeric encoder   (deterministic)       │
│   • IndexedDB local library                              │
└───────────────┬─────────────────────────────────────────┘
                │  image bytes (image path)        │  edits/new + catalog sync
                ▼                                  ▼
        ┌──────────────────────────┐   ┌───────────────────────────────────┐
        │  OMR service (scale-0)    │   │  Catalog service (backend bot)    │
        │  image/GIF/PDF → MusicXML │   │  edit/new → commit to GitHub repo │
        │  homr (Aud./oemer = fb)   │   │  history · revert · CORS proxy    │
        └──────────────────────────┘   └───────────────────────────────────┘
```

- **Everything except OMR runs client-side and offline** — MusicXML/MIDI parsing, encoding, rendering, and the local library need no network.
- **The OMR service** runs homr's fixed weights (compute cost, not per-token) on a **scale-to-zero container** (Cloud Run / Fly / Modal) — too heavy for the browser/Worker, near-free at hobby volume. It returns MusicXML, rejoining the offline path. No paid AI vision in v1; future paid-tier option in §14.
- **The catalog service** (same backend) holds the **GitHub bot token** and commits edits/new tags to the repo with the editor's name — wiki-style, straight to the catalog branch — and serves history/revert plus the barbershoptags CORS proxy (§6.7). Reads work offline from the snapshot; **edits require connectivity** (a commit). Details: §6.8.

---

## 6. The conversion pipeline (headline feature)

### 6.1 Flow
```
Import screen — tiered, cheapest-and-best first:
  ├─ "Write it yourself" → blank template → ASCII normalizer  → draft Tag    (no import, offline — §6.6)
  ├─ "MusicXML file" → file picker  → parse                   → ScoreModel   (perfect, free, offline)
  ├─ "MIDI file"     → file picker  → parse (enharmonic guess) → ScoreModel   (reliable pitch+rhythm+voices, offline)
  └─ "Image (photo/GIF/PDF)" → homr OMR → MusicXML → parse     → ScoreModel   (best-effort, compute-only)

  Source reality: barbershoptags.com has NO MusicXML. It serves GIF sheet music
  (→ image path) and sometimes MIDI (→ MIDI path). The "MusicXML file" path is for
  user-supplied exports (e.g. MuseScore). Catalog API: §6.7.
                                                      │
                              (import paths only)     ▼
                              ScoreModel → numeric encoder → draft Tag
                                                      │
                                                      ▼
                         REVIEW & EDIT screen (always — never auto-save)
                              live: numeric render + editable source + metadata
                                                      │
                                       ┌──────────────┴───────────────┐
                                       ▼                              ▼
                              Save to local library          Submit to catalog (optional)
```

### 6.2 MusicXML / MIDI → ScoreModel (deterministic)
- Parse parts/voices; map the 4 staves/parts to Tenor/Lead/Baritone/Bass (barbershop convention; if labeled, honor labels — else top-to-bottom).
- Read `<key><fifths>`/`<mode>` → `tonicPitchClass`, `keyName`, `mode`.
- Read `<time>` → `timeSignature`.
- Each `<note>`: `step`, `alter`, `octave`, `duration`, `<tie>`, `<fermata>`, `<lyric>` (`text` + `syllabic`) → `NoteEvent`. Rests → `kind:'rest'`.
- MusicXML **preserves enharmonic spelling** (step + alter), so `D♯` vs `E♭` survives into the ScoreModel and the encoder can emit `♯2` vs `♭3` faithfully.

**MIDI → ScoreModel** (barbershoptags.com ships MIDI, never MusicXML):
- **Tracks → voices, *if* the file has 4 separate tracks/channels** — then each part is its own track and OMR's voice-assignment problem disappears. **But** a single polyphonic track (4-note chords) does not: you must split by pitch order, with the same voice-crossing risk as OMR, then fix in review. Map tracks to Tenor/Lead/Baritone/Bass by name, order, or pitch range.
- Note-on/off → pitch + `durationBeats`; **ticks / division (PPQ)** → note value (tempo/BPM is irrelevant to notation); overlaps/sustains → ties.
- **Enharmonic spelling is absent** (MIDI 61 = C♯ *or* D♭). Derive the key from the file's key-signature meta event if present, else infer from pitch content / let the user set it in review; then spell each note diatonically against that key (the review step fixes the rest). This is the one place MIDI is lossier than MusicXML.
- **No lyrics** in most MIDI files → the lyric line starts empty for the author to fill (the §6.5 review surface handles this).

### 6.3 Image / GIF / PDF → MusicXML via homr (best-effort, no tokens)
Use **homr** — an open-source OMR engine — to turn an image into MusicXML, then reuse §6.2 unchanged. homr runs as fixed self-hosted weights (compute, not tokens).

**Engine: homr (locked for v1).** Transformer-based (Polyphonic-TrOMR), purpose-built for **camera photos** (it dewarps perspective per staff) and fine on clean rasters (the catalog's GIFs). Python via `uvx`/PyPI. Confirm its + its weights' license before shipping (§14).
- *Inputs:* photos, catalog **GIF** sheet music, and PDFs (rasterize pages to images first). Low-res GIFs hurt accuracy — upscale/clean first.
- *Fallback:* if homr is weak on clean print, **Audiveris** (Java) or **oemer** (MIT) drop in behind the same service interface — but ship one, don't build a router.
- *Zero-hosting for contributions:* run the homr CLI locally and commit the resulting tag; only the in-app "snap a photo" UX needs the hosted service.

**Barbershop caveat:** 4 voices on 2 staves split by stem direction — OMR gets the notes but **voice assignment** (tenor vs lead) is often wrong. The §6.5 review handles reassignment; expect it. All image output is a draft — surface a "check carefully" banner in review.

### 6.4 ScoreModel → numeric encoder (deterministic, the testable core)
One pure function. Mapping rules:

| Aspect | Rule |
|---|---|
| **Degree** | letter distance from tonic letter → `1`–`7` |
| **Accidental** | `note.alter` − (key's diatonic alter for that letter): `0`→none, `+1`→`#`, `-1`→`b` (emitted as ASCII; preserves written spelling) |
| **Octave** | `w = floor((noteMIDI − tonicMIDI@oct4) / 12)` → emit `w` × `'` if w>0, `abs(w)` × `,` if w<0, nothing if 0 (the renderer draws these as dots). Use the **written** (letter-based) octave, not chromatic MIDI, so `B#`/`Cb` land right. The oct-4 tonic home is a convention — validate against the golden tags (§13). |
| **Beat unit** | one cell = one beat (quarter by default); use `timeSignature` to convert durations to beats. Cells need not fill a measure - loose by design (§3.2). |
| **Sustain** | a note lasting N beats → the digit, then (N-1) × `-` (the only hold token; §3.2) |
| **Sub-beat** | eighth → `digit/`; sixteenth → `digit//`. Each fast note keeps **its own cell** — never packed |
| **Dotted** | `.` after the digit |
| **Rest** | `0` |
| **Tie** | `tiedFromPrev` → `~` prefix on the continued note |
| **Posted** | trailing `fermata` / unusually long final note → `X` (heuristic) |
| **Pickup** | a partial leading measure (anacrusis) → emit its beats **before the first** `|`, right-aligned (the parser leads them into measure 1) |
| **Lyrics** | `syllabic` begin/middle → join the next syllable with `-`; single/end → a space; held or rest beats under a word → `_` (§3.3) |

**Known-fuzzy areas — always land in review, never trust blindly:**
1. **Rhythm** — the numeric system is intentionally crude; complex rhythms degrade. Lossiest mapping.
2. **Octave reference** — the home-octave choice can put a whole voice an octave off. Review must offer a one-tap "shift voice ±octave."
3. **Posted notes** — fermata heuristic is a guess.
4. **Enharmonic/key** — review must allow changing the tonic/`original_key` and re-encoding live.

### 6.5 Review & edit screen
- Split or tabbed: **live numeric render** (the real NotationRenderer) ⟷ **editable plain-text source** (the canonical ASCII body, §3) ⟷ **metadata form** (title, arranger, key, difficulty, source_url, lyrics).
- Controls: change key/tonic (re-encodes), shift a voice ±octave, toggle a note posted, fix lyric hyphenation.
- For image imports: confidence banner + "compare to original" (show the source image alongside).
- Actions: **Save to library** (private) · **Publish / Update catalog** (commit via the catalog service, §6.8). The same screen, reached via **Edit** on a catalog tag, edits an existing entry.

### 6.6 Manual authoring (type a tag from scratch)
Not every tag arrives as a file or photo — many are simple enough to type, and contributors may have neither MusicXML nor a clean scan. Manual authoring is a **first-class entry point**.

**It is not a separate screen.** "Write it yourself" opens the **same §6.5 review/edit surface** on a blank 4-voice template (Tenor/Lead/Baritone/Bass + lyric line). Import paths produce a draft via the encoder; manual authoring produces the same draft by typing. Everything downstream is shared.

**Canonical text is ASCII — there is nothing to "convert."** Because octave/subdivision are stored as data and drawn by the renderer (§3), the stored body *is* plain ASCII: what you type is what's stored. No combining diacritics, no un-typeable glyphs.

| Canonical (ASCII) | Renders as | Meaning |
|---|---|---|
| `#2` / `b3` | `♯2` / `♭3` | sharp / flat (prefix) |
| `5'` / `5''` | dot(s) above the digit | octave up (one per `'`) |
| `5,` / `5,,` | dot(s) below the digit | octave down (one per `,`) |
| `3/` / `3//` | subdivision mark under the digit | eighth / sixteenth |
| `3.` | `3·` | dotted |
| `~4` | tie arc | tie (prefix on continued note) |
| `\|` `0` `X` `-` `_` | as typed | barline · rest · posted · hold · held lyric beat |

**Design rules:**
- **The parser reads ASCII directly into semantic tokens (§4.4); the renderer draws.** There is no Unicode form to normalize *to*. A small `normalize()` exists only for **leniency/migration** — accepting legacy Unicode tags (`5̣`→`5,`, `–`→`-`, `⁀`→`~`) and tidy input variants — unit-tested independently.
- **A light glyph toolbar** layers on for discoverability (tap to insert `♯ ♭`, octave ±, subdivision, tie, posted, rest, barline) — but plain typing already yields canonical text.
- **Live preview is the alignment teacher.** The renderer re-renders every keystroke; authors watch the beat-grid snap voices into alignment and learn whitespace is cosmetic (only `|` boundaries and lyric `_`/space/`-` carry meaning).
- **Validate, don't block:** flag unparseable tokens inline; warn if a staff isn't 4 voices or beat-counts disagree — but always allow save.

### 6.7 barbershoptags.com catalog API (optional, metadata autofill)
The site offers an official API (`https://www.barbershoptags.com/dbpage.php?pg=api`): an HTTP GET returns **XML metadata** for a tag plus URLs to its media. It does **not** provide MusicXML — only GIF sheet music, sometimes MIDI, and per-part MP3 learning tracks. Use it only to **autofill metadata**, never as a notation source:
- During import, let the user paste a barbershoptags.com URL or tag id; fetch the API and prefill title, arranger, key, lyrics, source_url, difficulty — cutting manual typing in the review form.
- Then point the **image path** at the tag's GIF, or the **MIDI path** at its MIDI, for the actual notation.
- Respect the site's terms/attribution (tags are CC0 translations; keep the source link). Verify field names against the doc URL above. Browser fetch needs a CORS proxy — and the GIF/MIDI binaries are cross-origin too, so fetch them through the same proxy rather than hotlinking. Route it through the backend that fronts homr.

### 6.8 Collaborative catalog editing (Git-backed, wiki-style)
The public catalog is a shared, editable corpus — not a frozen snapshot. Anyone can improve any tag; Git history makes every change **revertable**, the safety net that makes open editing safe.

- **Edit surface = §6.5/§6.6.** "Edit" on a catalog Tag detail opens the same review/edit screen, preloaded with the tag. Fixing a wrong note, octave, lyric, or metadatum is the same act as authoring — one surface.
- **Backend bot commits.** The client can't hold a write token, so the **catalog service** (same scale-to-zero backend as homr) commits on the editor's behalf, putting their typed **display name** in the commit (`Edit tag 7: Sleepytime (by Casey)`). No GitHub account needed.
- **Live, wiki-style.** Edits land on the catalog branch and go live on next sync — no review gate. History *is* the moderation system: anyone can view a tag's versions and **revert** to an earlier one (itself a tracked commit).
- **Optimistic concurrency.** An edit carries the base file's blob SHA (GitHub's Contents API requires it). If someone committed first, the write is rejected and the app prompts "this tag changed — reload & re-apply." No silent clobber.
- **Offline = read-only.** Reads come from the cached snapshot; **editing needs connectivity** (a commit). Offline edit-queueing is a later nicety (§14).
- **Cheap abuse defenses** (the real net is revert): server-side rate-limiting, a **recent-changes feed**, a **report** button, size/parse sanity checks, and a **CC0 + faithful-translation affirmation** on first contribution.

---

## 7. Screens / information architecture

| Screen | Purpose |
|---|---|
| **Library (home)** | Search (id/title/lyrics/arranger) + filter (difficulty, arranger, parts) over catalog + local imports. A visible "Imported" section/badge. Prominent **Import** entry point. |
| **Tag detail** | Full numeric notation with the **layout toggle**; metadata; source link; share-as-image; **Edit** (opens §6.5/§6.6) and **History** (versions + revert). |
| **Import / new** | Choose **Write it yourself** (§6.6), **Image** (photo/GIF/PDF), **MIDI file**, or **MusicXML file**. Optional barbershoptags.com URL/id to autofill metadata (§6.7). |
| **Review & edit** | Section 6.5 — shared by all import paths, manual authoring, *and* editing catalog tags (§6.8). |
| **History / changes** | Per-tag version list (editor name + date; view/diff/**revert**) and a global **recent-changes** feed for the catalog (§6.8). |
| **Notation guide** | Port the existing guide (why/how/which-note/rhythm/layout/example/glossary). |
| **About** | What numtags is, attribution, CC0, FAQ. |
| **Settings** | Theme, **default layout mode** (wrapped/continuous), font size. |

### 7.1 Empty, loading & error states
Principles (apply everywhere):
- **Never lose work.** Imports and edits persist to the local library *before* any network call; any failure leaves the draft intact and recoverable.
- **Never blank-screen.** A partly-parseable tag renders the parts that parse, with inline markers on the rest — never an empty page or a hard crash.
- **Offline is a state, not an error.** Distinguish *expected* offline (gray out network actions, explain) from *unexpected* failure (explain + retry).
- **Empty states teach.** Point to the next action (Import / Write it yourself) instead of just saying "nothing here."
- **Optimistic where safe; confirm where destructive** (revert, discarding unsaved edits).

| Surface | State | Behavior |
|---|---|---|
| **Library** | first load | instant from the bundled snapshot (no spinner); latest syncs in the background with a quiet "updating…" hint |
| | sync fails / offline | keep showing the cached catalog + a quiet "offline — showing saved catalog" / "couldn't refresh" banner + retry; **not** an error page |
| | no search/filter matches | "No tags match" + **Clear filters** |
| | nothing imported yet | friendly nudge: "Nothing of your own yet — **Import** or **Write a tag**" |
| **Tag detail** | id not found (bad link / removed) | "This tag doesn't exist or was removed" + back to Library; if removed, link to its history |
| | body won't fully parse (bad edit) | render the voices that parse + inline error markers + a **view raw source** fallback; never blank |
| **Import (any)** | picker cancelled | no-op, stay put |
| | unsupported / corrupt file | "That's not a MusicXML/MIDI file" + accepted types + pick again |
| **MusicXML / MIDI** | partial parse | draft with the parsed parts; gaps flagged in review |
| | total parse failure | error + offer **Write it yourself** or another file |
| | MIDI has no key event | proceed with a default key + a prominent "set the key" prompt in review |
| | MIDI single polyphonic track | proceed via pitch-split + a voice-assignment warning (§6.2) |
| **Image / homr** | offline | image option disabled with "needs connection"; MusicXML/MIDI/manual still work |
| | cold start (scale-to-zero) | "warming up · reading the music…" with patience; generous timeout, don't bail early |
| | low-confidence / messy output | deliver as a **rough draft** + a strong "check carefully" banner; offer retry with a better photo or switch to manual |
| | service down / timeout | error, **keep the image**, offer retry or manual — never discard input |
| **Review & edit** | unparseable token while typing | inline marker, non-blocking |
| | validation warnings (≠4 voices, beat mismatch) | non-blocking warnings; save still allowed |
| | leaving with unsaved changes | confirm before discarding |
| **Catalog publish/edit (§6.8)** | offline | "You're offline — save a private copy now, publish later" (no commit) |
| | commit in flight | pending state; disable double-submit |
| | stale-SHA conflict | "This tag changed — reload & re-apply" (optimistic concurrency) |
| | rejected (rate-limit / sanity / profanity) | explain why; **keep the work locally** |
| | commit failed (network/backend) | keep the edit as a local draft + retry; no lost work |
| | revert | confirm → pending → success/failure toast |
| | first contribution | CC0 + faithful-translation affirmation gate (a modal, not an error) |
| **History view** | single version | "No edits yet — this is the original" |
| | fetch fails | "Couldn't load history" + retry |
| **Autofill (§6.7)** | not found / API or proxy down | skip silently, let them type metadata; small "couldn't autofill" note |
| **Global / PWA** | fully offline | shell + cached catalog + local library + MusicXML/MIDI/manual all work; network actions show consistent offline affordances |
| | new version available | subtle "Refresh to update" prompt |

---

## 8. Mobile notation layout (the part to get right)

A 4-voice tag with 8–14 measures on a ~380px screen. Ship **both** modes; expose a **toggle** on Tag detail and a default in Settings (persisted). Both modes consume the **same parsed model** — only wrapping differs, so the parser stays layout-agnostic and only the render component branches.

### 8.1 Wrapped staff systems (default)
Like printed choral music. Voice lines stay continuous across the measures that fit the viewport width, then break to a new "system" stacked below. Scrolls **down** only. *(Mockups show the rendered view — dots/ties are CSS-drawn.)*
```
System 1
 T  3 3 3⁀2 | ♭3⁀2 |
 L  1 1 1 -  | 1    |
 B  6̣ 6̣ 6̣ - | ♭6̣⁀5̣|
 Bs 6̣ 5̣ ♯4̣- | 4̣   |
    slee-py  time

System 2
 T  3 - |
 L  1 - |
 B  5̣ - |
 Bs 1̣ - |
    south
```
- Compute measures-per-system from viewport width and measure widths; greedy-fit, never split a measure across systems.
- Keep beat-column widths consistent **within** a system so voices align vertically.
- Generous vertical gap between systems; lyric row hangs under each system.

### 8.2 Continuous scroll
One unbroken 4-voice line; swipe left/right. Preserves a single staff but you can't see the whole tag at once.
```
┌────────────────────────┄┄→ swipe
 T  3 3 3⁀2 | ♭3⁀2 | 3 -
 L  1 1 1 -  | 1    | 1 -
 B  6̣ 6̣ 6̣ - | ♭6̣⁀5̣| 5̣ -
 Bs 6̣ 5̣ ♯4̣- | 4̣   | 1̣ -
    slee-py time   south
└────────────────────────┄┄→
```
- `overflow-x: auto`, momentum scrolling, the four voices + lyrics locked together as one block.
- Optional: a sticky left column of voice labels (T/L/B/Bs) while scrolling.

### 8.3 Toggle
- A clear control on Tag detail (segmented "Wrapped | Scroll"). Remembers the last choice; Settings sets the default.

---

## 9. Visual design
- **Notation marks are CSS-drawn, not font glyphs.** Octave dots (above/below) and the subdivision mark are positioned by the renderer from semantic tokens (§4.4), so numtags does **not** depend on a font's combining-mark behavior. Any clean monospace renders the digits; only ordinary characters (`♯ ♭ ⁀`, digits) need to exist in the font, and those are universal. *(This removes the old Everson-Mono / Firefox combining-mark fragility — and the licensing risk.)*
- **Disambiguate octave-down dots from the subdivision mark.** Both sit under the digit, so render them in clearly separate vertical bands and distinct shapes (e.g. round octave dots placed lower; a short straight subdivision tick hugging the digit). A digit that is *both* subdivided and octave-down must read cleanly, never as one smudge.
- Carry the **Nord dark palette** (afterglow-friendly). Octave color cues (brighter up, steel-blue down) are a nice-to-keep, secondary to the marks.
- Mobile-first spacing; tap targets ≥44px.

---

## 10. Tech recommendations
- **Keep the proven web stack** (SvelteKit + Tailwind, Cloudflare adapter) — Nord theme and catalog reuse as-is. The notation **parser and renderer get a token-model update** (ASCII → semantic tokens, CSS-drawn marks; §4.4, §11); the new work is the *import pipeline + layout modes + local library*.
- PWA: service worker for offline catalog + app shell; manifest for install.
- IndexedDB via a thin wrapper (e.g. `idb`).
- MusicXML parsing client-side (DOMParser is enough; `.mxl` is zipped MusicXML — unzip first).
- MIDI parsing client-side (e.g. `@tonejs/midi` or a small parser): tracks/channels → voices, note-on/off → pitch + duration. **No enharmonic spelling in MIDI**, so the encoder spells `♯`/`♭` from key context (§6.2). Fully offline, no service.
- Image path: a **self-hosted homr OMR service** on a scale-to-zero container, returning MusicXML (rasterize PDFs to images first). No per-image token cost; no paid AI vision in v1.

---

## 11. Reuse from the current repo (don't rebuild these)
| Asset | Location (old repo) | Note |
|---|---|---|
| Notation grammar + parser | `src/lib/notation-parser.ts` | Port the staff/measure/beat/voice/lyric distribution, but **change the token model**: parse the canonical **ASCII** body into semantic `Beat` tokens (octave & subdivision as integers; §4.4), not glyph strings with combining marks. |
| Notation render logic | `src/lib/components/TagNotation.svelte` | Reuse the grid model; **draw octave dots + subdivision via CSS** from semantic tokens (don't sniff combining marks), and **replace** the per-measure flex-wrap with the two layout modes in §8. |
| Tag data + format | `data/tags/*.md`, `src/lib/types.ts` | Keep the markdown+YAML format; add `origin`. |
| Build step | `scripts/generate-tags.js` | Compiles markdown → bundled JSON. |
| Notation guide content | `src/routes/notation/+page.svelte` | Port the prose/glossary. |
| Theme + font | `tailwind.config.js` (Nord), fonts | Keep Nord. Font is now **cosmetic** — marks are CSS-drawn (§9), so any libre monospace works and the Everson Mono licensing question is no longer blocking. |
| The 5 hand-transcribed tags | `data/tags/` | Double as the **golden test set** (§13). |

---

## 12. Milestones
1. **Core read app** — Library, Tag detail, both layout modes + toggle, notation guide, ported catalog. (Highest value, lowest risk.)
2. **Manual authoring** — the review/edit surface (§6.5) on a blank template + ASCII normalizer (§6.6) + local library. Independent of the import pipeline (no ScoreModel/encoder needed), so it ships cheaply right after M1 and stands up the review/edit + library plumbing that M3 reuses.
3. **MusicXML import** — deterministic ScoreModel + encoder, feeding the review/edit surface already built in M2. Fully offline, testable.
4. **MIDI + image import** — a MIDI parser (deterministic, offline, solves voice assignment) and the self-hosted **homr** OMR service (image/GIF/PDF → MusicXML), both feeding the M3 encoder/review unchanged. MIDI first (offline, more accurate), then homr.
5. **Collaborative catalog (Git-backed)** — the catalog service (backend bot commits), **Publish** + in-app **edit any tag**, history + revert, wiki-style live. Reuses the §6.5/§6.6 surface; reads stay offline, edits need network. (Biggest backend lift — last.)

Ship M1–M3 before M4: the review screen and encoder must be solid before the noisy image path leans on them. (M2 manual authoring is the cheapest way to harden the review/edit + library surface early.)

---

## 13. Testing
- **Golden round-trip:** the 5 existing tags are hand-verified ground truth. Build fixtures where possible (source MusicXML → encoder → compare to the known numeric body) and snapshot the encoder output. Any encoder change that alters a golden tag must be deliberate.
- **Renderer:** visual snapshots of both layout modes at phone/tablet widths; assert the **CSS-drawn octave dots and subdivision mark render distinctly** (the §9 disambiguation), with no dependency on font combining marks.
- **Parser:** unit-test ASCII tokens → semantic `Beat` (accidentals `#`/`b`, octave `'`/`,` stacking, subdivision `/`, dotted `.`, tie `~`, posted, pickups, rests, barlines, multi-staff, attached lyric-only blocks, the `_` held-lyric beat).
- **Encoder:** unit-test each mapping rule in §6.4, especially the fuzzy four.
- **Legacy normalizer (§6.6):** assert `normalize()` migrates the legacy Unicode goldens (`5̣`→`5,`, `–`→`-`, `⁀`→`~`, `♭`→`b`) to canonical ASCII, and that `parse()` of the result yields the expected `Beat` tokens.
- **States (§7.1):** partial-parse renders partially; offline disables network actions (not errors); a stale commit prompts reload-and-re-apply; a failed commit keeps a local draft (no lost work).

---

## 14. Open questions / future
- **Transpose-to-concert-pitch view** on Tag detail (movable-Do makes this almost free — pick a key, show letter names). Natural follow-on, not in v1.
- **Catalog abuse & integrity (wiki-style):** the safety net is Git history + one-tap revert. Add cheap defenses — server-side rate-limiting, a recent-changes feed, a 'report' button, size/parse sanity checks, and a **CC0 + faithful-translation affirmation** on first contribution (per CONTRIBUTING). Revisit opt-in moderation only if persistent vandalism appears.
- **Catalog service security:** the GitHub bot's write token lives only in the backend (never the client), scoped to the catalog repo. Decide the commit target (direct to `main` vs a `catalog` branch) and how `tag_id`s are assigned on Publish.
- **Edit conflicts & offline:** optimistic concurrency on the file blob SHA (Contents API requires it); stale writes prompt reload-and-re-apply. Offline edit-queueing is deferred — edits need network in v1.
- **Multi-octave dots (CSS):** stack 2+ octave dots vertically and keep them clearly distinct from the subdivision mark (§9) — now a styling task, not a font-glyph one.
- **homr hosting + license:** confirm homr's + its model weights' **license** before shipping. Choose the scale-to-zero host (Cloud Run / Fly / Modal). Evaluate accuracy early on real barbershoptags.com **GIFs** (low-res raster — the realistic input), not just pristine PDFs.
- **Notation font:** largely resolved by §9 (marks are CSS-drawn) — any libre monospace works and Everson Mono is optional/cosmetic. If you do ship Everson Mono, confirm its license.
- **barbershoptags.com formats (confirmed via web search; verify exact field names at the API doc):** no MusicXML anywhere; sheet music is **GIF**, **MIDI** exists for some tags, learning tracks are MP3. MIDI bypasses OMR (deterministic pitch/rhythm; enharmonics guessed from key). The catalog API returns XML metadata + media URLs — useful for autofill (§6.7), not for notation.
- **Future paid tier — AI vision import.** If self-hosted OMR proves too weak on messy photos, a hosted vision model (e.g. Claude) could be an **opt-in paid** path for hard cases — the user covers the token cost, output is the same `ScoreModel`/MusicXML, the pipeline is unchanged. Out of scope for v1; noted so the architecture keeps the door open.
