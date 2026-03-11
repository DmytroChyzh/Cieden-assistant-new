### Skills

Non-obvious knowledge and gotchas for ElevenLabs integration. **Focus**: Things NOT in training data or official docs.

## ElevenLabs Voice Settings - Critical Gotchas
**Path**: `elevenlabs-voice-settings/skill.md`

**Non-Obvious Knowledge**:
- Only `voice_id` works in runtime overrides (speed/stability silently ignored)
- camelCase (SDK) vs snake_case (API) inconsistency causes silent failures
- Security toggle required for overrides (disabled by default, no error shown)
- Config updates have 100-500ms propagation delay (race condition)
- textOnly requires BOTH flags or you get billed for audio
- stability sweet spots (0.65-0.75, not linear 0-1)
- similarity_boost >0.85 causes distortion
- Voice cache can be stale, needs cache-busting

**Supporting Files**:
- [docs-index.md](./elevenlabs-voice-settings/docs-index.md) - 50+ documentation URLs
- [quick-reference.md](./elevenlabs-voice-settings/quick-reference.md) - Quick commands

---

## ElevenLabs Session Restart - Critical Edge Cases
**Path**: `elevenlabs-session-manager/skill.md`

**Non-Obvious Knowledge**:
- `status === 'disconnected'` doesn't mean audio stopped (must manually cleanup)
- Config updates don't apply to current session (must restart)
- Config propagation delay causes race conditions (add 500ms wait)
- Dynamic variables lost on restart (must re-inject via overrides)
- Overrides not persistent across sessions (must pass every time)
- Pending audio streams continue after disconnect
- Cross-tab duplicate sessions (double billing without session lock)
- Restarting mid-speech is jarring (wait for silence)

**Supporting Files**:
- [restart-patterns.md](./elevenlabs-session-manager/restart-patterns.md) - Common patterns
- [troubleshooting.md](./elevenlabs-session-manager/troubleshooting.md) - Debug guide

---

## Skill Philosophy

**✅ Skills Should Contain**:
- Non-obvious behaviors and gotchas
- Edge cases that cause bugs
- Things NOT in official documentation
- Undocumented timing/race conditions
- Silent failures and their causes
- Counter-intuitive API behaviors

**❌ Skills Should NOT Contain**:
- Basic API usage (that's in training data)
- Standard patterns (obvious to any developer)
- Generic TypeScript/React knowledge
- Step-by-step implementation guides
- Project-specific code

**Example**:

```markdown
❌ Don't Include (Obvious):
"Use fetch() to call the API"
"Store state in useState"
"Loop through array with .map()"

✅ Do Include (Non-Obvious):
"textOnly requires BOTH flags or you still get charged for audio"
"Config updates have 500ms propagation delay causing race conditions"
"Override persistence only lasts ONE session, not permanent"
```

---

## Documentation Reference

Complete ElevenLabs API documentation: [docs-index.md](./elevenlabs-voice-settings/docs-index.md)

---

**Purpose**: Save hours of debugging by documenting edge cases and gotchas
**Last Updated**: January 2026
