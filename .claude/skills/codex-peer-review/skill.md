---
name: Codex Peer Review
description: This skill should ALWAYS be used after you finish implementation PLANS, implement CODE CHANGES. Provides automated code review using Codex CLI with prioritized, MVP-focused feedback. CRITICAL - review findings are proposals - verify each before implementing.
---

# Codex Peer Review

Get independent AI peer review on your work using Codex CLI. Returns prioritized feedback (P0/P1/P2/P3) focused on MVP delivery.

**⚠️ Review findings are proposals** - Verify each finding with code inspection before implementing. Form your own opinion: ✅ AGREE / ❌ DISAGREE / ⚠️ PARTIAL / ❓ UNCERTAIN.

## When to Use

- **Before coding**: Review implementation plans
- **Before PR**: Check code quality and security
- **Before deployment**: Security audit
- **When stuck**: Get architectural feedback

## How It Works

**Run reviews via Task tool** - Reviews take 5-15 minutes. Use Task agent to avoid blocking.

**Review frequently** - Run after each phase/feature, not just at the end. Smaller reviews = faster results.

Use the `scripts/review.sh` helper script:

```bash
# Review a plan
scripts/review.sh plan docs/feature-plan.md

# Review code with context (recommended for features)
scripts/review.sh review-change \
  --description "Added X feature. Focus: state management, memory leaks" \
  --plan /tmp/plan.md

# Review code for quality
scripts/review.sh code src/features/new-feature/*.tsx

# Security audit
scripts/review.sh security src/api/*.ts

# Review PR diff
scripts/review.sh pr
```

Results are saved to `/tmp/codex-review.txt` and displayed automatically.

## Review Types

### 1. Plan Review
Provides feedback to improve implementation plans before coding.

```bash
scripts/review.sh plan docs/implementation-plan.md
```

**Provides suggestions on:**
- Missing critical steps or dependencies
- Over-engineering risks (we're building MVP)
- Security considerations to add
- Architectural concerns for MVP scope
- Potential blockers or risks

*Note: Returns constructive feedback, not priority levels (P0/P1/P2/P3).*

### 2. Code Quality Review
Reviews completed code for bugs and patterns.

```bash
scripts/review.sh code src/features/voice/*.tsx
```

**Checks for:**
- Bugs and edge cases
- Type safety issues
- Performance problems
- React best practices

### 3. Security Audit
Scans for vulnerabilities (uses web search for latest practices).

```bash
scripts/review.sh security src/api/*.ts
```

**Checks for:**
- Input validation gaps
- Auth/authorization flaws
- Data exposure risks
- Injection vulnerabilities
- API security issues

### 4. PR Review
Reviews git diff for merge readiness.

```bash
scripts/review.sh pr
# Or specify branch
scripts/review.sh pr main...feature-branch
```

**Checks for:**
- Breaking changes
- Security issues
- Missing test coverage
- Documentation gaps

### 5. Context-Aware Review (Best for feature implementation)
Reviews changes with context: description + diff + optional plan.

```bash
scripts/review.sh review-change \
  --description "What changed and focus areas" \
  [--plan /path/to/plan.md] \
  [--diff HEAD]
```

**When to use:**
- After implementing a feature (before PR)
- When you want context-specific feedback
- For complex changes that need plan comparison

**Parameters:**
- `--description` (required): What changed, what to focus on
- `--plan` (optional): Original implementation plan
- `--diff` (optional): Git diff spec (default: `main...HEAD`)

## Parallel Reviews (Advanced)

For comprehensive feedback, run multiple reviews in parallel:

```bash
# Review plan, security, and quality concurrently
scripts/review.sh parallel plan:docs/plan.md security:src/api/*.ts code:src/features/*.tsx
```

## Understanding the Output

### Code, Security, PR Reviews
Return **prioritized** issues you must fix:

- **P0 - CRITICAL** - Blocks all users OR security risk
  - App crashes/fails for everyone
  - Data loss or corruption
  - Security vulnerabilities (auth bypass, data exposure, injection attacks)
  - Critical functionality completely broken

- **P1 - HIGH** - Fails for some users OR impacts core functionality
  - Feature fails in specific scenarios/edge cases
  - Performance issues affecting user experience
  - Race conditions or memory leaks
  - Missing error handling on critical paths

- **P2 - MEDIUM** - Minor UX/performance issues
  - Suboptimal patterns or code quality
  - Small performance improvements
  - Missing validation on non-critical paths
  - Accessibility issues

- **P3 - LOW** - Nice-to-have improvements
  - Code style consistency
  - Minor refactoring suggestions
  - Documentation improvements
  - Future scalability considerations (beyond MVP scope)

Example:
```
- P0 — Security vulnerability
  - app/api/signed-url/route.ts:42 exposes endpoint without auth
  - Anyone can drain credits → BLOCKS deployment
  - Fix: Add session auth and rate limits

- P1 — Feature fails in edge case
  - WebSocket disconnect not handled in VoiceChat.tsx:156
  - Users get stuck in "connecting" state after network drop
  - Fix: Add disconnect handler with retry logic

- P2 — Minor UX issue
  - Loading spinner missing on chart generation
  - Users uncertain if action succeeded
  - Fix: Add loading state to ChartCard component
```

### Plan Reviews
Return **constructive feedback** to improve your plan (no priority levels):

Example:
```
- Missing critical steps
  - Add WebSocket connection cleanup to implementation steps
  - Include environment variable setup in deployment section

- Security considerations to add
  - Plan for rate limiting on API endpoints
  - Document PII handling approach

- Over-engineering risks
  - Cross-tab synchronization may be overkill for MVP
  - Consider simpler session management first
```

## Tracking Review Findings

### For Immediate Fixes
Address P0/P1 issues directly in your current work.

### For Deferred Fixes
If you can't fix P0/P1 issues immediately, track them:

**With Linear integration** (if available):
```bash
# Create issue from review output
# (Future: automated script to parse review and create Linear issues)
```

**Without Linear:**
- Create TODO comments in code with references
- Add to project backlog/issue tracker
- Document in technical debt log

## Running from Task Agents (Sandbox Mode)

**Always `cd` to project root first**, then use absolute paths for scripts:

```bash
cd /Users/yuriy.mykhasyak/Documents/MyApps/FinPilot/FinPilot-Project

# Using helper script (recommended)
.claude/skills/codex-peer-review/scripts/review.sh review-change \
  --description "Focus areas for review" \
  --diff HEAD

# Results in /tmp/codex-review.txt
cat /tmp/codex-review.txt
```

## Direct Codex Usage

For custom prompts, use Codex CLI directly:

```bash
cd /Users/yuriy.mykhasyak/Documents/MyApps/FinPilot/FinPilot-Project

codex exec \
  --output-last-message /tmp/codex-review.txt \
  --full-auto \
  "<your prompt>"

cat /tmp/codex-review.txt
```

**When calling via Bash tool:** Add `dangerouslyDisableSandbox: true` (Codex requires macOS system config access)

**Key flags:**
- `--output-last-message` - Save clean output to file
- `--full-auto` - No user prompts
- `--search` - Enable web search (for security reviews)

## MVP-Focused Prompting

All prompts emphasize MVP scope to avoid over-engineering:

```
"Review for MVP with 100-1000 users - flag CRITICAL issues only"
"Security audit: HIGH/CRITICAL issues, skip theoretical edge cases"
"Check if this scales to 1000 users, not 1M"
```

This prevents suggestions like "add enterprise caching layer" when you just need to ship.

## How to Evaluate Findings

**Never blindly implement** - Codex can be wrong about framework patterns, project context, or edge case severity.

**For each finding:** Read code at cited lines → Verify issue exists → Research if uncertain → Form opinion (✅ AGREE / ❌ DISAGREE / ⚠️ PARTIAL) → Propose action with rationale

**Common false positives:** Intentional patterns, framework-specific code, MVP-appropriate tradeoffs, over-estimated performance concerns

## Tips

1. **Review early** - Check plans before coding
2. **Review often** - Quick security checks on API changes
3. **Review before merge** - Always run PR review
4. **Verify P0/P1** - Even high-priority findings need validation
5. **Question P2/P3** - Often over-engineering for MVP
6. **Track deferred issues** - Create Linear issues for P0/P1 you can't fix immediately

## Troubleshooting

**"Review too generic"** → Provide more context in files or prompt
**"Review too slow"** → Review smaller file sets
**"Over-engineering suggestions"** → Script already optimizes for MVP; ignore P2/P3
**"Review analyzed wrong worktree"** → `cd` to the worktree directory before running review

## Resources

- **Full command reference**: [references/command-reference.md](./references/command-reference.md)
- **Real examples**: [references/usage-examples.md](./references/usage-examples.md)
- **Script source**: [scripts/review.sh](./scripts/review.sh)
