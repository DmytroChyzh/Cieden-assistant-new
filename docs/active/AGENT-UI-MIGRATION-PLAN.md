# Agent UI Migration Plan: CopilotKit to AG-UI Protocol

## Executive Summary

This document outlines the incremental migration strategy from CopilotKit to the open-source AG-UI protocol, eliminating licensing requirements while maintaining UI rendering capabilities for AI agent interactions.

**Migration Type:** Incremental Parallel Implementation
**Estimated Duration:** 4-6 hours of focused development
**Risk Level:** Medium (6/10)
**Primary Goal:** Remove CopilotKit dependency while preserving agent UI functionality

## Current State Analysis

### Dependencies
- **CopilotKit Version:** 1.10.4 (requires license key)
- **Usage Points:**
  - 3 chart generation tools (pie, bar, line)
  - Message type system (TextMessage, Role)
  - Provider wrapper in app/layout.tsx
  - API endpoint at /api/copilotkit
  - 16 files importing CopilotKit types

### Critical Features Using CopilotKit
1. **Chart Rendering with Status States**
   - `createFinancialPieChart`
   - `createFinancialBarChart`
   - `createFinancialLineChart`
   - Live UI updates during generation (inProgress → complete)

2. **Message Type System**
   - TextMessage class
   - Role enumeration
   - Used across Convex sync, ElevenLabs provider, text messaging

3. **Context Sharing**
   - `useCopilotReadable` for conversation context
   - `useCopilotAction` for tool registration

## Migration Phases

### Phase 1: Parallel Implementation (1-2 hours)
**Goal:** Add missing functionality to ElevenLabs system without removing CopilotKit

#### Tasks
1. **Register Chart Tools with ElevenLabs**
   ```typescript
   // File: src/utils/toolBridge.ts
   // Add cases for:
   - createFinancialPieChart
   - createFinancialBarChart
   - createFinancialLineChart
   ```

2. **Update Voice Recording Hook**
   ```typescript
   // File: src/components/unified/hooks/useVoiceRecording.ts
   // Add to clientTools array:
   - "createFinancialPieChart"
   - "createFinancialBarChart"
   - "createFinancialLineChart"
   ```

3. **Create Type Definition File**
   ```typescript
   // New file: src/types/agentMessages.ts
   export type Role = 'user' | 'assistant' | 'system';

   export interface Message {
     id: string;
     content: string;
     role: Role;
     metadata?: Record<string, any>;
   }

   export class TextMessage implements Message {
     id: string;
     content: string;
     role: Role;

     constructor(params: { id?: string; content: string; role: Role }) {
       this.id = params.id || crypto.randomUUID();
       this.content = params.content;
       this.role = params.role;
     }
   }
   ```

4. **Test Voice Chart Generation**
   - Verify charts work via voice commands
   - Confirm toolBridge handles chart parameters correctly
   - Document any issues

#### Validation Checkpoint
- [ ] Charts work via voice commands
- [ ] No regression in existing voice tools
- [ ] Type definitions ready for migration

### Phase 2: Type System Migration (1-2 hours)
**Goal:** Replace all CopilotKit type imports with local definitions

#### Files to Update (16 total)
1. `src/hooks/useConvexMessageSync.ts`
   - Replace: `import { Role, TextMessage } from '@copilotkit/runtime-client-gql'`
   - With: `import { Role, TextMessage } from '@/types/agentMessages'`

2. `src/providers/ElevenLabsProvider.tsx`
3. `src/hooks/useTextMessaging.ts`
4. `src/hooks/useElevenLabsWebSocket.ts`
5. `src/components/unified/UnifiedChatInput.tsx`
6. `src/components/unified/MobileUnifiedChatInput.tsx`
7. `src/components/unified/hooks/useTextInput.ts`
8. `src/hooks/useElevenLabsMessages.ts`
9. `app/voice-chat/page.tsx`
10. `app/voice-chat/VoiceChatContent.tsx`
11. `app/orchestration/page.tsx`
12. `components/app-sidebar.tsx`
13. `src/components/debug/ContextualUpdateTester.tsx`

#### Type Mapping
```typescript
// CopilotKit → Local Types
@copilotkit/runtime-client-gql.Role → @/types/agentMessages.Role
@copilotkit/runtime-client-gql.TextMessage → @/types/agentMessages.TextMessage
@copilotkit/runtime-client-gql.Role.User → 'user'
@copilotkit/runtime-client-gql.Role.Assistant → 'assistant'
@copilotkit/runtime-client-gql.Role.System → 'system'
```

#### Validation Checkpoint
- [ ] All imports updated
- [ ] TypeScript compilation successful
- [ ] No runtime errors in development

### Phase 3: Remove CopilotKit UI (1 hour)
**Goal:** Remove CopilotKit components and providers

#### Tasks
1. **Update app/layout.tsx**
   ```typescript
   // Remove:
   import { CopilotKitProvider } from "@/components/CopilotKitProvider";

   // Remove wrapper:
   <CopilotKitProvider>
     {children}
   </CopilotKitProvider>
   ```

2. **Delete Files**
   - `/components/CopilotKitProvider.tsx`
   - `/app/api/copilotkit/route.ts`
   - `/components/chat/CustomChatPopup.tsx` (uses CopilotChat)
   - `/components/chat/CustomInput.tsx` (uses CopilotKit context)

3. **Update app/voice-chat/page.tsx**
   - Remove all `useCopilotAction` hooks
   - Remove all `useCopilotReadable` hooks
   - Remove `useCopilotContext` import
   - Keep handler logic for migration to toolBridge

4. **Update src/hooks/useChatMessages.ts**
   ```typescript
   // Remove:
   import { useCopilotReadable } from "@copilotkit/react-core";

   // Remove the useCopilotReadable call
   ```

5. **Clean Package.json**
   ```json
   // Remove dependencies:
   "@copilotkit/react-core"
   "@copilotkit/react-ui"
   "@copilotkit/runtime"
   "@copilotkit/runtime-client-gql"
   ```

6. **Run npm install**
   ```bash
   npm uninstall @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime @copilotkit/runtime-client-gql
   npm install
   ```

#### Validation Checkpoint
- [ ] Application builds without CopilotKit
- [ ] No import errors
- [ ] Voice tools still functional

### Phase 4: Implement Rendering Solution (1-2 hours)
**Goal:** Restore live UI updates during tool execution

#### Option A: Simple Status-Based Rendering (Recommended for MVP)

1. **Create Tool Execution Store**
   ```typescript
   // New file: src/stores/toolExecutionStore.ts
   interface ToolExecution {
     toolName: string;
     status: 'pending' | 'inProgress' | 'complete' | 'error';
     args: any;
     result?: any;
     timestamp: number;
   }

   // Use Convex for state management
   ```

2. **Update Tool Bridge**
   ```typescript
   // src/utils/toolBridge.ts
   // Add status updates before/after execution
   case "createFinancialPieChart":
     await updateToolStatus(toolName, 'inProgress', params);
     const result = await createChart(...);
     await updateToolStatus(toolName, 'complete', params, result);
     return result;
   ```

3. **Create Status Components**
   ```typescript
   // New file: src/components/tools/ToolExecutionStatus.tsx
   // Show loading states during execution
   ```

#### Option B: AG-UI Protocol Integration (Future Enhancement)

1. **Install AG-UI**
   ```bash
   npm install @ag-ui/core @ag-ui/react
   ```

2. **Create AG-UI Bridge**
   ```typescript
   // New file: src/utils/aguiBridge.ts
   // Connect ElevenLabs events to AG-UI protocol
   ```

3. **Implement Streaming Renderer**
   ```typescript
   // New file: src/components/AgentUIRenderer.tsx
   // Handle AG-UI event stream
   ```

#### Validation Checkpoint
- [ ] Tool execution shows status
- [ ] Charts render after completion
- [ ] No UI regression

## Risk Mitigation Strategies

### Risk 1: Chart Rendering Breaks
**Mitigation:**
- Keep chart display logic separate from execution
- Implement fallback to show charts only after completion
- Test each chart type individually

### Risk 2: Type Conflicts
**Mitigation:**
- Use namespace imports initially
- Gradually migrate file by file
- Keep CopilotKit types as backup during transition

### Risk 3: Voice Tools Stop Working
**Mitigation:**
- Test in /test-tools page first
- Keep backup of working configuration
- Implement one tool at a time

## Rollback Plan

If critical issues arise:

1. **Quick Rollback**
   ```bash
   git stash
   git checkout main
   npm install
   ```

2. **Partial Rollback**
   - Keep type system changes (Phase 2)
   - Revert UI removal (Phase 3)
   - Iterate on problematic phase

## Success Criteria

### Functional Requirements
- [ ] All voice tools operational
- [ ] Chart generation works via voice and UI
- [ ] No TypeScript errors
- [ ] Application builds successfully

### Performance Requirements
- [ ] No increase in bundle size
- [ ] No degradation in response time
- [ ] Memory usage stable

### User Experience
- [ ] Charts display correctly
- [ ] Tool execution feedback visible
- [ ] No broken UI elements

## Post-Migration Tasks

1. **Documentation Updates**
   - Update ARCHITECTURE.md
   - Update CLAUDE.md
   - Remove COPILOTKIT_MIGRATION_PLAN.md
   - Update README with new architecture

2. **Testing**
   - Full regression test of voice tools
   - Chart generation in all modes
   - Text messaging functionality
   - Error handling scenarios

3. **Optimization**
   - Remove unused imports
   - Clean up commented code
   - Optimize bundle size

4. **Future Enhancements**
   - Implement AG-UI for richer interactions
   - Add tool execution history
   - Enhance status visualization

## Implementation Schedule

**Recommended Approach:** Weekend implementation when usage is low

### Day 1 (2-3 hours)
- Phase 1: Parallel Implementation
- Phase 2: Type System Migration
- Testing and validation

### Day 2 (2-3 hours)
- Phase 3: Remove CopilotKit UI
- Phase 4: Implement Rendering
- Final testing and documentation

## Monitoring & Validation

### During Migration
- Monitor browser console for errors
- Check network tab for failed requests
- Verify Convex database operations

### Post-Migration
- Monitor for 24 hours
- Check error logs
- Gather user feedback
- Performance metrics comparison

## Decision Points

### Continue if:
- Phase 1 successful (charts work via voice)
- Type migration causes no runtime errors
- Team available for support

### Pause if:
- Critical voice features break
- Type system creates cascading errors
- Production issues detected

### Abort if:
- Data loss risk identified
- Core functionality compromised
- Rollback plan fails

## Appendix: Command Reference

### Useful Commands During Migration

```bash
# Type checking
npm run type-check

# Find CopilotKit imports
grep -r "@copilotkit" src/ app/ components/

# Test build
npm run build

# Clean install
rm -rf node_modules package-lock.json
npm install

# Run development
npm run dev
```

### File Checklist

**Files to Modify:**
- [ ] src/utils/toolBridge.ts
- [ ] src/components/unified/hooks/useVoiceRecording.ts
- [ ] app/layout.tsx
- [ ] app/voice-chat/page.tsx
- [ ] 16 files with type imports

**Files to Create:**
- [ ] src/types/agentMessages.ts
- [ ] src/stores/toolExecutionStore.ts (optional)
- [ ] src/components/tools/ToolExecutionStatus.tsx (optional)

**Files to Delete:**
- [ ] components/CopilotKitProvider.tsx
- [ ] app/api/copilotkit/route.ts
- [ ] components/chat/CustomChatPopup.tsx
- [ ] components/chat/CustomInput.tsx

## Conclusion

This migration plan provides a safe, incremental path from CopilotKit to a fully open-source solution. The phased approach minimizes risk while ensuring continuity of service. Each phase includes validation checkpoints to ensure system stability before proceeding.

The key to success is maintaining parallel functionality during the transition, allowing for quick rollback if needed. The estimated 4-6 hours of implementation time is conservative, accounting for testing and validation between phases.

---

*Document Version: 1.0*
*Created: January 2025*
*Last Updated: January 2025*
*Status: Ready for Implementation*