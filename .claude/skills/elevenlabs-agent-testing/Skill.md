---
name: ElevenLabs Agent Testing
description: This skill should be used when testing ElevenLabs agents with dual testing strategy - client integration tests for our code and agent behavior tests for server-side logic.
version: 1.0.0
---

# ElevenLabs Agent Testing

This skill provides a comprehensive dual testing strategy for ElevenLabs conversational AI agents.

## When to Use This Skill

Invoke this skill when:
- Testing agent connectivity and message handling (client-side)
- Validating tool invocation and responses (server-side)
- Debugging connection or integration issues
- Adding new tools or modifying existing ones
- Before deploying agent configuration changes
- Setting up CI/CD pipelines for agent testing

## Dual Testing Strategy

This skill implements TWO complementary testing approaches:

### 1. Client Integration Tests
**Purpose**: Test OUR code (connection, handlers, message processing)

**What it tests**:
- WebSocket/WebRTC connection establishment
- Message reception via onMessage events
- Tool handler invocation in our codebase
- Message format and structure
- ElevenLabsProvider functionality

**Tool**: Custom TypeScript scripts using existing infrastructure

**When to use**:
- After changing client-side code
- When debugging connection issues
- Before UI testing
- To understand message formats

### 2. Agent Behavior Tests
**Purpose**: Test AGENT logic (server-side tool calls, responses)

**What it tests**:
- Correct tool invocation for user intents
- Tool parameter accuracy
- Conversational quality
- Agent personality consistency
- Multi-turn conversation flows

**Tool**: ElevenLabs native testing framework via CLI

**When to use**:
- After changing agent configuration
- After modifying tool definitions
- Before deployment
- In CI/CD pipelines

## Quick Start

### Client Integration Tests

```bash
# Test connection and basic communication
bun run test:client:connection

# Test all 11 tool handlers
bun run test:client:tools

# Document message formats
bun run test:client:messages

# Run all client tests
bun run test:client
```

### Agent Behavior Tests

```bash
# Generate test configs for all 11 tools
bun run test:agent:create

# Push tests to ElevenLabs
agents push-tests

# Run all agent tests
agents test "Support agent"

# Or use npm script
bun run test:agent
```

### Run Everything

```bash
bun run test:all
```

## Client Integration Tests

### test-connection.ts

Tests fundamental connectivity and message reception.

**What it validates**:
- Signed URL generation from `/api/elevenlabs/signed-url`
- WebSocket connection establishment
- Basic message reception
- Message event types

**Usage**:
```bash
bun run .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-connection.ts
```

**Expected output**:
```
🔌 CLIENT CONNECTION TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Signed URL Generation (245ms)
✅ WebSocket Connection (1823ms)
   Details: {
     messagesReceived: 3,
     messageTypes: ["agent_response", "string"]
   }
✅ Message Reception (1654ms)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Results: 3/3 passed (100%)
⏱️  Total time: 3722ms
```

### test-tools.ts

Tests that all 11 tool handlers are invoked correctly.

**What it validates**:
- Tool handler registration via createClientTools
- Handler invocation when agent calls tools
- All 11 tools: show_balance, create_pie_chart, etc.

**Usage**:
```bash
bun run .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-tools.ts
```

**Expected output**:
```
🔧 CLIENT TOOL HANDLER TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing show_balance...
  🔧 Handler called: show_balance
✅ show_balance (2145ms)
   Prompt: "Show my balance"

Testing create_pie_chart...
  🔧 Handler called: create_pie_chart
✅ create_pie_chart (2234ms)
   Prompt: "Create a pie chart"

... (9 more tools)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Results: 11/11 tools tested successfully
⏱️  Total time: 24573ms
```

### test-messages.ts

Documents all message event types received from agent.

**What it does**:
- Captures all onMessage events
- Categorizes by message type
- Saves samples to JSON file
- Helps understand message structure

**Usage**:
```bash
bun run .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-messages.ts
```

**Output**:
- Console: Message type breakdown
- File: `.claude/skills/elevenlabs-agent-testing/references/message-formats-captured.json`

## Agent Behavior Tests

### Creating Tests

Generate test configs for all 11 tools:

```bash
bun run .claude/skills/elevenlabs-agent-testing/scripts/agent-tests/create-agent-tests.ts
```

**What it creates**:
- 11 test config files in `test_configs/`
- Updated `tests.json` registry
- Multiple test cases per tool (varying prompts)

**Example test config** (test_configs/test_show_balance.json):
```json
{
  "name": "test_show_balance",
  "type": "tool_call",
  "description": "Verify agent calls show_balance tool when user asks about their balance",
  "config": {
    "test_cases": [
      {
        "user_message": "Show my balance",
        "expected_tool": "show_balance",
        "parameter_validation": {
          "method": "llm_evaluation",
          "criteria": "Parameters are appropriate for the user request"
        },
        "timeout_ms": 5000
      }
    ]
  }
}
```

### Pushing Tests

Push test configs to ElevenLabs:

```bash
agents push-tests
```

### Running Tests

Execute all agent tests:

```bash
agents test "Support agent"
```

**Expected output**:
```
🧪 Running tests for Support agent

Tool Call Tests:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ test_show_balance          (1.2s)
✅ test_show_savings_goal     (0.9s)
✅ test_create_pie_chart      (1.5s)
✅ test_create_bar_chart      (1.4s)
✅ test_show_loans            (1.1s)
✅ test_show_lending_options  (1.0s)
✅ test_show_credit_score     (1.2s)
✅ test_show_emi_info         (0.8s)
✅ test_start_quiz            (1.3s)
✅ test_update_quiz           (1.1s)
✅ test_show_document_id      (0.9s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Results: 11/11 passed (100%)
⏱️  Total time: 12.4s
```

## Development Workflow

### After Changing Client Code

```bash
# 1. Test connection
bun run test:client:connection

# 2. Test tool handlers
bun run test:client:tools

# 3. If issues, debug message formats
bun run test:client:messages
```

### After Changing Agent Config or Tools

```bash
# 1. Regenerate tests
bun run test:agent:create

# 2. Push to ElevenLabs
agents push-tests

# 3. Run tests
bun run test:agent
```

### Before Deployment

```bash
# Run everything
bun run test:all
```

## Testing Matrix

| Test Type | What It Catches | Speed | Automation |
|-----------|----------------|-------|------------|
| **Client Connection** | Connection failures, API issues | Fast (< 5s) | Easy |
| **Client Tools** | Handler bugs, registration issues | Medium (< 30s) | Easy |
| **Client Messages** | Format changes, integration issues | Fast (< 10s) | Easy |
| **Agent Behavior** | Wrong tools, bad parameters, quality issues | Medium (< 20s) | CI/CD ready |

## Troubleshooting

### Client Test Failures

**"Failed to get signed URL"**
- Check dev server is running: `npm run dev`
- Verify ELEVENLABS_API_KEY in .env.local
- Check API endpoint: `curl -X POST http://localhost:3000/api/elevenlabs/signed-url`

**"No messages received from agent"**
- Check agent ID is correct
- Verify agent is active in ElevenLabs dashboard
- Check WebSocket connection isn't blocked

**"Handler was not called"**
- Verify tool is registered in createClientTools
- Check toolBridge.ts has handler
- Review agent prompt instructs to use tools

### Agent Test Failures

**"Tool not called"**
- Check tool is pushed: `agents push-tools`
- Verify tool config has no errors
- Review agent prompt mentions tool

**"Parameter validation failed"**
- Check tool parameter schema
- Review LLM evaluation criteria
- Verify dynamic variables are set

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test ElevenLabs Agent

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Test Client Integration
        run: bun run test:client

      - name: Test Agent Behavior
        run: bun run test:agent
        env:
          ELEVENLABS_API_KEY: ${{ secrets.ELEVENLABS_API_KEY }}
```

## Best Practices

### Client Tests
- Run after every client-side code change
- Use to debug connection issues
- Document message formats for reference
- Keep tests fast and focused

### Agent Tests
- Run before deployment
- Update when tools change
- Use multiple prompt variations
- Validate conversation quality

### Both
- Run in CI/CD pipeline
- Version control test configs
- Review failures immediately
- Update tests as features evolve

## File Structure

```
.claude/skills/elevenlabs-agent-testing/
├── Skill.md                              # This file
├── scripts/
│   ├── client-tests/
│   │   ├── test-connection.ts            # Connection testing
│   │   ├── test-tools.ts                 # Tool handler testing
│   │   └── test-messages.ts              # Message format docs
│   └── agent-tests/
│       └── create-agent-tests.ts         # Generate ElevenLabs tests
├── references/
│   ├── client-testing-guide.md           # Client test details
│   ├── agent-testing-guide.md            # Agent test details
│   ├── message-formats-captured.json     # Generated message docs
│   └── troubleshooting.md                # Common issues
└── assets/
    └── test-templates/
        ├── client-test-template.ts       # Template for client tests
        ├── tool-test-template.json       # Template for tool tests
        └── scenario-test-template.json   # Template for scenarios
```

## Package.json Scripts

```json
{
  "scripts": {
    "test:client": "bun scripts/client-tests/test-connection.ts && bun scripts/client-tests/test-tools.ts",
    "test:client:connection": "bun .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-connection.ts",
    "test:client:tools": "bun .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-tools.ts",
    "test:client:messages": "bun .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-messages.ts",

    "test:agent": "agents test 'Support agent'",
    "test:agent:create": "bun .claude/skills/elevenlabs-agent-testing/scripts/agent-tests/create-agent-tests.ts",
    "test:agent:push": "agents push-tests",

    "test:all": "bun run test:client && bun run test:agent"
  }
}
```

## Resources

- ElevenLabs Agent Testing Docs: https://elevenlabs.io/docs/agents-platform/customization/agent-testing
- Agents CLI Docs: https://elevenlabs.io/docs/agents-platform/libraries/agents-cli
- Project CLAUDE.md: Architecture and patterns

## Version History

- **v1.0.0** (January 2025) - Initial skill creation
  - Dual testing strategy (client + agent)
  - 3 client test scripts
  - Agent test generator
  - 11 tools fully tested
  - Comprehensive documentation
