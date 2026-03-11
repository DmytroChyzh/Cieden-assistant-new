# Requirements DSL - Controlled Vocabulary

## Overview
This DSL uses a **mandatory controlled vocabulary** of 13 canonical verbs to ensure deterministic, concise specifications.

## Canonical Verbs (MANDATORY)

### State Operations
- **`set`** - Assign or update a state value
  - Example: `set: STATE.connected → true`
- **`create`** - Initialize a new instance or object
  - Example: `create: session_lock(tab_id, timestamp)`
- **`clear`** - Remove or reset data
  - Example: `clear: pending_messages[]`
- **`store`** - Persist data to storage
  - Example: `store: transcript → DB.streaming`

### Control Flow
- **`check`** - Evaluate a condition
  - Example: `check: voice_lock(other_tabs) → exists?`
- **`await`** - Wait for asynchronous operation
  - Example: `await: WebRTC.connected`
- **`do`** - Execute an action or function
  - Example: `do: fast_cleanup()`

### Communication
- **`send`** - Transmit data or message
  - Example: `send: BroadcastChannel → session_start`
- **`log`** - Record event or message
  - Example: `log: "Connection established"`

### Resource Management
- **`acquire`** - Obtain a lock or resource
  - Example: `acquire: session_lock(tab_id)`
- **`release`** - Free a lock or resource
  - Example: `release: session_lock()`

### Process Control
- **`start`** - Begin a process or stream
  - Example: `start: transcript_stream()`
- **`stop`** - End a process or stream
  - Example: `stop: connection()`

## Syntax Patterns

### Basic Assignment
```
set: variable → value
```

### Conditional Check
```
check: condition → result?
```

### Function Call
```
do: function_name(params)
```

### Async Wait
```
await: event_or_state
```

### Data Storage
```
store: data → destination
```

## Example: Before vs After

### Before (Verbose Natural Language)
```
Connection steps:
  - Check for existing voice session lock in other tabs
  - If text session is active: Run fast cleanup first
  - Initialize SDK with agentId parameter
  - Apply conversation history via dynamicVariables if provided
  - Set initial greeting via overrides.agent.firstMessage if no history
  - Wait for WebRTC connection to establish
  - Mark connection state: connected
  - Acquire cross-tab session lock
  - Broadcast session start to other tabs
  - Initialize transcript stream in Convex
  - Flush any queued voice messages
```
**Word count**: 120 words

### After (Controlled Vocabulary)
```
Connection steps:
  - check: voice_lock(other_tabs) → exists?
  - check: text_session.active → yes: do: fast_cleanup()
  - create: SDK(agentId)
  - check: history → exists: set: dynamicVariables ← history
  - check: history → none: set: overrides.agent.firstMessage ← greeting
  - await: WebRTC.connected
  - set: STATE.connected → true
  - acquire: session_lock(tab_id)
  - send: BroadcastChannel → session_start
  - start: transcript_stream()
  - clear: pending_messages[]
```
**Word count**: 55 words (54% reduction)

## Prohibited Synonyms

These verbs are **NOT allowed** - use the canonical verb instead:

### Instead of "set", don't use:
- ❌ Mark, Update, Apply, Assign, Configure, Define, Establish

### Instead of "create", don't use:
- ❌ Initialize, Init, Instantiate, Build, Construct, Setup

### Instead of "check", don't use:
- ❌ Verify, Validate, Confirm, Ensure, Test, Inspect

### Instead of "do", don't use:
- ❌ Run, Execute, Perform, Call, Trigger, Invoke

### Instead of "await", don't use:
- ❌ Wait, Wait for, Expect, Block on, Suspend until

### Instead of "clear", don't use:
- ❌ Reset, Delete, Remove, Erase, Purge, Wipe

### Instead of "store", don't use:
- ❌ Save, Persist, Write, Record, Cache

### Instead of "send", don't use:
- ❌ Transmit, Emit, Broadcast, Dispatch, Push, Post

### Instead of "acquire", don't use:
- ❌ Get, Obtain, Take, Lock, Reserve, Claim

### Instead of "release", don't use:
- ❌ Free, Unlock, Relinquish, Drop, Yield

### Instead of "start", don't use:
- ❌ Begin, Launch, Initiate, Activate, Trigger

### Instead of "stop", don't use:
- ❌ End, Terminate, Kill, Close, Finish, Halt

## Validation Rules

1. **Every action step MUST start with a canonical verb**
2. **Synonyms are prohibited** - parsers should reject them
3. **Arrow notation required** for assignments: `→` or `←`
4. **Parentheses required** for function parameters: `function(params)`
5. **Conditional format**: `condition → yes: action` or `condition → no: action`

## Benefits

1. **Deterministic**: LLMs produce consistent output
2. **Concise**: ~50% reduction in word count
3. **Parseable**: Can build syntax validators
4. **Searchable**: Easy to grep for specific actions
5. **Learnable**: Only 13 verbs to memorize
