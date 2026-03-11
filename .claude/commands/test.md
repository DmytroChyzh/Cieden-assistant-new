# TEST Mode - Comprehensive Validation

**Command:** `do test`

## Purpose
Implement tests specified in the active PLAN, run checks, and iterate until those tests pass. Validate functionality, performance, and integration points.

## Core Principle
Ensure quality through comprehensive testing. Validate both happy paths and edge cases.

## Process Overview

1. **Test Strategy Review** - Understand testing requirements from active PLAN
2. **Test Implementation** - Create unit, integration, and E2E tests
3. **Test Execution** - Run tests and validate results
4. **Issue Resolution** - Fix failing tests and implementation issues
5. **Performance Validation** - Ensure performance requirements met
6. **Documentation Update** - Update test documentation

## Testing Commands

### Core Commands
- `npm run test:once` - Run tests once
- `npm run test:core` - Run core tests (excluding timeout tests)
- `bun build:check` - Comprehensive build and lint validation

## Multi-Agent Opportunities 🚀

TEST mode has **significant potential** for parallel testing:

### Parallel Testing Streams
```
Agent 1: Backend Testing
├── Convex function unit tests
├── Database integration tests
├── Schema validation tests
├── Performance benchmarks
└── Security testing

Agent 2: Frontend Testing
├── Component unit tests
├── Hook testing
├── User interaction tests
├── Accessibility testing
└── Visual regression tests

Agent 3: Integration & E2E Testing
├── End-to-end user flows
├── API integration tests
├── Cross-browser testing
├── Performance testing
└── Error scenario testing
```

### Parallel Test Categories
```
Agent 1: Happy Path Testing
├── Core functionality validation
├── Expected user flows
├── Successful data operations
├── Normal performance scenarios
└── Standard configuration testing

Agent 2: Edge Case & Error Testing
├── Boundary condition testing
├── Error handling validation
├── Network failure scenarios
├── Invalid input handling
└── Security vulnerability testing

Agent 3: Performance & Load Testing
├── Response time validation
├── Memory usage testing
├── Concurrent user simulation
├── Database performance
└── Bundle size optimization
```

### Implementation Strategy
1. **Parallel Test Development**
   - Each agent creates tests for different domains
   - Comprehensive coverage across all aspects
   - Independent test suite execution

2. **Concurrent Test Execution**
   - Multiple test suites run simultaneously
   - Faster feedback on test results
   - Parallel debugging of failures

3. **Cross-Validation Testing**
   - Agents validate each other's implementations
   - Multiple perspectives on test coverage
   - Comprehensive edge case identification

## Test Types & Coverage

### Unit Tests
- **Convex Functions:** Input validation, business logic, error handling
- **React Components:** Rendering, props, interactions, state management
- **Utility Functions:** Pure function validation, edge cases

### Integration Tests
- **Frontend-Backend:** API calls, data flow, error propagation
- **Database Operations:** CRUD operations, relationships, consistency
- **External Services:** Third-party integrations, webhook handling

### End-to-End Tests
- **User Workflows:** Complete feature usage scenarios
- **Cross-Feature:** Integration between different system parts
- **Performance:** Real-world usage patterns and load

## Performance Testing

### Key Metrics
- **Response Times:** API calls, page loads, user interactions
- **Memory Usage:** Client and server resource consumption
- **Database Performance:** Query optimization, index usage
- **Bundle Size:** Frontend asset optimization

### Tools Integration
- **Convex MCP:** Database function testing and validation
- **Performance Monitoring:** Real-time performance metrics
- **Load Testing:** Simulate concurrent user scenarios

## Completion Criteria
- [ ] All planned tests implemented
- [ ] Unit test coverage meets requirements
- [ ] Integration tests validate data flow
- [ ] E2E tests cover user workflows
- [ ] Performance benchmarks met
- [ ] All tests passing
- [ ] `bun build:check` successful
- [ ] Test documentation updated

## Next Steps
- **REVIEW** - Validate implementation against plan
- **ITERATE** - Address any identified issues

## Reference
- **Full Guidelines:** `Cursor Rules/TEST.md`
- **Convex Testing:** `Cursor Rules/convex/convex_testing_guidelines.md`
- **Performance Standards:** `SYSTEM_ARCHITECTURE_OVERVIEW.md`