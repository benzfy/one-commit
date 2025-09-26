# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

One-Commit is an AI-powered CLI tool that generates meaningful git commit messages using OpenAI. Built with React/Ink for interactive terminal UI, it analyzes git diffs and provides users with generated commit messages following conventional commit formats.

## Development Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Run in development mode (direct TypeScript execution)
npm run dev

# Test the built CLI locally
node dist/cli.js

# Test with different options
node dist/cli.js --config
node dist/cli.js --help
```

## Architecture Overview

The application follows a modular architecture with clear separation of concerns:

### Core Modules (`src/`)

- **cli.tsx** - Main React/Ink application with three key components:
  - `FileSelector` - Custom multi-select file picker with keyboard navigation
  - `ConfigSetup` - OpenAI API configuration wizard  
  - `CommitFlow` - Main application flow orchestrator
- **git.ts** - Git operations wrapper using `execa` for staging, diffing, committing
- **ai.ts** - OpenAI integration with specialized commit message generation prompts
- **config.ts** - Configuration management using `conf` package for persistent storage
- **types.ts** - TypeScript interfaces for Config, GitDiff, and CommitOptions

### Application Flow

1. **Repository Check** - Validates git repository and checks for changes
2. **File Selection** - If no staged files, shows interactive file selector with:
   - Select All/Deselect All actions (defaults to all selected)
   - Modified files (📝) and new files (➕) categorization
   - Keyboard navigation (↑/↓, space, enter, ESC)
3. **AI Generation** - Sends git diff to OpenAI with specialized prompt for conventional commits
4. **Review & Commit** - Interactive review with options to commit, edit, regenerate, or cancel

### Key Dependencies

- **Ink 5.x** - React-based terminal UI framework (ESM modules)
- **OpenAI SDK** - API integration for commit message generation
- **Execa** - Process execution for git commands
- **Commander** - CLI argument parsing
- **Conf** - Configuration persistence

## Development Notes

### TypeScript Configuration
- Uses ESNext modules with bundler resolution for Ink 5.x compatibility
- React JSX with automatic runtime
- Outputs to `dist/` with source maps and declarations

### Terminal UI Patterns
- Custom `FileSelector` component implements keyboard navigation without external dependencies
- State management follows React patterns with useState/useEffect
- All UI components are functional components using hooks

### Git Integration
- Distinguishes between staged/unstaged/untracked files
- Supports selective file staging
- Uses `git diff --cached` for staged changes and `git diff` for unstaged changes

### Configuration Management
- Stores API keys, base URLs, and model preferences locally
- Falls back to environment variables (OPENAI_API_KEY, OPENAI_BASE_URL)
- First-run configuration wizard for user setup

### Error Handling
- Comprehensive error handling for git operations, API calls, and file operations
- User-friendly error messages displayed in terminal UI
- Graceful fallbacks for missing configurations

The codebase prioritizes user experience with interactive file selection, clear visual feedback, and robust error handling throughout the commit generation workflow.