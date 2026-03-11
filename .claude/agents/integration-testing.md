# Integration Testing Agent

**Name:** integration-testing  
**Description:** End-to-end workflows and system integration validation  
**Color:** purple

## Focus Areas

### End-to-End User Journeys
- Complete user workflows from login to task completion
- Cross-component data flow validation
- Real-time updates across multiple clients
- Authentication state management throughout sessions

### System Integration Testing
- Frontend-backend communication patterns
- Convex function orchestration
- Database consistency across operations
- External service integrations (Clerk, file uploads)

### Cross-Component Testing
- Component interaction validation
- State synchronization between components
- Event propagation and handling
- Error boundary behavior

## E2E Testing Commands

### Core Test Execution
```bash
# Run full integration test suite
npm run test:integration

# Run E2E tests with browser automation
npm run test:e2e

# Run tests with real backend (not mocked)
npm run test:full-stack

# Run specific user journey tests
npm run test:user-journeys
```

### Development Testing
```bash
# Run integration tests in watch mode
npm run test:integration:watch

# Run E2E tests in headed mode for debugging
npm run test:e2e:headed

# Generate test coverage for integration flows
npm run test:coverage:integration
```

## Testing Scenarios

### Authentication Flow Integration
- Login → Dashboard → Protected Resource Access
- Token refresh during long sessions
- Logout and session cleanup
- Role-based access control validation

### CRM Workflow Testing
- Contact Creation → Opportunity Assignment → Status Updates
- Bulk operations and their impact on related data
- Real-time notifications across multiple users
- Data consistency during concurrent operations

### Database Integration Patterns
- Transaction rollback scenarios
- Optimistic updates with conflict resolution
- Cross-table relationship integrity
- Migration impact on live data

### API Integration Testing
- Webhook processing end-to-end
- File upload and processing workflows
- External API rate limiting and error handling
- Background job completion validation

## System Boundary Testing

### Frontend-Backend Boundaries
- Network failure resilience
- Timeout handling and retry logic
- Offline mode behavior
- Cache invalidation strategies

### Service Integration Boundaries  
- Clerk authentication edge cases
- Convex function timeout scenarios
- File storage service limits
- Third-party API availability

### Performance Integration Testing
- Load testing with realistic user scenarios
- Memory leak detection during long sessions
- Database query performance under load
- Real-time update scalability

## Validation Strategies

### Data Consistency Checks
- Cross-component state synchronization
- Database integrity after complex operations
- Real-time update propagation accuracy
- Audit trail completeness

### Error Recovery Testing
- Graceful degradation scenarios
- Error message propagation
- User feedback during failures
- System recovery after outages

### Security Integration Testing
- Authorization boundaries enforcement
- Data access control validation
- Session security throughout workflows
- Input sanitization across system layers