# Voice Settings Integration Plan

## Context
FinPilot has a voice settings UI panel that allows users to configure:
- Voice selection (4 voices: young-female, mature-female, young-male, mature-male)
- Language (5 languages: Hindi, English, Tamil, Telugu, Marathi)
- Speech speed (4 presets: Slow, Normal, Fast, Auto-Adapt)
- Live captions toggle
- On-the-Go mode toggle

**PROBLEM**: Settings are purely cosmetic - stored only in localStorage, never sent to ElevenLabs API. Users can change settings but nothing actually happens.

## Current State

### Existing Files
1. `src/components/unified/hooks/useSettings.ts` - Settings hook (localStorage only)
2. `src/components/unified/SettingsPanel.tsx` - Settings UI
3. `convex/schema.ts` - Database schema
4. `convex/userPreferences.ts` - User preferences (only: theme, language, lendingViewMode)
5. `src/providers/ElevenLabsProvider.tsx` - ElevenLabs integration (~700 lines)
6. `app/api/elevenlabs/signed-url/route.ts` - Signed URL endpoint (text mode)
7. `app/api/elevenlabs/conversation-token/route.ts` - Token endpoint (voice mode)

### Tech Stack
- ElevenLabs React SDK (`@elevenlabs/react`)
- Convex for backend
- Next.js App Router
- TypeScript strict mode

## Critical Constraints (from ElevenLabs API research)

### ❌ CANNOT DO:
1. **Dynamic speed changes via SDK overrides** - only `voiceId` supported
2. Stability/similarity_boost via overrides
3. Speed/stability changes without session restart

### ✅ CAN DO:
1. Voice switching via overrides (if "Voice ID Override" enabled in dashboard)
2. Agent config updates via ElevenLabs API
3. Session restart with new parameters

### ⚠️ GOTCHAS:
1. **Config update delay required**: 500ms after API call for propagation
2. **Speed perception non-linear**: Use presets not slider (0.85, 1.0, 1.15, 1.3)
3. **textOnly needs dual flags**: Both SDK + override flags or still charged for audio
4. **Stability sweet spot**: 0.65-0.75 for most use cases
5. **Similarity boost max**: 0.75-0.85 (higher causes distortion)

## Implementation Plan

### Phase 1: Backend Schema Extension
**File**: `convex/schema.ts`

Extend `userPreferences` table:
```typescript
userPreferences: defineTable({
  userId: v.string(),
  // Existing
  lendingViewMode: v.optional(v.union(v.literal("compact"), v.literal("full"))),
  theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
  language: v.optional(v.string()),
  // NEW - Voice settings
  voiceId: v.optional(v.string()),
  voiceSpeed: v.optional(v.number()),
  speedPreset: v.optional(v.number()),
  captionsEnabled: v.optional(v.boolean()),
  goModeEnabled: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

**File**: `convex/userPreferences.ts`

Add mutations:
```typescript
export const updateVoiceSettings = mutation({
  args: {
    userId: v.string(),
    voiceId: v.optional(v.string()),
    voiceSpeed: v.optional(v.number()),
    speedPreset: v.optional(v.number()),
    captionsEnabled: v.optional(v.boolean()),
    goModeEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Update or insert user preferences
  },
});
```

### Phase 2: Voice Parameter Mapping
**New File**: `src/utils/voiceSettingsMapper.ts`

Purpose: Convert UI settings → ElevenLabs API parameters

```typescript
export const VOICE_MAPPING = {
  'young-female': process.env.NEXT_PUBLIC_VOICE_ID_ARIA || 'default_aria_id',
  'mature-female': process.env.NEXT_PUBLIC_VOICE_ID_SARAH || 'default_sarah_id',
  'young-male': process.env.NEXT_PUBLIC_VOICE_ID_ALEX || 'default_alex_id',
  'mature-male': process.env.NEXT_PUBLIC_VOICE_ID_DAVID || 'default_david_id',
};

export const SPEED_MAPPING = {
  1: 0.85,  // Slow
  2: 1.0,   // Normal
  3: 1.15,  // Fast
  4: 1.3,   // Auto-Adapt (placeholder - needs environmental detection)
};

export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.7,          // Sweet spot per research
  similarity_boost: 0.8,   // Optimal quality/accuracy
  optimize_streaming_latency: 3,  // Best tradeoff per research
};

export function mapSettingsToElevenLabsConfig(settings: Settings) {
  return {
    voice_id: VOICE_MAPPING[settings.voice] || VOICE_MAPPING['young-female'],
    speed: SPEED_MAPPING[settings.speedPreset] || 1.0,
    ...DEFAULT_VOICE_SETTINGS,
  };
}
```

### Phase 3: Agent Configuration API
**New File**: `app/api/elevenlabs/update-agent-config/route.ts`

Purpose: Update ElevenLabs agent configuration server-side

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { voiceId, speed, stability, similarity_boost } = await request.json();
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    // Update agent config via ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_config: {
            tts: {
              voice_id: voiceId,
              model_id: 'eleven_turbo_v2_5',
              stability,
              similarity_boost,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    // CRITICAL: Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update agent config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Phase 4: Settings Sync Layer
**File**: `src/components/unified/hooks/useSettings.ts`

Add Convex integration:
```typescript
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch from Convex
  const convexSettings = useQuery(api.userPreferences.get, { userId: 'current-user' });
  const updateConvexSettings = useMutation(api.userPreferences.updateVoiceSettings);

  // Load: Merge Convex + localStorage (Convex wins on conflict)
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const localSettings = stored ? JSON.parse(stored) : {};

    const merged = {
      ...DEFAULT_SETTINGS,
      ...localSettings,
      ...convexSettings,  // Server wins
    };

    setSettings(merged);
    setIsLoaded(true);
  }, [convexSettings]);

  // Save: localStorage + Convex
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };

    // Immediate: localStorage
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));

    // Persistent: Convex (async)
    updateConvexSettings({
      userId: 'current-user',
      voiceId: newSettings.voice,
      speedPreset: newSettings.speedPreset,
      captionsEnabled: newSettings.captions,
      goModeEnabled: newSettings.goMode,
    }).catch(error => {
      console.error('Failed to sync settings to Convex:', error);
      // Could add retry logic or "needs sync" flag
    });
  }, [settings, updateConvexSettings]);

  return { settings, updateSettings, resetSettings, isLoaded };
}
```

### Phase 5: ElevenLabsProvider Integration
**File**: `src/providers/ElevenLabsProvider.tsx`

Add settings application logic:

```typescript
// Add to provider props
interface ElevenLabsProviderProps {
  children: React.ReactNode;
  actionHandlers?: ActionHandlers;
  conversationId?: Id<"conversations"> | null;
  startStream?: (params: { conversationId: string; streamId: string; userId: string }) => Promise<void>;
  updateStream?: (params: { streamId: string; content: string; isComplete: boolean }) => Promise<void>;
  settings?: Settings;  // NEW
}

// Modify startVoice to apply settings
const startVoice = useCallback(async (initialGreeting?: string) => {
  // ... existing checks ...

  await runTransition(async () => {
    // NEW: Apply settings if provided
    if (settings) {
      const config = mapSettingsToElevenLabsConfig(settings);

      // Update agent config
      const response = await fetch('/api/elevenlabs/update-agent-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        console.warn('Failed to update agent config, using defaults');
      }
    }

    // Start WebRTC session with voice override (if supported)
    const voiceConversationId = await voiceConversation.startSession({
      agentId,
      connectionType: "webrtc",
      overrides: settings ? {
        tts: {
          voiceId: VOICE_MAPPING[settings.voice],  // Only this works dynamically
        }
      } : undefined,
    });

    // ... rest of existing code ...
  });
}, [settings, /* ... other deps ... */]);

// Similar for startText
```

### Phase 6: Session Restart Logic
**File**: `src/providers/ElevenLabsProvider.tsx`

Add restart method:

```typescript
const restartWithNewSettings = useCallback(async (newSettings: Settings) => {
  const wasVoice = sessionModeRef.current === 'voice';
  const wasText = sessionModeRef.current === 'text';

  // Update agent config first
  const config = mapSettingsToElevenLabsConfig(newSettings);
  await fetch('/api/elevenlabs/update-agent-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  // Stop current session
  if (wasVoice) {
    await stopVoice();
  } else if (wasText) {
    await stopText();
  }

  // Restart with new settings
  if (wasVoice) {
    await startVoice();
  } else if (wasText) {
    await startText();
  }
}, [stopVoice, stopText, startVoice, startText]);

// Expose in context
return (
  <ElevenLabsContext.Provider
    value={{
      // ... existing values ...
      restartWithNewSettings,
    }}
  >
    {children}
  </ElevenLabsContext.Provider>
);
```

### Phase 7: Settings Panel Enhancement
**File**: `src/components/unified/SettingsPanel.tsx`

Add feedback UI:

```typescript
export function SettingsPanel({ settings, onUpdateSettings, onClose, onToggleGoMode }: SettingsPanelProps) {
  const [isApplying, setIsApplying] = useState(false);
  const { restartWithNewSettings } = useElevenLabsConversation();

  const handleSpeedChange = async (preset: number) => {
    setIsApplying(true);
    try {
      // Update settings
      onUpdateSettings({ speedPreset: preset });

      // Restart session with new speed
      await restartWithNewSettings({ ...settings, speedPreset: preset });

      // Show success feedback
      toast.success('Speed updated!');
    } catch (error) {
      toast.error('Failed to update speed');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div>
      {/* Existing UI */}

      {/* NEW: Loading overlay */}
      {isApplying && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white">
            Applying new settings...
          </div>
        </div>
      )}
    </div>
  );
}
```

## Environment Variables Required

Add to `.env.local`:
```
# Voice ID mapping (get from ElevenLabs dashboard)
NEXT_PUBLIC_VOICE_ID_ARIA=voice_id_here
NEXT_PUBLIC_VOICE_ID_SARAH=voice_id_here
NEXT_PUBLIC_VOICE_ID_ALEX=voice_id_here
NEXT_PUBLIC_VOICE_ID_DAVID=voice_id_here
```

## Testing Plan

### Unit Tests
1. `voiceSettingsMapper` - Verify correct parameter conversion
2. Settings sync - localStorage + Convex merge logic

### Integration Tests
1. Agent config API - Successful update + error handling
2. Settings persistence - Convex save/load

### E2E Tests
1. Change speed → session restarts → new speed applied
2. Change voice → instant update (if override enabled) OR restart
3. Settings persist across page reload
4. Settings sync across tabs (Convex)

### Edge Cases
1. Offline settings changes → queue for sync
2. Rapid successive changes → debounce (last change wins)
3. API failures → retry logic + user notification
4. Missing voice IDs → fallback to defaults

## Rollout Strategy

### Phase 1: Foundation (Safe)
- Backend schema extension
- Settings sync to Convex
- No user-facing changes

### Phase 2: Read-Only Integration (Safe)
- Fetch settings on session start
- Apply to agent config
- No UI changes yet

### Phase 3: Full Integration (Risky)
- Enable settings changes
- Add restart logic
- Full UX feedback

## Risks & Mitigations

### Risk 1: Session restart UX disruption
**Mitigation**: Clear messaging, debounce changes, only restart on "Apply" button

### Risk 2: ElevenLabs API rate limits
**Mitigation**: Debounce config updates, cache last config, only update if changed

### Risk 3: Voice override not enabled in dashboard
**Mitigation**: Fallback to full restart, add docs to enable override

### Risk 4: Config propagation delay
**Mitigation**: Already accounted for (500ms wait), could add retry if session fails

## Open Questions

1. **Voice ID mapping** - Where to store? Env vars vs hardcoded vs API fetch?
   - Recommendation: Env vars for MVP (4 voices), API fetch for scalability

2. **Auto-Adapt speed** - How to detect environment?
   - Recommendation: Defer to future (use 1.3 static for MVP)

3. **Voice override toggle** - Is it enabled in dashboard?
   - Action: Verify and document

4. **Settings granularity** - Per-conversation or global?
   - Current: Global (userPreferences)
   - Future: Could add conversation-level overrides

5. **Language setting scope** - UI only or ElevenLabs agent language?
   - Current: UI only
   - Future: Sync to agent config (requires language validation)

## Success Criteria

- ✅ Settings persist to Convex database
- ✅ Speed changes apply to active sessions
- ✅ Voice changes apply (instantly or via restart)
- ✅ Settings sync across devices
- ✅ Clear UX feedback during transitions
- ✅ No billing surprises (textOnly mode works correctly)
- ✅ Performance acceptable (<1s for setting changes)

## Estimated Effort

- Backend schema + mutations: 2 hours
- Voice mapper utility: 1 hour
- Agent config API: 2 hours
- Settings sync layer: 3 hours
- Provider integration: 4 hours
- Session restart logic: 3 hours
- UI feedback: 2 hours
- Testing + debugging: 4 hours

**Total: ~21 hours (3 working days)**
