# Requirements DSL Extension - Changelog

## [2.0.1] - 2025-01-XX (Patch)

### Fixed
- **Section folding now works properly**: Added `"offSide": true` to enable indentation-based folding
- Simplified folding markers to match any section header starting with `[`
- Sections can now be collapsed/expanded by clicking the fold icon in the gutter

**How to use:**
- Hover near the line numbers on a section header (like `[Action ...]`)
- Click the down arrow (▼) to collapse the section
- Click the right arrow (▶) to expand it
- Or use keyboard: Place cursor on section header, press `Cmd+Option+[` (macOS) or `Ctrl+Shift+[` (Windows)

---

## [2.0.0] - 2025-01-XX (Breaking Change)

### Major Changes - Controlled Vocabulary

**Why this change?**
The original DSL allowed natural language with unlimited synonyms (Set, Mark, Update, Apply, Initialize, Run, Execute, etc.). This created:
- **Non-determinism**: LLMs produced inconsistent specs
- **Verbosity**: 120-word sections could be reduced to 55 words (54% reduction)
- **Ambiguity**: Same concept expressed many different ways

**Solution: Mandatory 13 Canonical Verbs**

Only these verbs are now allowed:

#### State Operations
- `set` - Assign/update value
- `create` - Initialize instance
- `clear` - Remove/reset data
- `store` - Persist to storage

#### Control Flow
- `check` - Evaluate condition
- `await` - Wait async operation
- `do` - Execute action

#### Communication
- `send` - Transmit data
- `log` - Record event

#### Resource Management
- `acquire` - Obtain lock/resource
- `release` - Free lock/resource

#### Process Control
- `start` - Begin process
- `stop` - End process

### New Syntax Highlighting

#### Added
- **Canonical verbs** (cyan + bold): `set`, `create`, `check`, `await`, `do`, etc.
- **Deprecated synonyms** (red + underline): `Initialize`, `Run`, `Mark`, `Wait`, etc.
- **Arrow operators** (purple): `→`, `←`
- **Function calls**: `function_name(params)` syntax
- **Logical operators**: `?` for conditionals

#### Changed
- Action verbs reduced from 24+ generic words to 13 canonical verbs
- All verbs now lowercase for consistency
- Synonyms now highlighted as errors to enforce controlled vocabulary

### Syntax Patterns

#### Assignment
```spec
set: variable → value
set: STATE.connected → true
```

#### Conditional
```spec
check: condition → result?
check: history → exists: set: variables ← history
```

#### Function Call
```spec
do: function_name(params)
create: session_lock(tab_id, timestamp)
```

#### Async Wait
```spec
await: event_or_state
await: WebRTC.connected
```

### Documentation

- Added `CONTROLLED_VOCABULARY.md` with complete reference
- Updated `README.md` with v2.0 features and before/after examples
- Created `controlled-vocabulary-example.spec` demonstrating new syntax

### Breaking Changes

⚠️ **Existing .spec files will show errors for deprecated synonyms**

You'll need to migrate to canonical verbs:
- `Initialize` → `create`
- `Run` / `Execute` / `Call` → `do`
- `Mark` / `Update` / `Apply` → `set`
- `Wait` / `Wait for` → `await`
- `Reset` / `Delete` / `Remove` → `clear`
- `Save` / `Persist` / `Write` → `store`
- etc. (see CONTROLLED_VOCABULARY.md for complete list)

### Benefits

1. **Deterministic**: LLMs produce consistent, predictable output
2. **Concise**: ~50% reduction in word count
3. **Parseable**: Can build syntax validators and linters
4. **Searchable**: Easy to grep for specific action types
5. **Learnable**: Only 13 verbs to memorize vs unlimited synonyms

---

## [1.5.0] - Previous Version

### Added
- Environment variable highlighting (SCREAMING_SNAKE_CASE)
- 24 action verbs (Set, Verify, Check, Wait, etc.)
- Bold font styling for action verbs

### Fixed
- Parenthetical support in error/success keywords
- Regex pattern for "On error (Attempt N):" style keywords

---

## [1.3.0]

### Added
- Semantic boolean colors:
  - `yes` → green (#89d185)
  - `no` → red (#f48771)
  - `none`/`empty` → orange (#ce9178)

---

## [1.2.0]

### Added
- Error keywords: "On error", "On timeout", etc. (red + bold)
- Success keywords: "On success" (green + bold)
- Explicit tokenColorCustomizations in .vscode/settings.json

### Fixed
- Theme compatibility issues (scopes now explicitly colored)
- Extension conflict (removed local .vscode/extensions folder)

---

## [1.0.0] - Initial Release

### Added
- Section headers: `[Define ...]`, `[Action ...]`, `[State ...]`, etc.
- Change markers: `[+ Add]`, `[- Remove]`, `[~ Modify]`
- Control keywords: `Show if:`, `Execute if:`, etc.
- Meta keywords: `Description:`, `Purpose:`, `Type:`, etc.
- State flags: `STATE.loading`, `STATE.transitioning`
- Data sources: `DB.Users.field`, `Session.user.id`
- Boolean values: yes/no
- Strings and numbers with units
- Comments (#) and parentheticals
- Code folding for sections
