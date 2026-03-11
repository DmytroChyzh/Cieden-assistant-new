# Codex Peer Review - Usage Examples

Real-world examples of using Codex CLI for peer review in the FinPilot project.

## Example 1: Feature Plan Review

**Scenario:** Before implementing voice message history feature

```bash
cat docs/voice-history-plan.md | codex exec \
  --json \
  --output-last-message /tmp/plan-review.txt \
  --sandbox read-only \
  --full-auto \
  "Review this implementation plan for a financial AI assistant MVP. Focus on:
   - Architectural soundness for MVP scope
   - Missing critical steps or dependencies
   - Over-engineering risks (we're building MVP, not enterprise)
   - Security considerations
   - Potential blockers
   Respond concisely with prioritized feedback."

# View results
cat /tmp/plan-review.txt
```

**Expected feedback areas:**
- Integration with existing `voiceSessions` table
- Privacy considerations for storing transcripts
- Real-time sync vs batch processing
- Impact on Convex quota

## Example 2: Security Audit of API Routes

**Scenario:** Review API routes before production deployment

```bash
cat app/api/elevenlabs/*.ts app/api/copilotkit/*.ts | codex exec \
  --json \
  --output-last-message /tmp/api-security.txt \
  --sandbox read-only \
  --full-auto \
  --search \
  "Security audit for financial app API routes. Check for:
   - API key exposure
   - Input validation on webhook endpoints
   - CORS configuration
   - Rate limiting
   - Authentication verification
   - Data sanitization
   Focus on HIGH/CRITICAL issues. Provide code fixes."

cat /tmp/api-security.txt
```

**Critical areas:**
- Environment variable leakage
- Webhook signature verification
- API key rotation strategy
- Request validation

## Example 3: React Component Quality Review

**Scenario:** Review voice interaction components

```bash
cat src/components/unified/*.tsx src/features/voice/*.tsx | codex exec \
  --json \
  --output-last-message /tmp/voice-components.txt \
  --sandbox read-only \
  --full-auto \
  "Review these React components for a voice AI feature:
   - Memory leaks in useEffect hooks
   - Race conditions in async state updates
   - Proper cleanup in WebSocket/WebRTC connections
   - Type safety issues
   - Re-render optimization
   Context: Real-time voice interactions with ElevenLabs.
   Prioritize CRITICAL issues."

cat /tmp/voice-components.txt
```

**Focus areas:**
- WebSocket connection cleanup
- Audio stream disposal
- State synchronization
- Cross-tab session management

## Example 4: Parallel Review Strategy

**Scenario:** Comprehensive review before PR merge

```bash
# Terminal 1: Plan/Architecture
cat docs/implementation-plan.md | codex exec \
  --output-last-message /tmp/architecture.txt \
  --sandbox read-only --full-auto \
  "Architecture review for MVP: flag critical scalability issues" &

# Terminal 2: Security
cat src/api/**/*.ts src/lib/auth.ts | codex exec \
  --output-last-message /tmp/security.txt \
  --sandbox read-only --full-auto --search \
  "Security audit: HIGH/CRITICAL only, financial app context" &

# Terminal 3: Code Quality
cat src/features/chat/*.tsx | codex exec \
  --output-last-message /tmp/quality.txt \
  --sandbox read-only --full-auto \
  "React code quality: hooks, performance, accessibility" &

# Terminal 4: TypeScript Safety
cat src/**/*.ts | codex exec \
  --output-last-message /tmp/types.txt \
  --sandbox read-only --full-auto \
  "TypeScript safety: check any usage, unsafe casts, missing types" &

# Wait and aggregate
wait
echo "=== Architecture ===" && cat /tmp/architecture.txt
echo -e "\n=== Security ===" && cat /tmp/security.txt
echo -e "\n=== Quality ===" && cat /tmp/quality.txt
echo -e "\n=== Types ===" && cat /tmp/types.txt
```

**Benefits:**
- 4x faster than sequential reviews
- Comprehensive coverage
- Independent perspectives
- Easy to prioritize results

## Example 5: PR Diff Review

**Scenario:** Review feature branch before merge

```bash
git diff main...feature/seamless-multimodal-chat | codex exec \
  --json \
  --output-last-message /tmp/pr-review.txt \
  --sandbox read-only \
  --full-auto \
  "Review this PR for a voice/text mode switching feature:
   - Breaking changes to existing voice flow
   - Potential race conditions in mode switching
   - Security issues with WebSocket/WebRTC toggle
   - Test coverage gaps
   - Documentation updates needed
   Context: ElevenLabs integration with dual connection modes.
   Flag merge-blocking issues."

cat /tmp/pr-review.txt
```

**Key review points:**
- Backward compatibility
- State transition safety
- Connection cleanup
- User experience edge cases

## Example 6: Convex Schema Review

**Scenario:** Validate database schema changes

```bash
cat convex/schema.ts | codex exec \
  --json \
  --output-last-message /tmp/schema-review.txt \
  --sandbox read-only \
  --full-auto \
  "Review this Convex database schema for a financial AI assistant:
   - Index optimization for common queries
   - Missing relationships or foreign keys
   - Data type choices (v.any() usage)
   - Privacy/security field considerations
   - Migration path from current schema
   Context: Real-time sync, ~1000 users, financial data.
   Prioritize performance and data integrity issues."

cat /tmp/schema-review.txt
```

**Focus areas:**
- Query performance
- Data validation
- Privacy-sensitive fields
- Index strategy

## Example 7: Pre-Deployment Checklist

**Scenario:** Final review before production deployment

```bash
#!/bin/bash
# pre-deploy-review.sh

echo "Running pre-deployment reviews..."

# 1. Security audit
echo "=== Security Audit ==="
cat src/api/**/*.ts convex/auth.ts | codex exec \
  --output-last-message /tmp/deploy-security.txt \
  --sandbox read-only --full-auto --search \
  "Pre-deployment security audit for financial app:
   - Authentication flows
   - API security
   - Data validation
   - Environment variables
   - Third-party integrations
   CRITICAL issues only."
cat /tmp/deploy-security.txt

# 2. Performance check
echo -e "\n=== Performance Review ==="
cat src/features/**/*.tsx convex/**/*.ts | codex exec \
  --output-last-message /tmp/deploy-perf.txt \
  --sandbox read-only --full-auto \
  "Performance review for 1000 concurrent users:
   - Database query optimization
   - React rendering bottlenecks
   - Bundle size issues
   - Real-time sync performance
   Flag critical bottlenecks."
cat /tmp/deploy-perf.txt

# 3. Error handling
echo -e "\n=== Error Handling Review ==="
cat src/**/*.{ts,tsx} | codex exec \
  --output-last-message /tmp/deploy-errors.txt \
  --sandbox read-only --full-auto \
  "Error handling review:
   - Uncaught promise rejections
   - Missing try-catch in critical paths
   - User-facing error messages
   - Logging strategy
   Flag critical gaps."
cat /tmp/deploy-errors.txt

echo -e "\n=== Review Complete ==="
```

## Example 8: Documentation Sync Check

**Scenario:** Ensure documentation matches current implementation

```bash
cat README.md ARCHITECTURE.md docs/*.md | codex exec \
  --json \
  --output-last-message /tmp/docs-sync.txt \
  --sandbox read-only \
  --full-auto \
  --search \
  "Check if documentation matches current codebase:
   - Verify architecture diagrams accuracy
   - Check API examples work
   - Validate tech stack versions
   - Find outdated instructions
   - Compare with src/ structure
   Reference latest Next.js, Convex, ElevenLabs docs.
   Flag critical inaccuracies."

cat /tmp/docs-sync.txt
```

## Example 9: Refactoring Safety Check

**Scenario:** Validate large refactoring (toolBridge.ts consolidation)

```bash
# Before/after comparison
git show main:src/utils/toolBridge.ts > /tmp/before.ts
git show HEAD:src/utils/toolBridge.ts > /tmp/after.ts

cat /tmp/before.ts /tmp/after.ts | codex exec \
  --json \
  --output-last-message /tmp/refactor-review.txt \
  --sandbox read-only \
  --full-auto \
  "Review toolBridge.ts refactoring (before vs after):
   - Verify all tool handlers preserved
   - Check for behavior changes
   - Identify breaking changes
   - Validate error handling maintained
   - Check type safety improvements
   Context: Voice tool routing for ElevenLabs integration.
   Flag any behavioral differences."

cat /tmp/refactor-review.txt
```

## Example 10: Quick Pre-Commit Hook

**Scenario:** Fast review of staged changes before commit

```bash
#!/bin/bash
# .git/hooks/pre-commit (make executable)

echo "Running quick code review..."

STAGED_FILES=$(git diff --staged --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

if [ -n "$STAGED_FILES" ]; then
  git diff --staged | codex exec \
    --output-last-message /tmp/pre-commit-review.txt \
    --sandbox read-only \
    --full-auto \
    "Quick review of staged changes:
     - Obvious bugs
     - Console.log statements
     - Commented code
     - TODO/FIXME additions
     - Security red flags
     Respond in 3-5 bullet points."

  echo "=== Review ==="
  cat /tmp/pre-commit-review.txt
  echo ""

  read -p "Proceed with commit? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

## Example 11: Cross-Feature Consistency Check

**Scenario:** Ensure consistency across similar features

```bash
cat src/features/charts/*.tsx src/features/voice/*.tsx | codex exec \
  --json \
  --output-last-message /tmp/consistency.txt \
  --sandbox read-only \
  --full-auto \
  "Review cross-feature consistency:
   - Error handling patterns
   - Loading state management
   - User action callback patterns
   - Component prop interfaces
   - Convex query usage
   Identify inconsistencies that could cause confusion.
   Context: FinPilot feature modules."

cat /tmp/consistency.txt
```

## Example 12: Third-Party Integration Review

**Scenario:** Review ElevenLabs integration code

```bash
cat src/providers/ElevenLabsProvider.tsx \
    src/config/elevenLabsTools.ts \
    app/api/elevenlabs/*.ts | codex exec \
  --json \
  --output-last-message /tmp/elevenlabs-review.txt \
  --sandbox read-only \
  --full-auto \
  --search \
  "Review ElevenLabs integration for production:
   - SDK usage best practices
   - Connection lifecycle management
   - Error recovery strategies
   - API key security
   - Webhook verification
   - Billing optimization (avoid duplicate charges)
   Reference latest ElevenLabs docs.
   Flag critical issues."

cat /tmp/elevenlabs-review.txt
```

## Tips for Effective Reviews

### 1. Provide Context
Always include project-specific context:
```bash
"Context: Financial AI assistant MVP, 100-1000 users, Next.js 15 + Convex"
```

### 2. Prioritize Findings
Request prioritized feedback:
```bash
"Respond with CRITICAL, HIGH, MEDIUM priority levels"
```

### 3. Focus Reviews
Narrow scope for better feedback:
```bash
# Too broad
cat src/**/*.ts | codex exec ... "Review all code"

# Better
cat src/features/auth/*.ts | codex exec ... "Review auth flow for security"
```

### 4. Use Web Search for Latest Info
Enable `--search` for framework/library reviews:
```bash
--search "Check against Next.js 15 best practices"
```

### 5. Save Common Prompts
Create aliases for frequent reviews:
```bash
alias review-security='codex exec --output-last-message /tmp/sec.txt --sandbox read-only --full-auto --search'
alias review-plan='codex exec --output-last-message /tmp/plan.txt --sandbox read-only --full-auto'

# Usage
cat api.ts | review-security "Security audit for API endpoint"
cat plan.md | review-plan "Review implementation plan for MVP"
```

## Common Patterns

### Pattern 1: Feature Development Cycle
```bash
# 1. Plan review
cat docs/feature.md | codex exec ... "Review plan"

# 2. Implementation review (parallel)
cat src/feature/*.tsx | codex exec ... "Code quality" &
cat src/feature/api/*.ts | codex exec ... "Security audit" &
wait

# 3. PR review
git diff main...feature | codex exec ... "PR readiness"
```

### Pattern 2: Weekly Codebase Audit
```bash
# Run every Friday before sprint end
git diff main...develop | codex exec ... "Weekly audit: security + quality"
```

### Pattern 3: Continuous Documentation Sync
```bash
# Run after major features
cat docs/**/*.md | codex exec --search ... "Verify docs match latest code"
```

---

**Note:** All examples use FinPilot project context. Adjust paths and context for your specific project.
