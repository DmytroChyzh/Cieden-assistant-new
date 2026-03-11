# Voice Settings Integration - Agent Pool Strategy

## Research-Backed Decision

**Sources Verified:**
- ✅ ElevenLabs Pricing (2025): No per-agent cost, usage-based billing only
- ✅ ElevenLabs API Docs: Overrides support `voiceId` only, not speed/stability
- ✅ Project scale: 1-2 concurrent users typical
- ✅ Agent CLI capability: Can manage multiple agents easily

## Chosen Approach: Agent Pool

Instead of one shared agent OR complex per-user agent cloning, we use a **pre-configured agent pool**.

### Why This Works for FinPilot:
1. **No Agent Cost**: ElevenLabs charges $0.10/min for conversations, NOT per-agent
2. **Small Scale**: 1-2 concurrent sessions = simple pool of 4-8 agents sufficient
3. **Existing Infrastructure**: Agent CLI already set up for multi-agent management
4. **Zero Runtime Complexity**: No dynamic agent creation, just selection logic

---

## Agent Pool Structure

### Simplified Pool (Start with this - 4 agents)

```
1. support_agent_young_female    (default, speed 1.0)
2. support_agent_mature_female   (speed 1.0)
3. support_agent_young_male      (speed 1.0)
4. support_agent_mature_male     (speed 1.0)
```

### Extended Pool (Add later if needed - 8 agents)

```
5. support_agent_young_female_fast    (speed 1.2)
6. support_agent_mature_female_fast   (speed 1.2)
7. support_agent_young_male_fast      (speed 1.2)
8. support_agent_mature_male_fast     (speed 1.2)
```

### Full Pool (If user demand grows - 12 agents)

```
9. support_agent_young_female_slow     (speed 0.85)
10. support_agent_mature_female_slow   (speed 0.85)
11. support_agent_young_male_slow      (speed 0.85)
12. support_agent_mature_male_slow     (speed 0.85)
```

---

## Implementation Plan

### Phase 1: Create Agent Pool (One-time setup)

**Step 1: Define agent configurations**

Create config files for each agent variant:

```bash
# agent_configs/prod/support_agent_young_female.json
{
  "name": "Support agent (Young Female)",
  "conversation_config": {
    "tts": {
      "model_id": "eleven_flash_v2",
      "voice_id": "${VOICE_ID_ARIA}",
      "speed": 1.0,
      "stability": 0.7,
      "similarity_boost": 0.8
    },
    // ... rest of config same as current agent
  }
}

# agent_configs/prod/support_agent_mature_female.json
{
  "name": "Support agent (Mature Female)",
  "conversation_config": {
    "tts": {
      "voice_id": "${VOICE_ID_SARAH}",
      "speed": 1.0,
      // ...
    }
  }
}
```

**Step 2: Create agents via CLI**

```bash
cd /path/to/FinPilot-Project

# Create each agent
agents add "support_agent_young_female"
agents add "support_agent_mature_female"
agents add "support_agent_young_male"
agents add "support_agent_mature_male"

# Push all configurations
agents push

# Verify creation
agents status
```

**Step 3: Update agents.json registry**

```json
{
  "agents": [
    {
      "name": "support_agent_young_female",
      "config": "agent_configs/prod/support_agent_young_female.json",
      "environment": "prod"
    },
    {
      "name": "support_agent_mature_female",
      "config": "agent_configs/prod/support_agent_mature_female.json",
      "environment": "prod"
    },
    // ... rest
  ]
}
```

---

### Phase 2: Agent Selection Logic

**File:** `src/utils/agentSelection.ts`

```typescript
// Agent pool mapping
const AGENT_POOL = {
  'young-female': {
    normal: process.env.NEXT_PUBLIC_AGENT_YOUNG_FEMALE!,
    fast: process.env.NEXT_PUBLIC_AGENT_YOUNG_FEMALE_FAST,
    slow: process.env.NEXT_PUBLIC_AGENT_YOUNG_FEMALE_SLOW,
  },
  'mature-female': {
    normal: process.env.NEXT_PUBLIC_AGENT_MATURE_FEMALE!,
    fast: process.env.NEXT_PUBLIC_AGENT_MATURE_FEMALE_FAST,
    slow: process.env.NEXT_PUBLIC_AGENT_MATURE_FEMALE_SLOW,
  },
  'young-male': {
    normal: process.env.NEXT_PUBLIC_AGENT_YOUNG_MALE!,
    fast: process.env.NEXT_PUBLIC_AGENT_YOUNG_MALE_FAST,
    slow: process.env.NEXT_PUBLIC_AGENT_YOUNG_MALE_SLOW,
  },
  'mature-male': {
    normal: process.env.NEXT_PUBLIC_AGENT_MATURE_MALE!,
    fast: process.env.NEXT_PUBLIC_AGENT_MATURE_MALE_FAST,
    slow: process.env.NEXT_PUBLIC_AGENT_MATURE_MALE_SLOW,
  },
} as const;

export type VoiceLabel = keyof typeof AGENT_POOL;
export type SpeedCategory = 'slow' | 'normal' | 'fast';

/**
 * Select appropriate agent ID based on user preferences
 * Falls back to default agent if specific variant doesn't exist
 */
export function selectAgentId(
  voiceLabel: VoiceLabel,
  speedPreset: number
): string {
  // Map speed preset to category
  const speedCategory: SpeedCategory =
    speedPreset === 1 ? 'slow' :
    speedPreset === 3 || speedPreset === 4 ? 'fast' :
    'normal';

  // Get agent ID for this combination
  const agentId = AGENT_POOL[voiceLabel]?.[speedCategory];

  // Fallback to normal speed if fast/slow variant doesn't exist
  if (!agentId && speedCategory !== 'normal') {
    const fallbackId = AGENT_POOL[voiceLabel]?.normal;
    if (fallbackId) {
      console.warn(`Agent variant ${voiceLabel}_${speedCategory} not found, using normal speed`);
      return fallbackId;
    }
  }

  // Final fallback to default agent
  return agentId || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!;
}

/**
 * Get all available agent combinations
 */
export function getAvailableAgents() {
  return Object.entries(AGENT_POOL).flatMap(([voice, speeds]) =>
    Object.entries(speeds)
      .filter(([_, id]) => !!id)
      .map(([speed, id]) => ({
        voice: voice as VoiceLabel,
        speed: speed as SpeedCategory,
        agentId: id,
      }))
  );
}
```

---

### Phase 3: Backend Schema (Same as voice-only plan)

**File:** `convex/schema.ts`

```typescript
userPreferences: defineTable({
  userId: v.string(),

  // Voice settings (includes speed now!)
  voiceLabel: v.string(),       // 'young-female', etc.
  speedPreset: v.number(),      // 1-4
  captionsEnabled: v.boolean(),
  goModeEnabled: v.boolean(),

  // Other preferences
  lendingViewMode: v.optional(v.union(v.literal("compact"), v.literal("full"))),
  theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
  language: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user", ["userId"]),
```

**File:** `convex/userPreferences.ts`

```typescript
export const updateVoiceSettings = mutation({
  args: {
    voiceLabel: v.optional(v.string()),
    speedPreset: v.optional(v.number()),
    captionsEnabled: v.optional(v.boolean()),
    goModeEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Validate voice label
    const VALID_VOICES = ['young-female', 'mature-female', 'young-male', 'mature-male'];
    if (args.voiceLabel && !VALID_VOICES.includes(args.voiceLabel)) {
      throw new Error(`Invalid voice. Must be one of: ${VALID_VOICES.join(", ")}`);
    }

    // Validate speed preset
    if (args.speedPreset && (args.speedPreset < 1 || args.speedPreset > 4)) {
      throw new Error("Speed preset must be between 1-4");
    }

    const userId = identity.subject;
    const now = Date.now();

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        voiceLabel: args.voiceLabel || 'young-female',
        speedPreset: args.speedPreset || 2,
        captionsEnabled: args.captionsEnabled ?? true,
        goModeEnabled: args.goModeEnabled ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
```

---

### Phase 4: Provider Integration (with Agent Selection)

**File:** `src/providers/ElevenLabsProvider.tsx`

```typescript
export function ElevenLabsProvider({ children, ... }: Props) {
  const { settings } = useSettings();

  // Select appropriate agent based on user preferences
  const selectedAgentId = useMemo(() => {
    return selectAgentId(
      settings.voice as VoiceLabel,
      settings.speedPreset
    );
  }, [settings.voice, settings.speedPreset]);

  // Voice mode - use selected agent
  const voiceConversation = useConversation({
    micMuted: false,
    volume: 1.0,
    clientTools: createClientTools(actionHandlers ?? null),
  });

  // Text mode - use selected agent
  const textConversation = useConversation({
    textOnly: true,
    overrides: {
      conversation: {
        textOnly: true,
      }
    },
    clientTools: createClientTools(actionHandlers ?? null),
  });

  // Start voice with selected agent
  const startVoice = useCallback(async (initialGreeting?: string) => {
    // ... existing checks ...

    await runTransition(async () => {
      const conversationId = await voiceConversation.startSession({
        agentId: selectedAgentId,  // Use selected agent!
        connectionType: "webrtc",
      });

      // ... rest of existing code ...
    });
  }, [selectedAgentId, voiceConversation, /* ... */]);

  // Start text with selected agent
  const startText = useCallback(async () => {
    // ... existing checks ...

    await runTransition(async () => {
      // Generate signed URL for selected agent
      const signedUrlResponse = await fetch('/api/elevenlabs/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId }),  // Pass agent ID!
      });

      // ... rest of existing code ...
    });
  }, [selectedAgentId, textConversation, /* ... */]);

  // ... rest unchanged
}
```

---

### Phase 5: API Route Update

**File:** `app/api/elevenlabs/signed-url/route.ts`

Accept agentId parameter:

```typescript
export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    // Use provided agentId or fallback to default
    const targetAgentId = agentId || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${targetAgentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    // ... rest unchanged
  }
}
```

---

### Phase 6: Settings UI (Now with Speed!)

**File:** `src/components/unified/SettingsPanel.tsx`

```typescript
export function SettingsPanel({ onClose }: Props) {
  const { settings, updateSettings } = useSettings();
  const { sessionMode, conversation } = useElevenLabsConversation();
  const [pendingChanges, setPendingChanges] = useState<{
    voice?: string;
    speed?: number;
  }>({});

  const hasChanges =
    (pendingChanges.voice && pendingChanges.voice !== settings.voice) ||
    (pendingChanges.speed && pendingChanges.speed !== settings.speedPreset);

  const handleApply = async () => {
    if (!hasChanges) return;

    // Update settings
    await updateSettings({
      voice: pendingChanges.voice || settings.voice,
      speedPreset: pendingChanges.speed || settings.speedPreset,
    });

    // Restart session if active (new agent will be selected automatically)
    if (sessionMode === 'voice' || sessionMode === 'text') {
      await conversation.endSession();
      await new Promise(r => setTimeout(r, 300));

      if (sessionMode === 'voice') {
        await startVoice();
      } else {
        await startText();
      }
    }

    toast.success('Settings applied!');
    setPendingChanges({});
  };

  return (
    <div>
      {/* Voice Selection */}
      <VoiceSelector
        selected={pendingChanges.voice || settings.voice}
        onChange={(voice) => setPendingChanges(prev => ({ ...prev, voice }))}
      />

      {/* Speed Selection - NOW AVAILABLE! */}
      <SpeedSelector
        selected={pendingChanges.speed || settings.speedPreset}
        onChange={(speed) => setPendingChanges(prev => ({ ...prev, speed }))}
        options={[
          { value: 1, label: 'Slow', icon: '🐢' },
          { value: 2, label: 'Normal', icon: '▶️' },
          { value: 3, label: 'Fast', icon: '⚡' },
          { value: 4, label: 'Auto-Adapt', icon: '🎯' },
        ]}
      />

      {/* Apply Button */}
      {hasChanges && (
        <Button onClick={handleApply} className="w-full">
          Apply Settings {sessionMode && '(will reconnect)'}
        </Button>
      )}

      {/* Captions/Go-Mode toggles unchanged */}
    </div>
  );
}
```

---

## Environment Variables

```bash
# Agent Pool IDs (from ElevenLabs dashboard after creation)

# Phase 1: Essential agents (create these first)
NEXT_PUBLIC_AGENT_YOUNG_FEMALE=agent_id_1
NEXT_PUBLIC_AGENT_MATURE_FEMALE=agent_id_2
NEXT_PUBLIC_AGENT_YOUNG_MALE=agent_id_3
NEXT_PUBLIC_AGENT_MATURE_MALE=agent_id_4

# Phase 2: Fast variants (add when needed)
NEXT_PUBLIC_AGENT_YOUNG_FEMALE_FAST=agent_id_5
NEXT_PUBLIC_AGENT_MATURE_FEMALE_FAST=agent_id_6
NEXT_PUBLIC_AGENT_YOUNG_MALE_FAST=agent_id_7
NEXT_PUBLIC_AGENT_MATURE_MALE_FAST=agent_id_8

# Phase 3: Slow variants (optional)
NEXT_PUBLIC_AGENT_YOUNG_FEMALE_SLOW=agent_id_9
# ... etc

# Fallback (keep existing)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=support_agent  # Default fallback
```

---

## Cost Analysis

### Current (1 agent):
- 100 minutes/month @ $0.10/min = **$10/month**

### With Agent Pool (4-8 agents):
- Same 100 minutes/month @ $0.10/min = **$10/month**
- ✅ **Zero additional cost** for extra agents!

### Savings vs Alternatives:
- ❌ Real-time voice cloning: Much more expensive
- ❌ Per-user agent instances: Complex infrastructure
- ✅ Agent pool: Simple, cost-effective, scalable

---

## Rollout Strategy

### Phase 1: Start Small (MVP - 1 week)
1. Create 4 essential agents (one per voice, normal speed)
2. Deploy agent selection logic
3. Test with real users
4. Monitor usage patterns

### Phase 2: Add Fast Variants (Week 2)
1. Identify most-used voice
2. Create fast variant for popular voice
3. Test and validate
4. Roll out remaining fast variants

### Phase 3: Complete Pool (Future)
1. Add slow variants if requested
2. Consider additional speed variants (1.15, 1.3)
3. Monitor and optimize based on analytics

---

## Success Criteria

- ✅ Users can select voice AND speed
- ✅ Settings persist to Convex
- ✅ Correct agent selected per user preferences
- ✅ Session restarts gracefully when settings change
- ✅ No cross-user interference (different agents per session)
- ✅ Fallback to default agent if variant missing
- ✅ Performance: Settings change <3s
- ✅ Cost: Same as single-agent ($0.10/min)

---

## Estimated Effort

- Phase 1: Agent creation (one-time) - 2 hours
- Phase 2: Agent selection logic - 2 hours
- Phase 3: Backend schema + mutations - 2 hours
- Phase 4: Provider integration - 3 hours
- Phase 5: API route updates - 1 hour
- Phase 6: UI updates (settings panel) - 3 hours
- Testing + verification - 3 hours

**Total: ~16 hours (2 working days)**

---

## Advantages Over Alternatives

### vs Voice-Only Overrides:
- ✅ Speed settings now available
- ✅ All voice characteristics configurable
- ✅ Pre-tested configurations

### vs Dynamic Agent Creation:
- ✅ No runtime complexity
- ✅ No API rate limit concerns
- ✅ Predictable performance

### vs Per-User Agents:
- ✅ Much simpler (4-8 agents vs hundreds)
- ✅ No cleanup needed
- ✅ Easier to maintain

---

**This approach gives you full voice+speed customization at zero additional cost!** 🎉
