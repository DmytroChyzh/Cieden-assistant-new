<!-- b1c2b0ed-65ae-4873-976c-fe09bf698d9f fa252810-34a8-4583-a120-e998f1a1d16c -->
# Embeddable Voice Chat Widget (GTM, voice, anon) — Next.js route, regression‑safe

### Scope (MVP)

- Voice + text chat inside an iframe, embeddable via GTM, no login (anonymous `visitorId`).
- Persist conversation history to Convex; (manual cleanup acceptable for MVP).
- Server‑side origin allowlist and per‑route security headers.

### Non‑goals (to avoid overengineering)

- No redesign of existing chat/voice pages.
- No changes to `middleware.ts` auth flows.
- No CopilotKit integration inside the widget (keep light UI).
- No real‑time cross‑app state sharing; widget is isolated.

### Architecture

- Embed via GTM loader → floating button + iframe → `GET /embed/widget?theme=..&org=..`.
- Widget page renders a minimal React UI; voice loaded on demand.
- Anonymous sessions: `visitorId` (UUID) in iframe localStorage → Convex httpActions for list/send/getOrCreate.
- Security controls:
- CSP: `frame-ancestors` allowlist for `/embed/widget` only.
- Permissions-Policy: mic/autoplay allowed on `/embed/widget` route; iframe sets `allow="microphone; autoplay; clipboard-read; clipboard-write"`.
- Server allowlist: verify `Origin`/`Referer` against `WIDGET_ALLOWED_ORIGINS` on the widget route; render a blocked page if invalid.
- postMessage: parent↔child messages validated by origin (optional; keep minimal).

### Implementation (minimal, additive only)

- New Next.js route: `app/embed/widget/page.tsx`
- Reads query params (`theme`, `org`), generates/reads `visitorId`, renders widget UI.
- Loads voice module dynamically on mic click to keep initial JS small.
- Loader script: `public/finpilot-widget.js`
- Creates FAB + iframe; sets `allow` attributes; toggles visibility.
- Convex anon endpoints: `convex/visitor.ts` (httpActions)
- `getOrCreateConversationHttp` (POST): returns `conversationId` for `visitorId`.
- `listMessagesHttp` (GET): messages for `conversationId` + `visitorId`.
- `sendMessageHttp` (POST): creates message; validates ownership.
- Set CORS headers to allow iframe origin; simple rate limit per `visitorId`.
- Headers
- Extend `next.config.ts` `headers()` with an entry for `source: '/embed/widget'` setting:
- `Content-Security-Policy: frame-ancestors <allowlist>`
- `Permissions-Policy: microphone=(self), autoplay=(self)`
- Ensure no `X-Frame-Options: DENY` for this route.
- Voice
- Use existing `GET /api/elevenlabs/signed-url` from inside iframe.
- Establish voice session via ElevenLabs SDK/WebRTC when user clicks mic.

### Guardrails (do NOT change)

- Do not modify `middleware.ts`, `app/voice-chat/**`, `src/providers/**`, `components/**` aside from adding new files listed above.
- Do not alter existing Convex tables; reuse `conversations/messages` with `userId = visitorId`.
- Do not change `/api/elevenlabs/**` semantics; only call existing endpoints.
- Do not add heavy deps to widget; avoid Tailwind, framer‑motion, icon packs; use small inline CSS and a single SVG.
- Keep widget code under `src/embed/` with no imports from app‑internal pages.
- Feature flag: gate rendering via `NEXT_PUBLIC_WIDGET_ENABLED`; if false, widget route returns a small disabled page.

### Acceptance tests (how we verify)

- GTM loader
- Inject Custom HTML in GTM Preview; bubble appears; no console errors; no layout shift (iframe has fixed size).
- Toggle bubble; iframe shows/hides.
- Security/Headers
- On allowed domain: iframe loads; check response headers for CSP `frame-ancestors` and Permissions‑Policy.
- On blocked domain: iframe shows blocked message (HTTP 200 page content), no network calls to Convex.
- Anonymous data flow
- First open creates `visitorId`; send a text; refresh; message persists.
- `visitorId` from one browser cannot read messages created by a different `visitorId` (direct API calls return 403/empty).
- Voice
- Mic click asks permission; voice session connects; agent responds; a transcript snippet is stored.
- If mic is denied, widget gracefully falls back to text (no unhandled errors).
- Performance budgets
- Loader script ≤ 2 KB gz; initial widget JS ≤ ~70 KB (React) with voice chunk deferred; TTI not impacted since iframe loads on click.
- Error handling
- ElevenLabs failure: show retry; text still works.
- Convex httpAction failure: show toast; prevent loops.

### Rollout & rollback

- Default off: `NEXT_PUBLIC_WIDGET_ENABLED=false` until GTM test passes.
- Ship on a separate branch; deploy; validate on a staging domain in GTM Preview.
- Turn on allowlist + flag; publish GTM.
- Rollback: disable flag, remove allowlist entry, unpublish GTM tag.

### Risks & mitigations

- Mic in iframe: require explicit user gesture; `allow` attributes set; document browser quirks.
- Cross‑origin Convex: CORS headers on httpActions; validate origin and `visitorId` ownership.
- Regression risk: limited by additive files, explicit guardrails, and no changes to existing routes/providers.

### Docs to ship

- `docs/embed/INTEGRATION.md`: GTM steps + loader snippet + allowed origins.
- `docs/embed/SECURITY.md`: CSP, Permissions‑Policy, CORS, rate limiting, retention.
- `docs/embed/VOICE.md`: permission prompts, autoplay notes, troubleshooting.

### Implementation todos

- setup-embed-route: Create `app/embed/widget/page.tsx` rendering widget shell [public]
- loader-script: Add `public/finpilot-widget.js` with `FinPilotWidget.init()`
- convex-visitor-http: Add anon Convex httpActions with CORS + rate limit
- widget-ui: Build minimal UI under `src/embed/` (list, input, mic)
- voice-elevenlabs: Integrate ElevenLabs WebRTC with deferred load
- headers-embed: Add per‑route CSP/Permissions‑Policy for `/embed/widget`
- docs-integration: Write `docs/embed/INTEGRATION.md`
- docs-security: Write `docs/embed/SECURITY.md` and `VOICE.md`
- manual-test: Run GTM Preview + cross‑browser/device matrix

### To-dos

- [ ] Create public route app/embed/widget/page.tsx rendering widget shell
- [ ] Add convex/visitor.ts with anon list/send/getOrCreate using visitorId
- [ ] Build src/components/embed/WidgetApp.tsx (list, input, mic button)
- [ ] Wire ElevenLabs WebRTC in widget, no auth, minimal transcripts
- [ ] Publish public/finpilot-widget.js and global init() API
- [ ] Enforce WIDGET_ALLOWED_ORIGINS in embed page; add CSP frame-ancestors
- [ ] Write docs/embed/INTEGRATION.md with GTM steps and snippet
- [ ] Write docs/embed/SECURITY.md and data retention notes
- [ ] Run manual test matrix across major browsers and pages