 # PLAN POC Mode - Rapid Prototyping Planner

**Command:** `do planpoc`

## Purpose
Create blueprint for **new features or Proof-of-Concepts (POCs)**, focusing on speed, exploring core logic/UI, and enabling quick feedback. Robustness and comprehensive testing are secondary.

## Core Principle
Plan minimum viable steps to demonstrate the concept and gather feedback. Prioritize speed of implementation.

## Process Overview

1. **Clarify POC Goal** - Define what question this POC answers
2. **Define Scope** - Essential UI, backend, schema (leverage existing system)
3. **Outline Implementation Steps** - Files, functions, data flow
4. **Plan for Feedback** - Identify logging points for tracing
5. **Set Documentation Expectations** - Minimal inline comments
6. **Produce Checklist & Tasks** - Actionable task list

## Key Constraints

### Convex Integration
- ✅ **Always use:** `import { query, mutation } from "./customBuilders"`
- ❌ **Never use:** `import { query, mutation } from "./_generated/server"`
- **Authentication automatic:** `ctx.user` and `ctx.userId` available
- **Relationship triggers:** Automatic denormalization for data consistency

### Scope Limitations
- **Avoid complex schema changes** requiring data migration
- **Assume additive changes** or simple modifications only
- **Leverage existing system** features (auth, validation, triggers)
- **Explicitly list OUT-OF-SCOPE** features for this POC

## Multi-Agent Opportunities 🚀

PLAN POC mode benefits from **parallel planning** across domains:

### Parallel Planning Streams
```
Agent 1: Backend Planning
├── Schema changes analysis
├── Function signature design
├── Data flow mapping
└── Validation requirements

Agent 2: Frontend Planning  
├── UI component structure
├── User interaction flows
├── Hook integration patterns
└── Basic styling approach

Agent 3: Integration Planning
├── API connection points
├── Error handling strategy
├── Logging implementation
└── Performance considerations
```

### Parallel Prototype Architecture
```
Agent 1: Core Logic Prototype
├── Backend function POC
├── Data validation POC
├── Basic CRUD operations
└── Save to app/prototypes/[feature]-backend/

Agent 2: UI Interaction Prototype
├── Component structure POC
├── User flow validation
├── Basic interaction patterns
└── Save to app/prototypes/[feature]-frontend/

Agent 3: Full Integration Prototype
├── End-to-end flow POC
├── Real data integration
├── Error handling POC
└── Save to app/prototypes/[feature]-integration/
```

### Implementation Strategy
1. **Parallel Domain Planning**
   - Each agent focuses on specific technical domain
   - Reduces planning time and increases thoroughness
   - Ensures all aspects are considered simultaneously

2. **Concurrent Prototype Planning**
   - Plan multiple prototype variants simultaneously
   - Each addresses different aspects of the POC
   - Allows for parallel validation of different concepts

3. **Coordinated Integration**
   - Results combined into comprehensive POC plan
   - Integration points identified and validated
   - Potential conflicts resolved before implementation

## Completion Checklist
- [ ] POC Goal & Acceptance Criteria Defined
- [ ] Minimal Scope (UI, Backend, Schema) Defined
- [ ] Out-of-Scope Items Listed
- [ ] Implementation Steps (Files, Functions, Flow) Outlined
- [ ] Feedback Logging Points Identified
- [ ] Formal Testing Confirmed as Out-of-Scope
- [ ] Minimal Documentation Expectation Set
- [ ] Tasks updated in `[feature].tasks.md`

## Next Steps
- **BUILD POC** - Implement the planned prototype
- **Multiple Prototypes** - If multiple approaches planned, build in parallel

## Reference
- **Full Guidelines:** `Cursor Rules/PLAN_POC.md`
- **Convex Rules:** `Cursor Rules/convex/` (for technical implementation)
- **Prototype Location:** `app/prototypes/`