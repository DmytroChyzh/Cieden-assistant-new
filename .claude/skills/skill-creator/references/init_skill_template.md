# Skill Initialization Template

This reference provides the template structure for initializing a new skill.

## Directory Structure

When initializing a skill, create this structure:

```
skill-name/
├── Skill.md
├── scripts/
│   └── example_script.py
├── references/
│   └── example_reference.md
└── assets/
    └── example_asset.txt
```

## Skill.md Template

```markdown
---
name: Skill Name
description: This skill should be used when [specific trigger conditions]. [Brief functionality description].
version: 1.0.0
---

# Skill Name

Brief description of what this skill does.

## When to Use This Skill

Invoke this skill when:
- [Specific use case 1]
- [Specific use case 2]
- [Specific use case 3]

## Prerequisites

- [Requirement 1]
- [Requirement 2]

## Core Functionality

### [Feature 1]

[Description of how to use feature 1]

### [Feature 2]

[Description of how to use feature 2]

## Resources

### Scripts

- `scripts/example_script.py` - [What it does and when to use it]

### References

- `references/example_reference.md` - [What information it contains]

### Assets

- `assets/example_asset.txt` - [What it is and how to use it]

## Workflows

### Workflow 1: [Task Name]

**Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Example:**
```
[Example usage]
```

### Workflow 2: [Task Name]

**Steps:**
1. [Step 1]
2. [Step 2]

## Best Practices

- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

## Troubleshooting

### Issue 1

**Problem:** [Description]

**Solution:** [How to fix]

### Issue 2

**Problem:** [Description]

**Solution:** [How to fix]

## Version History

- **v1.0.0** (Date) - Initial creation
  - [Feature 1]
  - [Feature 2]
```

## Example Script Template

```python
#!/usr/bin/env python3
"""
Example script for [skill name]

This script demonstrates [what it does].
"""

def main():
    """Main function"""
    print("Example script executed successfully")

if __name__ == "__main__":
    main()
```

## Example Reference Template

```markdown
# Example Reference

This reference provides [type of information] for [skill name].

## Section 1

[Content]

## Section 2

[Content]

## Quick Reference

| Item | Description |
|------|-------------|
| [Item 1] | [Description] |
| [Item 2] | [Description] |
```

## Example Asset Template

```
Example asset file content
This could be a template, configuration file, or any resource
used in the skill's output.
```

## Initialization Checklist

When initializing a new skill:

- [ ] Create skill directory with proper name
- [ ] Create Skill.md with YAML frontmatter
- [ ] Add `name` and `description` in frontmatter
- [ ] Write skill body using imperative form
- [ ] Create `scripts/` directory if needed
- [ ] Create `references/` directory if needed
- [ ] Create `assets/` directory if needed
- [ ] Add example files to demonstrate structure
- [ ] Document all resources in Skill.md
- [ ] Include workflows and examples
- [ ] Add troubleshooting section
- [ ] Test skill structure

## Tips

1. **Start minimal** - Begin with just Skill.md, add resources as needed
2. **Clear descriptions** - Use third-person, be specific about triggers
3. **Lean Skill.md** - Move detailed info to references
4. **Organize resources** - Use subdirectories in scripts/references/assets
5. **Document everything** - Reference all resources in Skill.md
6. **Test early** - Try using the skill immediately after creation
