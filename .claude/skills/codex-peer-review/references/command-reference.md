# Codex Peer Review - Quick Reference

Fast command templates for common review scenarios.

## Basic Command Structure

```bash
echo "<prompt>" | codex exec \
  --json \
  --output-last-message /tmp/review.txt \
  --sandbox read-only \
  --full-auto \
  -C /path/to/project
```

## Common Review Templates

### Plan Review
```bash
cat docs/plan.md | codex exec \
  --json \
  --output-last-message /tmp/plan-review.txt \
  --sandbox read-only \
  --full-auto \
  "Review this implementation plan for MVP. Focus on:
   - Architectural soundness
   - Missing critical steps
   - Over-engineering risks
   - Security considerations
   Respond concisely with prioritized feedback."
```

### Code Quality Review
```bash
cat src/feature/*.tsx | codex exec \
  --json \
  --output-last-message /tmp/quality-review.txt \
  --sandbox read-only \
  --full-auto \
  "Review this code for:
   - Bugs and edge cases
   - Code quality and patterns
   - Performance issues
   - Type safety
   MVP context: prioritize critical issues.
   Respond concisely."
```

### Security Audit
```bash
cat src/api/*.ts | codex exec \
  --json \
  --output-last-message /tmp/security-review.txt \
  --sandbox read-only \
  --full-auto \
  --search \
  "Security audit for financial app MVP. Check:
   - Input validation
   - Auth/authorization flaws
   - Data exposure risks
   - Injection vulnerabilities
   - API security
   - Sensitive data handling
   HIGH/CRITICAL issues only. Provide fixes."
```

### Architecture Review
```bash
cat ARCHITECTURE.md src/features/*/README.md | codex exec \
  --json \
  --output-last-message /tmp/arch-review.txt \
  --sandbox read-only \
  --full-auto \
  "Review architecture for financial AI assistant MVP:
   - Pattern consistency
   - Scalability for 100-1000 users
   - State management approach
   - Critical issues requiring later refactoring
   Skip over-optimization."
```

### PR Review
```bash
git diff main...feature-branch | codex exec \
  --json \
  --output-last-message /tmp/pr-review.txt \
  --sandbox read-only \
  --full-auto \
  "Review PR diff for merge readiness:
   - Breaking changes
   - Test coverage gaps
   - Security issues
   - Code quality
   - Documentation needs
   Prioritize merge-blocking issues."
```

### Documentation Review
```bash
cat docs/technical-spec.md | codex exec \
  --json \
  --output-last-message /tmp/docs-review.txt \
  --sandbox read-only \
  --full-auto \
  --search \
  "Review technical documentation:
   - Accuracy and completeness
   - Missing critical info
   - Outdated references
   - Code example correctness
   - Developer clarity
   Check against latest practices."
```

## Parallel Reviews

Run multiple reviews concurrently:

```bash
# Start all reviews in background
cat plan.md | codex exec \
  --json --output-last-message /tmp/plan.txt \
  --sandbox read-only --full-auto \
  "Review plan for MVP feasibility" &

cat src/api/*.ts | codex exec \
  --json --output-last-message /tmp/security.txt \
  --sandbox read-only --full-auto --search \
  "Security audit: HIGH/CRITICAL issues only" &

cat src/features/voice/*.tsx | codex exec \
  --json --output-last-message /tmp/quality.txt \
  --sandbox read-only --full-auto \
  "Code quality review: critical issues" &

# Wait for completion
wait

# Aggregate results
echo "=== Plan Review ===" && cat /tmp/plan.txt
echo -e "\n=== Security Audit ===" && cat /tmp/security.txt
echo -e "\n=== Quality Review ===" && cat /tmp/quality.txt
```

## Feature-Specific Reviews

### New Feature End-to-End
```bash
# 1. Plan review
cat docs/feature-plan.md | codex exec \
  --output-last-message /tmp/plan.txt \
  --sandbox read-only --full-auto \
  "Review feature plan for MVP"

# 2. Implementation review
cat src/features/new-feature/*.ts* | codex exec \
  --output-last-message /tmp/impl.txt \
  --sandbox read-only --full-auto \
  "Code quality review for new feature"

# 3. Security check
cat src/features/new-feature/api/*.ts | codex exec \
  --output-last-message /tmp/sec.txt \
  --sandbox read-only --full-auto --search \
  "Security audit for new API endpoints"

# Show all results
cat /tmp/plan.txt /tmp/impl.txt /tmp/sec.txt
```

### Refactoring Validation
```bash
git diff main...refactor-branch | codex exec \
  --output-last-message /tmp/refactor.txt \
  --sandbox read-only --full-auto \
  "Review refactoring for:
   - Behavior preservation
   - Performance impact
   - Breaking changes
   - Test coverage"
```

### Pre-Deployment Security
```bash
cat src/api/**/*.ts src/lib/auth.ts | codex exec \
  --output-last-message /tmp/pre-deploy-security.txt \
  --sandbox read-only --full-auto --search \
  "Pre-deployment security audit for financial app MVP.
   Focus on:
   - Authentication flows
   - Authorization checks
   - Data validation
   - API security
   - Environment variables
   Provide CRITICAL and HIGH issues with fixes."
```

## Git Integration

### Pre-Commit Review
```bash
git diff --staged | codex exec \
  --output-last-message /tmp/pre-commit.txt \
  --sandbox read-only --full-auto \
  "Quick review of staged changes"
```

### Pre-Push Review
```bash
git diff origin/main...HEAD | codex exec \
  --output-last-message /tmp/pre-push.txt \
  --sandbox read-only --full-auto \
  "Review changes before push"
```

### Compare Branches
```bash
git diff main...feature | codex exec \
  --output-last-message /tmp/branch-compare.txt \
  --sandbox read-only --full-auto \
  "Compare branches for merge readiness"
```

## Output Handling

### View Final Review Only
```bash
codex exec --output-last-message /tmp/review.txt ... && cat /tmp/review.txt
```

### Extract Reasoning Steps (JSONL)
```bash
codex exec --json ... | grep '"type":"reasoning"' | jq -r '.item.text'
```

### Get Token Usage
```bash
codex exec --json ... | grep '"type":"turn.completed"' | jq '.usage'
```

### Save Full JSONL Output
```bash
codex exec --json ... > /tmp/review-full.jsonl
```

## MVP-Focused Prompts

### Critical Issues Only
```
"Review for MVP launch with 100 users - flag CRITICAL issues only"
```

### Security (High Priority)
```
"Security audit: focus on HIGH/CRITICAL, skip theoretical edge cases"
```

### Scalability Check
```
"Check if this pattern scales to 1000 users, not 1M users"
```

### Bug Triage
```
"Identify must-fix bugs vs nice-to-have improvements"
```

### Performance
```
"Check for performance bottlenecks for 100-1000 concurrent users"
```

## Flags Reference

| Flag | Purpose | Example |
|------|---------|---------|
| `--json` | JSONL output | `--json` |
| `--output-last-message` | Save final response | `--output-last-message /tmp/out.txt` |
| `--sandbox` | Sandbox mode | `--sandbox read-only` |
| `--full-auto` | Auto-approve commands | `--full-auto` |
| `-C` | Set working directory | `-C /path/to/project` |
| `--search` | Enable web search | `--search` |
| `--model` | Override model | `--model gpt-5` |

## Common Patterns

### Review Multiple Files by Pattern
```bash
find src/features/auth -name "*.ts" -exec cat {} + | codex exec ...
```

### Review Specific Git Commit
```bash
git show <commit-sha> | codex exec ...
```

### Review Changes in Last N Commits
```bash
git diff HEAD~3..HEAD | codex exec ...
```

### Review Specific Function
```bash
cat src/utils/helpers.ts | codex exec \
  ... "Review only the 'validateUserInput' function"
```

## Troubleshooting Quick Fixes

### Timeout on Large Files
```bash
# Break into smaller chunks
cat file1.ts | codex exec ... &
cat file2.ts | codex exec ... &
wait
```

### Too Generic Feedback
```bash
# Add more context
"Review this React component for memory leaks and race conditions.
Context: Financial transaction display with real-time updates."
```

### Over-Engineering Warnings
```bash
# Emphasize MVP scope
"Review for MVP (100 users, 3-month timeline).
Skip enterprise patterns and over-optimization."
```

## One-Liners

```bash
# Quick security check
cat src/api/*.ts | codex exec --output-last-message /tmp/sec.txt --sandbox read-only --full-auto --search "Security audit: CRITICAL issues"

# Fast plan review
cat plan.md | codex exec --output-last-message /tmp/plan.txt --sandbox read-only --full-auto "Review plan for MVP"

# PR readiness
git diff main...HEAD | codex exec --output-last-message /tmp/pr.txt --sandbox read-only --full-auto "PR merge check"

# Pre-commit check
git diff --staged | codex exec --output-last-message /tmp/commit.txt --sandbox read-only --full-auto "Quick review"
```

## Advanced: Custom Review Types

### Type Safety Deep Dive
```bash
cat src/**/*.ts | codex exec \
  --output-last-message /tmp/types.txt \
  --sandbox read-only --full-auto \
  "TypeScript type safety review:
   - any usage
   - Type assertions
   - Missing generics
   - Unsafe casts"
```

### React-Specific Review
```bash
cat src/components/**/*.tsx | codex exec \
  --output-last-message /tmp/react.txt \
  --sandbox read-only --full-auto \
  "React best practices review:
   - Hook dependencies
   - Memory leaks
   - Re-render optimization
   - Accessibility"
```

### Performance Audit
```bash
cat src/features/dashboard/*.tsx | codex exec \
  --output-last-message /tmp/perf.txt \
  --sandbox read-only --full-auto \
  "Performance review for dashboard:
   - Unnecessary re-renders
   - Heavy computations
   - Large bundle impacts
   - Database query patterns"
```

### API Contract Review
```bash
cat src/api/routes/*.ts | codex exec \
  --output-last-message /tmp/api.txt \
  --sandbox read-only --full-auto \
  "API contract review:
   - Breaking changes
   - Versioning strategy
   - Error responses
   - Documentation accuracy"
```

---

**Tip:** Save frequently used commands as shell aliases or scripts for faster access.

```bash
# Add to ~/.bashrc or ~/.zshrc
alias codex-review='codex exec --json --output-last-message /tmp/review.txt --sandbox read-only --full-auto'
alias codex-security='codex exec --json --output-last-message /tmp/security.txt --sandbox read-only --full-auto --search'

# Usage
cat file.ts | codex-review "Quick code review"
cat api.ts | codex-security "Security audit"
```
