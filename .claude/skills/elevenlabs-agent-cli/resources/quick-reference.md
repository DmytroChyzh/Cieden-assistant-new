# ElevenLabs Agent CLI - Quick Reference

## One-Line Commands

```bash
# Status & Info
agents status                    # Check sync status
agents list                      # List local agents
agents whoami                    # Check auth status
agents --version                 # Check CLI version

# Sync Operations
agents pull --update            # Pull latest agent config
agents push                     # Push agent changes
agents pull-tools --all         # Pull all tools
agents push-tools               # Push tool changes

# Development
agents watch                    # Auto-sync on changes
agents test <agent_name>        # Run tests
```

## Common Workflows

### Add New Tool (3 steps)
```bash
# 1. Create config
cat > tool_configs/my_tool.json << 'EOF'
{"type":"client","name":"my_tool","description":"...","parameters":{...}}
EOF

# 2. Register in tools.json (add entry)

# 3. Push
agents push-tools
```

### Update Agent Config (3 steps)
```bash
# 1. Backup + Pull
cp agent_configs/prod/support_agent.json{,.backup}
agents pull --update

# 2. Edit agent_configs/prod/support_agent.json

# 3. Push
agents push
```

### Full Sync (2 steps)
```bash
# 1. Pull everything
agents pull-tools --all && agents pull --all

# 2. Push everything
agents push-tools && agents push
```

## Critical Field Values

### Audio Formats
- `pcm_16000` - Basic (16kHz)
- `pcm_24000` - Good (24kHz) ⭐
- `pcm_48000` - High (48kHz)

### TTS Models (English only)
- `eleven_flash_v2` - Fastest ⭐
- `eleven_turbo_v2` - Balanced

### Client Events (enable all)
```json
["audio","interruption","agent_response","user_transcript",
"agent_response_correction","agent_tool_response","vad_score"]
```

### Important Settings
```json
{
  "silence_end_call_timeout": 30,        // seconds
  "optimize_streaming_latency": 3,       // 0-4
  "background_voice_detection": true,    // enable
  "user_input_audio_format": "pcm_24000"
}
```

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `unknown command 'fetch'` | Use `agents pull` |
| `Required property X not in properties` | Match property names exactly in required/properties |
| `Expected enum. Received "array"` | Use `"type": "string"` with JSON description |
| `must use turbo or flash v2` | Use `eleven_flash_v2` not `v2_5` |
| Tool works in test-tools not voice | Register in both toolBridge.ts AND elevenLabsTools.ts |

## File Locations

```
.
├── agents.json                    # Agent registry
├── tools.json                     # Tool registry
├── agent_configs/prod/*.json      # Agent configurations
├── tool_configs/*.json            # Tool configurations
├── src/utils/toolBridge.ts        # Tool handlers
└── src/config/elevenLabsTools.ts  # Tool registrations
```

## Schema Templates

### Minimal Tool
```json
{
  "type": "client",
  "name": "tool_name",
  "description": "What it does",
  "parameters": {"type": "object", "properties": {}}
}
```

### Tool with Parameters
```json
{
  "type": "client",
  "name": "show_balance",
  "description": "Shows user balance",
  "parameters": {
    "type": "object",
    "required": ["userId"],
    "properties": {
      "userId": {
        "type": "string",
        "description": "User identifier"
      }
    }
  }
}
```

## Current Project State

- **Agent**: Support agent (agent_6301k7vxwa13f2qbna6q0rxa88t8)
- **Tools**: 11 client tools (show_balance, create_pie_chart, etc.)
- **Audio**: pcm_24000
- **Model**: eleven_flash_v2
- **CLI**: v0.5.0

## Tool Development Checklist

1. Create `tool_configs/new_tool.json`
2. Add to `tools.json`
3. Run `agents push-tools`
4. Add handler in `src/utils/toolBridge.ts`
5. Register in `src/config/elevenLabsTools.ts`
6. Test in `/test-tools`
7. Test in `/voice-chat`

## Need More Info?

See full skill: `.claude/skills/elevenlabs-agent-cli.md`
