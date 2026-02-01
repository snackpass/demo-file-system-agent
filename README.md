# Executive Assistant Demo

A demo application where users can chat with a Claude agent that manages a markdown-based filesystem as their personal executive assistant.

## Features

- **Persistent Filesystem**: Files are stored in an E2B sandbox that persists across sessions
- **Chat Interface**: Natural language conversation with Claude
- **File Browser**: Visual sidebar showing all files in the sandbox
- **File Viewer**: Click any file to view its contents
- **User Settings**: Set your name for personalized assistance
- **Session Management**: Clear chat history or reset the entire session

## Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Backend**: Next.js API routes
- **AI**: Anthropic Claude API with tool use
- **Sandbox**: E2B for secure file operations

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file and add your API keys:
   ```bash
   cp .env.local.example .env.local
   ```

3. Add your API keys to `.env.local`:
   - `E2B_API_KEY`: Get from [E2B Dashboard](https://e2b.dev)
   - `ANTHROPIC_API_KEY`: Get from [Anthropic Console](https://console.anthropic.com)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Set Your Name**: Click your name in the header to personalize the assistant
2. **Start Chatting**: Ask the assistant to help organize your tasks, notes, etc.
3. **View Files**: Click files in the sidebar to view their contents
4. **Clear Chat**: Clears message history but keeps files
5. **Reset All**: Destroys the sandbox and starts fresh

## How It Works

### Data Persistence

| Data | Storage | Persistence |
|------|---------|-------------|
| Chat messages | React state | Ephemeral (lost on refresh) |
| Filesystem | E2B sandbox | Until reset or sandbox timeout |
| Sandbox ID | localStorage | Until user resets |
| User name | localStorage | Until user changes |

### System Prompt

The assistant operates with instructions to:
- Document everything in markdown files
- Keep folder structure simple
- Notice and remember user preferences
- Save important context to files
- Periodically clean up unused files

### Tools Available to the Agent

- `write_file`: Create or update files
- `read_file`: Read file contents
- `list_directory`: List directory contents
- `run_command`: Execute shell commands

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main page with chat + file browser
│   └── api/
│       ├── chat/route.ts    # Chat API endpoint
│       ├── files/route.ts   # File operations API
│       └── sandbox/route.ts # Sandbox management API
├── components/
│   ├── chat.tsx             # Chat interface
│   ├── message.tsx          # Message bubble
│   ├── file-browser.tsx     # File tree sidebar
│   ├── file-viewer.tsx      # File content modal
│   └── user-settings.tsx    # User name + session controls
└── lib/
    ├── constants.ts         # System prompt
    └── e2b.ts               # E2B utilities
```
