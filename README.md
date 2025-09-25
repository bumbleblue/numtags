# TagAlong

A Progressive Web App for learning and sharing barbershop tags with custom numeric notation.

## 🎵 What is TagAlong?

TagAlong is a mobile-first web application designed specifically for barbershop singers to quickly find, learn, and share barbershop tags. Tags are short, harmonically rich pieces of music meant for spontaneous group singing.

Our app uses a custom numeric notation system that makes it easy to read and learn tags on any device, with a clean, searchable database that grows through community contributions.

## ✨ Features

- **🔍 Smart Search**: Search by ID, title, lyrics, or arranger
- **📱 Mobile First**: Optimized for mobile devices with PWA capabilities
- **🖼️ Share as Image**: Generate beautiful images of tags to share
- **⚡ Offline Ready**: Works offline once loaded
- **🎯 Filter & Sort**: Filter by difficulty, arranger, or parts
- **🌐 Open Source**: Community-driven with transparent development

## 🎼 Numeric Notation System

TagAlong uses a simple numeric notation system where numbers represent scale degrees:

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

Each line represents a different voice part (Lead, Bass, Baritone, Tenor), and the numbers show which scale degree to sing.

### Example:
```
Lead: 1 3 5 1
Bass: 1 1 3 1
Baritone: 3 3 3 3
Tenor: 5 5 5 5
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/tag-along.git
cd tag-along
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

## 📁 Project Structure

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

## 📝 Tag Data Format

Tags are stored as Markdown files with YAML frontmatter:

```yaml
---
title: "Sweet Adeline"
tag_id: 1001
arranger: "Traditional"
difficulty: "Easy"
source_url: "https://www.barbershoptags.com/tags/1001"
date_added: "2024-01-15"
parts: 4
lyrics: "Sweet Adeline, my Adeline"
comments: "Classic barbershop tag, great for beginners"
---

Lead: 1 3 5 1
Bass: 1 1 3 1
Baritone: 3 3 3 3
Tenor: 5 5 5 5

Sweet Adeline, my Adeline
```

## 🤝 Contributing

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

## 📱 PWA Features

TagAlong is a Progressive Web App with the following features:

- **Offline Support**: Works without internet connection
- **Installable**: Add to home screen on mobile devices
- **Fast Loading**: Optimized for quick access
- **Responsive**: Works on all device sizes

## 🛠️ Tech Stack

- **Framework**: SvelteKit
- **Styling**: TailwindCSS
- **Search**: Fuse.js
- **PWA**: Service Worker + Manifest
- **Deployment**: Static hosting (GitHub Pages, Vercel, Netlify)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Barbershop Harmony Society for inspiration
- The barbershop community for feedback and support
- Open source contributors who make this possible

## 📞 Contact

- GitHub Issues: [Report bugs or request features](https://github.com/your-username/tag-along/issues)
- GitHub Discussions: [Join the conversation](https://github.com/your-username/tag-along/discussions)

---

Made with ❤️ for the barbershop community
