# Requirements DSL Syntax Highlighting

This directory contains a custom VSCode language extension for Requirements DSL (`.spec` files).

## What's Included

- **Extension**: Custom language definition in `extensions/requirements-dsl/`
- **Grammar**: TextMate grammar for syntax highlighting (`spec.tmLanguage.json`)
- **Language Config**: Editor features like comments, brackets, folding

## How It Works

The extension is automatically loaded from the `.vscode/extensions/` directory when you open this workspace in VSCode. No manual installation needed!

## Highlighted Syntax Elements

### Section Headers
- `[Define ...]` - Data definitions
- `[State ...]` - State management
- `[Action ...]` - Action specifications
- `[Component ...]` - UI components
- `[Session ...]` - Session management
- `[Behavior ...]` - System behaviors
- `[Configuration ...]` - Configuration sections
- `[Error ...]` - Error handling
- `[Integration ...]` - Integration points
- `[Context ...]` - Context providers
- `[Insight ...]` - Key insights
- `[System ...]` - System descriptions
- `[Change ...]` - Change specifications

### Change Markers
- `[+ Add ...]` - New additions (green)
- `[- Remove ...]` - Removals (red)
- `[~ Modify ...]` - Modifications (orange)

### Keywords
- **Conditional**: `Show if:`, `Hide if:`, `Execute if:`, `Skip if:`, `When:`, etc.
- **Flow Control**: `Steps:`, `On success:`, `On error:`, `Response:`, `Recovery:`, etc.
- **Metadata**: `Description:`, `Purpose:`, `Type:`, `Fields:`, `Options:`, etc.

### Data Sources
- Dot notation: `DB.Users.field`, `Session.user.role`, `State.form.value`
- Automatically highlighted in green

### State Flags
- Format: `STATE.flagName`
- Examples: `STATE.loading`, `STATE.transitioning`, `STATE.connected`
- Highlighted in orange

### Boolean Values
- `yes` / `no` - Highlighted as constants
- `none` / `empty` - Highlighted as constants

### Comparison Operators
- `>`, `<`, `>=`, `<=`, `:`, `→`, `+`, `-`

### Strings and Numbers
- Strings in quotes: `"example"`
- Numbers with units: `5 seconds`, `300ms`, `30%`

## Editor Features

### Comments
- Line comments start with `#`
- Syntax: `# This is a comment`

### Code Folding
- Sections can be folded at `[Define ...]`, `[Action ...]`, etc.
- Helps navigate large specification files

### Auto-closing Pairs
- Brackets: `[` `]`
- Braces: `{` `}`
- Parentheses: `(` `)`
- Quotes: `"` `"` and `'` `'`

## Creating New .spec Files

1. Create a new file with `.spec` extension
2. Syntax highlighting activates automatically
3. Start writing using the Requirements DSL syntax

## Example

```spec
[Define UserSession]
Description: Manages authenticated user session

Fields:
  userId: text (Unique user identifier)
  STATE.authenticated: yes/no (Authentication status)
  lastActivity: timestamp

Storage: Session storage
Lifecycle: Browser session

[Action Login]
Description: Authenticate user and create session

Execute if:
  DB.Users.status: active
  State.form.isValid: yes

Steps:
  - Validate credentials
  - Create session token
  - Store session in browser
  - Redirect to dashboard

On success:
  - Show welcome message
  - Load user data

On error:
  - Show error message
  - Clear password field

Timeout: 10 seconds
Retry: no
```

## Troubleshooting

### Syntax highlighting not working?

1. **Reload VSCode Window**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
   - Type "Reload Window" and press Enter

2. **Check file extension**
   - Ensure file ends with `.spec`
   - Check bottom-right corner of VSCode shows "Requirements DSL"

3. **Manual language selection**
   - Click language indicator in bottom-right
   - Type "Requirements DSL" and select it

### Extension not loading?

- Ensure `.vscode/extensions/requirements-dsl/` directory exists
- Check `package.json` is present in the extension directory
- Reload VSCode window

## Cleanup Task

**TODO**: Delete the old `specs/elevenlabs-provider.toml` file manually (the rename couldn't auto-delete it due to permissions).

## Color Customization

The colors are determined by your VSCode theme. Different elements use standard TextMate scopes:

- **Section headers**: `entity.name.*`
- **Keywords**: `keyword.control.*`
- **Data sources**: `variable.other.property`
- **State flags**: `variable.other.constant.state`
- **Booleans**: `constant.language.boolean`
- **Strings**: `string.quoted.*`
- **Comments**: `comment.line`

To customize colors, add theme overrides to your VSCode `settings.json`:

```json
{
  "editor.tokenColorCustomizations": {
    "textMateRules": [
      {
        "scope": "keyword.control.requirements-dsl",
        "settings": {
          "foreground": "#569CD6",
          "fontStyle": "bold"
        }
      }
    ]
  }
}
```
