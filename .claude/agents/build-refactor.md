# build-refactor

**Description:** Code restructuring with behavior preservation
**Color:** purple

## Core Refactoring Guidelines

### Safety-First Approach
- **Always run tests before refactoring:** `bun build:check` to establish baseline
- **Preserve public interfaces:** Maintain API contracts and function signatures
- **Use small, atomic commits:** Each refactor step should be independently verifiable
- **Validate behavior preservation:** Run tests after each refactoring step

### Pre-Refactor Validation
```bash
# Required checks before any refactoring
bun build:check                    # Full build validation
npm run test:core                  # Core functionality tests
bun convex dev --once              # Convex schema validation
```

### Convex-Specific Refactoring Patterns

#### Function Signature Changes
```typescript
// SAFE: Add optional parameters
// Before
export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => { ... }
});

// After
export const getUser = query({
  args: { 
    id: v.id("users"),
    includeProfile: v.optional(v.boolean()) // Safe addition
  },
  handler: async (ctx, { id, includeProfile = false }) => { ... }
});
```

#### Database Query Optimization
```typescript
// SAFE: Optimize query structure while preserving results
// Before
const users = await ctx.db.query("users").collect();
const activeUsers = users.filter(u => u.status === "active");

// After
const activeUsers = await ctx.db
  .query("users")
  .withIndex("by_status", q => q.eq("status", "active"))
  .collect();
```

### React Component Refactoring

#### Hook Extraction Pattern
```typescript
// SAFE: Extract custom hooks without changing component behavior
// Before
function UserProfile({ userId }: { userId: string }) {
  const user = useQuery(api.users.get, { id: userId });
  const updateUser = useMutation(api.users.update);
  
  const handleUpdate = useCallback(async (data: UserData) => {
    await updateUser({ id: userId, ...data });
  }, [userId, updateUser]);
  
  return <div>{/* component JSX */}</div>;
}

// After
function useUserProfile(userId: string) {
  const user = useQuery(api.users.get, { id: userId });
  const updateUser = useMutation(api.users.update);
  
  const handleUpdate = useCallback(async (data: UserData) => {
    await updateUser({ id: userId, ...data });
  }, [userId, updateUser]);
  
  return { user, handleUpdate };
}

function UserProfile({ userId }: { userId: string }) {
  const { user, handleUpdate } = useUserProfile(userId);
  return <div>{/* same component JSX */}</div>;
}
```

### Code Quality Improvements

#### Type Safety Enhancement
```typescript
// SAFE: Strengthen types without breaking existing code
// Before
interface User {
  id: string;
  email: string;
  status: string; // Weak typing
}

// After
interface User {
  id: Id<"users">;
  email: string;
  status: "active" | "inactive" | "pending"; // Stronger typing
}
```

#### Error Handling Consolidation
```typescript
// SAFE: Centralize error handling patterns
// Before - Scattered error handling
try {
  const result = await api.call();
  return result;
} catch (error) {
  console.error("API call failed:", error);
  throw error;
}

// After - Consistent error handling
const handleApiCall = async <T>(
  apiCall: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    console.error(`${context} failed:`, error);
    // Add telemetry, user notification, etc.
    throw error;
  }
};
```

### Performance Optimization Patterns

#### Memoization Refactoring
```typescript
// SAFE: Add memoization without changing behavior
// Before
const ExpensiveComponent = ({ data }: { data: ComplexData[] }) => {
  const processedData = data.map(item => expensiveCalculation(item));
  return <div>{/* render processedData */}</div>;
};

// After
const ExpensiveComponent = ({ data }: { data: ComplexData[] }) => {
  const processedData = useMemo(
    () => data.map(item => expensiveCalculation(item)),
    [data]
  );
  return <div>{/* same render logic */}</div>;
};
```

### Refactoring Validation Checklist

#### Post-Refactor Verification
- [ ] `bun build:check` passes
- [ ] `npm run test:core` passes
- [ ] No TypeScript errors
- [ ] No ESLint warnings introduced
- [ ] Convex functions deploy successfully
- [ ] Database queries return expected results
- [ ] UI components render identically
- [ ] Performance metrics unchanged or improved

#### Behavior Preservation Tests
```typescript
// Create behavior tests before refactoring
describe('Refactoring validation', () => {
  it('preserves original function behavior', async () => {
    const originalResult = await originalFunction(testInput);
    const refactoredResult = await refactoredFunction(testInput);
    expect(refactoredResult).toEqual(originalResult);
  });
});
```

### Critical Safety Rules

#### Never Refactor These Simultaneously
- ❌ Database schema changes + function logic changes
- ❌ API interface changes + implementation changes
- ❌ Authentication logic + business logic
- ❌ Multiple component hierarchies in one commit

#### Always Preserve
- ✅ Public API contracts
- ✅ Database constraints
- ✅ Authentication flows
- ✅ Error handling behavior
- ✅ Performance characteristics

### Rollback Strategy
```bash
# Immediate rollback if refactoring breaks functionality
git stash                          # Save current work
git reset --hard HEAD~1           # Revert last commit
bun build:check                    # Verify stability
```

### Documentation Updates
- Update function comments after signature changes
- Refresh README sections affected by architectural changes
- Update type definitions in schema files
- Maintain changelog entries for significant refactors