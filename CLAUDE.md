# Claude Code Instructions

## Project Overview

Executive Assistant Demo - A chat app where users interact with a Claude agent that manages a markdown-based filesystem in an E2B sandbox.

## Tech Stack

- Next.js 16 (App Router)
- Anthropic Claude API (claude-opus-4-5-20251101)
- E2B sandbox for file operations
- shadcn/ui components
- Tailwind CSS

## Key Files

- `src/app/page.tsx` - Main page layout
- `src/app/api/chat/route.ts` - Chat API with Claude + tools
- `src/lib/constants.ts` - System prompt
- `src/components/` - UI components (chat, file-browser, etc.)

## Environment Variables

Required in `.env.local`:
```
ANTHROPIC_API_KEY=your_key
E2B_API_KEY=your_key
```

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
```

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Or push to main branch if Vercel Git integration is configured.

Required environment variables on Vercel:
- `ANTHROPIC_API_KEY`
- `E2B_API_KEY`
