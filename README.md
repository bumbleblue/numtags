# numtags

Barbershop tags in numeric notation

## What is numtags?

numtags is a mobile-first web application designed specifically for barbershop singers to quickly find, learn, and share barbershop tags. Tags are short, harmonically rich pieces of music meant for spontaneous group singing. The app uses a custom numeric notation system that makes it easy to read, learn, and teach tags on any device — and it can **convert a tag from MusicXML, MIDI, or a photo/GIF of sheet music** into that notation.

[FABLE_SPEC.md](FABLE_SPEC.md) is the full product/engineering spec.

## Features

- **Search**: Search by ID, title, lyrics, or arranger
- **Import & convert**: MusicXML (`.xml`/`.mxl`) and MIDI files convert entirely in the browser; photos/GIFs/PDFs convert through a self-hosted OMR service (see `services/`). Every conversion lands in a review screen — nothing is saved unseen
- **Write your own**: type a tag in plain-ASCII shorthand with a live preview
- **Your library**: imports and drafts live in a private on-device library (IndexedDB)
- **Two layouts**: wrapped staff systems (like printed music) or one continuous scrolling line — toggle per tag, default in Settings
- **Mobile First**: Optimized for mobile devices with PWA capabilities
- **Share as Image**: Generate images of tags to share
- **Offline Ready**: browsing, writing, and MusicXML/MIDI import all work offline
- **Open Source**: Openly licensed and welcoming community contributions
- **Dark Mode**: Because let's face it, we mostly sing tags at afterglows

## Numeric Notation System

numtags uses a movable-Do numeric system where numbers represent scale degrees:

```
1 = Root (Do)
2 = Second (Re)
3 = Third (Mi)
4 = Fourth (Fa)
5 = Fifth (So)
6 = Sixth (La)
7 = Seventh (Ti)
```

Each line represents a voice part (Tenor, Lead, Baritone, Bass). The notation is stored as plain ASCII — what you type is what's stored — and the app draws the pretty marks (♯/♭, octave dots, tie arcs) when displaying it:

| You type | Meaning |
|---|---|
| `#2` / `b3` | sharp / flat |
| `5'` / `5,` | octave up / down (stack: `5''`, `5,,`) |
| `3/` / `3//` | eighth / sixteenth note |
| `3.` | dotted |
| `~4` | tie (continue the previous note) |
| `-` | hold one more beat |
| `0` | rest |
| `X` | posted — hold until the cut |
| `\|` | measure boundary |
| `_` | (lyric line) beat with no new syllable |

### Example:
```
Tenor:     3 - 3 - | 4 ~4 3 - |
Lead:      1 - 1 - | 1 ~7, 1 - |
Baritone:  5, - b7, - | 6, ~5, 5, - |
Bass:      1, - 5, - | 4, ~2, 1, - |
           "My town, my town."
```

The full guide lives in the app under **Guide** (`/notation`).

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bumbleblue/numtags.git
cd numtags
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Tests & checks

```bash
npm test         # vitest — parser, normalizer, encoder, golden tags
npm run check    # svelte-check
```

### Building for Production

```bash
npm run build
```

Builds with the Cloudflare adapter. The markdown catalog compiles to a bundled snapshot (`npm run generate-tags`) before every dev/build.

### Backend services (optional)

`services/` contains a FastAPI scaffold for the two network features: image→MusicXML OMR (homr) and the Git-backed collaborative catalog (a bot commits edits with the editor's name; history + revert). The app runs fully without it — image import and Publish simply show as unavailable until `PUBLIC_SERVICE_URL` is configured. See [services/README.md](services/README.md).

## Project Structure

```
numtags/
├── src/
│   ├── lib/
│   │   ├── notation/       # ASCII grammar: parse, normalize, transform (+tests)
│   │   ├── score/          # MusicXML/MIDI → ScoreModel → encode (+tests)
│   │   ├── library/        # IndexedDB private library
│   │   ├── components/
│   │   │   └── notation/   # NotationRenderer + BeatCell (CSS-drawn marks)
│   │   ├── data.ts         # catalog ∪ local library search
│   │   └── types.ts        # Tag types
│   ├── routes/             # Library, tag pages, import, review, guide, settings
│   ├── app.css
│   └── app.html
├── services/               # OMR + catalog bot service (FastAPI, not deployed)
├── static/                 # PWA assets
├── data/tags/              # The catalog (Markdown + YAML, canonical ASCII)
└── package.json
```

## Tag Data Format

Tags are stored as Markdown files with YAML frontmatter (canonical ASCII notation):

```yaml
---
title: "So Tired of Waiting For You"
tag_id: 53
arranger: "Renee Craig"
difficulty: "Medium"
source_url: "https://www.barbershoptags.com/tag-53-So-Tired-of-Waiting-for-You"
date_added: "2008-12-15"
parts: 4
lyrics: "So tired of waiting for you."
original_key: "G"
origin: "catalog"
---

| 1 3 5 | 4 6 - 1' | 1' - |
| 1 1 #1 | 2 b3 - 4 | 3 - |
| 1 b7, 6, | 1 1 - b6, | 5, - |
| 1 5, 3, | 6, 4, - 2, | 1, - |
So tired of wait-ing _ for you.
```

Formatting notes:

- Each staff is 4 voice lines followed by its lyric line(s); blank lines separate staffs
- In lyric lines, a space advances one beat, `_` holds, and `slee-py` splits a word across two beats
- Beats before the first `|` are a pickup
- The 5 original hand-transcribed tags double as the golden test set — changes to them must be deliberate (tests will tell you)

## Contributing

We welcome contributions! Here's how you can help:

### Adding New Tags

The easiest way is in the app: **Import → Write it yourself**, then save and export/share. To contribute to the shared catalog today:

1. Create a new Markdown file in the `data/tags/` directory (format above)
2. Submit a pull request

(In-app publishing to the catalog exists behind the catalog service and goes live when that service is deployed.)

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (Svelte 5 runes for new components)
- Add TypeScript types and tests for new features
- `npm test` must stay green — the golden-tag tests guard the notation core
- Update documentation as needed

## PWA Features

numtags is a Progressive Web App with the following features:

- **Offline Support**: app shell + catalog cached; MusicXML/MIDI import and authoring work offline
- **Installable**: Add to home screen on mobile devices
- **Fast Loading**: catalog ships as a build-time snapshot
- **Responsive**: Works on all device sizes

## Tech Stack

- **Framework**: SvelteKit (Svelte 5)
- **Styling**: TailwindCSS (Base16 Default Dark palette, role-named color tokens)
- **Search**: Fuse.js
- **Imports**: DOMParser (MusicXML), @tonejs/midi, fflate (.mxl), homr (OMR, self-hosted)
- **Storage**: IndexedDB (idb) + Git-backed catalog
- **PWA**: Service Worker + Manifest
- **Deployment**: Cloudflare (adapter-cloudflare)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributor License Agreement

By contributing to numtags, you agree to the following terms:

### Tag Translations and Content
- **Source Attribution**: All tags are sourced from [barbershoptags.com](https://barbershoptags.com) and are only rewritten in our numeric notation system
- **Original Links**: We maintain links to the original publication location on barbershoptags.com
- **CC0 License**: Any copyright generated through tag translations or contributions to this project shall be licensed under CC0 1.0 Universal (Public Domain)
- **No Original Composition**: We do not create original musical content - only translate existing tags into numeric notation

### Website Code
- **MIT License**: The website code is licensed under the MIT License
- **Contributions**: By contributing code, you agree to license your contributions under the MIT License

### Contributing
When you contribute tag translations or other content to numtags, you:
1. Confirm that you are translating from the original source on barbershoptags.com
2. Agree to license any copyright in your contributions under CC0 1.0 Universal
3. Understand that we maintain attribution to the original source
4. Accept that your contributions will be freely available to the public domain

This ensures that all tag translations remain freely available and that we respect the original sources while making barbershop tags more accessible through numeric notation.

## Contact

- GitHub Issues: [Report bugs or request features](https://github.com/bumbleblue/numtags/issues)
- GitHub Discussions: [Join the conversation](https://github.com/bumbleblue/numtags/discussions)

---

Made with ❤️ for all of you barbershop-obsessed people!
