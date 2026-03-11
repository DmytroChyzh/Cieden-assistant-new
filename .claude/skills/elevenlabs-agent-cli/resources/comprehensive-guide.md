# ElevenLabs Agent CLI Management Skill

This skill provides comprehensive guidance for managing ElevenLabs agents and client tools using the Agent CLI.

## Prerequisites

- ElevenLabs Agent CLI v0.5.0+ installed globally
- Authenticated with `agents login`
- Project initialized with `agents init`

## Core Commands Reference

### Agent Management

```bash
# Check status of all agents
agents status

# List local agents
agents list

# Pull latest configuration from ElevenLabs
agents pull --all              # Pull everything (new + existing)
agents pull --update           # Update existing only
agents pull                    # Pull new items only

# Push agents to ElevenLabs
agents push

# Delete an agent
agents delete <agent_id>

# Add new agent
agents add <name>
```

### Tool Management

```bash
# Push tools to ElevenLabs
agents push-tools

# Pull tools from ElevenLabs
agents pull-tools --all        # Pull all tools
agents pull-tools --update     # Update existing only
agents pull-tools              # Pull new tools only

# Add new client tool
agents add-client-tool <name>

# Add new webhook tool
agents add-webhook-tool <name>
```

### Testing

```bash
# Run tests for an agent
agents test <agent_name>

# Push tests
agents push-tests

# Pull tests
agents pull-tests
```

### Other Commands

```bash
# Check version
agents --version

# Check login status
agents whoami

# Watch for changes and auto-push
agents watch

# Generate widget code
agents widget <agent_name>
```

## Project Structure

```
FinPilot-Project/
├── agents.json                 # Agent registry
├── tools.json                  # Tool registry
├── agent_configs/
│   └── prod/
│       └── support_agent.json  # Agent configuration
└── tool_configs/
    ├── show_balance.json       # Individual tool configs
    ├── create_pie_chart.json
    └── ...
```

## Common Workflows

### 1. Adding a New Client Tool

**Step 1: Create tool configuration file**

```bash
# Create tool config in tool_configs/
cat > tool_configs/my_new_tool.json << 'EOF'
{
    "type": "client",
    "name": "my_new_tool",
    "description": "Description of what this tool does",
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

**Step 2: Register tool in tools.json**

```json
{
    "tools": [
        {
            "name": "my_new_tool",
            "type": "client",
            "config": "tool_configs/my_new_tool.json"
        }
    ]
}
```

**Step 3: Push to ElevenLabs**

```bash
agents push-tools
```

**Step 4: Update your codebase**

Add the tool to:
1. `src/config/elevenLabsTools.ts` - Client tool definition
2. `src/utils/toolBridge.ts` - Tool handler implementation

### 2. Updating Agent Configuration

**Step 1: Pull latest configuration**

```bash
# Always backup first
cp agent_configs/prod/support_agent.json agent_configs/prod/support_agent.json.backup

# Pull latest from ElevenLabs
agents pull --update
```

**Step 2: Make your changes**

Edit `agent_configs/prod/support_agent.json`:

```json
{
    "name": "Support agent",
    "conversation_config": {
        "tts": {
            "model_id": "eleven_flash_v2",  // Change model
            "voice_id": "cjVigY5qzO86Huf0OWal"
        },
        "turn": {
            "silence_end_call_timeout": 30  // Change timeout
        }
    }
}
```

**Step 3: Push changes**

```bash
agents push
```

### 3. Syncing All Configuration

```bash
# Pull everything from server
agents pull-tools --all
agents pull --all

# Check status
agents status

# Push all changes
agents push-tools
agents push
```

## Configuration Field Reference

### Agent Configuration Structure

```json
{
    "name": "Agent Name",
    "conversation_config": {
        "asr": {
            "quality": "high",
            "provider": "elevenlabs",
            "user_input_audio_format": "pcm_24000",  // 16000, 24000, 48000
            "keywords": []
        },
        "turn": {
            "turn_timeout": 7,
            "silence_end_call_timeout": 30,  // -1 to disable
            "mode": "turn"
        },
        "tts": {
            "model_id": "eleven_flash_v2",    // English: turbo_v2 or flash_v2
            "voice_id": "voice_id_here",
            "agent_output_audio_format": "pcm_24000",
            "optimize_streaming_latency": 3,  // 0-4, higher = more aggressive
            "stability": 0.5,                  // 0-1
            "speed": 1,                        // 0.5-2.0
            "similarity_boost": 0.8            // 0-1
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
                "vad_score"                    // Real-time voice detection
            ]
        },
        "vad": {
            "background_voice_detection": true
        },
        "agent": {
            "first_message": "Greeting message",
            "language": "en",
            "disable_first_message_interruptions": false,
            "prompt": {
                "prompt": "System prompt here",
                "llm": "gpt-4o",
                "temperature": 0.7,
                "max_tokens": -1
            }
        }
    }
}
```

### Tool Configuration Structure

```json
{
    "type": "client",
    "name": "tool_name",
    "description": "Clear description for LLM",
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

**Important:** Property names in `required` must match keys in `properties` exactly (case-sensitive).

### Audio Format Options

- `pcm_16000` - 16kHz (basic quality, lower bandwidth)
- `pcm_24000` - 24kHz (good quality, balanced)
- `pcm_48000` - 48kHz (high quality, higher bandwidth)

### TTS Model Options (English)

- `eleven_flash_v2` - Fastest, lowest latency
- `eleven_turbo_v2` - Balanced speed and quality
- Note: v2.5 models NOT available for English

### Client Events Available

- `audio` - Audio stream data
- `interruption` - User interrupts agent
- `agent_response` - Agent text responses
- `user_transcript` - Finalized user speech-to-text (complete utterances only)
- `agent_response_correction` - Response corrections
- `agent_tool_response` - Tool execution responses
- `vad_score` - Real-time voice activity scores (0-1)
- `conversation_initiation_metadata` - Conversation start metadata
- `ping` - Keepalive pings

**Note:** There is NO support for tentative/interim transcriptions. `user_transcript` only provides finalized utterances.

## Common Issues and Solutions

### Issue 1: Schema Validation Errors

**Error:** `Required property X not in properties`

**Solution:** Ensure property names match exactly:

```json
// ❌ WRONG
{
    "required": ["user_id"],
    "properties": {
        "userId": { ... }  // Mismatch!
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

### Issue 2: Array Type Parameters

**Error:** `Expected enum. Received "array"` or `Missing required key "items"`

**Solution:** Use string type with JSON encoding:

```json
// ❌ WRONG
{
    "data": {
        "type": "array",
        "items": { ... }
    }
}

// ✅ CORRECT
{
    "data": {
        "type": "string",
        "description": "JSON string array: [{\"name\":\"Item\",\"value\":123}]"
    }
}
```

### Issue 3: Model Version Errors

**Error:** `English Agents must use turbo or flash v2`

**Solution:** Use v2 models for English:

```json
{
    "tts": {
        "model_id": "eleven_flash_v2"  // NOT eleven_flash_v2_5
    }
}
```

### Issue 4: Tool Not Working in Voice Mode

**Problem:** Tool works in test-tools but not via voice

**Solution:** Tools must be registered in TWO places:

1. `src/utils/toolBridge.ts` - Add handler
2. `src/config/elevenLabsTools.ts` - Add to createClientTools()

### Issue 5: Unknown Command Errors

**Error:** `error: unknown command 'fetch'` or `'sync'`

**Solution:** Use correct commands:
- ❌ `agents fetch`
- ❌ `agents sync`
- ❌ `agents list-agents`
- ✅ `agents pull`
- ✅ `agents push`
- ✅ `agents list`

## Best Practices

### 1. Always Backup Before Pulling

```bash
cp agent_configs/prod/support_agent.json agent_configs/prod/support_agent.json.backup
agents pull --update
```

### 2. Use Version Control

```bash
git add agents.json tools.json agent_configs/ tool_configs/
git commit -m "Update agent configuration"
```

### 3. Test in Development First

```bash
# Push to dev environment first
agents push --env dev

# Test thoroughly
# Then push to prod
agents push --env prod
```

### 4. Validate Configuration Locally

```bash
# Check status before pushing
agents status

# Look for schema validation issues
# Fix any errors before pushing
```

### 5. Keep Tools and Code in Sync

When adding a tool:
1. Create tool config
2. Add to tools.json
3. Push with `agents push-tools`
4. Update codebase (toolBridge.ts, elevenLabsTools.ts)
5. Test in /test-tools page
6. Test via voice in /voice-chat

### 6. Document Tool Parameters Clearly

```json
{
    "description": "Creates a pie chart. Use when user asks to visualize proportional data or see spending breakdown by category.",
    "parameters": {
        "properties": {
            "title": {
                "description": "Chart title. Example: 'Monthly Spending Breakdown'"
            }
        }
    }
}
```

Clear descriptions help the LLM use tools correctly.

### 7. Monitor Client Events

Enable all relevant events for debugging:

```json
"client_events": [
    "audio",
    "interruption",
    "agent_response",
    "user_transcript",
    "agent_response_correction",
    "agent_tool_response",
    "vad_score"
]
```

## Quick Reference Card

| Task | Command |
|------|---------|
| Check status | `agents status` |
| List agents | `agents list` |
| Pull config | `agents pull --update` |
| Push config | `agents push` |
| Pull tools | `agents pull-tools --all` |
| Push tools | `agents push-tools` |
| Add tool | Create JSON + add to tools.json + push |
| Check version | `agents --version` |
| Check auth | `agents whoami` |
| Auto-sync | `agents watch` |

## Current Project State (January 2025)

### Active Agents
- **Support agent** (ID: agent_6301k7vxwa13f2qbna6q0xa88t8)
  - Model: eleven_flash_v2
  - Audio: pcm_24000
  - Timeout: 30 seconds
  - VAD: Enabled

### Registered Tools (11 total)
1. show_balance
2. show_savings_goal
3. show_document_id
4. create_pie_chart
5. create_bar_chart
6. show_loans
7. show_lending_options
8. show_credit_score
9. show_emi_info
10. start_quiz
11. update_quiz

### Tool Development Checklist

When adding a new tool:

- [ ] Create tool config in `tool_configs/new_tool.json`
- [ ] Add to `tools.json`
- [ ] Push with `agents push-tools`
- [ ] Add handler to `src/utils/toolBridge.ts`
- [ ] Add to `src/config/elevenLabsTools.ts`
- [ ] Test in `/test-tools` page
- [ ] Test via voice in `/voice-chat`
- [ ] Verify in ElevenLabs dashboard
- [ ] Document in CLAUDE.md

## Troubleshooting Checklist

When tools aren't working:

1. [ ] Check tool is in tools.json
2. [ ] Verify tool config has no schema errors
3. [ ] Confirm tool pushed successfully (`agents push-tools`)
4. [ ] Check toolBridge.ts has handler
5. [ ] Verify elevenLabsTools.ts has registration
6. [ ] Look for console logs: `🔧 Tool Called via Bridge`
7. [ ] Check ElevenLabs dashboard shows tool
8. [ ] Test message format: `TOOL_CALL:tool_name:{"params":"here"}`

## Resources

- [ElevenLabs Agent CLI Docs](https://elevenlabs.io/docs/agents-platform/libraries/agents-cli)
- [Client Events Reference](https://elevenlabs.io/docs/agents-platform/customization/events/client-events)
- [React SDK Docs](https://elevenlabs.io/docs/agents-platform/libraries/react)
- Project CLAUDE.md for architecture context

## Version History

- **v1.0** (January 2025) - Initial skill creation
  - CLI v0.5.0
  - 11 client tools
  - 1 active agent (Support agent)
  - Audio quality: pcm_24000
  - Model: eleven_flash_v2
