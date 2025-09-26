# One-Commit

🚀 AI-powered automatic commit message generator that uses OpenAI to create meaningful commit messages from your git diff.

[中文文档](./README-zh.md) | [English](./README.md)

## Features

- 🤖 **AI-Generated Commit Messages** - Uses OpenAI to analyze your changes and generate descriptive commit messages
- 📁 **Selective File Staging** - Choose specific files to stage and commit
- 🎯 **Conventional Commits** - Follows conventional commit format (feat:, fix:, docs:, etc.)
- ⚙️ **Configurable** - Support for custom OpenAI API keys and base URLs
- 🔄 **Interactive** - Review, edit, or regenerate commit messages before committing
- 📦 **Easy to Use** - Simple npx command, no installation required

## Quick Start

```bash
# Run directly with npx (no installation needed)
npx one-commit

# Or install globally
npm install -g one-commit
one-commit
```

## First Time Setup

When you first run `one-commit`, you'll be prompted to configure your OpenAI settings:

```bash
npx one-commit --config
```

You'll need to provide:
- **OpenAI API Key** (required)
- **Base URL** (optional, defaults to https://api.openai.com/v1)
- **Model** (optional, defaults to gpt-4o-mini)

## Usage

### Basic Usage

Navigate to your git repository and run:

```bash
npx one-commit
```

The tool will:
1. Check if you have staged changes
2. If no staged changes, ask if you want to stage all changes
3. Generate a commit message using AI
4. Show you the generated message for review
5. Allow you to commit, edit, regenerate, or cancel

### Configuration

```bash
# Configure OpenAI settings
npx one-commit --config

# Show help
npx one-commit --help
```

### Environment Variables

You can also set configuration via environment variables:

```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.openai.com/v1"  # optional
```

## Examples

### Generated Commit Messages

The AI generates commit messages following conventional commit format:

- `feat: add user authentication system`
- `fix: resolve memory leak in data processor`
- `docs: update API documentation`
- `refactor: simplify error handling logic`
- `style: format code with prettier`

### Interactive Flow

```
🚀 One-Commit

✨ Generated commit message:
┌─────────────────────────────────────────────────┐
│ feat: add user authentication with JWT tokens  │
└─────────────────────────────────────────────────┘

Files: src/auth.ts, src/middleware.ts (+127 -23)

What would you like to do?
✅ Commit with this message
✏️  Edit message
🔄 Regenerate message
❌ Cancel
```

## Requirements

- Node.js 18+
- Git repository
- OpenAI API key

## Configuration Storage

Configuration is stored locally using the `conf` package:
- macOS: `~/Library/Preferences/one-commit/config.json`
- Linux: `~/.config/one-commit/config.json`
- Windows: `%APPDATA%\one-commit\config.json`

## Development

```bash
# Clone the repository
git clone <repository-url>
cd one-commit

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Made with ❤️ for developers who want better commit messages without the hassle.