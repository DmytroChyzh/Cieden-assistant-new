# build-new-feature

**Description:** Create robust new functionality with quality patterns

**Color:** lightgreen

## Core Quality Principles

### Architecture Constraints
- **Max nesting depth:** 3 levels for functions/components
- **File LOC targets:** Functions ≤150, Components ≤200, Pages ≤300
- **Single responsibility:** One feature concern per file
- **Dependency direction:** UI → hooks → Convex functions → schema

### Critical Checkpoints
1. **Schema first:** Define tables/indexes before functions
2. **Validators mandatory:** All args/returns with specific types
3. **Auth patterns:** Use custom builders, never bypass hooks
4. **Type safety:** `Id<"table">` not strings, avoid `any`

## DRY Patterns & Reusability

### Common Components
- **Form patterns:** Reuse validation schemas across create/edit
- **List patterns:** Standardize pagination, filtering, sorting
- **Modal patterns:** Consistent open/close state management
- **Error boundaries:** Wrap feature areas, not individual components

### Function Composition
- **Query chaining:** Build complex views from simple queries
- **Mutation batching:** Group related operations in transactions
- **Validation sharing:** Extract common validators to shared modules
- **Permission patterns:** Centralize access control logic

## Validation Commands

### Pre-implementation
```bash
bun build:check  # Before any code changes
```

### During development
```bash
# After schema changes
bun convex dev --reset-test-data

# After function changes
npm run test:core

# Before committing
bun build:check && npm run test:once
```

### Feature validation
- **Database consistency:** Use Convex MCP to verify data structure
- **Real-time updates:** Test with multiple browser tabs
- **Permission boundaries:** Verify auth constraints work
- **Error states:** Test network failures, invalid data

## Critical Pitfalls

### Authentication Bypasses
- ❌ `import from "convex/react"` - bypasses auth
- ❌ Manual `ctx.auth` checks - use custom builders
- ❌ Client-side only validation - always validate server-side

### Performance Anti-patterns
- ❌ N+1 queries in components - batch at Convex level
- ❌ Unnecessary re-renders - memoize expensive computations
- ❌ Large result sets - implement proper pagination
- ❌ Blocking mutations - use optimistic updates where appropriate

### Schema Evolution
- ❌ Breaking changes without migrations
- ❌ Missing indexes on query fields
- ❌ Overly permissive validators
- ❌ Circular dependencies between tables

## Implementation Flow

1. **Schema definition** → Run `bun build:check`
2. **Convex functions** → Test with MCP tools
3. **React hooks/components** → Test with `npm run test:core`
4. **Integration testing** → Full `bun build:check`
5. **Manual validation** → Multi-tab, error scenarios

## Quality Gates

- **Type coverage:** No `any` types without justification
- **Error handling:** All mutations handle failure cases
- **Loading states:** All async operations show progress
- **Accessibility:** Keyboard navigation, screen reader support
- **Responsive design:** Mobile-first approach verified