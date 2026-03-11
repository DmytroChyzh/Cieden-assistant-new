# FinPilot - AI Financial Assistant

AI-powered financial assistant with voice and text chat capabilities, built with Next.js, Convex, and ElevenLabs.

## Quick Start

**New contributors:** See [Setup Guide](docs/SETUP_GUIDE.md) for detailed onboarding instructions.

### Prerequisites

- Node.js >=18.17.0
- Accounts for: OpenRouter, ElevenLabs, Convex (all have free tiers)

### Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up Convex backend
npx convex login
npx convex init

# 3. Create .env.local with required variables (see docs/SETUP_GUIDE.md)

# 4. Start development servers (2 terminals required)
npm run dev          # Terminal 1: Next.js
npx convex dev       # Terminal 2: Convex backend
```

Visit http://localhost:3000

## Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Complete onboarding instructions for new contributors
- **[Architecture](docs/active/ARCHITECTURE.md)** - System architecture and technical details
- **[Onboarding Assessment](docs/ONBOARDING_ASSESSMENT.md)** - Analysis of setup complexity
- **[Coding Guidelines](AGENTS.md)** - Development standards and best practices

## Tech Stack

- **Frontend:** Next.js 15.4.8, React 19, TypeScript, Tailwind CSS
- **Backend:** Convex (real-time database & functions)
- **AI:** CopilotKit (self-hosted), OpenRouter
- **Voice:** ElevenLabs ConvAI
- **UI:** shadcn/ui, Radix UI, Recharts, Framer Motion

## Development

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run lint     # Run linter
npx convex dev   # Start Convex backend (required)
```

## Environment Variables

See [Setup Guide](docs/SETUP_GUIDE.md#4-create-environment-variables-file) for complete list.

**Required:**
- `OPENROUTER_API_KEY` - AI model access
- `NEXT_PUBLIC_CONVEX_URL` - Convex public URL
- `CONVEX_DEPLOYMENT` - Convex deployment ID
- `ELEVENLABS_API_KEY` - Voice services
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` - ElevenLabs agent ID
- `JWT_PRIVATE_KEY` - Convex Auth JWT key

## Project Structure

```
├── app/          # Next.js App Router (pages, API routes)
├── src/          # Shared code (components, features, hooks, utils)
├── components/   # Global UI components
├── convex/       # Convex backend (functions, schema, auth)
└── docs/         # Documentation
```

## Contributing

1. Read [Setup Guide](docs/SETUP_GUIDE.md)
2. Review [Coding Guidelines](AGENTS.md)
3. Check [Architecture](docs/active/ARCHITECTURE.md) for context
4. Follow Conventional Commits format

## License

Private project - All rights reserved
