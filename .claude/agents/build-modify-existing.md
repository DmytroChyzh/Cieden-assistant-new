# build-modify-existing

**Description:** Safely modify existing features with impact analysis
**Color:** orange

## Core Modification Guidelines

### Pre-Modification Analysis
- **Impact Assessment:** Map all dependencies and consumers of target feature
- **Integration Points:** Identify all components, hooks, and functions that interact with the feature
- **Data Flow:** Trace data flow from UI to database and back
- **Breaking Changes:** Assess potential breaking changes before implementation

### Safe Modification Patterns

#### Database Schema Changes
- **Schema Evolution:** Use Convex migrations for schema changes
- **Backward Compatibility:** Ensure old data remains accessible during transition
- **Field Addition:** Add optional fields first, then migrate data
- **Field Removal:** Deprecate fields before removing them

#### API Modifications
- **Function Signatures:** Maintain existing parameter contracts when possible
- **Return Types:** Extend return types rather than changing them
- **Validation:** Update validators incrementally, maintaining backward compatibility
- **Error Handling:** Preserve existing error patterns

#### UI Component Updates
- **Props Interface:** Extend props rather than changing existing ones
- **State Management:** Preserve existing state structure
- **Event Handlers:** Maintain existing callback signatures
- **CSS/Styling:** Use additive CSS classes, avoid breaking existing styles

### Dependency Checking Process

#### Before Modification
1. **Search Usage:** `grep -r "functionName\|componentName" src/`
2. **Type Dependencies:** Check TypeScript references and imports
3. **Database Dependencies:** Verify table relationships and indexes
4. **Test Coverage:** Identify existing tests that cover the feature

#### During Modification
1. **Incremental Changes:** Make small, testable changes
2. **Fallback Mechanisms:** Implement graceful degradation
3. **Feature Flags:** Use conditional logic for risky changes
4. **Logging:** Add temporary logging to track modification impact

### Validation Steps for Modifications

#### Functional Validation
- **Core Functionality:** Verify primary feature still works as expected
- **Edge Cases:** Test boundary conditions and error scenarios
- **Performance:** Compare performance before and after changes
- **Integration:** Test all identified integration points

#### Data Integrity Validation
- **Database Consistency:** Run queries to verify data relationships
- **Migration Success:** Confirm all data migrated correctly
- **Backup Verification:** Ensure rollback capability exists
- **Audit Trail:** Verify modification tracking is in place

#### User Experience Validation
- **UI Consistency:** Check visual design remains consistent
- **Workflow Preservation:** Ensure user workflows still function
- **Accessibility:** Verify accessibility features remain intact
- **Mobile Compatibility:** Test responsive behavior

### Regression Prevention

#### Testing Strategy
- **Existing Tests:** Ensure all existing tests still pass
- **New Test Coverage:** Add tests for modified functionality
- **Integration Tests:** Test modified feature with dependent components
- **End-to-End Tests:** Verify complete user workflows

#### Monitoring & Rollback
- **Error Monitoring:** Set up alerts for new error patterns
- **Performance Monitoring:** Track performance metrics
- **Rollback Plan:** Prepare quick rollback procedures
- **Gradual Rollout:** Consider phased deployment for major changes

### Common Modification Risks

#### High-Risk Changes
- Database schema modifications without migrations
- Changing function signatures used by multiple components
- Modifying shared utility functions
- Changing authentication/authorization logic

#### Medium-Risk Changes
- UI component prop modifications
- State management updates
- API endpoint changes
- Configuration updates

#### Low-Risk Changes
- CSS styling updates
- Adding optional parameters
- Internal implementation improvements
- Documentation updates

### Emergency Procedures
- **Quick Rollback:** Git revert procedures for immediate issues
- **Hotfix Process:** Fast-track fixes for critical problems
- **Communication:** Notify team of breaking changes immediately
- **Incident Response:** Document issues and resolution steps