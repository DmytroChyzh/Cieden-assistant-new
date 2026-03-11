# FinPilot Architecture Documentation

> **Version:** 2.1.0  
> **Last Updated:** August 2025  
> **Purpose:** Concise architectural reference for AI development agents

## Quick Navigation

1. [System Overview](#system-overview) - Core concepts and data flow
2. [Critical Patterns](#critical-patterns) - Essential architecture patterns
3. [Tool Development](#tool-development) - Step-by-step tool creation
4. [Troubleshooting](#troubleshooting) - Common issues and solutions
5. [Technical Reference](#technical-reference) - Schemas and APIs

---

## System Overview

FinPilot is a **mobile-first financial AI assistant** with voice-powered interactions and visual data representation.

### Core Architecture
- **Frontend**: Next.js 15.4 + TypeScript + Convex (real-time backend)
- **AI Systems**: ElevenLabs (voice + UI tools) + CopilotKit (UI components and chart generation)
- **State**: Server-managed via Convex, no client-side state libraries
- **Communication**: Bridge pattern connects voice tools to UI components

### Two Distinct Tool Systems

**Voice Tools (External API Pattern):**
```
Voice Command → ElevenLabs Agent → Bridge Handler → TOOL_CALL String → ToolCallMessageRenderer → UI Component
                         ↑                                                                        ↓
                         ←── Contextual Update ←──────────────────────────────────── UI Event
```

**Text Chat Tools (AI-Initiated Pattern):**
```
Text Input → CopilotKit AI → Frontend Action → Direct UI Render
```

### Data Flow Essentials for Voice Tools
```
Voice Command → ElevenLabs Agent → Bridge → Convex Message → UI Render
                         ↑                              ↓
                         ←── Contextual Update ←── UI Event
```

**Critical Files:**
- `src/utils/toolBridge.ts` - Maps ElevenLabs tools to UI actions
- `src/components/unified/hooks/useVoiceRecording.ts` - **CRITICAL**: clientTools registration
- `src/components/chat/ToolCallMessageRenderer.tsx` - Parses and renders tool messages

---

## Critical Patterns

### 1. Three-Step Voice Tool Registration (CRITICAL PATTERN)

**Voice tools require registration in THREE places for proper functionality:**

```typescript
// Step 1: Bridge Handler (app/voice-chat/page.tsx)
actionHandlers: {
  show_credit_score: async (params) => {
    const toolCallMessage = `TOOL_CALL:showCreditScore:${JSON.stringify(params)}`;
    await createMessage({ content: toolCallMessage, role: 'assistant', source: 'voice' });
    return "Displaying credit score analysis...";
  }
}

// Step 2: Voice Registration (useVoiceRecording.ts) - CRITICAL FOR VOICE
clientTools: {
  show_credit_score: async (params) => {
    return await bridgeElevenLabsToolToCopilot({
      name: 'show_credit_score', parameters: params, timestamp: Date.now()
    }, actionHandlers);
  }
}

// Step 3: UI Renderer (ToolCallMessageRenderer.tsx)
if (content.startsWith('TOOL_CALL:showCreditScore:')) {
  const toolData = JSON.parse(content.replace('TOOL_CALL:showCreditScore:', ''));
  return <CreditScoreCard data={toolData} onUserAction={onUserAction} />;
}
```

**Note**: CopilotKit Frontend Actions are separate and only used for AI-initiated chart generation via text chat.

### 2. Message-as-Protocol Pattern

All UI tools communicate via structured messages:

```typescript
// Format: TOOL_CALL:toolName:JSON_params
const message = `TOOL_CALL:showAccountBalance:${JSON.stringify({balance: 25000})}`;

// Parsing (with error handling - REQUIRED)
if (content.startsWith('TOOL_CALL:showAccountBalance:')) {
  try {
    const toolData = JSON.parse(content.replace('TOOL_CALL:showAccountBalance:', ''));
    return <BalanceCard {...toolData} onUserAction={onUserAction} />;
  } catch (error) {
    console.error('Failed to parse tool call:', error);
    return <div className="text-red-400">Failed to display card</div>;
  }
}
```

### 3. Bidirectional Communication Pattern

Components must accept `onUserAction` prop for voice context updates:

```typescript
// ✅ CORRECT: All interactive components
interface ComponentProps {
  onUserAction?: ((text: string) => void) | null;
}

const handleUserClick = () => {
  if (onUserAction) {
    onUserAction("User clicked 'Learn More' for Personal Loan Premium");
  }
};

// Usage chain: page.tsx → MessageCard → ToolRenderer → YourComponent
```

### 4. Tool Naming Convention (CRITICAL)
- **ElevenLabs clientTools**: `snake_case` (`show_balance`)
- **Bridge handlers**: `snake_case` (matching clientTools)
- **Message parsing**: `camelCase` (`TOOL_CALL:showAccountBalance:`)
- **Components**: `PascalCase` (`BalanceCard`)

---

## Tool Development

### Essential Checklist for New Voice Tools

**Files to modify (in order):**

1. **Bridge Registration** (`src/utils/toolBridge.ts`)
```typescript
export interface ActionHandlers {
  your_tool?: (params: YourToolParams) => Promise<string>;
}

case 'your_tool':
  return actionHandlers.your_tool(toolCall.parameters as YourToolParams);
```

2. **Voice Registration** (`src/components/unified/hooks/useVoiceRecording.ts`) - **MOST CRITICAL**
```typescript
clientTools: {
  // Existing tools...
  your_tool: async (parameters) => {
    return await bridgeElevenLabsToolToCopilot(
      { name: 'your_tool', parameters, timestamp: Date.now() }, 
      actionHandlers
    );
  }
}
```

3. **UI Component** (`src/components/charts/YourToolCard.tsx`)
```typescript
export function YourToolCard({ 
  param1, 
  onUserAction // REQUIRED for bidirectional communication 
}: YourToolProps & { onUserAction?: ((text: string) => void) | null }) {
  
  const handleInteraction = () => {
    if (onUserAction) {
      onUserAction(`User interacted with ${param1}`);
    }
  };
  
  return (
    <Card className="bg-gradient-to-r from-blue-500/20 to-purple-500/20">
      <Button onClick={handleInteraction}>Action</Button>
    </Card>
  );
}
```

4. **Message Parsing** (`src/components/chat/ToolCallMessageRenderer.tsx`)
```typescript
if (content.startsWith('TOOL_CALL:yourTool:')) {
  try {
    const toolData = JSON.parse(content.replace('TOOL_CALL:yourTool:', ''));
    return <YourToolMessage data={toolData} onUserAction={onUserAction} />;
  } catch (error) {
    return <div className="text-red-400">Failed to display tool</div>;
  }
}
```

5. **Action Handler** (`app/voice-chat/page.tsx`)
```typescript
const actionHandlers: ActionHandlers = {
  your_tool: async (params) => {
    if (conversationId) {
      await createMessage({
        conversationId,
        content: `TOOL_CALL:yourTool:${JSON.stringify(params)}`,
        role: 'assistant',
        source: 'voice'
      });
    }
    return `Displaying your ${params.param1}...`;
  }
};
```

**Testing Flow:**
1. Test via `/test-tools` page first (bypasses voice)
2. Check console for bridge logs: `🔧 Tool Called via Bridge`
3. Verify message appears in `/voice-chat`
4. Test actual voice command
5. Verify bidirectional communication works

### Common Implementation Examples

**Reference Files for Patterns:**
- **Balance Tool**: `src/components/charts/BalanceCard.tsx` - Basic tool with chart
- **Savings Tool**: `src/components/charts/SavingsGoalCard.tsx` - Interactive tool with CTA
- **Credit Score Tool**: `src/components/charts/CreditScoreCard.tsx` - Complex tool with multiple sections

---

## Troubleshooting

### Voice Tool Issues

**Symptoms → Solutions:**

| Issue | Most Likely Cause | Fix |
|-------|------------------|-----|
| Tool works in test-tools but not voice | Missing clientTools registration | Add to `useVoiceRecording.ts` |
| Tool call returns "tool not found" | Name mismatch | Check snake_case consistency |
| UI renders but no contextual updates | Missing onUserAction prop | Thread prop through components |
| Message parsing fails | JSON parse error | Add try/catch in renderer |

**Debug Commands:**
```typescript
// Check voice connection
console.log('Voice status:', conversation.status); // Should be 'connected'
console.log('Available tools:', Object.keys(conversation.clientTools || {}));

// Monitor bridge calls  
// Look for: "🔧 Tool Bridge Executing: ..." in console

// Test Convex connection
const messages = useQuery(api.messages.list);
console.log('Convex connected:', !!messages);
```

### Quick Fixes

**Missing Voice Tools:**
1. Check `useVoiceRecording.ts` clientTools object
2. Verify bridge case statement exists
3. Test with `/test-tools` first

**Charts Not Rendering:**
1. Verify message format: `TOOL_CALL:toolName:params`
2. Check conversation ID is set
3. Add error boundaries in parsing logic

**Real-time Sync Issues:**
1. Check Convex connection: `npx convex dev` running
2. Verify WebSocket connection in Network tab
3. Test manual message creation in Convex dashboard

---

## Technical Reference

### Database Schema (Essential Tables)

```typescript
// conversations
{
  title: v.string(),
  userId: v.optional(v.string()),
  _creationTime: number
}

// messages  
{
  conversationId: v.id("conversations"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  source: v.optional(v.union(v.literal("voice"), v.literal("text"))),
  metadata: v.optional(v.any())
}

// charts
{
  conversationId: v.id("conversations"),
  type: v.union(v.literal("pie"), v.literal("bar"), v.literal("line")),
  title: v.string(),
  data: v.any()
}
```

### API Endpoints

- **`/api/copilotkit`** - CopilotKit runtime (OpenRouter integration)
- **`/api/elevenlabs/signed-url`** - Generate voice WebSocket URLs
- **`/api/elevenlabs/webhook`** - Handle ElevenLabs events

### Environment Variables

```bash
# Required
OPENROUTER_API_KEY=           # AI model access
CONVEX_DEPLOYMENT=            # Convex project
NEXT_PUBLIC_CONVEX_URL=       # Convex public URL
ELEVENLABS_API_KEY=           # Voice services

# Optional  
NEXT_PUBLIC_AGENT_ID=         # Custom ElevenLabs agent
```

### File Structure (Critical Paths)

```
src/
├── utils/toolBridge.ts                    # CRITICAL: Bridge registration
├── components/unified/hooks/
│   └── useVoiceRecording.ts              # CRITICAL: clientTools
├── components/chat/
│   └── ToolCallMessageRenderer.tsx       # Message parsing
├── components/charts/                    # UI components
└── features/                            # Feature modules

app/
├── voice-chat/page.tsx                  # Action handlers
├── test-tools/page.tsx                  # Tool testing
└── api/                                 # Backend routes

convex/
├── messages.ts                          # Message operations
├── conversations.ts                     # Conversation management
└── schema.ts                           # Database schema
```

---

## Development Commands

```bash
# Start development (2 terminals required)
npm run dev                   # Next.js server
npx convex dev               # Convex backend

# Testing & debugging
npm run type-check           # TypeScript validation
npx convex logs             # Backend logs
npm run lint                # Code quality

# Testing tools without voice
open http://localhost:3000/test-tools
```

---

## Additional Resources

- **Detailed Examples**: See implementation in `src/components/charts/` for complete tool patterns
- **CopilotKit Charts**: Text chat uses Frontend Actions in `app/voice-chat/page.tsx` (AI-initiated only, NOT for voice tools)
- **Voice Configuration**: Check `useVoiceRecording.ts` for WebRTC setup
- **Debugging Guide**: See existing tool implementations for error handling patterns

**Key Files for Reference:**
- **Complete Tool Example**: `BalanceCard.tsx` + corresponding bridge/voice registration
- **Complex UI Tool**: `CreditScoreCard.tsx` for multi-section components  
- **Bridge Implementation**: `toolBridge.ts` for tool routing logic
- **Voice Integration**: `useVoiceRecording.ts` for WebRTC and tool registration

---

*This document focuses on actionable development patterns. For historical context, migration details, and future planning, see supplementary documentation files.*