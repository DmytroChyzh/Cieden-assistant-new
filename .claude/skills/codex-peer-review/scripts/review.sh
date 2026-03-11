#!/bin/bash
#
# Codex Peer Review Helper Script
# Simple wrapper for common review workflows
#

set -e

REVIEW_OUTPUT="/tmp/codex-review.txt"

# Detect if we're in a git worktree
# Worktrees have .git as a file (pointing to real git dir), main repo has .git as directory
if [ -f .git ]; then
    # In a worktree - use current directory
    PROJECT_ROOT="$(pwd)"
else
    # In main repo or no git - use toplevel or pwd
    PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to run codex review
run_review() {
    local prompt="$1"
    local use_search="$2"

    echo -e "${BLUE}Running review...${NC}"

    # Run codex with or without search (--search must go BEFORE exec)
    if [ "$use_search" = "true" ]; then
        codex --search exec \
            --output-last-message "$REVIEW_OUTPUT" \
            --sandbox read-only \
            --full-auto \
            -C "$PROJECT_ROOT" \
            "$prompt" >/dev/null 2>&1
    else
        codex exec \
            --output-last-message "$REVIEW_OUTPUT" \
            --sandbox read-only \
            --full-auto \
            -C "$PROJECT_ROOT" \
            "$prompt" >/dev/null 2>&1
    fi

    if [ -f "$REVIEW_OUTPUT" ]; then
        echo -e "${GREEN}✓ Review complete${NC}\n"
        cat "$REVIEW_OUTPUT"
        echo -e "\n${YELLOW}Results saved to: $REVIEW_OUTPUT${NC}"
    else
        echo -e "${RED}✗ Review failed${NC}"
        exit 1
    fi
}

# Review type handlers
review_plan() {
    local file="$1"
    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: File not found: $file${NC}"
        exit 1
    fi

    local prompt="🔍 TWO-PHASE PLAN REVIEW PROCESS

PHASE 1: CODEBASE RESEARCH (MANDATORY - Complete this first!)

Before reviewing the plan, you MUST research the actual codebase to understand current implementation:

**Research Steps:**
1. **Read files mentioned in the plan** - Use 'read' tool for files referenced in plan
2. **Search for related patterns** - Use 'glob' to find related files (e.g., **/*settings*.ts, **/*elevenlabs*.tsx)
3. **Grep for key concepts** - Search for patterns, functions, types mentioned in plan
4. **Analyze dependencies** - Understand how features connect and depend on each other
5. **Check project skills documentation** - Read .claude/skills/elevenlabs-*/skill.md for known constraints
6. **MANDATORY: Web search external APIs** - For ElevenLabs features, search:
   - https://elevenlabs.io/docs/agents-platform/customization/personalization/overrides (what can be overridden?)
   - https://elevenlabs.io/docs/agents-platform/customization/voice/speed-control (can speed be per-session?)
   - Verify claims about what's possible vs impossible with actual documentation

**Confidence Gate: Only proceed to Phase 2 when >95% confident you understand:**
- Current implementation state (actual code, not assumptions)
- Existing patterns and architectural decisions
- Technical constraints from dependencies
- Integration points and data flows

Think: \"Have I actually READ the relevant code files? Or am I guessing?\"

---
PHASE 2: DETAILED PLAN ANALYSIS (After research)

Now analyze the plan below using your research findings.

**Provide specific feedback with evidence from codebase:**

**Critical Issues (with file/line references):**
- [Issue] - Reference: [actual file:line from your research]
- Example: \"Plan updates shared agent globally (Phase 3), but ElevenLabsProvider.tsx:1050 shows this affects all users\"

**Missing Steps (based on actual code patterns):**
- [Missing step] - Evidence: [pattern you found in codebase]
- Example: \"Missing auth check in Phase 1. Existing pattern in convex/userPreferences.ts:38 requires ctx.auth.getUserIdentity()\"

**Incorrect Assumptions (conflicts with research):**
- [Wrong assumption] - Reality: [what you found in code]
- Example: \"Plan assumes per-user speed config possible, but src/providers/ElevenLabsProvider.tsx:478 uses shared agent ID\"

**Overlooked Dependencies (from codebase analysis):**
- [Dependency] - Found in: [file where you discovered it]
- Example: \"Plan doesn't account for cross-tab session lock in src/utils/crossTabSession.ts:15-45\"

**Leverage Existing Patterns (opportunities found):**
- [Pattern to reuse] - Location: [where it exists]
- Example: \"Reuse voice mapping from src/config/elevenLabsTools.ts:8-15 instead of creating new mapper\"

---
PROJECT CONTEXT:

$(cat "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null || echo "No CLAUDE.md found")

---
📋 IMPLEMENTATION PLAN TO REVIEW:

$(cat "$file")

---
REQUIREMENTS:
✅ Phase 1 research complete (files read, patterns analyzed)
✅ >95% confidence in understanding current state
✅ Specific file/line references in all feedback
✅ Evidence from ACTUAL CODE, not assumptions
✅ Web search used for external dependencies (if needed)"

    echo "" | run_review "$prompt" "true"
}

review_code() {
    local files="$@"

    local prompt="TASK: Review this code for bugs, quality, and performance.

Check for:
- Bugs and edge cases
- Code quality and patterns
- Performance issues
- Type safety issues
- Best practices for the tech stack

Priority definitions with examples:

P0 - CRITICAL (Blocks all users OR security risk):
- App crashes for everyone (e.g., uncaught exception in render path)
- Data loss/corruption (e.g., mutation deletes wrong records)
- Security vulnerabilities (e.g., auth bypass, SQL injection, exposed keys)
- Critical functionality broken (e.g., users can't login, payments fail)

P1 - HIGH (Fails for some users OR impacts core functionality):
- Feature fails in edge cases (e.g., WebSocket reconnect not handled)
- Performance issues affecting UX (e.g., 5s load time, memory leak)
- Race conditions or concurrency bugs
- Missing error handling on critical paths (e.g., no try/catch on API calls)

P2 - MEDIUM (Minor UX/performance issues):
- Suboptimal patterns (e.g., unnecessary re-renders, N+1 queries)
- Small performance improvements (e.g., could memoize heavy computation)
- Missing validation on non-critical paths
- Accessibility issues (e.g., missing ARIA labels)
- Code quality (e.g., overly complex functions, poor naming)

P3 - LOW (Nice-to-have improvements):
- Code style consistency (e.g., formatting, naming conventions)
- Minor refactoring suggestions
- Documentation improvements
- Future scalability beyond current MVP scope

Provide file:line references and specific fixes.

---
PROJECT CONTEXT (for reference):

$(cat "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null || echo "No CLAUDE.md found")"

    cat $files | run_review "$prompt" "true"
}

review_security() {
    local files="$@"

    local prompt="TASK: Security audit - identify vulnerabilities and risks.

Check for:
- Input validation and sanitization
- Authentication/authorization flaws
- Data exposure risks (PII, credentials)
- Injection vulnerabilities (SQL, XSS, etc.)
- API security best practices
- Environment variable leaks

Priority definitions with examples:

P0 - CRITICAL (Security risks that block deployment):
- Auth bypass (e.g., endpoint without authentication check, JWT not verified)
- Data exposure (e.g., API returns all users' PII, no row-level security)
- Injection attacks (e.g., unsanitized SQL query, XSS in rendered content)
- Credential leaks (e.g., API keys in client code, .env committed to git)

P1 - HIGH (Security issues affecting some scenarios):
- Missing rate limiting (e.g., brute force possible on login)
- Weak session management (e.g., no httpOnly cookies, no CSRF protection)
- CORS misconfiguration (e.g., allows all origins on sensitive endpoints)
- Missing input validation on user data (e.g., no length limits, type checks)
- Insufficient error handling exposing internals

P2 - MEDIUM (Minor security improvements):
- Missing CSRF tokens on non-critical mutations
- Weak password requirements
- Missing security headers (CSP, X-Frame-Options)
- Verbose error messages in production
- Missing audit logging on sensitive operations

P3 - LOW (Hardening for future):
- Additional encryption at rest
- Security monitoring/alerts
- Penetration testing recommendations
- Compliance certifications (SOC2, etc.)

Provide file:line references and code fixes.

---
PROJECT CONTEXT (for reference):

$(cat "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null || echo "No CLAUDE.md found")"

    cat $files | run_review "$prompt" "true"
}

review_pr() {
    local branch_spec="${1:-HEAD}"

    # If just "pr" with no args, compare HEAD to main
    if [ "$branch_spec" = "HEAD" ]; then
        branch_spec="main...HEAD"
    fi

    if ! git diff "$branch_spec" >/dev/null 2>&1; then
        echo -e "${RED}Error: Invalid git branch specification: $branch_spec${NC}"
        exit 1
    fi

    local prompt="TASK: Review this PR diff for merge readiness.

Check for:
- Breaking changes
- Security issues
- Test coverage gaps
- Code quality problems
- Documentation updates needed

Priority definitions with examples:

P0 - CRITICAL (Blocks deployment):
- Breaks all users (e.g., syntax error, missing dependency)
- Security vulnerabilities (e.g., new endpoint without auth)
- Data loss risk (e.g., wrong field deleted in migration)

P1 - HIGH (Should fix before merge):
- Breaks some users (e.g., edge case not handled)
- Missing error handling on new critical paths
- Performance regression (e.g., N+1 query introduced)
- Breaking API changes without migration

P2 - MEDIUM (Fix when you can):
- Minor code quality issues
- Missing tests for non-critical features
- Suboptimal patterns introduced
- Documentation gaps

P3 - LOW (Future improvements):
- Code style inconsistencies
- Refactoring suggestions
- Nice-to-have documentation

Provide specific file:line references from the diff.

---
PROJECT CONTEXT (for reference):

$(cat "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null || echo "No CLAUDE.md found")"

    git diff "$branch_spec" | run_review "$prompt" "true"
}

review_change() {
    local description=""
    local plan_file=""
    local diff_spec="main...HEAD"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --description)
                description="$2"
                shift 2
                ;;
            --plan)
                plan_file="$2"
                shift 2
                ;;
            --diff)
                diff_spec="$2"
                shift 2
                ;;
            *)
                echo -e "${RED}Error: Unknown option: $1${NC}"
                echo "Usage: $0 review-change --description '<desc>' [--plan <file>] [--diff <spec>]"
                exit 1
                ;;
        esac
    done

    # Validate required parameters
    if [ -z "$description" ]; then
        echo -e "${RED}Error: --description is required${NC}"
        echo "Usage: $0 review-change --description '<desc>' [--plan <file>] [--diff <spec>]"
        exit 1
    fi

    # Get the diff
    if ! git diff "$diff_spec" >/dev/null 2>&1; then
        echo -e "${RED}Error: Invalid git diff specification: $diff_spec${NC}"
        exit 1
    fi

    local diff_output=$(git diff "$diff_spec")
    if [ -z "$diff_output" ]; then
        echo -e "${RED}Error: No changes found in diff: $diff_spec${NC}"
        exit 1
    fi

    # Read plan if provided
    local plan_content=""
    if [ -n "$plan_file" ]; then
        if [ ! -f "$plan_file" ]; then
            echo -e "${YELLOW}Warning: Plan file not found: $plan_file (continuing without it)${NC}"
        else
            plan_content=$(cat "$plan_file")
        fi
    fi

    local prompt="🔍 CONTEXT-AWARE CODE REVIEW

You have full autonomy to explore the codebase using available tools (read, glob, grep) to understand context.

---
📝 CHANGE DESCRIPTION:

$description

"

    if [ -n "$plan_content" ]; then
        prompt+="---
📋 ORIGINAL IMPLEMENTATION PLAN:

$plan_content

"
    fi

    prompt+="---
🔀 DIFF OF CHANGES:

$diff_output

---
🎯 YOUR TASK:

1. **Understand the Context First** (use tools as needed):
   - Read full files mentioned in diff for complete context
   - Search for related patterns (glob/grep) to understand existing architecture
   - Check project documentation (.claude/skills/, CLAUDE.md, etc.)
   - Verify assumptions by reading actual code

2. **Review Against the Plan** (if provided):
   - Does implementation match the plan?
   - Are there deviations? Are they justified?
   - Missing steps from the plan?

3. **Code Quality Analysis**:
   - **P0 - CRITICAL**: Crashes, data loss, security vulnerabilities
   - **P1 - HIGH**: Edge case failures, race conditions, memory leaks
   - **P2 - MEDIUM**: Suboptimal patterns, code quality issues
   - **P3 - LOW**: Style, refactoring suggestions, future improvements

4. **Specific Focus Areas for This Change**:
   - State management correctness
   - Memory leaks (proper cleanup, unregister handlers)
   - Race conditions (callbacks firing after unmount)
   - Type safety
   - Integration points with existing code

**Requirements:**
✅ Use tools to read files and understand context (don't guess!)
✅ Provide specific file:line references
✅ Include code snippets showing the issue
✅ Suggest concrete fixes
✅ Prioritize issues (P0/P1/P2/P3)

---
PROJECT CONTEXT (for reference):

$(cat "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null || echo "No CLAUDE.md found")"

    echo "" | run_review "$prompt" "true"
}

review_parallel() {
    echo -e "${YELLOW}Parallel reviews: Run multiple review commands in separate terminals${NC}"
    echo "Example:"
    echo "  Terminal 1: $0 plan docs/plan.md &"
    echo "  Terminal 2: $0 security src/api/*.ts &"
    echo "  Terminal 3: $0 code src/features/*.tsx &"
    echo "  Then: wait"
}

# Main command router
case "$1" in
    plan)
        shift
        review_plan "$@"
        ;;
    code)
        shift
        review_code "$@"
        ;;
    security)
        shift
        review_security "$@"
        ;;
    pr)
        shift
        review_pr "$@"
        ;;
    review-change)
        shift
        review_change "$@"
        ;;
    parallel)
        shift
        review_parallel "$@"
        ;;
    *)
        echo "Codex Peer Review"
        echo ""
        echo "Usage:"
        echo "  $0 plan <file>                              - Review implementation plan"
        echo "  $0 code <files...>                          - Review code quality"
        echo "  $0 security <files...>                      - Security audit"
        echo "  $0 pr [branch-spec]                         - Review PR diff (default: main...HEAD)"
        echo "  $0 review-change --description '<desc>' \\"
        echo "                   [--plan <file>] \\"
        echo "                   [--diff <spec>]            - Context-aware code review (RECOMMENDED)"
        echo "  $0 parallel <type:target...>                - Run multiple reviews in parallel"
        echo ""
        echo "Examples:"
        echo "  $0 plan docs/feature-plan.md"
        echo "  $0 code src/features/voice/*.tsx"
        echo "  $0 security src/api/*.ts"
        echo "  $0 pr"
        echo "  $0 pr main...feature-branch"
        echo "  $0 review-change --description 'Added VAD integration for user speaking detection' --plan /tmp/vad-plan.txt"
        echo "  $0 review-change --description 'Fixed auth bug' --diff 'main...bugfix-branch'"
        echo "  $0 parallel plan:docs/plan.md security:src/api/*.ts"
        echo ""
        echo "Results saved to: $REVIEW_OUTPUT"
        exit 1
        ;;
esac
