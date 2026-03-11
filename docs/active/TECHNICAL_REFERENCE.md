# FinPilot Technical Reference

> **Companion to ARCHITECTURE.md**  
> **Contains**: Detailed examples, migration notes, and historical context

## Complete Tool Implementation Examples

### Credit Score Tool (v2.0 - Frontend Action Pattern)

This is the complete implementation of a tool using the modern Frontend Action approach:

#### 1. Bridge Registration (`src/utils/toolBridge.ts`)
```typescript
export interface ActionHandlers {
  show_credit_score?: (params: CreditScoreParams) => Promise<string>;
}

export interface CreditScoreParams {
  score: number;
  range: string;
  factors: Array<{
    name: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
  tips: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
}

case 'show_credit_score':
  if (!actionHandlers.show_credit_score) {
    throw new Error('show_credit_score handler not registered');
  }
  return await Promise.resolve(
    actionHandlers.show_credit_score(toolCall.parameters as CreditScoreParams)
  );
```

#### 2. Voice Registration (`src/components/unified/hooks/useVoiceRecording.ts`)
```typescript
clientTools: actionHandlers ? {
  // Other tools...
  show_credit_score: async (parameters: CreditScoreParams) => {
    console.log('🔧 CREDIT_SCORE Tool Called via Bridge:', parameters);
    
    try {
      const result = await bridgeElevenLabsToolToCopilot(
        { name: 'show_credit_score', parameters, timestamp: Date.now() }, 
        actionHandlers
      );
      return result;
    } catch (error) {
      console.error('❌ Bridge execution failed:', error);
      return `Sorry, I couldn't show your credit score right now.`;
    }
  }
} : {},
```

#### 3. Frontend Action (`app/voice-chat/page.tsx`)
```typescript
useCopilotAction({
  name: "showCreditScore",
  description: "Display credit score with detailed breakdown and tips",
  parameters: [
    {
      name: "score",
      type: "number", 
      description: "Current credit score (300-850 range)",
      required: true
    },
    {
      name: "range",
      type: "string",
      description: "Credit score range classification",
      required: true
    },
    {
      name: "factors",
      type: "object",
      description: "Array of factors affecting the credit score",
      required: true
    },
    {
      name: "tips",
      type: "object", 
      description: "Array of improvement tips",
      required: true
    }
  ],
  handler: async ({ score, range, factors, tips }) => {
    if (conversationId) {
      await createMessage({
        conversationId,
        content: `Credit Score displayed: ${score} (${range})`,
        role: 'assistant',
        source: 'contextual',
        metadata: {
          toolName: 'showCreditScore',
          toolType: 'frontend_action',
          parameters: { score, range, factors, tips },
          executedAt: Date.now(),
          version: '2.0'
        }
      });
    }
    return `Displaying your credit score of ${score}...`;
  },
  render: ({ args, status }) => {
    if (status === "inProgress") {
      return <div className="p-4 rounded-lg bg-muted">Loading...</div>;
    }
    return (
      <CreditScoreCard 
        {...args} 
        onUserAction={onUserAction}
        compact={false}
      />
    );
  }
});
```

#### 4. Action Handler (`app/voice-chat/page.tsx`)
```typescript
const actionHandlers: ActionHandlers = {
  show_credit_score: async (params) => {
    if (conversationId) {
      const toolCallMessage = `TOOL_CALL:showCreditScore:${JSON.stringify(params)}`;
      await createMessage({
        conversationId,
        content: toolCallMessage,
        role: 'assistant',
        source: 'voice',
        metadata: {
          toolName: 'showCreditScore',
          toolType: 'frontend_action',
          parameters: params,
          executedAt: Date.now(),
          version: '2.0'
        }
      });
    }
    return `I'm displaying your credit score of ${params.score} on screen now.`;
  }
};
```

#### 5. Message Parsing (`src/components/chat/ToolCallMessageRenderer.tsx`)
```typescript
if (content.startsWith('TOOL_CALL:showCreditScore:')) {
  try {
    const toolData = JSON.parse(content.replace('TOOL_CALL:showCreditScore:', ''));
    return (
      <CreditScoreMessage 
        data={toolData}
        onUserAction={onUserAction}
      />
    );
  } catch (error) {
    console.error('Failed to parse credit score tool call:', error);
    return <div className="text-red-400">Failed to display credit score</div>;
  }
}

// Wrapper component
export function CreditScoreMessage({ data, onUserAction }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/70">Here's your credit score analysis:</p>
      <CreditScoreCard {...data} onUserAction={onUserAction} />
    </div>
  );
}
```

#### 6. UI Component (`src/components/charts/CreditScoreCard.tsx`)
```typescript
interface CreditScoreCardProps {
  score: number;
  range: string;
  factors: Array<{
    name: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }>;
  tips: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  onUserAction?: ((text: string) => void) | null;
  compact?: boolean;
}

export function CreditScoreCard({
  score,
  range,
  factors,
  tips,
  onUserAction,
  compact = true
}: CreditScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'factors' | 'tips'>('factors');

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (onUserAction) {
      onUserAction(`User ${isExpanded ? 'collapsed' : 'expanded'} credit score details`);
    }
  };

  const handleTabChange = (tab: 'factors' | 'tips') => {
    setSelectedTab(tab);
    if (onUserAction) {
      onUserAction(`User switched to ${tab} tab in credit score analysis`);
    }
  };

  // Send automatic context when score is low
  useEffect(() => {
    if (onUserAction && score < 600) {
      onUserAction(`Credit score ${score} is below average. User may benefit from improvement suggestions.`);
    }
  }, [score, onUserAction]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-white">
                Credit Score
              </CardTitle>
              <p className="text-blue-200 text-sm">{range}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{score}</div>
              <div className="text-blue-200 text-xs">out of 850</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score visualization */}
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                score >= 750 ? "bg-green-500" :
                score >= 700 ? "bg-yellow-500" :
                "bg-red-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${(score / 850) * 100}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>

          {!compact && (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={selectedTab === 'factors' ? 'default' : 'outline'}
                onClick={() => handleTabChange('factors')}
                className="w-full"
              >
                Factors ({factors.length})
              </Button>
              <Button
                variant={selectedTab === 'tips' ? 'default' : 'outline'}
                onClick={() => handleTabChange('tips')}
                className="w-full"
              >
                Tips ({tips.length})
              </Button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!compact && selectedTab === 'factors' && (
              <motion.div
                key="factors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {factors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                    <span className="text-sm text-white">{factor.name}</span>
                    <Badge variant={
                      factor.impact === 'positive' ? 'default' :
                      factor.impact === 'negative' ? 'destructive' : 'secondary'
                    }>
                      {factor.impact}
                    </Badge>
                  </div>
                ))}
              </motion.div>
            )}

            {!compact && selectedTab === 'tips' && (
              <motion.div
                key="tips"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {tips.map((tip, index) => (
                  <div key={index} className="p-3 bg-white/5 rounded">
                    <h4 className="font-semibold text-white text-sm">{tip.title}</h4>
                    <p className="text-xs text-white/70 mt-1">{tip.description}</p>
                    <Badge size="sm" className="mt-2">
                      {tip.priority} priority
                    </Badge>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleExpand}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isExpanded ? 'Show Less' : 'Learn More'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

## Migration Progress (v1.0 → v2.0)

### Completed Migrations

#### ✅ Credit Score Tool 
- **Status**: Fully migrated to Frontend Actions
- **Enhanced Metadata**: Structured tool execution tracking
- **Benefits**: Better error handling, cleaner separation of concerns

### Remaining Migrations

#### 🔄 EMI Calculator Tool
- **Current**: String parsing approach
- **Target**: Frontend Action with enhanced metadata
- **Files to update**:
  - `src/components/charts/EMICard.tsx`
  - Bridge registration in `toolBridge.ts`
  - Frontend Action in `voice-chat/page.tsx`

#### 🔄 Balance Display Tool  
- **Current**: Direct message creation
- **Target**: Frontend Action approach
- **Files to update**:
  - `src/components/charts/BalanceCard.tsx` 
  - Action handler in `voice-chat/page.tsx`

#### 🔄 Savings Goal Tool
- **Current**: Bridge-only approach
- **Target**: Frontend Action with progress tracking
- **Files to update**:
  - `src/components/charts/SavingsGoalCard.tsx`
  - Enhanced metadata structure

## Enhanced Metadata Structure (v2.0)

### Current Implementation
```typescript
metadata: {
  toolName: 'showCreditScore',
  toolType: 'frontend_action',      // vs 'bridge_fallback' for v1.0
  parameters: { score, range, ... }, // Complete parameter set
  executedAt: Date.now(),
  version: '2.0'                    // Track migration version
}
```

### Analytics Capabilities
```typescript
// Query tool usage by type
export const getToolUsageStats = query({
  args: { 
    toolType: v.optional(v.string()),
    timeRange: v.optional(v.number()) 
  },
  handler: async (ctx, { toolType = 'frontend_action', timeRange = 7 }) => {
    const cutoff = Date.now() - (timeRange * 24 * 60 * 60 * 1000);
    
    return await ctx.db
      .query("messages")
      .filter((q) => q.and(
        q.neq(q.field("metadata"), undefined),
        q.eq(q.field("metadata.toolType"), toolType),
        q.gte(q.field("metadata.executedAt"), cutoff)
      ))
      .collect();
  }
});
```

## Convex Streaming Patterns

### ✅ Correct Usage: Voice Transcription
```typescript
// Real-time speech-to-text updates
const startStream = useMutation(api.streaming.startStreamingTranscript);
const updateStream = useMutation(api.streaming.updateStreamingTranscript);

// Stream interim transcripts
const streamId = await startStream({ conversationId });
await updateStream({ streamId, content: "Hello", isComplete: false });
await updateStream({ streamId, content: "Hello world", isComplete: true });
```

### ❌ Incorrect Usage: Static Data
```typescript
// DON'T: Use streaming for charts, balance data, etc.
const chartStream = useMutation(api.streaming.createChartStream); // Wrong!

// DO: Use standard mutations
const createChart = useMutation(api.charts.create); // Correct!
```

## Architecture Decision Records

### ADR-005: Frontend Actions vs String Parsing
**Date**: January 2025  
**Status**: In Progress  
**Context**: Need better tool execution tracking and error handling  
**Decision**: Migrate to CopilotKit Frontend Actions with enhanced metadata  
**Consequences**: Better observability, cleaner code, but requires migration effort

### ADR-006: Selective Migration Approach
**Date**: January 2025  
**Status**: Accepted  
**Context**: Can't migrate all tools at once due to complexity  
**Decision**: Prioritize high-usage tools (Credit Score → EMI → Balance → Savings)  
**Consequences**: Gradual improvement with backward compatibility maintained

## Performance Optimizations

### Component-Level Optimizations
```typescript
// 1. Memoize expensive components
export const CreditScoreCard = React.memo(CreditScoreCardComponent);

// 2. Use lazy loading for heavy charts
const ChartMessage = dynamic(() => import('./ChartMessage'), {
  loading: () => <ChartSkeleton />
});

// 3. Optimize re-renders with proper dependencies
const memoizedData = useMemo(() => {
  return processChartData(rawData);
}, [rawData.version, rawData.timestamp]); // Specific dependencies
```

### Convex Query Optimizations
```typescript
// Use pagination for large datasets
export const listMessages = query({
  args: { conversationId: v.id("conversations"), limit: v.number() },
  handler: async (ctx, { conversationId, limit = 50 }) => {
    return ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .take(limit);
  }
});
```

## Common Anti-Patterns to Avoid

### ❌ Wrong: Missing Error Boundaries
```typescript
// This will crash the entire message list
const toolData = JSON.parse(content.replace('TOOL_CALL:showBalance:', ''));
```

### ✅ Correct: Graceful Error Handling
```typescript
try {
  const toolData = JSON.parse(content.replace('TOOL_CALL:showBalance:', ''));
  return <BalanceCard {...toolData} />;
} catch (error) {
  console.error('Tool parsing failed:', error);
  return <div className="text-red-400">Unable to display balance</div>;
}
```

### ❌ Wrong: Forgetting onUserAction Prop
```typescript
// Component won't send contextual updates
<BalanceCard balance={balance} /> 
```

### ✅ Correct: Threading Props
```typescript
// Full bidirectional communication
<BalanceCard balance={balance} onUserAction={onUserAction} />
```

---

*This technical reference provides detailed implementation patterns and migration guidance. Use alongside ARCHITECTURE.md for complete development context.*