# Migration Guide: v1.x to v2.0 (Controlled Vocabulary)

## Overview

Version 2.0 introduces a **controlled vocabulary** of 13 canonical verbs to replace unlimited synonyms. This makes specifications deterministic, concise, and parseable.

## Quick Reference: Synonym Mapping

### State Operations

| ❌ Old (Deprecated) | ✅ New (Canonical) | Example |
|---|---|---|
| Set, Mark, Update, Apply, Assign | `set` | `set: STATE.connected → true` |
| Initialize, Init, Setup | `create` | `create: SDK(agentId)` |
| Reset, Delete, Remove, Erase | `clear` | `clear: pending_messages[]` |
| Save, Persist, Write | `store` | `store: data → DB.sessions` |

### Control Flow

| ❌ Old (Deprecated) | ✅ New (Canonical) | Example |
|---|---|---|
| Verify, Validate, Confirm, Ensure | `check` | `check: credentials → valid?` |
| Wait, Wait for, Block on | `await` | `await: WebRTC.connected` |
| Run, Execute, Perform, Call | `do` | `do: cleanup()` |

### Communication

| ❌ Old (Deprecated) | ✅ New (Canonical) | Example |
|---|---|---|
| Transmit, Emit, Broadcast, Dispatch | `send` | `send: BroadcastChannel → start` |
| Record (for events) | `log` | `log: "Session started"` |

### Resource Management

| ❌ Old (Deprecated) | ✅ New (Canonical) | Example |
|---|---|---|
| Get, Obtain, Take, Lock | `acquire` | `acquire: session_lock(tab_id)` |
| Free, Unlock, Drop | `release` | `release: session_lock()` |

### Process Control

| ❌ Old (Deprecated) | ✅ New (Canonical) | Example |
|---|---|---|
| Begin, Launch, Initiate | `start` | `start: transcript_stream()` |
| End, Terminate, Kill, Close | `stop` | `stop: connection()` |

## Step-by-Step Migration

### Step 1: Install v2.0 Extension

1. Download `requirements-dsl-2.0.0.vsix`
2. In VSCode/Cursor: `Cmd+Shift+P` → "Extensions: Install from VSIX..."
3. Select the downloaded file
4. Reload window

### Step 2: Identify Deprecated Synonyms

Open your .spec file. Deprecated synonyms will appear with:
- **Red color**
- **Underline styling**

Example errors you'll see:
```spec
Steps:
  - Initialize SDK          ← Red underline (should be: create: SDK())
  - Wait for connection     ← Red underline (should be: await: connection)
  - Mark as connected       ← Red underline (should be: set: STATE.connected → true)
```

### Step 3: Apply Syntax Patterns

#### Pattern 1: Simple Assignment
**Before:**
```spec
Set connection state: connected
Mark session as active
```

**After:**
```spec
set: STATE.connected → true
set: session.active → yes
```

#### Pattern 2: Conditional Check
**Before:**
```spec
Check for existing lock in other tabs
Verify credentials are valid
```

**After:**
```spec
check: lock(other_tabs) → exists?
check: credentials → valid?
```

#### Pattern 3: Function Call
**Before:**
```spec
Initialize SDK with agentId parameter
Run fast cleanup first
Call the cleanup handler
```

**After:**
```spec
create: SDK(agentId)
do: fast_cleanup()
do: cleanup_handler()
```

#### Pattern 4: Async Wait
**Before:**
```spec
Wait for WebRTC connection to establish
Wait until session is ready
```

**After:**
```spec
await: WebRTC.connected
await: session.ready
```

#### Pattern 5: Data Storage
**Before:**
```spec
Save session to database
Persist user preferences
```

**After:**
```spec
store: session → DB.sessions
store: preferences → DB.user_preferences
```

### Step 4: Use Arrow Operators

The arrow operators (`→` and `←`) make data flow explicit:

**Right arrow `→`** (assignment/forward flow):
```spec
set: variable → value
check: condition → result?
store: data → destination
```

**Left arrow `←`** (receive/backward flow):
```spec
set: dynamicVariables ← history
```

**How to type arrows:**
- macOS: Option + Shift + → or ←
- Windows: Alt codes or copy from examples
- Or just type `->` (some editors auto-replace)

### Step 5: Full Example Migration

#### Before (v1.x - Verbose)
```spec
[Action Connect to Voice Session]

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

On error:
  - Log error message
  - Release the session lock
  - Mark connection state as error
  - Broadcast connection failed to other tabs
```
**Word count**: 120 words

#### After (v2.0 - Controlled Vocabulary)
```spec
[Action Connect to Voice Session]

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

On error:
  - log: error_message
  - release: session_lock()
  - set: STATE.connected → error
  - send: BroadcastChannel → connection_failed
```
**Word count**: 55 words (54% reduction)

## Common Pitfalls

### ❌ Pitfall 1: Using Capital Case for Verbs
```spec
Set: STATE.connected → true    ← Wrong (Capital S)
```
```spec
set: STATE.connected → true    ← Correct (lowercase)
```

### ❌ Pitfall 2: Mixing Old and New Syntax
```spec
- Initialize SDK                ← Old syntax (will error)
- create: session_lock()        ← New syntax
```
All verbs must use canonical form.

### ❌ Pitfall 3: Forgetting Function Parentheses
```spec
do: cleanup                     ← Missing parentheses
```
```spec
do: cleanup()                   ← Correct
```

### ❌ Pitfall 4: Using Wrong Arrow Direction
```spec
set: value ← STATE.connected    ← Backwards (value receives state)
```
```spec
set: STATE.connected → value    ← Correct (state gets value)
```

## Validation Checklist

After migrating your spec file:

- [ ] No red underlines (all deprecated synonyms replaced)
- [ ] All verbs are lowercase
- [ ] Function calls have parentheses: `function()`
- [ ] Arrows point in correct direction: `→` for "becomes", `←` for "receives from"
- [ ] Conditionals use `?`: `check: condition → result?`
- [ ] Word count reduced by ~40-60%

## Benefits of Migration

1. **Consistency**: LLMs generate specs with identical vocabulary
2. **Conciseness**: Typical reduction of 40-60% in word count
3. **Clarity**: Unambiguous verb meanings (no "does Set mean Mark or Update?")
4. **Parseability**: Can build validators and code generators
5. **Searchability**: `grep "^check:"` finds all conditional checks

## Need Help?

- See `CONTROLLED_VOCABULARY.md` for complete reference
- See `controlled-vocabulary-example.spec` for working examples
- See `CHANGELOG.md` for detailed changes

## Rollback (If Needed)

If you need to revert to v1.5.0:
1. Uninstall v2.0.0 extension
2. Install `requirements-dsl-1.5.0.vsix`
3. Your old .spec files will work as-is (no errors)

However, we recommend migrating to v2.0 for the benefits listed above.
