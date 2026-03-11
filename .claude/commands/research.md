# RESEARCH Mode - Thorough Analysis

**Command:** `do res`

## Purpose
Understand requirements, existing codebase, and context thoroughly before planning. Identify strategic goal (POC vs. MVP). Documentation-first approach.

## Process Overview

### Phase 1: Documentation Review
1. **Analyze Request & Context**
2. **Review Existing Documentation** (blocking requirement)
   - `SYSTEM_ARCHITECTURE_OVERVIEW.md`
   - Feature-specific `.doc.md` and `.tasks.md` files
   - Relevant technical rules from `Cursor Rules/`
3. **Consult Technical Rules** based on task requirements

### Phase 2: Targeted Code Investigation  
4. **Comprehensive Dependency Analysis**
5. **Identify Documentation Gaps**
6. **Explore Codebase** (targeted based on gaps)
7. **Analyze Patterns & Dependencies**

### Phase 3: External Research & Synthesis
8. **External Research** (if needed)
9. **Strategic Goal Assessment** (POC vs MVP)
10. **Update Feature Documentation**

## Multi-Agent Opportunities 🚀

RESEARCH mode has **high potential** for parallel execution:

### Parallel Research Streams
```
Agent 1: Codebase Analysis
├── Backend functions analysis
├── Schema investigation  
├── Dependency mapping
└── Pattern identification

Agent 2: Documentation & External Research
├── Existing documentation review
├── External API research
├── Best practices investigation
└── Library version checks

Agent 3: Frontend & Integration Analysis  
├── UI component analysis
├── Hook patterns investigation
├── Integration point mapping
└── User flow analysis
```

### Implementation Strategy
1. **Parallel Codebase Exploration**
   - Multiple agents search different code areas simultaneously
   - Each agent focuses on specific domains (backend, frontend, integrations)
   - Results consolidated for comprehensive understanding

2. **Concurrent Documentation Review**
   - Agent 1: Technical documentation (`Cursor Rules/`, architecture docs)
   - Agent 2: Feature documentation (`.doc.md`, `.tasks.md` files)  
   - Agent 3: External research (APIs, libraries, best practices)

3. **Parallel Dependency Analysis**
   - Agent 1: Backend dependencies (`grep` convex functions)
   - Agent 2: Frontend dependencies (`grep` React components)
   - Agent 3: Configuration dependencies (configs, schemas)

### Consolidation Process
- Each agent reports findings in structured format
- Main orchestrator synthesizes results
- Identifies gaps requiring additional investigation
- Creates comprehensive research summary

## Completion Criteria
- [ ] Documentation review complete
- [ ] Code exploration targeted and complete  
- [ ] Patterns/dependencies analyzed
- [ ] External research performed (if needed)
- [ ] Strategic goal determined (POC/MVP)
- [ ] Feature documentation updated

## Next Steps
= **DESIGN** if requres UX changes (new components, large layout changes, etc ).
- **IDEATE** if multiple backend approaches possible
- **Direct to PLAN** if no UI changes and single clear backend approach exists

## Always Reference latest docs for convex 1.25 from July 2025 that you may miss.
- **Technical Rules:** `Cursor Rules/convex/` 
convex_typescript_best_practices.md
convex_data_access_storage.md
convex_react_integration.md
convex_schema_validators_indexing_typescript.md
convex_workflows.md
convex_testing_guidelines.md
convex_functions_auth_patterns.md
convex_http_actions.md
convex_migrations.md
convex_scheduling_rules.md
convex_mock_data_guidelines.md
- **Architecture:** `SYSTEM_ARCHITECTURE_OVERVIEW.md`