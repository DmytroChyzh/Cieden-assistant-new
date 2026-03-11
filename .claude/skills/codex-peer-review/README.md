# Codex Peer Review Skill

Get independent AI peer review using Codex CLI. Simple, opinionated workflow with helper script.

## Quick Start

```bash
# Review a plan
.claude/skills/codex-peer-review/scripts/review.sh plan docs/feature-plan.md

# Review code
.claude/skills/codex-peer-review/scripts/review.sh code src/features/voice/*.tsx

# Security audit
.claude/skills/codex-peer-review/scripts/review.sh security src/api/*.ts

# Review PR
.claude/skills/codex-peer-review/scripts/review.sh pr
```

Results saved to `/tmp/codex-review.txt` with prioritized feedback (P0/P1/P2/P3).

## Review Types

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `plan <file>` | Review implementation plan | Before coding |
| `code <files>` | Code quality & bugs | Before PR |
| `security <files>` | Security audit | API changes, before deploy |
| `pr [branch]` | PR readiness | Before merge |
| `parallel <specs>` | Multiple reviews | Comprehensive check |

## What You Get

### Plan Reviews
**Constructive feedback** to improve your plan (no priorities):
- Missing steps or dependencies
- Over-engineering risks
- Security considerations to add
- Architectural concerns

### Code/Security/PR Reviews
**Prioritized issues** to fix:
- **P0** - Blocks all users OR security risk (must fix before deploy)
- **P1** - Fails for some users OR impacts core functionality (fix before launch)
- **P2** - Minor UX/performance issues (fix when you can)
- **P3** - Nice-to-have improvements (backlog)

Example:
```
- P0 — Security vulnerability (blocks deployment)
  - app/api/route.ts:42 exposes endpoint without auth
  - Anyone can drain credits

- P1 — Feature fails in edge case
  - WebSocket disconnect not handled
  - Users stuck after network drop
```

**Tracking**: For P0/P1 issues you can't fix immediately, create Linear issues (if available) or add to backlog.

## Files

- **[skill.md](./skill.md)** - Concise skill guide (~175 lines)
- **[scripts/review.sh](./scripts/review.sh)** - Helper script for common reviews
- **[references/](./references/)** - Detailed docs and examples (optional reading)

## Requirements

- Codex CLI installed: `codex --version`
- Git repository (for PR reviews)

## Git Worktree Support

The review script automatically works with git worktrees - just `cd` to the worktree before running:

```bash
# Switch to your worktree
cd /path/to/my-worktree

# Run review (script analyzes worktree code, not main repo)
/path/to/main-repo/.claude/skills/codex-peer-review/scripts/review.sh plan docs/plan.md
```

**How it works:** `git rev-parse --show-toplevel` returns the worktree path when run from a worktree.

**Verify detection:**
```bash
cd /path/to/worktree
git rev-parse --show-toplevel
# Should return: /path/to/worktree
```

**Note:** If plan file exists only in main repo, use absolute path:
```bash
cd /path/to/worktree
/path/to/main/.claude/skills/codex-peer-review/scripts/review.sh plan /path/to/main/docs/plan.md
```

## Version

**v2.1.0** - Added git worktree support, simplified script-based workflow
