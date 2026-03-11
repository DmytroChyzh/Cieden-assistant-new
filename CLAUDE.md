# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skills Available

- **Skill Creator** (`.claude/skills/skill-creator/`) - Guide for creating effective skills
  - Use when: Creating or updating skills that extend Claude's capabilities
  - Resources: Templates, validation checklist, best practices

- **Codex Peer Review** (`.claude/skills/codex-peer-review/`) - Independent code review via Codex CLI
  - Use when: Need peer review on plans, code quality, security, architecture, or PRs
  - Workflows: Plan review, security audit, code quality, PR readiness, documentation sync
  - MVP-focused: Prioritized feedback (P0/P1/P2/P3), parallel reviews, security-first
  - Resources: Quick reference, usage examples, pre-deployment checklists

- **ElevenLabs Agent CLI Manager** (`.claude/skills/elevenlabs-agent-cli/`) - Manages agents and client tools
  - Use when: Adding tools, updating config, syncing with ElevenLabs
  - Resources: Comprehensive guide + quick reference included

- **ElevenLabs Agent Testing** (`.claude/skills/elevenlabs-agent-testing/`) - Dual testing strategy
  - Use when: Testing agents, validating tools, debugging connections
  - Client tests: Connection, tools, messages (test OUR code)
  - Agent tests: Tool calls, responses, quality (test AGENT behavior)
  - Resources: Test scripts, templates, troubleshooting

## Current State (Verified September 17, 2025)

FinPilot is a **functional, production-ready** financial AI assistant with:
- ✅ Voice interactions via ElevenLabs ConvAI
- ✅ Real-time data sync with Convex
- ✅ Financial visualizations (charts, cards, insights)
- ✅ Self-hosted CopilotKit runtime
- ✅ Interactive quizzes and quick actions
- ✅ User authentication and preferences

## Development Commands

### Core Commands
```bash
# Development server with Turbopack
npm run dev - assume is't already running at localhost:3000

# Production build
npm run build

# Lint code
npm run lint
```

### Convex Development
```bash
# Run Convex development server (in separate terminal)
npx convex dev

# Deploy to production
npx convex deploy
```

### Linear CLI (Issue Management)
```bash
# The 'lin' alias only works outside sandbox mode
# In sandbox mode, use the full path:
bash ~/.claude/skills/linear/scripts/linear.sh [command]

# Common commands:
bash ~/.claude/skills/linear/scripts/linear.sh list          # List recent issues
bash ~/.claude/skills/linear/scripts/linear.sh addBug "title" "description"
bash ~/.claude/skills/linear/scripts/linear.sh get ISSUE-ID  # Get issue details
```

## Architecture Overview

### Tech Stack (package.json verified)
- **Frontend**: Next.js 15.4.6 with App Router, TypeScript 5.x (strict mode)
- **Backend**: Convex 1.25.4 for real-time state management and database
- **AI Integration**:
  - CopilotKit 1.5.20 self-hosted runtime via OpenRouter
  - ElevenLabs 0.4.x ConvAI for voice interactions
  - OpenAI 4.67.3 SDK (via OpenRouter)
- **Styling**: Tailwind CSS 4.x + shadcn/ui components (Radix UI based)
- **Auth**: @convex-dev/auth 0.0.88 with NextJS integration
- **Visualization**: Recharts 2.15.4, Framer Motion 12.23

### Key Architectural Patterns

1. **Feature-Based Structure**: Code organized by features in `src/features/` (auth, charts, chat, voice)

2. **State Management**: All state handled through Convex - no client-side state libraries (no zustand)

3. **Real-time Updates**: Convex provides real-time data synchronization across all clients

4. **Voice Architecture** (Updated January 2026):
   - Unified approach using ElevenLabs React SDK for both modes
   - Text mode: WebSocket via signed URLs (textOnly: true, NO audio charges)
   - Voice mode: WebRTC via agent ID
   - Client tools work in both modes (11 tools registered, consolidated from toolBridge.ts)
   - Cross-tab coordination prevents duplicate sessions (BroadcastChannel + localStorage)
   - Session persists across navigation (layout-level provider)
   - Streaming transcripts stored in Convex `streamingTranscripts` table
   - Voice sessions tracked in `voiceSessions` table

5. **API Routes**:
   - `/api/copilotkit`: Self-hosted CopilotKit runtime using OpenRouter
   - `/api/elevenlabs/signed-url`: Generate signed URLs for ElevenLabs
   - `/api/elevenlabs/webhook`: Handle ElevenLabs webhooks

### Database Schema (Convex)
- **conversations**: Chat conversations with metadata (userId, title, lastMessageAt)
- **messages**: Individual messages with role, content, and source (voice/text/contextual)
- **charts**: Generated financial charts (pie, bar, line) with data and config
- **voiceSessions**: Voice interaction tracking with duration and transcripts
- **streamingTranscripts**: Real-time transcript streaming with WebSocket integration
- **savingsGoals/History/Insights**: Complete savings tracking system
- **documents**: User document storage (ID cards, licenses, etc.)
- **quizzes/quizResponses**: Interactive quiz system with response tracking
- **userPreferences**: Theme, language, and display preferences
- **auth tables**: User authentication (via @convex-dev/auth)

### Performance Targets
- Voice-to-chart latency: <500ms
- Mobile-first responsive design
- Edge functions for webhooks

### Environment Variables Required
- `OPENROUTER_API_KEY`: For AI model access via OpenRouter
- `ELEVENLABS_API_KEY`: ElevenLabs API authentication
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`: ElevenLabs agent identifier
- `CONVEX_DEPLOYMENT`: Convex deployment URL
- `NEXT_PUBLIC_CONVEX_URL`: Public Convex URL for client
- Auth-related variables as needed by Convex Auth

### Project Context
FinPilot is a mobile-first financial AI assistant that combines:
- Voice-powered interactions via ElevenLabs
- Visual AI capabilities through CopilotKit
- Real-time data synchronization with Convex
- Financial charting and insights generation

## Project Structure (Actual Implementation)

```
FinPilot-Project/
├── app/api/              # API routes (auth, copilotkit, elevenlabs, mcp)
├── src/
│   ├── features/        # Feature modules (auth, charts, chat, voice)
│   ├── components/      # Shared components
│   ├── utils/          # Helper functions (including critical toolBridge.ts)
│   └── hooks/          # Custom React hooks
├── convex/             # Backend (schema, auth, messages, charts, streaming, etc.)
└── public/             # Static assets
```

## Documentation Structure

This project uses layered documentation for different development needs:

- **CLAUDE.md** (this file): Primary context and quick reference for AI assistants
- **FinPilot-Project/ARCHITECTURE.md**: Core patterns, tool development, and troubleshooting
- **FinPilot-Project/TECHNICAL_REFERENCE.md**: Detailed implementation examples
- **memory/**: Extracted patterns, architecture, integrations, and decisions
- **specs/000-existing-baseline/**: Retroactive specification of current state

## Voice Tool Development (Updated January 2026)

**NEW**: Tools are now automatically registered for both text and voice modes via unified configuration.

When adding new tools:

1. **Add to toolBridge.ts**: Define the handler in `src/utils/toolBridge.ts`
2. **Add to elevenLabsTools.ts**: Register in `src/config/elevenLabsTools.ts` (automatically works in both modes)
3. **Update ActionHandlers interface**: Add the tool to the `ActionHandlers` interface in toolBridge.ts

### Current Tool List (11 Tools)
**Core Financial UI:**
- show_balance, show_savings_goal, show_document_id

**Charts:**
- create_pie_chart, create_bar_chart (replaces old show_spending_chart)

**Loans:**
- show_loans, show_lending_options

**Credit & EMI:**
- show_credit_score, show_emi_info

**Quizzes:**
- start_quiz, update_quiz (replaces old show_quiz)

**Removed Tools:**
- show_spending_chart → replaced by create_pie_chart/create_bar_chart
- show_quiz → replaced by start_quiz/update_quiz
- initiate_claim, show_claim_assistant, show_document_upload → not in toolBridge

## Key Development Patterns

### Message Format for UI Tools
```typescript
// All UI tools use this format:
`TOOL_CALL:${toolName}:${JSON.stringify(params)}`
```

### Bidirectional Communication
All interactive components should accept `onUserAction` prop for sending context back to voice agent:
```typescript
interface ComponentProps {
  onUserAction?: ((text: string) => void) | null;
}
```

### Testing Workflow
1. Test new tools via `/test-tools` page first (bypasses voice)
2. Check console for bridge logs: `🔧 Tool Called via Bridge`
3. Verify message rendering in `/voice-chat`
4. Test actual voice commands
5. Verify contextual updates work

## Common File Locations

**Critical for tools (Updated January 2026):**
- `src/utils/toolBridge.ts` - Tool routing and ActionHandlers interface
- `src/config/elevenLabsTools.ts` - Unified tool configuration (both text & voice)
- `src/providers/ElevenLabsProvider.tsx` - SDK integration and cross-tab coordination
- `src/components/chat/ToolCallMessageRenderer.tsx` - Message parsing
- `app/voice-chat/page.tsx` - Action handlers

**UI Components:**
- `src/components/charts/` - Financial UI components
- `src/features/` - Feature-specific components

**Backend:**
- `convex/messages.ts` - Message operations
- `convex/conversations.ts` - Conversation management
- `convex/schema.ts` - Database schema
- `convex/streaming.ts` - Real-time streaming operations
- `convex/charts.ts` - Chart data management

## Cross-Tab Session Coordination (New - January 2026)

The app now prevents duplicate ElevenLabs sessions across browser tabs:

### How It Works
- **Session Lock**: Uses localStorage to track which tab owns the current session
- **BroadcastChannel**: Real-time messaging between tabs
- **Heartbeat System**: Every 10 seconds to detect stale sessions
- **Stale Cleanup**: Orphaned sessions are cleaned up after 30 seconds

### For Users
- Only one tab can have an active voice/text session at a time
- Attempting to start a session in another tab shows an error
- Closing the active tab allows other tabs to take over
- UI shows "Active in another tab" warning when applicable

### For Developers
- Session state is stored in `localStorage.elevenlabs_session_lock`
- Cross-tab messages use BroadcastChannel('elevenlabs_session')
- Provider includes: `isOtherTabActive`, `otherTabMode`, `tabId` fields
- Lock is acquired AFTER successful connection, released on disconnect

## Established Code Patterns

### Component Pattern
```typescript
interface ComponentProps {
  data?: any;
  onUserAction?: ((text: string) => void) | null;  // Critical for voice
  compact?: boolean;
}

export function Component({ data, onUserAction, compact = false }: ComponentProps) {
  // Implementation
}
```

### Convex Query/Mutation Pattern
```typescript
export const functionName = query/mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Always use indexes for performance
    return await ctx.db.query("tableName")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();
  },
});
```

## Known Issues & Technical Debt

1. **Tool Registration**: Requires manual dual registration (toolBridge.ts + useVoiceRecording.ts)
2. **Schema Types**: Some Convex fields use `v.any()` that need proper typing
3. **Test Coverage**: No automated tests currently - manual testing via `/test-tools`
4. **Documentation Drift**: Some older MD files describe unimplemented features

## Quick Reference

### Add New Voice Tool
1. Define handler in `src/utils/toolBridge.ts`
2. Register in `src/components/unified/hooks/useVoiceRecording.ts` clientTools
3. Create UI component with `onUserAction` prop
4. Test via `/test-tools` page first

### Debug Voice Issues
1. Check ElevenLabs console for WebSocket errors
2. Verify streaming transcripts in Convex dashboard
3. Look for `🔧 Tool Called via Bridge` in browser console
4. Confirm tool registration in both required locations

### Common Development Tasks
- **Run dev server**: `npm run dev` (assumes localhost:3000)
- **Run Convex**: `npx convex dev` (separate terminal)
- **Test tools**: Navigate to `/test-tools`
- **Check voice**: Navigate to `/voice-chat`

## Recent Updates

### January 2026 - Unified SDK Migration
- Migrated to ElevenLabs React SDK for both text and voice modes
- Removed custom WebSocket hook (~500 lines)
- Added cross-tab coordination (BroadcastChannel + localStorage)
- Consolidated tools: 11 tools (up from 8) aligned with toolBridge.ts
- All tools now work in both text and voice modes
- No audio charges in text mode (verified with dual textOnly flags)
- Provider reduced from 973 → ~700 lines (-28%)
- Session lock prevents duplicate billing across tabs
- Heartbeat system maintains session and detects stale tabs

### September 2025
- Completed Spec Kit retrofit for better context management
- Extracted patterns from actual implementation
- Verified all tech stack versions
- Documented critical dual registration requirement
- Created comprehensive memory files for architecture and patterns