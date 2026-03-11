# BUILD ITER Mode - Quick Iterations

**Command:** `do builditer`

## Purpose
Implement small, quick adjustments identified during REVIEW or ad-hoc requests. Skip full PLAN phase for simple, well-understood changes.

## Core Principle
Make targeted, minimal changes efficiently. Focus on specific improvements without extensive planning overhead.

## When to Use
- Simple changes (≤30 LOC, ≤2 files)
- High confidence in approach (>95%)
- Well-understood modifications
- Bug fixes and small enhancements
- UI tweaks and minor feature additions

## Process Overview

1. **Quick Assessment** - Verify change scope and complexity
2. **Targeted Implementation** - Make specific, minimal changes
3. **Immediate Validation** - Quick testing and verification
4. **Documentation Update** - Update relevant documentation if needed

## Multi-Agent Opportunities 🚀

BUILD ITER mode has **moderate potential** for parallel execution:

### Parallel Quick Fixes
```
Agent 1: Frontend Iterations
├── UI component adjustments
├── Styling updates
├── User interaction improvements
├── Client-side bug fixes
└── Performance optimizations

Agent 2: Backend Iterations
├── Function parameter adjustments
├── Validation rule updates
├── Query optimizations
├── Server-side bug fixes
└── Configuration changes

Agent 3: Integration & Testing
├── Integration point updates
├── Test case adjustments
├── Documentation updates
├── Deployment configuration
└── Quick validation
```

### Parallel Bug Resolution
```
Agent 1: UI/UX Issues
├── Visual bug fixes
├── Interaction improvements
├── Responsive design fixes
├── Accessibility improvements
└── User feedback implementation

Agent 2: Logic & Data Issues
├── Business logic corrections
├── Data validation fixes
├── Query optimizations
├── Performance improvements
└── Security enhancements

Agent 3: Infrastructure Issues
├── Configuration fixes
├── Deployment issues
├── Monitoring adjustments
├── Logging improvements
└── Error handling updates
```

### Implementation Strategy
1. **Parallel Domain Fixes**
   - Each agent handles different types of issues
   - Reduces dependencies and conflicts
   - Faster overall resolution time

2. **Independent Quick Changes**
   - Multiple small changes implemented simultaneously
   - Cross-validation of changes
   - Comprehensive testing coverage

3. **Coordinated Integration**
   - Changes integrated and tested together
   - Conflict resolution and coordination
   - Unified deployment and validation

## Change Categories

### UI/UX Iterations
- **Visual Adjustments:** Colors, spacing, typography
- **Interaction Improvements:** Button states, feedback, animations
- **Responsive Fixes:** Mobile and tablet layout issues
- **Accessibility:** ARIA labels, keyboard navigation, contrast

### Logic & Data Iterations
- **Validation Updates:** Input validation rules, error messages
- **Query Optimizations:** Performance improvements, index usage
- **Business Logic:** Rule adjustments, calculation fixes
- **Data Transformations:** Format changes, field mappings

### Infrastructure Iterations
- **Configuration:** Environment variables, feature flags
- **Monitoring:** Log levels, metric collection, alerts
- **Performance:** Caching, bundling, optimization
- **Security:** Access control, validation, sanitization

## Quality Gates

### Immediate Validation
- **Functionality:** Core feature still works
- **No Regressions:** Existing functionality unaffected
- **Performance:** No significant performance degradation
- **Security:** No security vulnerabilities introduced

### Quick Testing
- **Unit Tests:** Affected functions still pass
- **Integration Tests:** Key workflows still functional
- **Manual Testing:** Quick smoke test of changes
- **Build Validation:** `bun build:check` passes

## Completion Criteria
- [ ] Targeted changes implemented
- [ ] No regressions introduced
- [ ] Quick validation completed
- [ ] `bun build:check` passes
- [ ] Documentation updated if needed
- [ ] Changes ready for deployment

## Next Steps
- **TEST** - If changes are significant
- **Direct Deployment** - If changes are minimal and validated

## Reference
- **Full Guidelines:** `Cursor Rules/BUILD_ITER.md`
- **Quality Standards:** `CLAUDE.md` (core constraints)
- **Quick Validation:** `bun build:check` command