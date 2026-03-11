---
name: Skill Creator
description: This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
version: 1.0.0
---

# Skill Creator

This skill provides guidance for creating effective skills that extend Claude's capabilities.

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks—they transform Claude from a general-purpose agent into a specialized agent equipped with procedural knowledge.

### What Skills Provide

1. **Specialized workflows** - Multi-step procedures for specific domains
2. **Tool integrations** - Instructions for working with specific file formats or APIs
3. **Domain expertise** - Company-specific knowledge, schemas, business logic
4. **Bundled resources** - Scripts, references, and assets for complex tasks

### Anatomy of a Skill

Every skill consists of a required Skill.md file and optional bundled resources:

```
skill-name/
├── Skill.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation loaded as needed
    └── assets/           - Files used in output (templates, icons, etc.)
```

#### Skill.md (required)

**Metadata Quality:** The `name` and `description` in YAML frontmatter determine when Claude will use the skill. Be specific about what the skill does and when to use it. Use third-person (e.g. "This skill should be used when..." instead of "Use this skill when...").

#### Bundled Resources (optional)

##### Scripts (`scripts/`)

Executable code (Python/Bash/etc.) for tasks requiring deterministic reliability or repeatedly rewritten.

- **When to include**: Same code repeatedly rewritten or deterministic reliability needed
- **Example**: `scripts/rotate_pdf.py` for PDF rotation
- **Benefits**: Token efficient, deterministic, may execute without loading into context

##### References (`references/`)

Documentation and reference material loaded as needed into context.

- **When to include**: For documentation Claude should reference while working
- **Examples**: `references/api_docs.md`, `references/schema.md`, `references/policies.md`
- **Benefits**: Keeps Skill.md lean, loaded only when needed
- **Best practice**: If files are large (>10k words), include grep search patterns in Skill.md
- **Avoid duplication**: Information should live in either Skill.md or references, not both

##### Assets (`assets/`)

Files not loaded into context, but used within output Claude produces.

- **When to include**: Files needed in final output
- **Examples**: `assets/logo.png`, `assets/template.html`, `assets/boilerplate/`
- **Benefits**: Separates output resources from documentation

### Progressive Disclosure Design

Skills use three-level loading to manage context efficiently:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **Skill.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by Claude (unlimited)

## Skill Creation Process

Follow this process in order, skipping steps only when clearly not applicable.

### Step 1: Understanding the Skill with Concrete Examples

Skip only when skill usage patterns are clearly understood.

To create an effective skill, clearly understand concrete examples of how it will be used:

**Questions to ask:**
- "What functionality should this skill support?"
- "Can you give examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"

**Example conversation:**
```
User: "I need a skill for managing ElevenLabs agents"
Claude: "What functionality should the ElevenLabs skill support? Adding tools, updating config, or something else?"
User: "Adding tools, updating agent configuration, syncing with servers"
Claude: "Can you give examples of what users might say?"
User: "Add a new tool for balance", "Update audio quality to 24kHz", "Sync agent config"
```

Conclude when there's clear sense of functionality the skill should support.

### Step 2: Planning Reusable Skill Contents

Analyze each example by:

1. Consider how to execute from scratch
2. Identify helpful scripts, references, and assets for repeated execution

**Example: PDF Editor Skill**
- Query: "Help me rotate this PDF"
- Analysis: Rotating PDF requires rewriting same code each time
- Resource: `scripts/rotate_pdf.py` script

**Example: Frontend Builder Skill**
- Query: "Build me a todo app"
- Analysis: Frontend requires same boilerplate HTML/React each time
- Resource: `assets/hello-world/` template with boilerplate

**Example: BigQuery Skill**
- Query: "How many users logged in today?"
- Analysis: Querying requires rediscovering table schemas each time
- Resource: `references/schema.md` documenting schemas

Create a list of reusable resources: scripts, references, and assets.

### Step 3: Initializing the Skill

Skip only if skill already exists and needs iteration.

When creating new skill from scratch, use the initialization script:

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```

The script:
- Creates skill directory at specified path
- Generates Skill.md template with proper frontmatter
- Creates example resource directories
- Adds example files that can be customized or deleted

### Step 4: Edit the Skill

Remember: Creating for another instance of Claude to use. Focus on beneficial, non-obvious information.

#### Start with Reusable Resources

Implement resources identified in Step 2: `scripts/`, `references/`, and `assets/` files. May require user input (e.g., brand assets, documentation).

Delete any example files not needed for the skill.

#### Update Skill.md

**Writing Style:** Use **imperative/infinitive form** (verb-first instructions), not second person. Use objective, instructional language (e.g., "To accomplish X, do Y" rather than "You should do X").

Answer these questions:

1. What is the purpose of the skill, in a few sentences?
2. When should the skill be used?
3. How should Claude use the skill in practice? Reference all reusable resources.

### Step 5: Packaging a Skill

Package skill into distributable zip file:

```bash
scripts/package_skill.py <path/to/skill-folder>
```

Optional output directory:
```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```

The script will:

1. **Validate** automatically:
   - YAML frontmatter format and required fields
   - Skill naming conventions and directory structure
   - Description completeness and quality
   - File organization and resource references

2. **Package** if validation passes:
   - Creates zip file named after skill (e.g., `my-skill.zip`)
   - Includes all files with proper directory structure

If validation fails, fix errors and run again.

### Step 6: Iterate

After testing, users may request improvements.

**Iteration workflow:**
1. Use skill on real tasks
2. Notice struggles or inefficiencies
3. Identify how Skill.md or resources should be updated
4. Implement changes and test again

## Key Best Practices

### Metadata Quality

**Good descriptions:**
- Specific about functionality and triggers
- Use third-person perspective
- Clear when to invoke

**Examples:**
```yaml
# ✅ GOOD
description: This skill should be used when users want to create or update skills that extend Claude's capabilities with specialized knowledge.

# ❌ BAD (too vague)
description: Helps with skills

# ❌ BAD (second person)
description: Use this skill when you want to create skills
```

### Progressive Disclosure

**Skill.md should be lean (<5k words):**
- Essential workflows and procedures
- When to use which resources
- References to bundled resources

**References files for details:**
- API documentation
- Database schemas
- Detailed specifications
- Company policies

**Avoid duplication:**
- Information lives in either Skill.md or references, not both
- Keep Skill.md procedural, references detailed

### Writing Style

**Imperative form (verb-first):**
```markdown
✅ To rotate a PDF, use the rotate_pdf.py script
✅ Execute package_skill.py to create distributable zip
✅ Validate frontmatter format before packaging

❌ You should use the rotate_pdf.py script to rotate PDFs
❌ If you want to package, run package_skill.py
```

## Example Skills

### Simple Skill (No Bundled Resources)

```
simple-calculator/
└── Skill.md
```

Skill.md contains all instructions inline.

### Skill with Scripts

```
pdf-editor/
├── Skill.md
└── scripts/
    ├── rotate_pdf.py
    └── merge_pdfs.py
```

Skill.md references scripts for deterministic operations.

### Skill with References

```
company-knowledge/
├── Skill.md
└── references/
    ├── api_docs.md
    ├── schema.md
    └── policies.md
```

Skill.md directs Claude to load references as needed.

### Complete Skill

```
frontend-builder/
├── Skill.md
├── scripts/
│   └── init_project.sh
├── references/
│   └── component_library.md
└── assets/
    ├── template/
    └── logo.png
```

Combines all resource types for comprehensive functionality.

## Common Patterns

### CLI Tool Management Skill

**Use case:** Managing CLI tools with complex commands

**Resources:**
- `references/commands.md` - Full command reference
- `references/troubleshooting.md` - Common issues and fixes
- Skill.md - Workflows and when to use which commands

**Example:** ElevenLabs Agent CLI skill

### Code Generator Skill

**Use case:** Generating boilerplate code

**Resources:**
- `assets/templates/` - Boilerplate code templates
- `scripts/init_project.py` - Setup scripts
- Skill.md - How to customize templates

### Documentation Skill

**Use case:** Company-specific knowledge

**Resources:**
- `references/policies.md` - Company policies
- `references/processes.md` - Standard procedures
- Skill.md - When to reference which docs

### Data Processing Skill

**Use case:** Working with specific data formats

**Resources:**
- `scripts/transform.py` - Data transformation scripts
- `references/schema.md` - Data schemas
- Skill.md - Workflows and script usage

## Validation Checklist

Before packaging, verify:

- [ ] YAML frontmatter present and valid
- [ ] `name` field present (< 64 characters)
- [ ] `description` field present (< 200 characters)
- [ ] Description uses third-person perspective
- [ ] Description clearly states when to invoke
- [ ] Skill.md body is lean (< 5k words)
- [ ] All referenced resources exist
- [ ] Scripts are executable
- [ ] No duplicate information between Skill.md and references
- [ ] Writing style is imperative/infinitive form
- [ ] Resource directories properly organized

## Resources

- Anthropic Skills Repository: https://github.com/anthropics/skills
- Skill Creator Scripts: https://github.com/anthropics/skills/tree/main/skill-creator/scripts
- Official Documentation: https://support.claude.com/en/articles/12512198-how-to-create-custom-skills

## Quick Reference

| Task | Action |
|------|--------|
| Create new skill | Use `init_skill.py` script |
| Package skill | Use `package_skill.py` script |
| Add executable code | Place in `scripts/` |
| Add documentation | Place in `references/` |
| Add output resources | Place in `assets/` |
| Keep Skill.md lean | Move details to references |
| Validate skill | Run `package_skill.py` (validates first) |

---

## Version History

- **v1.0.0** (January 2025) - Initial skill creation
  - Complete skill creation process
  - Best practices and patterns
  - Validation checklist
  - Example structures
