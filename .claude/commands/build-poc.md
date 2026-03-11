# BUILD POC Mode - Rapid Implementation

**Command:** `do buildpoc`

## Purpose
Implement Proof-of-Concept (POC) code exactly as defined in approved `PLAN_POC`, prioritizing speed, core logic demonstration, and planned feedback logging.

## Core Principle
Build minimum required to demonstrate the concept quickly. Focus on functionality over polish or comprehensive error handling.

## Process Overview

1. **Verify Plan** - Ensure approved `PLAN_POC` context available
2. **Implement Backend Changes** - Schema and functions with logging
3. **Implement Frontend Changes** - UI components and hooks
4. **Implement Minimal Documentation** - Essential inline comments
5. **Code Style & Quality** - POC-focused standards

## Critical Constraints

### Convex Integration
- ✅ **Always use:** `import { query, mutation } from "convex/customBuilders.ts"`
- ❌ **Never use:** `import { query, mutation } from "_generated/server"`
- **Authentication automatic:** `ctx.user` and `ctx.userId` available
- **Relationship triggers:** Automatic denormalization for consistency

### Logging Requirements
- **Server logging:** `logger.info` from `@/lib/axiom/server`
- **Client logging:** `log.info` from `lib/axiom/client.ts` useLogger hook
- **Log at planned points:** Function entry/exit, state changes, API calls

## Multi-Agent Opportunities 🚀

BUILD POC mode has **excellent potential** for parallel implementation:

### Parallel Implementation Streams
```
Agent 1: Backend Implementation
├── Convex schema modifications
├── Query/mutation functions
├── Validation implementation
├── Server logging integration
└── Basic error handling

Agent 2: Frontend Implementation
├── UI component creation
├── Hook implementation
├── Client logging integration
├── Basic styling
└── User interaction flows

Agent 3: Integration & Validation
├── End-to-end connection
├── Data flow validation
├── Error boundary setup
├── Quick testing
└── Performance check
```

### Parallel Prototype Development
**High-value approach for POCs:**

```
Agent 1: Core Logic Prototype (app/prototypes/[feature]-core/)
├── Essential backend functions
├── Data validation proof
├── Basic CRUD operations
└── Logging implementation

Agent 2: UI Interaction Prototype (app/prototypes/[feature]-ui/)
├── Component interaction demo
├── User flow validation
├── Basic styling proof
└── Responsive behavior

Agent 3: Integration Prototype (app/prototypes/[feature]-full/)
├── Full-stack integration
├── Real data demonstration
├── Error handling proof
└── Performance validation
```

### Implementation Strategy
1. **Parallel Component Development**
   - Each agent works on independent parts simultaneously
   - Reduces total implementation time significantly
   - Enables early integration testing

2. **Concurrent Prototype Building**
   - Multiple working prototypes created in parallel
   - Each validates different aspects of the concept
   - User can compare approaches quickly

3. **Real-time Integration**
   - Agents coordinate on shared interfaces
   - Integration happens continuously during development
   - Early identification of integration issues

### Prototype Management
- **Location:** `app/prototypes/[feature-name]-[type]/`
- **Types:** `-core`, `-ui`, `-full`, `-[approach-name]`
- **Documentation:** Each includes README with implementation notes
- **Feedback:** Comprehensive logging for evaluation
- **Cleanup:** Non-selected prototypes archived after review

## Code Quality Standards (POC Focus)

### Clarity Over Complexity
- Descriptive variable and function names
- Straightforward control flow
- Max nesting depth: 3 levels

### Minimal but Effective
- Essential TypeScript types for clarity
- Basic error handling for critical paths
- File size target: 200-400 LOC per file

## Completion Criteria
- [ ] Approved PLAN_POC implemented exactly
- [ ] Backend functions using customBuilders
- [ ] Frontend components connected
- [ ] Planned logging implemented
- [ ] Basic documentation added
- [ ] Core functionality demonstrable

## Next Steps
- **REVIEW POC** - Evaluate concept viability
- **Multiple Reviews** - If multiple prototypes built, compare all

## Reference
- **Full Guidelines:** `Cursor Rules/BUILD_POC.md`
- **Logging Rules:** `Cursor Rules/logging.md`
- **Convex Rules:** `Cursor Rules/convex/` (for implementation patterns)
- **Prototype Location:** `app/prototypes/`