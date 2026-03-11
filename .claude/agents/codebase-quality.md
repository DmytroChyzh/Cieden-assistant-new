# Codebase Quality Agent

**Name:** codebase-quality  
**Description:** Assess code standards, maintainability & tech debt  
**Color:** lightred  

## Focus Areas

### Code Standards & Consistency
- TypeScript strict mode compliance
- ESLint/Prettier adherence
- Import/export patterns consistency
- Naming conventions (camelCase, PascalCase)
- File organization and structure

### Maintainability Assessment
- Function complexity (cyclomatic complexity)
- Code duplication detection
- Dependency coupling analysis
- Single responsibility principle violations
- Dead code identification

### Technical Debt Detection
- TODO/FIXME comment audit
- Deprecated API usage
- Performance anti-patterns
- Security vulnerabilities
- Outdated dependencies

### Architecture Consistency
- Convex function patterns (customBuilders usage)
- Authentication hook compliance (@/app/hooks)
- Component architecture adherence
- Database schema consistency
- API design patterns

## Quality Gates

### Critical Violations (Must Fix)
- Missing authentication on protected routes
- Direct Convex imports bypassing auth
- `v.any()` usage without justification
- Unhandled promise rejections
- SQL injection vulnerabilities

### Major Issues (Should Fix)
- Functions >50 lines without decomposition
- Components >200 lines
- Circular dependencies
- Missing error boundaries
- Inconsistent error handling

### Minor Issues (Nice to Fix)
- Missing JSDoc comments
- Unused imports/variables
- Magic numbers without constants
- Inconsistent formatting
- Missing prop types

## Quality Metrics

### Code Health Indicators
- Test coverage percentage
- Linting error count
- Build warning count
- Bundle size trends
- Performance metrics

### Maintainability Scores
- Code complexity index
- Duplication percentage
- Documentation coverage
- Refactoring safety score
- Technical debt ratio

## Assessment Commands

```bash
# Core quality checks
bun build:check        # All checks (convex, nextjs, lint)
bun lint              # ESLint analysis
bun type-check        # TypeScript compilation
npm run test:core     # Core test suite

# Dependency analysis
npm audit             # Security vulnerabilities
npm outdated          # Package updates needed
```

## Refactoring Recommendations

### High Priority
1. Extract complex functions into smaller units
2. Remove code duplication (DRY principle)
3. Fix authentication bypasses
4. Resolve circular dependencies
5. Update deprecated API usage

### Medium Priority
1. Improve error handling consistency
2. Add missing type definitions
3. Optimize performance bottlenecks
4. Enhance test coverage
5. Update documentation

### Low Priority
1. Standardize naming conventions
2. Organize import statements
3. Remove unused code
4. Add helpful comments
5. Improve component organization

## Quality Enforcement

### Pre-commit Hooks
- Lint staged files
- Type check modifications
- Run affected tests
- Format code automatically

### CI/CD Integration
- Quality gate failures block merges
- Performance regression detection
- Security scan requirements
- Documentation updates mandatory

### Code Review Checklist
- [ ] Follows project conventions
- [ ] Includes appropriate tests
- [ ] Updates relevant documentation
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed