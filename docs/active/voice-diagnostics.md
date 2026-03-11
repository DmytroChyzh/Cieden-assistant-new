### Voice diagnostics - how to enable and read logs

Enable diagnostics
- Development: Enabled by default.
- Production: Set `NEXT_PUBLIC_VOICE_DIAGNOSTICS=true` in `.env.local` and rebuild.

What gets logged
- Prefixed with `[perf]` in the console.
- All logs include a `label`, `phase`, and `dtMs` (elapsed since the start of that timer).

Key timers and phases
- `voice.start` (attempt-scoped; attempt 1 or 2)
  - `enter`: start of the attempt (includes `attemptId`, `attempt`, and applied prefs)
  - `transport_mounted`: Voice transport mounted (after internal ready)
  - `startSession_call` / `startSession_return`: SDK startSession call envelope
  - `connected`: after waiting for WebRTC “connected”
  - `lock_acquired`: after session lock is written and broadcast
  - `attempt1_failed`: only when attempt 1 fails (includes reason)
  - `fast_stop_text_done`: fast-stop text completed (ms)
  - `connected_event` / `disconnected_event`: emitted by SDK callbacks (correlated via `attemptId`)

- One-off events:
  - `voice.force_stop_previous_tab_wait`: time spent waiting before takeover (~300ms)
  - `voice.transport_ready`: child transport mounted and ready

- Hook preflight (`voice.hook_start`)
  - `waitForMessages_done`: time the hook waited for Convex `messages` to resolve (up to ~500ms)
  - `buildHistory_done`: time to build `conversationHistory`
  - `provider_done`: time spent inside `startVoice` call
  - `complete`: total setup time (matches existing “Total setup time”)

How to use outputs
- Comparing `startSession_return → connected` highlights ICE/TURN handshake latency.
- Large `waitForMessages_done` suggests first-load data wait.
- Frequent `attempt1_failed` with short `fast_stop_text_done` indicates concurrent text/voice interactions forcing a retry.





