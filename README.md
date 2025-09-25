# numtags

Barbershop tags in numeric notation

## 🎵 What is numtags?

numtags is a mobile-first web application designed specifically for barbershop singers to quickly find, learn, and share barbershop tags. Tags are short, harmonically rich pieces of music meant for spontaneous group singing. The app uses a custom numeric notation system that makes it easy to read, learn, and teach tags on any device.

## Features

- **Search**: Search by ID, title, lyrics, or arranger
- **Mobile First**: Optimized for mobile devices with PWA capabilities
- **Share as Image**: Generate images of tags to share 
- **Offline Ready**: Works offline once loaded
- **Filter & Sort**: Filter by difficulty, arranger, or parts
- **Open Source**: Openly licensed and welcoming community contributions
- **Dark Mode**: Because let's face it, we mostly sing tags at afterglows

## Numeric Notation System

numtags uses a simple numeric notation system where numbers represent scale degrees:

```
1 = Root (Do)
2 = Second (Re)
3 = Third (Mi)
4 = Fourth (Fa)
5 = Fifth (So)
6 = Sixth (La)
7 = Seventh (Ti)
8 = Octave (Do)
```

Each line represents a different voice part (Tenor, Lead, Baritone, Bass), and the numbers show which scale degree to sing. 

### Example:
```

Tenor:    3 - 3 - 4 4 - 3 - -
Lead:     8 - 8 - 8 7 - 8 - -
Baritone: 5 -♭7 - 6 5 - 5 - -
Bass:     1 - 5 - 4 2 - 1 - -

        "My town, my- town."
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

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

### Building for Production

```bash
npm run build
```

The built files will be in the `build` directory, ready for deployment.

## Project Structure

```
tag-along/
├── src/
│   ├── lib/
│   │   ├── components/     # Reusable Svelte components
│   │   ├── data.ts        # Data management and search
│   │   └── types.ts       # TypeScript type definitions
│   ├── routes/            # SvelteKit pages
│   ├── app.css           # Global styles
│   └── app.html          # HTML template
├── static/               # Static assets
├── data/                 # Tag data (Markdown + YAML)
└── package.json
```

## Tag Data Format

Tags are stored as Markdown files with YAML frontmatter:

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
comments: ""
original_key: "G"
---

|  1  3  5  |  4  6  -  1̇  |  1̇  —  |
|  1  1 ♯1  |  2 ♭3  -  4  |  3  —  |
|  1 ♭7̣  6̣  |  1  1  - ♭6̣  |  5̣  —  |
|  1  5̣  3̣  |  6̣  4̣  -  2̣  |  1̣  —  |
So tired of   wait-ing for   you.
```

## Contributing

We welcome contributions! Here's how you can help:

### Adding New Tags

1. Create a new Markdown file in the `data/tags/` directory
2. Use the format shown above with proper YAML frontmatter
3. Submit a pull request

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add TypeScript types for new features
- Test your changes thoroughly
- Update documentation as needed

## PWA Features

numtags is a Progressive Web App with the following features:

- **Offline Support**: Works without internet connection
- **Installable**: Add to home screen on mobile devices
- **Fast Loading**: Optimized for quick access
- **Responsive**: Works on all device sizes

## Tech Stack

- **Framework**: SvelteKit
- **Styling**: TailwindCSS
- **Search**: Fuse.js
- **PWA**: Service Worker + Manifest
- **Deployment**: Static hosting (Netlify)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- GitHub Issues: [Report bugs or request features](https://github.com/your-username/tag-along/issues)
- GitHub Discussions: [Join the conversation](https://github.com/your-username/tag-along/discussions)

---

Made with ❤️ for all of you barbershop-obsessed people!
