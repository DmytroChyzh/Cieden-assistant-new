<!-- 2bb979fc-f520-4e10-be34-20ae48adb4cb 18f5cfd8-36c4-4222-b529-bce02940bf9c -->
# Widget → Primary App: 100% Parity (Anonymous, GTM)

## Status Summary (October 2025)

**Current State:** Phase 0 ~70% complete in `feat/embed-widget` branch (git worktree)
**Location:** `/Users/yuriy.mykhasyak/Documents/MyApps/FinPilot/FinPilot-Project-widget`
**Next Critical Step:** Phase 1 - ElevenLabsProvider Integration (blocks tool parity)

**Key Findings from Codex Review:**
- ✅ Widget infrastructure exists: embed route, GTM loader, anonymous HTTP routes, visitor ownership
- ⚠️ Voice uses raw WebSocket - **NO** `@elevenlabs/react` provider integration yet
- ❌ Zero client tools registered - no show_balance, charts, quizzes work in widget
- ❌ CORS wildcard instead of strict allowlist
- ❌ Missing rate limiting, CSP headers, structured logging

**Estimated Total Effort:** 14-20 days (Phases 1-7)

---

## Assumptions

- No authentication in widget; anonymous sessions via visitorId (UUID stored in iframe localStorage).
- Keep using existing Convex tables; set `userId = visitorId` for all writes/reads.
- ElevenLabs remains the voice/text engine. Agent tool calls must work in-widget.
- Widget loads via GTM (loader script + iframe), becomes the main UI; existing app can be deprecated later.

## High-level Approach

- Bring the widget to parity by reusing core providers and flows from the app, adapted for anonymous context.
- Register ElevenLabs client tools in the widget (same as app) and persist results via anonymous Convex HTTP Actions.
- Where app mutations/queries require auth, expose anon-safe HTTP Actions that enforce visitor ownership and CORS allowlist.
- Keep UI minimal but feature-complete: dynamically import heavier components (charts, transcripts) when needed.

## Feature Parity Plan

1) Voice/Text Transport Parity

- Create `src/embed/ElevenLabsWidgetProvider.tsx` mirroring `src/providers/ElevenLabsProvider.tsx` but:
- Anonymous conversation bootstrap (get/create via widget HTTP).
- Register `clientTools: createClientTools(...)` for tool parity.
- Persist user + assistant messages and streaming transcripts (HTTP Actions).
- Honor the same connection heuristics, timeouts, cross-tab control is optional (single-iframe).

2) Tool Calls Parity (Charts, Actions, MCP)

- Client tools in-widget call server via anon HTTP Actions:
- Option A (primary): call existing Convex MCP HTTP (`/mcp` on `.convex.site`) for tool execution; persist outputs via widget `/assistant` route.
- Option B (for non-MCP tools that write data): dedicated widget HTTP routes that internally call `api.*` using `ctx.runMutation` with visitor ownership checks.
- Ensure chart creation (`charts.create`) and tool messages are persisted into `messages` with metadata (chartId, toolCall).

3) Data Features Parity

- Add anon HTTP routes that wrap internal logic for:
- Conversations/messages (done), transcript streams (`streaming.ts`), sessions (`sessions.ts`), context (`context.ts`), charts (`charts.ts`).
- Optional parity: savings, quizzes, documents (if required by agent/tools) via restricted anon routes keyed by visitorId.
- All routes enforce: origin allowlist, CORS/OPTIONS, visitor ownership, and lightweight rate limiting per visitorId + IP.

4) UI Parity (Widget Shell ≈ App Chat)

- Build `src/embed/ui/*` components approximating app renderers (message list, tool result cards, charts):
- Use dynamic import for `recharts` views and heavy UI to keep TTI small.
- Show streaming transcript UI when voice active; show chart cards when tool returns chartId.
- Keep compact input area; add a gear menu for basic settings (theme, language) stored per-visitor.

5) Settings (Anonymous Preferences)

- Introduce `visitorPreferences` (Convex table or reuse `userPreferences` with visitorId) and HTTP routes to get/update.
- Support theme/language initially; leave room for more toggles later.

6) Security & Perf

- Headers on `/embed/widget`: `frame-ancestors` from env allowlist; `Permissions-Policy` for mic/autoplay.
- All Convex HTTP Actions: strict CORS to allowed origins; simple rate-limit per visitorId/IP; structured validation and consistent 4xx errors.
- Use `.convex.site` for HTTP Actions in cloud; `/http` locally.
- Logging/observability: tag messages/streams with visitorId and conversationId.

7) QA & Rollout

- Manual matrix: desktop/mobile (iOS/Android), Safari/Chrome/Firefox/Edge.
- GTM preview end-to-end: load bubble → open iframe → text, voice, tool calls, charts.
- Staged allowlist + flag; keep legacy app read-only during validation; migrate links to new widget.

## Files/Areas to Update (key examples)

- ElevenLabs provider parity:
- New: `src/embed/ElevenLabsWidgetProvider.tsx` (adapt from `src/providers/ElevenLabsProvider.tsx`).
- Update: `app/embed/widget/page.tsx` to use the provider + settings context.
- Widget UI:
- New: `src/embed/ui/MessageList.tsx`, `src/embed/ui/InputBar.tsx`, `src/embed/ui/ChartCard.tsx`, `src/embed/ui/Transcript.tsx`.
- Convex HTTP Actions (anon safe):
- Update: `convex/http.ts` (already includes widget routes) → add transcript, sessions, context, charts routes.
- New: `convex/widgetInternal.ts` (internal mutations/queries for anon flows; ownership checks).
- Tool execution paths:
- Use `https://<dev>.convex.site/mcp` for MCP tools; on result, POST summary to `/widget/assistant`.
- For non-MCP actions, dedicated widget routes call `api.*` internally.
- Loader script:
- `public/finpilot-widget.js` stays thin; no business logic.
- Docs:
- `docs/embed/INTEGRATION.md`, `SECURITY.md`, `VOICE.md` (expand with tool parity and settings).

## Phased Delivery

### Phase 0: Baseline (PARTIAL - ~70% Complete) [feat/embed-widget branch]

**✅ Completed:**
- Embed route with origin allowlist: `app/embed/widget/page.tsx`
- GTM loader script (thin): `public/finpilot-widget.js`
- Anonymous HTTP routes: `/widget/get-or-create`, `/widget/messages`, `/widget/send`, `/widget/assistant`
- Visitor ownership checks: `convex/visitorInternal.ts`
- Basic text chat UI: `src/embed/WidgetApp.tsx`

**⚠️ Partially Complete:**
- Voice uses raw WebSocket (lines 124-139 in WidgetApp.tsx) - NO ElevenLabsProvider integration
- CORS uses reflection/wildcard - NOT strict allowlist enforcement
- No CSP headers (`frame-ancestors`, `Permissions-Policy`)

**❌ Missing:**
- No client tools registration (11 tools from `elevenLabsTools.ts`)
- No `@elevenlabs/react` provider integration
- No tool output persistence pipeline
- No rate limiting (per visitorId or IP)
- No structured logging with visitorId

**Blockers for Phases 1-4:** Must integrate ElevenLabsProvider before tool parity can work.

---

### Phase 1: ElevenLabs Provider Integration (CRITICAL - Blocks tool parity)

**Goal:** Replace raw WebSocket with `@elevenlabs/react` provider for unified tool support.

**Tasks:**
- Create `src/embed/ElevenLabsWidgetProvider.tsx` adapting `src/providers/ElevenLabsProvider.tsx`:
  - Text mode: Signed URL + dual `textOnly` flags (prevent audio charges)
  - Voice mode: WebRTC via agent ID
  - Register `clientTools: createClientTools(actionHandlers)` (11 tools)
  - Queue tool outputs via `queueToolMessage` → `POST /widget/assistant`
- Wire provider into `src/embed/WidgetApp.tsx` (remove manual WS)
- Test: Voice + text work, tool calls trigger (even if UI not rendered yet)

**Files Modified:**
- New: `src/embed/ElevenLabsWidgetProvider.tsx` (~300-400 lines)
- Update: `src/embed/WidgetApp.tsx` (remove lines 110-158, wrap with provider)

**Estimate:** 3-4 days

---

### Phase 2: Tool Execution Parity (Charts, MCP, Messages)

**Goal:** Make all 11 tools work in widget with proper persistence.

**Tasks:**
- Add MCP API key to widget context (required for `/mcp` endpoint)
- Add anonymous HTTP routes:
  - `POST /widget/charts/create` → calls `visitorInternal.createChart`
  - `POST /widget/transcript/create` → returns `streamId` for streaming
  - Extend `convex/visitorInternal.ts` with chart/stream helpers
- Wire chart tools through MCP → persist chartId via `/widget/assistant`
- Test matrix: All 11 tools execute and persist correctly

**Files Modified:**
- Update: `convex/http.ts` (add chart/transcript routes)
- Update: `convex/visitorInternal.ts` (add createChart, createStream helpers)
- Update: `src/embed/ElevenLabsWidgetProvider.tsx` (pass MCP API key)

**Estimate:** 2-3 days

---

### Phase 3: Sessions/Context Parity (Optional - Defer if not critical)

**Goal:** Support session tracking and context preservation.

**Tasks:**
- Add anon HTTP routes for sessions (create/end/transition)
- Add anon HTTP routes for context (save/merge)
- Wire provider to call these on session lifecycle events

**Estimate:** 1-2 days (or defer post-MVP)

---

### Phase 4: UI Parity (Tool Renderers + Charts)

**Goal:** Render tool results beautifully in widget.

**Tasks:**
- Import `ToolCallMessageRenderer` from main app
- Add dynamic imports for chart components:
  - `ChartMessage` from `src/components/charts/ChartMessage.tsx`
  - Other tool UI components as needed
- Update `src/embed/WidgetApp.tsx` message list to use renderer
- Style for compact iframe layout

**Files Modified:**
- Update: `src/embed/WidgetApp.tsx` (replace plain bubbles with ToolCallMessageRenderer)
- New: `src/embed/ui/CompactToolRenderer.tsx` (optional wrapper for iframe sizing)

**Estimate:** 2-3 days

---

### Phase 5: Visitor Preferences + Settings UI

**Goal:** Persist theme/language per visitor.

**Tasks:**
- Add anonymous HTTP routes for visitor preferences (get/update)
- Build gear menu in widget (theme, language selectors)
- Store preferences via `visitorId` key

**Estimate:** 1-2 days

---

### Phase 6: Security Hardening (REQUIRED before production)

**Goal:** Lock down widget for production deployment.

**Tasks:**
- **CORS Enforcement:** Replace wildcard with strict allowlist from `WIDGET_ALLOWED_ORIGINS`
  - Fix: `convex/http.ts` lines 563-567, 587-591, 611-615, 643-647
- **CSP Headers:** Add `frame-ancestors` + `Permissions-Policy: microphone=(self)` to `/embed/widget`
  - Fix: `app/embed/widget/page.tsx` or Next.js headers config
- **Rate Limiting:** Per visitorId (10 req/min) + per IP (100 req/min)
  - New: `convex/rateLimit.ts` helper
  - Wire into all `/widget/*` routes
- **Logging:** Tag all widget logs with `visitorId` + `conversationId`

**Files Modified:**
- Update: `convex/http.ts` (strict CORS on all widget routes)
- Update: `app/embed/widget/page.tsx` or `next.config.ts` (CSP headers)
- New: `convex/rateLimit.ts`

**Estimate:** 2-3 days

---

### Phase 7: QA & Rollout

**Goal:** Validate across browsers/devices, deploy to production.

**Tasks:**
- Manual testing matrix: Desktop/mobile, Safari/Chrome/Firefox/Edge
- GTM preview testing: Bubble → iframe → text/voice/tools
- Staged rollout with allowlist + feature flag
- Monitor logs for errors, adjust rate limits if needed

**Estimate:** 2-3 days

## Risks & Mitigations

- Anonymous write surface expansion → enforce strict origin allowlist + per-visitor limits.
- Bundle size growth → dynamic import heavy UI; defer SDK where possible.
- Tool parity drift → centralize tool calls through MCP where feasible; add integration tests.

### To-dos

- [ ] Create ElevenLabsWidgetProvider with client tools parity
- [ ] Add anon HTTP routes for transcripts, sessions, context, charts
- [ ] Wire widget tool calls through MCP; persist outputs
- [ ] Render chart results via dynamic ChartCard
- [ ] Build MessageList/InputBar/Transcript compact components
- [ ] Add visitor preferences (theme/language) and gear menu
- [ ] Add per-visitor/IP rate limiting on widget routes
- [ ] Add structured logs for widget routes with visitorId
- [ ] Add E2E scripts for create/send/assistant/messages + tools
- [ ] Update docs for tool parity, settings, rollout steps

