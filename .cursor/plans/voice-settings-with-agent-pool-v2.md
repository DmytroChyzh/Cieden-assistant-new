# Voice Settings Integration - Agent Pool Strategy (v2)
## Revised Based on Codex Peer Review

**Review Date**: 2025-10-20
**Changes**: Fixed critical issues identified in peer review, added phased MVP approach

---

## Research-Backed Decision

**Sources Verified:**
- ✅ ElevenLabs Pricing (2025): No per-agent cost, usage-based billing only
- ✅ ElevenLabs API Docs: Overrides support `voiceId` only, not speed/stability
- ✅ Project scale: 1-2 concurrent users typical
- ✅ Agent CLI capability: Can manage multiple agents easily
- ✅ Existing code analysis: Provider uses single global agent ID (ElevenLabsProvider.tsx:745)

---

## Chosen Approach: Agent Pool

Instead of one shared agent OR complex per-user agent cloning, we use a **pre-configured agent pool**.

### Why This Works for FinPilot:
1. **No Agent Cost**: ElevenLabs charges $0.10/min for conversations, NOT per-agent
2. **Small Scale**: 1-2 concurrent sessions = simple pool of 4-8 agents sufficient
3. **Existing Infrastructure**: Agent CLI already set up for multi-agent management
4. **Zero Runtime Complexity**: No dynamic agent creation, just selection logic
5. **Avoids Multi-Tenant Blocker**: Each session uses appropriate pre-configured agent

---

## Critical Issues Fixed (from Codex Review)

### 1. ✅ API Parameter Naming Consistency
- **Issue**: Plan used `agentId` in POST body, route expects `agent_id`
- **Fix**: Use `agent_id` throughout to match existing API contract (signed-url/route.ts:37)

### 2. ✅ SettingsPanel Component Contract
- **Issue**: Plan assumed panel can directly restart sessions via `useElevenLabsConversation()`
- **Reality**: Panel is presentational only (SettingsPanel.tsx:11-16)
- **Fix**: Handle session restart at Provider level via settings change detection

### 3. ✅ Cross-Tab Session Lock Coordination
- **Issue**: Plan didn't account for session lock during settings-driven restarts
- **Fix**: Must release/reacquire lock correctly (ElevenLabsProvider.tsx:1106-1115)

### 4. ✅ Context Reinjection After Restart
- **Issue**: Overlooked context injection flow on session restart
- **Fix**: Preserve useContextInjection behavior (useContextInjection.ts:33-40)

### 5. ✅ Phased Approach (MVP First)
- **Issue**: Original plan tried to do everything at once
- **Fix**: Split into Phase 1 (localStorage only) and Phase 2 (Convex sync)

---

## Agent Pool Structure

### Phase 1 MVP: Simplified Pool (4 agents)

```
1. support_agent_young_female    (default, speed 1.0)
2. support_agent_mature_female   (speed 1.0)
3. support_agent_young_male      (speed 1.0)
4. support_agent_mature_male     (speed 1.0)
```

### Phase 2 Expansion: Extended Pool (8 agents)

```
5. support_agent_young_female_fast    (speed 1.2)
6. support_agent_mature_female_fast   (speed 1.2)
7. support_agent_young_male_fast      (speed 1.2)
8. support_agent_mature_male_fast     (speed 1.2)
```

### Future: Full Pool (12 agents - only if demand justifies)

```
9. support_agent_young_female_slow     (speed 0.85)
10. support_agent_mature_female_slow   (speed 0.85)
11. support_agent_young_male_slow      (speed 0.85)
12. support_agent_mature_male_slow     (speed 0.85)
```

---

## Implementation Plan - MVP (Phase 1)

**Goal**: Agent selection logic working with localStorage settings (no Convex changes yet)

### Step 1: Create Agent Pool (One-time setup)

**1.1: Define agent configurations**

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

**1.2: Create agents via CLI**

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

**1.3: Update .env with agent IDs**

```bash
# Agent Pool IDs (from ElevenLabs dashboard after creation)
NEXT_PUBLIC_AGENT_YOUNG_FEMALE=agent_id_1
NEXT_PUBLIC_AGENT_MATURE_FEMALE=agent_id_2
NEXT_PUBLIC_AGENT_YOUNG_MALE=agent_id_3
NEXT_PUBLIC_AGENT_MATURE_MALE=agent_id_4

# Fallback (keep existing)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=support_agent  # Default fallback
```

---

### Step 2: Agent Selection Logic

**File**: `src/utils/agentSelection.ts` (NEW)

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
 * Validate env variables are set correctly
 * Call this on provider mount to catch config issues early
 */
export function validateAgentPoolConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Required base agents
  if (!process.env.NEXT_PUBLIC_AGENT_YOUNG_FEMALE) missing.push('NEXT_PUBLIC_AGENT_YOUNG_FEMALE');
  if (!process.env.NEXT_PUBLIC_AGENT_MATURE_FEMALE) missing.push('NEXT_PUBLIC_AGENT_MATURE_FEMALE');
  if (!process.env.NEXT_PUBLIC_AGENT_YOUNG_MALE) missing.push('NEXT_PUBLIC_AGENT_YOUNG_MALE');
  if (!process.env.NEXT_PUBLIC_AGENT_MATURE_MALE) missing.push('NEXT_PUBLIC_AGENT_MATURE_MALE');
  if (!process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID) missing.push('NEXT_PUBLIC_ELEVENLABS_AGENT_ID');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get all available agent combinations (for debugging/admin)
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

### Step 3: Provider Integration (Agent Selection)

**File**: `src/providers/ElevenLabsProvider.tsx`

**Changes needed:**

```typescript
import { selectAgentId, validateAgentPoolConfig, type VoiceLabel } from '@/utils/agentSelection';
import { useSettings } from '@/components/unified/hooks/useSettings';

export function ElevenLabsProvider({ children, actionHandlers }: Props) {
  const { settings } = useSettings();

  // Validate agent pool config on mount
  useEffect(() => {
    const validation = validateAgentPoolConfig();
    if (!validation.valid) {
      console.error('Agent pool configuration incomplete. Missing:', validation.missing);
      console.warn('Will fall back to NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
    }
  }, []);

  // Select appropriate agent based on user preferences (localStorage for MVP)
  const selectedAgentId = useMemo(() => {
    return selectAgentId(
      settings.voice as VoiceLabel,
      settings.speedPreset
    );
  }, [settings.voice, settings.speedPreset]);

  // Track previous settings to detect changes
  const prevSettings = useRef({ voice: settings.voice, speedPreset: settings.speedPreset });

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
    // Existing checks for cross-tab lock...
    if (isOtherTabActive) {
      setError(`Session already active in another tab (${otherTabMode} mode)`);
      return;
    }

    await runTransition(async () => {
      const conversationId = await voiceConversation.startSession({
        agentId: selectedAgentId,  // ✅ Use selected agent!
        connectionType: "webrtc",
      });

      if (!conversationId) {
        throw new Error("Failed to start voice conversation");
      }

      setConversationId(conversationId);
      setMode('voice');

      // Acquire cross-tab lock AFTER successful connection
      acquireSessionLock('voice');

      // ... rest of existing code (context injection, etc.) ...
    });
  }, [selectedAgentId, voiceConversation, isOtherTabActive, acquireSessionLock /* ... */]);

  // Start text with selected agent
  const startText = useCallback(async () => {
    // Existing checks for cross-tab lock...
    if (isOtherTabActive) {
      setError(`Session already active in another tab (${otherTabMode} mode)`);
      return;
    }

    await runTransition(async () => {
      // ✅ Generate signed URL for selected agent (use agent_id, not agentId)
      const signedUrlResponse = await fetch('/api/elevenlabs/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: selectedAgentId }),  // ✅ Fixed param name!
      });

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to get signed URL');
      }

      const { signed_url } = await signedUrlResponse.json();

      const conversationId = await textConversation.startSession({
        signedUrl: signed_url,
      });

      if (!conversationId) {
        throw new Error("Failed to start text conversation");
      }

      setConversationId(conversationId);
      setMode('text');

      // Acquire cross-tab lock AFTER successful connection
      acquireSessionLock('text');

      // ... rest of existing code ...
    });
  }, [selectedAgentId, textConversation, isOtherTabActive, acquireSessionLock /* ... */]);

  // ✅ NEW: Handle settings changes (voice or speed)
  // Only restart if session is active AND settings actually changed
  useEffect(() => {
    const settingsChanged =
      prevSettings.current.voice !== settings.voice ||
      prevSettings.current.speedPreset !== settings.speedPreset;

    if (settingsChanged && (mode === 'voice' || mode === 'text')) {
      console.log('Voice settings changed, restarting session with new agent:', selectedAgentId);

      // Update ref BEFORE async operations
      prevSettings.current = { voice: settings.voice, speedPreset: settings.speedPreset };

      // Graceful restart: end current session, then start new one
      const handleRestart = async () => {
        const currentMode = mode;

        // Release cross-tab lock BEFORE ending session
        releaseSessionLock();

        await voiceConversation.endSession();
        await textConversation.endSession();

        // Small delay to ensure clean disconnect
        await new Promise(r => setTimeout(r, 300));

        // Start with new agent (preserves context injection via existing hooks)
        if (currentMode === 'voice') {
          await startVoice();
        } else {
          await startText();
        }
      };

      handleRestart().catch((err) => {
        console.error('Failed to restart session with new settings:', err);
        setError('Failed to apply new voice settings');
      });
    } else if (settingsChanged) {
      // Settings changed but no active session, just update ref
      prevSettings.current = { voice: settings.voice, speedPreset: settings.speedPreset };
    }
  }, [settings.voice, settings.speedPreset, mode, selectedAgentId, startVoice, startText, releaseSessionLock]);

  // ... rest unchanged (existing disconnect logic, context provider, etc.)
}
```

**Key changes:**
1. Import `selectAgentId` and `useSettings`
2. Compute `selectedAgentId` via `useMemo`
3. Pass `selectedAgentId` to both `startVoice` and `startText`
4. Fix API param name: `agent_id` (not `agentId`)
5. Add settings change detection with graceful restart
6. Preserve cross-tab lock coordination (release before restart, acquire after)
7. Validate agent pool config on mount

---

### Step 4: API Route Update (Minor Fix)

**File**: `app/api/elevenlabs/signed-url/route.ts`

**Current code** (route.ts:37-42):
```typescript
const body = await request.json();
const agent_id = body.agent_id || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
```

✅ **No changes needed!** Route already accepts `agent_id` override.

Just ensure Provider sends correct param name (fixed in Step 3).

---

### Step 5: Settings UI Update (Optional for MVP)

**File**: `src/components/unified/SettingsPanel.tsx`

**For MVP: Keep it simple - no "Apply" button needed!**

Settings changes are now **automatically detected** by the Provider via `useEffect`, so no manual restart is required.

**Minimal changes:**

```typescript
import { type VoiceLabel } from '@/utils/agentSelection';

export function SettingsPanel({
  settings,
  onUpdateSettings,
  onClose,
  onToggleGoMode,
}: SettingsPanelProps) {
  // ✅ Settings panel remains presentational
  // No need to access useElevenLabsConversation() or handle restarts
  // Provider automatically restarts when settings change

  return (
    <div className="space-y-6">
      {/* Voice Selection */}
      <div>
        <label className="text-sm font-medium">Voice</label>
        <VoiceSelector
          selected={settings.voice}
          onChange={(voice: VoiceLabel) =>
            onUpdateSettings({ ...settings, voice })
          }
          options={[
            { value: 'young-female', label: 'Young Female', icon: '👩' },
            { value: 'mature-female', label: 'Mature Female', icon: '👩‍💼' },
            { value: 'young-male', label: 'Young Male', icon: '👨' },
            { value: 'mature-male', label: 'Mature Male', icon: '👨‍💼' },
          ]}
        />
      </div>

      {/* Speed Selection - NOW AVAILABLE! */}
      <div>
        <label className="text-sm font-medium">Speed</label>
        <SpeedSelector
          selected={settings.speedPreset}
          onChange={(speedPreset: number) =>
            onUpdateSettings({ ...settings, speedPreset })
          }
          options={[
            { value: 1, label: 'Slow', icon: '🐢', description: '0.85x speed' },
            { value: 2, label: 'Normal', icon: '▶️', description: '1.0x speed' },
            { value: 3, label: 'Fast', icon: '⚡', description: '1.2x speed' },
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          ⚠️ Changing voice or speed will reconnect your session
        </p>
      </div>

      {/* Captions/Go-Mode toggles unchanged */}
      {/* ... */}
    </div>
  );
}
```

**Key points:**
- Panel stays presentational (no conversation hooks)
- Provider handles restart automatically via `useEffect`
- Just show warning that changes will reconnect session
- No "Apply" button needed for MVP

---

## Environment Variables (MVP)

**Add to `.env.local`:**

```bash
# Agent Pool IDs (from ElevenLabs dashboard after creation)
NEXT_PUBLIC_AGENT_YOUNG_FEMALE=agent_id_1
NEXT_PUBLIC_AGENT_MATURE_FEMALE=agent_id_2
NEXT_PUBLIC_AGENT_YOUNG_MALE=agent_id_3
NEXT_PUBLIC_AGENT_MATURE_MALE=agent_id_4

# Fallback (keep existing)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=support_agent  # Default fallback
```

**Add to `.env.example`:**

```bash
# ElevenLabs Agent Pool
# Create 4 agents via ElevenLabs dashboard with different voice/speed configs
NEXT_PUBLIC_AGENT_YOUNG_FEMALE=your_agent_id_here
NEXT_PUBLIC_AGENT_MATURE_FEMALE=your_agent_id_here
NEXT_PUBLIC_AGENT_YOUNG_MALE=your_agent_id_here
NEXT_PUBLIC_AGENT_MATURE_MALE=your_agent_id_here

# Fallback agent (required)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_default_agent_id
```

---

## Testing Plan (MVP)

### 1. Agent Pool Creation
- [ ] Create 4 agents via CLI
- [ ] Verify all agents appear in ElevenLabs dashboard
- [ ] Copy agent IDs to `.env.local`
- [ ] Validate config with `validateAgentPoolConfig()`

### 2. Agent Selection Logic
- [ ] Test `selectAgentId()` with all voice/speed combinations
- [ ] Verify fallback to normal speed when fast/slow missing
- [ ] Verify fallback to default agent when voice missing
- [ ] Check console warnings for missing variants

### 3. Provider Integration
- [ ] Start voice mode → verify correct agent ID used
- [ ] Start text mode → verify correct agent_id sent to API
- [ ] Change voice in settings → verify session restarts with new agent
- [ ] Change speed in settings → verify session restarts with new agent
- [ ] Verify cross-tab lock released/reacquired during restart
- [ ] Verify context injection works after restart

### 4. Cross-Tab Coordination
- [ ] Open two tabs, start session in Tab A
- [ ] Try to start session in Tab B → should show error
- [ ] Change settings in Tab A → verify restart works
- [ ] Close Tab A → Tab B should be able to start session

### 5. Error Handling
- [ ] Missing env variable → should fall back to default agent
- [ ] API error during restart → should show error message
- [ ] Network failure during restart → should handle gracefully

---

## Phase 2: Convex Persistence (Future)

**Deferred to Phase 2** (after MVP is tested and validated):

### Changes needed:
1. **Schema extension** (convex/schema.ts):
   ```typescript
   userPreferences: defineTable({
     userId: v.string(),
     voiceLabel: v.string(),       // 'young-female', etc.
     speedPreset: v.number(),      // 1-4
     captionsEnabled: v.boolean(),
     goModeEnabled: v.boolean(),
     lendingViewMode: v.optional(...),
     theme: v.optional(...),
     language: v.optional(...),
     createdAt: v.number(),
     updatedAt: v.number(),
   }).index("by_user", ["userId"]),
   ```

2. **Mutations** (convex/userPreferences.ts):
   - Add `updateVoiceSettings` mutation with validation
   - Add `getVoiceSettings` query

3. **Sync layer** (src/components/unified/hooks/useSettings.ts):
   - Hydrate from Convex on mount
   - Write to Convex on change
   - Keep localStorage as fallback for offline

4. **Conflict resolution**:
   - Last-writer-wins via `updatedAt` timestamp
   - Server timestamp always wins over client

---

## Success Criteria (MVP)

- ✅ Users can select voice AND speed in settings
- ✅ Correct agent selected per user preferences (localStorage)
- ✅ Session restarts automatically when settings change
- ✅ No cross-user interference (different agents per session)
- ✅ Fallback to default agent if variant missing
- ✅ Cross-tab lock coordination works during restarts
- ✅ Context injection preserved after restarts
- ✅ Performance: Settings change restart <3s
- ✅ Cost: Same as single-agent ($0.10/min)

---

## Estimated Effort (MVP Only)

- Agent creation (one-time): 2 hours
- Agent selection logic: 2 hours
- Provider integration: 3 hours
- Settings UI updates: 1 hour
- Testing + verification: 3 hours

**Total MVP: ~11 hours (1.5 working days)**

**Phase 2 (Convex)**: +5 hours

---

## Cost Analysis

### Current (1 agent):
- 100 minutes/month @ $0.10/min = **$10/month**

### With Agent Pool (4 agents):
- Same 100 minutes/month @ $0.10/min = **$10/month**
- ✅ **Zero additional cost** for extra agents!

### Future (8-12 agents):
- Still $10/month for same usage
- ✅ Only pay for conversation time, NOT per-agent

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

## Risks & Mitigations

### Risk 1: Settings change during active conversation
- **Mitigation**: Graceful restart with 300ms delay, preserve context injection

### Risk 2: Cross-tab lock not released during restart
- **Mitigation**: Explicit `releaseSessionLock()` before `endSession()`

### Risk 3: Missing agent variant breaks session
- **Mitigation**: Multi-level fallback (normal speed → default agent)

### Risk 4: Context lost during restart
- **Mitigation**: Leverage existing `useContextInjection` hook (automatically kicks in)

---

**This MVP approach gives you full voice+speed customization with zero additional cost and minimal risk!** 🎉
