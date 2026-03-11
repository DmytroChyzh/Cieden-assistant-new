---
name: ElevenLabs Agent CLI Manager
description: Use for server side configuration of ElevenLabs agents and client tools using Agent CLI.
---

# ElevenLabs Agent CLI Manager

This skill helps manage ElevenLabs agents and client tools using the ElevenLabs Agent CLI (v0.5.0+).

## When to Use This Skill

Invoke this skill when you need to:
- Add or modify client tools for agents
- Update agent configuration (TTS model, audio quality, timeouts, etc.)
- Sync configuration between local files and ElevenLabs servers
- Troubleshoot tool registration or schema validation issues
- Check agent/tool status or pull latest configuration

## Prerequisites

- ElevenLabs Agent CLI installed globally (`npm i -g @elevenlabs/agents-cli`)
- Authenticated with `agents login`
- Project initialized with `agents init`

## Core Commands

### Agent Management

```bash
# Check status
agents status

# List local agents
agents list

# Pull latest from ElevenLabs
agents pull --all              # Everything
agents pull --update           # Update existing only
agents pull                    # New items only

# Push changes
agents push

# Delete agent
agents delete <agent_id>
```

### Tool Management

```bash
# Push tools
agents push-tools

# Pull tools
agents pull-tools --all        # All tools
agents pull-tools --update     # Update existing
agents pull-tools              # New only

# Add tools
agents add-client-tool <name>
agents add-webhook-tool <name>
```

## Project File Structure

```
FinPilot-Project/
├── agents.json                 # Agent registry
├── tools.json                  # Tool registry
├── agent_configs/
│   └── prod/
│       └── support_agent.json  # Agent configuration
└── tool_configs/
    ├── show_balance.json       # Tool configs
    ├── create_pie_chart.json
    └── ...
```

## Common Workflows

### 1. Adding a New Client Tool

**Step 1: Create tool configuration**

```bash
cat > tool_configs/my_new_tool.json << 'EOF'
{
    "type": "client",
    "name": "my_new_tool",
    "description": "Clear description of what this tool does for the LLM",
    "response_timeout_secs": 20,
    "disable_interruptions": false,
    "force_pre_tool_speech": false,
    "assignments": [],
    "parameters": {
        "type": "object",
        "required": [],
        "description": "",
        "properties": {}
    },
    "expects_response": false,
    "dynamic_variables": {
        "dynamic_variable_placeholders": {}
    },
    "execution_mode": "immediate"
}
EOF
```

**Important:** If tool has parameters, ensure property names in `required` array EXACTLY match keys in `properties` object (case-sensitive).

**Step 2: Register in tools.json**

Add entry:
```json
{
    "name": "my_new_tool",
    "type": "client",
    "config": "tool_configs/my_new_tool.json"
}
```

**Step 3: Push to ElevenLabs**

```bash
agents push-tools
```

**Step 4: Update codebase**

Tools must be registered in TWO places:
1. `src/utils/toolBridge.ts` - Add handler function
2. `src/config/elevenLabsTools.ts` - Add to createClientTools()

### 2. Updating Agent Configuration

**Step 1: Backup and pull**

```bash
cp agent_configs/prod/support_agent.json agent_configs/prod/support_agent.json.backup
agents pull --update
```

**Step 2: Edit configuration**

Common settings to update:
- `tts.model_id`: "eleven_flash_v2" or "eleven_turbo_v2" (English only)
- `turn.silence_end_call_timeout`: 30 (seconds)
- `asr.user_input_audio_format`: "pcm_24000" (16000/24000/48000)
- `tts.agent_output_audio_format`: "pcm_24000"
- `vad.background_voice_detection`: true
- `conversation.client_events`: Add "vad_score" for real-time voice detection

**Step 3: Push changes**

```bash
agents push
```

### 3. Full Sync

```bash
# Pull everything
agents pull-tools --all
agents pull --all

# Check status
agents status

# Push all changes
agents push-tools
agents push
```

## Configuration Reference

### Agent Configuration Structure

```json
{
    "name": "Support agent",
    "conversation_config": {
        "asr": {
            "quality": "high",
            "user_input_audio_format": "pcm_24000"
        },
        "turn": {
            "turn_timeout": 7,
            "silence_end_call_timeout": 30,
            "mode": "turn"
        },
        "tts": {
            "model_id": "eleven_flash_v2",
            "voice_id": "voice_id_here",
            "agent_output_audio_format": "pcm_24000",
            "optimize_streaming_latency": 3,
            "stability": 0.5,
            "speed": 1,
            "similarity_boost": 0.8
        },
        "conversation": {
            "text_only": false,
            "max_duration_seconds": 600,
            "client_events": [
                "audio",
                "interruption",
                "agent_response",
                "user_transcript",
                "agent_response_correction",
                "agent_tool_response",
                "vad_score"
            ]
        },
        "vad": {
            "background_voice_detection": true
        }
    }
}
```

### Tool Configuration Structure

```json
{
    "type": "client",
    "name": "tool_name",
    "description": "Clear description for LLM to understand when to use this tool",
    "response_timeout_secs": 20,
    "parameters": {
        "type": "object",
        "required": ["param1"],
        "properties": {
            "param1": {
                "type": "string",
                "description": "Parameter description"
            }
        }
    }
}
```

### Critical Configuration Values

**Audio Formats:**
- `pcm_16000` - 16kHz (basic)
- `pcm_24000` - 24kHz (recommended)
- `pcm_48000` - 48kHz (high quality)

**TTS Models (English only):**
- `eleven_flash_v2` - Fastest, lowest latency
- `eleven_turbo_v2` - Balanced
- Note: v2.5 models NOT available for English

**Client Events:**
- `audio` - Audio stream
- `interruption` - User interrupts
- `agent_response` - Agent text
- `user_transcript` - Finalized speech-to-text (NO interim/tentative support)
- `agent_response_correction` - Corrections
- `agent_tool_response` - Tool execution
- `vad_score` - Real-time voice activity (0-1)

## Common Issues and Solutions

### Issue 1: Schema Validation Error

**Error:** `Required property X not in properties`

**Cause:** Property name mismatch between `required` and `properties`

**Fix:**
```json
// ❌ WRONG
{
    "required": ["user_id"],
    "properties": {
        "userId": { ... }
    }
}

// ✅ CORRECT
{
    "required": ["userId"],
    "properties": {
        "userId": { ... }
    }
}
```

### Issue 2: Array Parameter Error

**Error:** `Expected enum. Received "array"` or `Missing required key "items"`

**Cause:** ElevenLabs doesn't support array types directly in parameters

**Fix:** Use string type with JSON encoding
```json
{
    "data": {
        "type": "string",
        "description": "JSON string array. Example: [{\"name\":\"Item\",\"value\":123}]"
    }
}
```

### Issue 3: Model Version Error

**Error:** `English Agents must use turbo or flash v2`

**Cause:** Trying to use v2.5 model with English language

**Fix:** Use v2 models only
```json
{
    "tts": {
        "model_id": "eleven_flash_v2"  // NOT v2_5
    }
}
```

### Issue 4: Tool Not Working in Voice

**Problem:** Tool works in test page but not via voice

**Cause:** Tool not registered in both required locations

**Fix:** Register tool in BOTH:
1. `src/utils/toolBridge.ts` - Handler function
2. `src/config/elevenLabsTools.ts` - createClientTools()

### Issue 5: Unknown Command

**Error:** `error: unknown command 'fetch'` or `'sync'`

**Cause:** Using incorrect command names

**Fix:** Use correct commands:
- ✅ `agents pull`
- ✅ `agents push`
- ✅ `agents list`
- ❌ `agents fetch`
- ❌ `agents sync`
- ❌ `agents list-agents`

## Best Practices

1. **Always backup before pulling:**
   ```bash
   cp agent_configs/prod/support_agent.json{,.backup}
   ```

2. **Use version control:**
   ```bash
   git add agents.json tools.json agent_configs/ tool_configs/
   git commit -m "Update agent configuration"
   ```

3. **Validate before pushing:**
   ```bash
   agents status  # Check for issues first
   ```

4. **Keep tools and code in sync:**
   - Create tool config → Register → Push → Update code → Test

5. **Test thoroughly:**
   - Test in `/test-tools` page first
   - Then test via voice in `/voice-chat`
   - Check console for logs: `🔧 Tool Called via Bridge`

6. **Document parameters clearly:**
   Write clear descriptions that help the LLM understand when and how to use tools

7. **Enable all relevant events:**
   Include all client_events for better debugging and monitoring

## Tool Development Checklist

When adding a new tool, complete all steps:

- [ ] Create tool config in `tool_configs/new_tool.json`
- [ ] Add entry to `tools.json`
- [ ] Push with `agents push-tools`
- [ ] Add handler to `src/utils/toolBridge.ts`
- [ ] Add to `src/config/elevenLabsTools.ts`
- [ ] Test in `/test-tools` page
- [ ] Test via voice in `/voice-chat`
- [ ] Verify in ElevenLabs dashboard
- [ ] Document in project CLAUDE.md



## Quick Command Reference

```bash
# Status
agents status                   # Check sync status
agents list                     # List agents
agents whoami                   # Auth status

# Pull
agents pull --update            # Update existing
agents pull-tools --all         # All tools

# Push
agents push                     # Push agents
agents push-tools               # Push tools

# Development
agents watch                    # Auto-sync
agents test <agent>             # Run tests
```

## Resources

- Project CLAUDE.md - Architecture and patterns
- `src/utils/toolBridge.ts` - Tool handlers
- `src/config/elevenLabsTools.ts` - Tool registrations
- ElevenLabs Docs: https://elevenlabs.io/docs/agents-platform/

## Troubleshooting Steps

When tools aren't working:

1. Check tool in tools.json
2. Verify no schema errors in tool config
3. Confirm pushed successfully: `agents push-tools`
4. Check toolBridge.ts has handler
5. Verify elevenLabsTools.ts has registration
6. Look for console log: `🔧 Tool Called via Bridge`
7. Check ElevenLabs dashboard shows tool
8. Test message format: `TOOL_CALL:tool_name:{"params":"here"}`

---

## Version History

- **v1.0.0** (January 2025) - Initial skill creation
  - CLI v0.5.0
  - 11 client tools
  - 1 active agent
  - Comprehensive workflows and troubleshooting
