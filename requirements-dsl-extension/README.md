# Requirements DSL

Syntax highlighting for Requirements DSL specification files (`.spec` extension) with **controlled vocabulary** for deterministic, concise specifications.

## Features

### v2.0 - Controlled Vocabulary
- **13 Canonical Verbs**: Only approved verbs allowed (highlighted in cyan + bold)
  - State: `set`, `create`, `clear`, `store`
  - Control: `check`, `await`, `do`
  - Communication: `send`, `log`
  - Resources: `acquire`, `release`
  - Process: `start`, `stop`
- **Deprecated Synonyms**: Prohibited verbs highlighted as errors (red + underline)
  - Examples: `Initialize`, `Run`, `Mark`, `Wait` → use canonical verbs instead
- **Arrow Operators**: `→` and `←` for assignments (purple)
- **Function Calls**: `function_name(params)` syntax highlighting

### Core Features
- **Section Headers**: Highlights `[Define ...]`, `[Action ...]`, `[State ...]`, etc.
- **Change Markers**: Color-coded `[+ Add]`, `[- Remove]`, `[~ Modify]`
- **Keywords**: `Show if:`, `Execute if:`, `On success:`, `Steps:`, etc.
- **Data Sources**: Dot notation like `DB.Users.field`, `State.form.value`
- **State Flags**: `STATE.loading`, `STATE.transitioning`
- **Boolean Values**: `yes` (green), `no` (red), `none` (orange)
- **Comments**: Line comments starting with `#`, parentheticals like `(Attempt 1)`

## Usage

Create files with `.spec` extension and start writing using the Requirements DSL syntax.

## Example (v2.0 Controlled Vocabulary)

```spec
[Define UserSession]
Description: Manages authenticated user session

Fields:
  userId: text (Unique user identifier)
  STATE.authenticated: yes/no (Authentication status)

[Action Login]
Description: Authenticate user

Execute if:
  DB.Users.status: active
  State.form.isValid: yes

Steps:
  - check: credentials → valid?
  - create: session_token()
  - store: session → DB.sessions
  - set: STATE.authenticated → yes
  - send: redirect → "/dashboard"

On success:
  - log: "User logged in"
  - do: show_welcome_message()

On error (Invalid credentials):
  - log: "Login failed"
  - clear: session_token

Timeout: 10 seconds
```

### Before/After Comparison

**Before (verbose, non-deterministic):**
```spec
Steps:
  - Check for existing voice session lock in other tabs
  - If text session is active: Run fast cleanup first
  - Initialize SDK with agentId parameter
  - Wait for WebRTC connection to establish
```
120 words total

**After (controlled vocabulary):**
```spec
Steps:
  - check: voice_lock(other_tabs) → exists?
  - check: text_session.active → yes: do: fast_cleanup()
  - create: SDK(agentId)
  - await: WebRTC.connected
```
55 words total (54% reduction)

## Installation

1. Download the `.vsix` file
2. In VSCode/Cursor, open Command Palette (`Cmd+Shift+P`)
3. Select "Extensions: Install from VSIX..."
4. Select the downloaded file
5. Reload window

## License

MIT
