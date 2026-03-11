# ERROR FIX Mode - Focused Debugging

**Command:** `fix`

## Purpose
Efficiently identify the **ROOT CAUSE** of reported errors and implement targeted, minimal fixes. Focus exclusively on resolving the specific error without scope creep.

## Core Principle
Isolate the issue, fix it accurately, and verify the fix without introducing regressions. No cutting corners on security or auth.

## Process Overview

1. **Gather Error Context** - Review error messages, stack traces, logs
2. **Detailed Log/Error Analysis** - Use Axiom and Convex tools for investigation
3. **Code Investigation** - Examine specific failure points
4. **Root Cause Hypothesis** - Formulate clear hypothesis and targeted fix
5. **Implement Fix** - Minimal, accurate code changes
6. **Verify Fix** - Test and validate resolution
7. **Documentation** - Update relevant documentation

## Multi-Agent Opportunities 🚀

ERROR FIX mode has **excellent potential** for parallel debugging:

### Parallel Investigation Streams
```
Agent 1: Error Analysis & Reproduction
├── Stack trace analysis
├── Error message interpretation
├── Reproduction scenario creation
├── Timeline reconstruction
└── Context gathering

Agent 2: Log & Data Investigation
├── Axiom log queries and analysis
├── Database state investigation
├── Performance metrics review
├── Related error pattern detection
└── Historical trend analysis

Agent 3: Code & System Investigation
├── Code path analysis
├── Dependency investigation
├── Configuration review
├── Integration point analysis
└── Security implication assessment
```

### Parallel Root Cause Analysis
```
Agent 1: Frontend Investigation
├── Component state analysis
├── Hook behavior investigation
├── User interaction flow
├── Browser-specific issues
└── Client-side error patterns

Agent 2: Backend Investigation
├── Convex function analysis
├── Database operation review
├── Server-side logic validation
├── API integration issues
└── Performance bottlenecks

Agent 3: Integration Investigation
├── Frontend-backend communication
├── External service integration
├── Authentication flow issues
├── Data synchronization problems
└── Configuration mismatches
```

### Implementation Strategy
1. **Parallel Error Investigation**
   - Multiple agents examine different aspects simultaneously
   - Comprehensive error context gathering
   - Faster identification of root causes

2. **Concurrent Code Analysis**
   - Each agent focuses on different layers (UI, API, DB)
   - Parallel examination of potential failure points
   - Cross-validation of findings

3. **Multi-Perspective Problem Solving**
   - Different agents approach from various angles
   - Reduces likelihood of missing critical issues
   - Comprehensive solution validation

## Critical Guidelines

### Avoid Common Shortcuts
🚨 **Security & Auth Shortcuts:**
- Never use "as any" for auth-related type issues
- Don't bypass authentication checks
- Avoid suppressing security warnings

🚨 **Data & Validation Shortcuts:**
- Don't ignore validation errors
- Avoid "any" types for data handling
- Don't bypass data consistency checks

🚨 **Error Handling Shortcuts:**
- Don't catch and ignore errors silently
- Avoid generic error messages
- Don't suppress error logging

## Tools & Commands

### Investigation Tools
- **Axiom Queries:** `mcp_Axiom_queryApl` for log analysis
- **Convex Functions:** `mcp_Convex_run` for function testing
- **Code Search:** `grep_search`, `codebase_search` for pattern finding
- **Build Validation:** `bun build:check` for comprehensive validation

### Common Error Patterns
- **Authentication Issues:** Check customBuilders usage, auth flow
- **Type Errors:** Validate schema definitions, TypeScript types
- **Database Errors:** Check relationships, validators, constraints
- **Performance Issues:** Analyze query patterns, indexing
- **Integration Errors:** Validate external API calls, webhooks

## Completion Criteria
- [ ] Root cause clearly identified
- [ ] Minimal, targeted fix implemented
- [ ] No shortcuts or workarounds used
- [ ] Fix validated through testing
- [ ] `bun build:check` passes
- [ ] Related documentation updated
- [ ] No regressions introduced

## Next Steps
- **TEST** - Validate fix with comprehensive testing
- **MONITOR** - Watch for related issues or regressions

## Reference
- **Full Guidelines:** `Cursor Rules/ERR.md`
- **Logging Analysis:** `Cursor Rules/logging.md`
- **System Architecture:** `SYSTEM_ARCHITECTURE_OVERVIEW.md`
- **Security Patterns:** `Cursor Rules/convex/convex_functions_auth_patterns.md`