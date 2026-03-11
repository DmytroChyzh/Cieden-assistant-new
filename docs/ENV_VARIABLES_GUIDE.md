# Environment Variables Guide

## ⚠️ Should You Commit `.env.local`?

**Short Answer: NO, even for POC** ❌

### Why Not?

1. **Security Risk**: API keys can be abused if exposed
2. **Git History**: Secrets remain in git history even if removed later
3. **Repository Access**: Private repos can become public or be shared
4. **Service Policies**: Many services (OpenRouter, ElevenLabs) prohibit committing API keys
5. **Best Practice**: Never commit secrets, even for POC/demo projects

### Better Alternatives

#### Option 1: Use `.env.example` Template ✅ (Recommended)

Create `.env.example` with placeholder values (no real secrets):

```bash
# Copy this file to .env.local and fill in actual values
cp .env.example .env.local
# Then edit .env.local with real values
```

**Benefits:**
- Shows what variables are needed
- Safe to commit to git
- Easy onboarding (just copy and fill)

#### Option 2: Share `.env.local` Securely ✅

Share the actual `.env.local` file via:
- Password manager (1Password, Bitwarden)
- Encrypted file sharing
- Secure team channel
- Team secrets management tool

**Benefits:**
- No secrets in git
- Easy for contributors
- Can revoke access if needed

#### Option 3: Use Vercel Environment Variables ✅ (Already Done!)

For production/testing:
- All env vars already configured in Vercel
- Commits to `main` → Auto-deploy → Works immediately
- No local setup needed for production testing

---

## Environment Variables Template

Create `.env.example` file (safe to commit):

```bash
# ============================================
# FinPilot Environment Variables Template
# ============================================
# Copy this file to .env.local and fill in your actual values
# DO NOT commit .env.local to git (it's in .gitignore)

# ============================================
# AI/LLM Services (REQUIRED)
# ============================================
# Get your API key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=your-openrouter-api-key-here

# ============================================
# Convex Backend (REQUIRED)
# ============================================
# After running `npx convex init`, you'll get these values
# Public URL for client-side Convex connection
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Deployment identifier (format: dev:deployment-id or prod:deployment-id)
# Used by `npx convex dev` command
CONVEX_DEPLOYMENT=dev:your-deployment-id

# JWT Private Key for Convex Auth
# Generate a secure random key (32+ characters)
# You can generate one with: openssl rand -base64 32
JWT_PRIVATE_KEY=your-jwt-private-key-here

# ============================================
# ElevenLabs Voice Services (REQUIRED)
# ============================================
# Get your API key from: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here

# Get your agent ID from: https://elevenlabs.io/app/convai
# Create a new agent or use an existing one
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your-agent-id-here

# ============================================
# Webhook Security (OPTIONAL)
# ============================================
# Generate a secure random secret for webhook validation
# You can generate one with: openssl rand -hex 32
WEBHOOK_SECRET=your-webhook-secret-here

# ============================================
# Development Settings (OPTIONAL)
# ============================================
NODE_ENV=development

# ============================================
# Convex Site URL (OPTIONAL)
# ============================================
# If using Convex Auth with custom domain
# CONVEX_SITE_URL=https://your-domain.com
```

---

## Quick Setup for New Contributors

### If `.env.example` exists:

```bash
# 1. Copy template
cp .env.example .env.local

# 2. Get actual values from team lead (via secure channel)
# OR set up your own accounts and fill in values

# 3. Start development
npm run dev
npx convex dev  # if needed
```

### If team lead shares `.env.local`:

```bash
# 1. Copy shared .env.local to project root
cp /path/to/shared/.env.local .env.local

# 2. Start development
npm run dev
npx convex dev  # if needed
```

---

## Current Setup Status

✅ **`.env.local` is correctly gitignored** (see `.gitignore` line 35)
✅ **Vercel has all env vars configured** (production works immediately)
⚠️ **`.env.example` template needed** (for easy onboarding)

---

## Recommendation for POC

**Don't commit `.env.local`**, but:

1. ✅ **Create `.env.example`** with placeholders (safe to commit)
2. ✅ **Share `.env.local` securely** with contributors (password manager, etc.)
3. ✅ **Document in README** where to get env vars
4. ✅ **Use Vercel env vars** for production (already done)

This gives you:
- ✅ Easy onboarding (copy `.env.example` → fill values OR get `.env.local` from team)
- ✅ Security (no secrets in git)
- ✅ Best practices (follows industry standards)
- ✅ Flexibility (can revoke/rotate keys without git history issues)
