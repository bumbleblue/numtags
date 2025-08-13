# Contributing to TagAlong

Thank you for your interest in contributing to TagAlong! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Types of Contributions

We welcome several types of contributions:

1. **Adding New Tags** - Submit new barbershop tags in our numeric notation format
2. **Improving Existing Tags** - Fix errors, add missing metadata, or improve notation
3. **Code Contributions** - Bug fixes, new features, or improvements to the app
4. **Documentation** - Improving README, guides, or code comments
5. **Bug Reports** - Report issues you encounter
6. **Feature Requests** - Suggest new features or improvements

## 🎼 Adding New Tags

### Tag Format

Tags should be submitted as Markdown files with YAML frontmatter:

```yaml
---
title: "Tag Title"
tag_id: 1234
arranger: "Arranger Name"
difficulty: "Easy/Medium/Hard"
source_url: "https://www.barbershoptags.com/tags/1234"
date_added: "YYYY-MM-DD"
parts: 4
lyrics: "Optional lyrics for the tag"
comments: "Additional performance or arrangement notes"
---

Lead: 1 3 5 1
Bass: 1 1 3 1
Baritone: 3 3 3 3
Tenor: 5 5 5 5

Optional lyrics here
```

### Numeric Notation Guidelines

- Use numbers 1-8 to represent scale degrees
- 1 = Root (Do), 2 = Second (Re), etc.
- Each line should represent a voice part
- Use consistent spacing and formatting
- Include lyrics if available

### Parts Field

- Use an integer representing the number of voice parts
- Common values: 2 (duet), 3 (trio), 4 (quartet), 5+ (larger groups)
- This helps with filtering and categorization

### File Naming

- Use kebab-case for filenames
- Include the tag title in the filename
- Example: `sweet-adeline.md`, `goodbye-coney-island-baby.md`

### Submission Process

1. Create a new Markdown file in the `data/tags/` directory
2. Follow the format above with proper YAML frontmatter
3. Ensure the tag_id is unique
4. Submit a pull request with a descriptive title

## 💻 Code Contributions

### Development Setup

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
5. Make your changes
6. Test thoroughly
7. Submit a pull request

### Code Style Guidelines

- Follow existing code style and patterns
- Use TypeScript for type safety
- Add proper TypeScript types for new features
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing

- Test your changes in the browser
- Ensure the app works on mobile devices
- Test search functionality with your changes
- Verify PWA features still work

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add new tag sharing feature
fix: resolve search filter issue
docs: update contribution guidelines
style: improve mobile layout
refactor: simplify tag data structure
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description** - Clear description of the issue
2. **Steps to Reproduce** - Step-by-step instructions
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - Browser, OS, device type
6. **Screenshots** - If applicable

## 💡 Feature Requests

When suggesting features, please include:

1. **Description** - Clear description of the feature
2. **Use Case** - Why this feature would be useful
3. **Implementation Ideas** - How it might work
4. **Mockups** - If applicable

## 📋 Pull Request Process

1. **Fork and Clone** - Fork the repo and clone locally
2. **Create Branch** - Create a feature branch
3. **Make Changes** - Implement your changes
4. **Test** - Test thoroughly
5. **Commit** - Use clear commit messages
6. **Push** - Push to your fork
7. **Submit PR** - Create a pull request with description

### Pull Request Guidelines

- Use a clear, descriptive title
- Include a detailed description of changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed

## 📞 Getting Help

If you need help or have questions:

- Open a GitHub issue
- Join GitHub Discussions
- Check existing documentation
- Review existing issues and PRs

## 📄 License

By contributing to TagAlong, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:

- GitHub contributors list
- Project README (for significant contributions)
- Release notes

Thank you for contributing to TagAlong! 🎵
