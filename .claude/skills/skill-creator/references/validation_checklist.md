# Skill Validation Checklist

This reference provides a comprehensive checklist for validating skills before packaging.

## YAML Frontmatter Validation

### Required Fields

- [ ] **name** field present
  - Must be between 1-64 characters
  - Should be human-readable and descriptive
  - Example: "ElevenLabs Agent CLI Manager"

- [ ] **description** field present
  - Must be between 1-200 characters
  - Should clearly state when skill is invoked
  - Must use third-person perspective
  - Should be specific, not vague

- [ ] **version** field present (optional but recommended)
  - Should follow semantic versioning (e.g., "1.0.0")

### Format Requirements

- [ ] YAML frontmatter starts with `---`
- [ ] YAML frontmatter ends with `---`
- [ ] Valid YAML syntax (proper indentation, quotes if needed)
- [ ] Frontmatter is at the very beginning of Skill.md

**Example of valid frontmatter:**
```yaml
---
name: Skill Name
description: This skill should be used when users want to [specific action]. It provides [specific functionality].
version: 1.0.0
---
```

## Description Quality Validation

### Third-Person Perspective

- [ ] Uses "This skill should be used" not "Use this skill"
- [ ] Uses "it provides" not "you can use it to"
- [ ] Avoids second-person pronouns (you, your)

**Good examples:**
```yaml
description: This skill should be used when users want to create or update skills that extend Claude's capabilities.
description: This skill manages ElevenLabs agents and tools. Invoke when adding tools, updating config, or syncing with servers.
```

**Bad examples:**
```yaml
description: Use this skill when you want to work with skills
description: You can use this to manage agents
description: Helps with stuff
```

### Specificity

- [ ] Clearly states WHEN to invoke the skill
- [ ] Describes WHAT the skill does
- [ ] Provides enough context for auto-invocation
- [ ] Avoids vague terms like "helps with" or "works with"

## File Structure Validation

### Required Files

- [ ] `Skill.md` exists in skill root directory
- [ ] Skill directory name matches intended skill name
- [ ] No spaces in skill directory name (use hyphens)

### Resource Directories

- [ ] `scripts/` directory exists if referenced in Skill.md
- [ ] `references/` directory exists if referenced in Skill.md
- [ ] `assets/` directory exists if referenced in Skill.md
- [ ] All referenced files actually exist
- [ ] No broken links in Skill.md

### File Organization

- [ ] Scripts in `scripts/` directory only
- [ ] Documentation in `references/` directory only
- [ ] Output resources in `assets/` directory only
- [ ] No files in skill root except Skill.md

## Content Validation

### Skill.md Body

- [ ] Total length < 5k words (keep it lean)
- [ ] Uses imperative/infinitive form (verb-first)
- [ ] Avoids second-person ("you") throughout
- [ ] Includes "When to Use This Skill" section
- [ ] Documents all bundled resources
- [ ] Provides clear workflows or procedures
- [ ] Includes examples where helpful

### Writing Style

- [ ] Imperative form: "To accomplish X, do Y"
- [ ] Not: "You should do X" or "If you want X"
- [ ] Objective and instructional tone
- [ ] Clear and concise explanations
- [ ] Proper markdown formatting

### Resource Documentation

- [ ] All scripts referenced with purpose
- [ ] All references described with content type
- [ ] All assets explained with usage
- [ ] Clear when to use each resource
- [ ] No duplicate information between Skill.md and references

## Script Validation

If skill includes scripts:

- [ ] Scripts have proper shebang (e.g., `#!/usr/bin/env python3`)
- [ ] Scripts are executable (`chmod +x`)
- [ ] Scripts have docstrings/comments
- [ ] Script purpose documented in Skill.md
- [ ] Script dependencies listed (if any)
- [ ] Scripts tested and working

## Reference Files Validation

If skill includes references:

- [ ] Markdown files properly formatted
- [ ] Information not duplicated in Skill.md
- [ ] Clear when Claude should load each reference
- [ ] Large files (>10k words) have grep patterns in Skill.md
- [ ] References contain detailed information
- [ ] Skill.md remains procedural, references remain detailed

## Asset Validation

If skill includes assets:

- [ ] Assets are output resources, not documentation
- [ ] Asset purpose documented in Skill.md
- [ ] Assets properly organized in subdirectories
- [ ] File formats appropriate for use case
- [ ] Templates/boilerplate tested and working

## Progressive Disclosure Validation

- [ ] Metadata (name + description) ~100 words
- [ ] Skill.md body < 5k words
- [ ] Detailed info in references, not Skill.md
- [ ] Clear guidance on when to load references
- [ ] No context window bloat from redundant info

## Pre-Packaging Checklist

Before running `package_skill.py`:

- [ ] All validation checks above passed
- [ ] Skill tested on real examples
- [ ] User feedback incorporated
- [ ] Examples and workflows verified
- [ ] Troubleshooting section helpful
- [ ] Version number updated if applicable
- [ ] No unnecessary example files remaining
- [ ] All referenced resources exist and work

## Common Issues

### Issue: Description Too Vague

**Problem:** `description: Helps with agents`

**Fix:** Be specific about when and what:
```yaml
description: This skill should be used when managing ElevenLabs agents and tools. Invoke when adding tools, updating config, or syncing with servers.
```

### Issue: Second Person Usage

**Problem:** `description: Use this skill when you want to...`

**Fix:** Use third person:
```yaml
description: This skill should be used when users want to...
```

### Issue: Skill.md Too Long

**Problem:** Skill.md is 10k+ words with API docs embedded

**Fix:** Move API docs to `references/api_docs.md`, keep workflows in Skill.md

### Issue: Duplicate Information

**Problem:** Same information in both Skill.md and references

**Fix:** Choose one location - procedural in Skill.md, detailed in references

### Issue: Broken Resource References

**Problem:** Skill.md references `scripts/rotate.py` but file doesn't exist

**Fix:** Either create the file or remove the reference

### Issue: Wrong Writing Style

**Problem:** "You should use the rotate_pdf.py script to rotate PDFs"

**Fix:** "To rotate a PDF, use the rotate_pdf.py script"

## Validation Commands

### Manual Check

```bash
# Check YAML frontmatter
head -10 Skill.md

# Check word count
wc -w Skill.md

# Check file structure
ls -la

# Verify all referenced files exist
grep -o 'scripts/[^`]*' Skill.md | xargs ls -l
grep -o 'references/[^`]*' Skill.md | xargs ls -l
grep -o 'assets/[^`]*' Skill.md | xargs ls -l
```

### Automated Packaging (includes validation)

```bash
# This validates AND packages
scripts/package_skill.py path/to/skill-folder
```

## Post-Validation Steps

After validation passes:

1. Package the skill
2. Test with real use cases
3. Gather user feedback
4. Iterate based on feedback
5. Update version number
6. Re-validate and re-package

## Quality Metrics

A high-quality skill should:

- [ ] Be automatically invoked when appropriate
- [ ] Provide clear, actionable guidance
- [ ] Include all necessary resources
- [ ] Maintain lean Skill.md (<5k words)
- [ ] Use proper progressive disclosure
- [ ] Have clear examples and workflows
- [ ] Include troubleshooting guidance
- [ ] Be well-organized and documented
- [ ] Follow all style guidelines
- [ ] Work reliably on real tasks
