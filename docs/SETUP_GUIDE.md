# FinPilot Setup Guide for New Contributors

## Quick Start Options

### Option 1: Production Testing (Easiest) ✅

**Works immediately!** Just commit to `main` branch and Vercel will auto-deploy with all environment variables already configured.

### Option 2: Local Development (Recommended)

**5-10 minutes** if you have `.env.local` file from team lead.

---

## Prerequisites

- **Node.js**: >=18.17.0 (check with `node --version`)
- **npm** or **bun** package manager
- **Git** for version control
- **`.env.local` file** (get from team lead via secure channel)

## External Service Accounts

**For Production:** ✅ Not needed - All configured in Vercel

**For Local Development:** 
- ✅ Not needed if using shared `.env.local` from team
- ⚠️ Only needed if setting up your own accounts (see below)

### If Setting Up Your Own Accounts:

1. **OpenRouter** (AI/LLM access)
   - Sign up: https://openrouter.ai/
   - Get API key: https://openrouter.ai/keys
   - Free tier available

2. **ElevenLabs** (Voice services)
   - Sign up: https://elevenlabs.io/
   - Get API key: https://elevenlabs.io/app/settings/api-keys
   - Create agent: https://elevenlabs.io/app/convai
   - Free tier available (limited)

3. **Convex** (Backend database)
   - Sign up: https://www.convex.dev/
   - Free tier available

---

## Step-by-Step Setup

### For Production Testing (Vercel)

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd FinPilot-Project
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

3. **Vercel auto-deploys** ✅
   - All environment variables are already configured in Vercel
   - Preview deployments work automatically
   - Production works immediately

**That's it!** No local setup needed for production testing.

---

### For Local Development

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FinPilot-Project
```

### 2. Install Dependencies

```bash
npm install
# or if using bun:
bun install
```

### 3. Set Up Environment Variables

**Get `.env.local` from team lead** (via password manager, secure channel, etc.)

Then copy it to project root:
```bash
# Copy the .env.local file to project root
cp /path/to/.env.local .env.local
```

**OR if you need to create your own:**

Create `.env.local` with these variables (get values from team lead or set up your own accounts):

```bash
# AI/LLM Services
OPENROUTER_API_KEY=your-openrouter-api-key-here

# Convex Backend (already deployed - use shared URL)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment-id
JWT_PRIVATE_KEY=your-jwt-private-key-here

# ElevenLabs Voice Services
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your-agent-id-here

# Optional
WEBHOOK_SECRET=your-webhook-secret-here
NODE_ENV=development
```

**Important:** 
- Never commit `.env.local` to git (it's in `.gitignore`)
- Use shared credentials from team lead for easiest setup

### 4. Start Development Servers

You need **two terminals** running simultaneously:

**Terminal 1 - Next.js Frontend:**
```bash
npm run dev
```

**Terminal 2 - Convex Backend (if developing Convex functions):**
```bash
npx convex dev
```

**Note:** If you're only testing frontend changes and using the shared Convex deployment URL, you may not need Terminal 2. Only run `npx convex dev` if you're modifying Convex backend functions.

The app will be available at: http://localhost:3000

### 5. Verify Setup

1. Open http://localhost:3000 in your browser
2. Check browser console for errors
3. Check terminal outputs for any error messages
4. Try basic functionality (if auth is required, sign up/login first)

---

## Troubleshooting

### Issue: "Missing environment variable" errors

**Solution:** 
- Verify `.env.local` exists in root directory
- Check all required variables are set (see step 4)
- Restart both dev servers after changing `.env.local`

### Issue: Convex connection errors

**Solution:**
- Verify `NEXT_PUBLIC_CONVEX_URL` matches your Convex project URL
- Ensure `npx convex dev` is running in a separate terminal
- Check Convex dashboard: https://dashboard.convex.dev/

### Issue: ElevenLabs API errors

**Solution:**
- Verify `ELEVENLABS_API_KEY` is correct
- Check `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` matches your agent ID
- Ensure agent is active in ElevenLabs dashboard

### Issue: OpenRouter API errors

**Solution:**
- Verify `OPENROUTER_API_KEY` is correct
- Check your OpenRouter account has credits/quota
- Verify API key is active in OpenRouter dashboard

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

---

## Development Workflow

### Running the App

Always run both servers:
1. `npm run dev` (Next.js)
2. `npx convex dev` (Convex)

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

### Testing

```bash
# Client tests
npm run test:client

# Agent tests
npm run test:agent

# All tests
npm run test:all
```

---

## Project Structure

```
FinPilot-Project/
├── app/              # Next.js App Router pages & API routes
├── src/              # Shared code (components, features, hooks, utils)
├── components/       # Global UI components
├── convex/           # Convex backend functions & schema
├── public/           # Static assets
└── docs/             # Documentation
```

---

## Getting Help

- Check `docs/active/ARCHITECTURE.md` for architecture details
- Review `AGENTS.md` for coding guidelines
- Check Convex logs: `npx convex logs`
- Check Next.js logs in terminal running `npm run dev`

---

## Quick Reference

| Command | Purpose |
|--------|---------|
| `npm run dev` | Start Next.js dev server |
| `npx convex dev` | Start Convex backend |
| `npm run build` | Build for production |
| `npm run lint` | Run linter |
| `npx convex logs` | View Convex backend logs |

---

## Next Steps

After setup is complete:
1. Read `docs/active/ARCHITECTURE.md` to understand the codebase
2. Review `AGENTS.md` for coding standards
3. Check existing issues/PRs for context
4. Start with small tasks to get familiar with the codebase
