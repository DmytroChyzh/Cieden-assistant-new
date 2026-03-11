# Voice Settings Integration Plan (REVISED after Codex Review)

## Critical Discovery from Peer Review

**🚨 BLOCKER**: Original plan used `PATCH /agents/{agentId}` which updates the SHARED agent globally, affecting ALL users. This won't work for per-user settings.

**Solution**: Use **session-scoped overrides** only (no agent config updates). Accept limitation that speed cannot be changed dynamically.

---

## Revised Approach

### What We CAN Do (with session overrides):
- ✅ Voice switching (instant, if "Voice ID Override" enabled in dashboard)
- ✅ Language selection (affects UI only for MVP)
- ✅ Captions toggle (client-side only)
- ✅ On-the-Go mode (UI scaling)

### What We CANNOT Do (requires agent config, which is global):
- ❌ Speed changes (would affect all users)
- ❌ Stability/similarity_boost changes (would affect all users)

### MVP Decision:
**Remove speed settings from this phase.** Add it later only if we implement per-user agent cloning (complex, deferred).

---

## Simplified Implementation Plan

### Phase 1: Backend Schema Extension

**File**: `convex/schema.ts`

```typescript
userPreferences: defineTable({
  userId: v.string(),

  // Existing
  lendingViewMode: v.optional(v.union(v.literal("compact"), v.literal("full"))),
  theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
  language: v.optional(v.string()),

  // Voice settings (SIMPLIFIED - no speed)
  voiceId: v.optional(v.string()),  // Canonical ElevenLabs voice ID
  captionsEnabled: v.optional(v.boolean()),
  goModeEnabled: v.optional(v.boolean()),

  // Server timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user", ["userId"]),
```

**File**: `convex/userPreferences.ts`

```typescript
// Get user preferences (with auth)
export const get = query({
  args: {},  // NO userId from client
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", identity.subject))
      .first();

    return preferences || {
      lendingViewMode: "compact" as const,
      theme: "system" as const,
      language: "en",
      voiceId: null,
      captionsEnabled: true,
      goModeEnabled: false,
    };
  },
});

// Update voice settings (with auth and validation)
export const updateVoiceSettings = mutation({
  args: {
    voiceId: v.optional(v.string()),
    captionsEnabled: v.optional(v.boolean()),
    goModeEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // P0: Auth check - derive userId from session
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // P0: Validate voiceId is in allowed list
    const ALLOWED_VOICES = [
      'aria_voice_id',
      'sarah_voice_id',
      'alex_voice_id',
      'david_voice_id',
    ];

    if (args.voiceId && !ALLOWED_VOICES.includes(args.voiceId)) {
      throw new Error("Invalid voice ID");
    }

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
```

---

### Phase 2: Voice Mapping (Simplified)

**File**: `src/utils/voiceSettingsMapper.ts`

```typescript
// Voice ID mapping (from env vars)
export const VOICE_MAPPING = {
  'young-female': process.env.NEXT_PUBLIC_VOICE_ID_ARIA!,
  'mature-female': process.env.NEXT_PUBLIC_VOICE_ID_SARAH!,
  'young-male': process.env.NEXT_PUBLIC_VOICE_ID_ALEX!,
  'mature-male': process.env.NEXT_PUBLIC_VOICE_ID_DAVID!,
} as const;

// Reverse mapping for UI display
export const VOICE_ID_TO_LABEL: Record<string, keyof typeof VOICE_MAPPING> = {
  [process.env.NEXT_PUBLIC_VOICE_ID_ARIA!]: 'young-female',
  [process.env.NEXT_PUBLIC_VOICE_ID_SARAH!]: 'mature-female',
  [process.env.NEXT_PUBLIC_VOICE_ID_ALEX!]: 'young-male',
  [process.env.NEXT_PUBLIC_VOICE_ID_DAVID!]: 'mature-male',
};

// Validate env vars at module load
Object.values(VOICE_MAPPING).forEach(id => {
  if (!id) {
    console.error('Missing voice ID in environment variables');
  }
});

export function mapVoiceLabelToId(label: string): string | null {
  return VOICE_MAPPING[label as keyof typeof VOICE_MAPPING] || null;
}

export function mapVoiceIdToLabel(id: string): string | null {
  return VOICE_ID_TO_LABEL[id] || null;
}
```

---

### Phase 3: Settings Sync Layer

**File**: `src/components/unified/hooks/useSettings.ts`

```typescript
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState, useEffect, useCallback } from 'react';

export interface Settings {
  voice: string;  // UI label (young-female, etc.)
  language: string;
  captionsEnabled: boolean;
  goModeEnabled: boolean;
  visuals?: {
    waveformPlacement: WaveformPlacement;
    // ... other visual settings
  };
}

const DEFAULT_SETTINGS: Settings = {
  voice: 'young-female',
  language: 'hi-IN',
  captionsEnabled: true,
  goModeEnabled: false,
  visuals: {
    waveformPlacement: 'over-input',
    // ... defaults
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch from Convex (authenticated)
  const convexPrefs = useQuery(api.userPreferences.get);
  const updateConvexSettings = useMutation(api.userPreferences.updateVoiceSettings);

  // Load: Merge server + localStorage (server wins for voice)
  useEffect(() => {
    if (!convexPrefs) return;

    const stored = localStorage.getItem('finpilot-voice-settings');
    const localSettings = stored ? JSON.parse(stored) : {};

    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...localSettings,
      // Server wins for synced fields
      voice: convexPrefs.voiceId
        ? mapVoiceIdToLabel(convexPrefs.voiceId) || DEFAULT_SETTINGS.voice
        : localSettings.voice || DEFAULT_SETTINGS.voice,
      captionsEnabled: convexPrefs.captionsEnabled ?? localSettings.captionsEnabled ?? true,
      goModeEnabled: convexPrefs.goModeEnabled ?? localSettings.goModeEnabled ?? false,
    };

    setSettings(merged);
    setIsLoaded(true);
  }, [convexPrefs]);

  // Save: localStorage + Convex
  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };

    // Immediate: localStorage
    setSettings(newSettings);
    localStorage.setItem('finpilot-voice-settings', JSON.stringify(newSettings));

    // Persistent: Convex (only synced fields)
    try {
      await updateConvexSettings({
        voiceId: newSettings.voice ? mapVoiceLabelToId(newSettings.voice) : undefined,
        captionsEnabled: newSettings.captionsEnabled,
        goModeEnabled: newSettings.goModeEnabled,
      });
    } catch (error) {
      console.error('Failed to sync settings:', error);
      // Could show toast: "Settings saved locally, will sync when online"
    }
  }, [settings, updateConvexSettings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('finpilot-voice-settings');
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}
```

---

### Phase 4: ElevenLabsProvider Integration

**File**: `src/providers/ElevenLabsProvider.tsx`

Add settings prop and apply via overrides:

```typescript
export function ElevenLabsProvider({
  children,
  actionHandlers,
  conversationId,
  startStream,
  updateStream,
  settings,  // NEW: Pass from parent
}: {
  children: React.ReactNode;
  actionHandlers?: ActionHandlers;
  conversationId?: Id<"conversations"> | null;
  startStream?: (...) => Promise<void>;
  updateStream?: (...) => Promise<void>;
  settings?: { voiceId: string | null };  // NEW
}) {
  // ... existing code ...

  // Voice mode conversation with settings override
  const voiceConversation = useConversation({
    micMuted: false,
    volume: 1.0,
    clientTools: createClientTools(actionHandlers ?? null),

    // NEW: Apply voice override if settings provided
    overrides: settings?.voiceId ? {
      tts: {
        voiceId: settings.voiceId,
      }
    } : undefined,

    // ... rest of existing config
  });

  // Text mode conversation with settings override
  const textConversation = useConversation({
    textOnly: true,
    overrides: {
      conversation: {
        textOnly: true,
      },
      // NEW: Apply voice override for text mode too
      ...(settings?.voiceId ? {
        tts: {
          voiceId: settings.voiceId,
        }
      } : {}),
    },
    clientTools: createClientTools(actionHandlers ?? null),
    // ... rest of existing config
  });

  // ... rest of provider implementation unchanged
}
```

**File**: `app/layout.tsx` or parent component

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { settings, isLoaded } = useSettings();

  // Convert to voiceId for provider
  const voiceSettings = {
    voiceId: settings.voice ? mapVoiceLabelToId(settings.voice) : null,
  };

  return (
    <ConvexAuthProvider>
      <ElevenLabsProvider
        settings={voiceSettings}
        // ... other props
      >
        {children}
      </ElevenLabsProvider>
    </ConvexAuthProvider>
  );
}
```

---

### Phase 5: Settings Panel Enhancement

**File**: `src/components/unified/SettingsPanel.tsx`

Simplifications:
1. Remove speed controls (can't be changed per-user with shared agent)
2. Add "Apply" button for voice changes (clearer UX)
3. Show reconnection notice

```typescript
export function SettingsPanel({
  settings,
  onUpdateSettings,
  onClose,
  onToggleGoMode
}: SettingsPanelProps) {
  const [pendingVoice, setPendingVoice] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const { conversation, sessionMode, startVoice, startText } = useElevenLabsConversation();

  const hasChanges = pendingVoice && pendingVoice !== settings.voice;

  const handleVoiceSelect = (voiceId: string) => {
    setPendingVoice(voiceId);
  };

  const handleApplyVoice = async () => {
    if (!pendingVoice) return;

    setIsApplying(true);
    try {
      // Update settings
      await onUpdateSettings({ voice: pendingVoice });

      // Restart session to apply new voice
      const wasVoice = sessionMode === 'voice';
      const wasText = sessionMode === 'text';

      if (wasVoice) {
        await conversation.endSession();
        await new Promise(r => setTimeout(r, 300));
        await startVoice();
      } else if (wasText) {
        await conversation.endSession();
        await new Promise(r => setTimeout(r, 300));
        await startText();
      }

      toast.success('Voice updated!');
      setPendingVoice(null);
    } catch (error) {
      console.error('Failed to apply voice:', error);
      toast.error('Failed to update voice');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <motion.div className="...">
      {/* Voice Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-white/70">
          <Mic className="w-4 h-4" />
          <span className="text-sm font-medium">Voice</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => handleVoiceSelect(voice.id)}
              disabled={isApplying}
              className={cn(
                "flex-shrink-0 px-4 py-3 rounded-xl border transition-all",
                (pendingVoice || settings.voice) === voice.id
                  ? "bg-white/20 border-white/40 text-white"
                  : "bg-white/5 border-white/20 text-white/60"
              )}
            >
              <div className="text-sm font-medium">{voice.name}</div>
              <div className="text-xs opacity-60">{voice.type}</div>
            </button>
          ))}
        </div>

        {/* Apply Button */}
        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleApplyVoice}
            disabled={isApplying}
            className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium disabled:opacity-50"
          >
            {isApplying ? 'Applying...' : 'Apply Voice Change (will reconnect)'}
          </motion.button>
        )}
      </div>

      {/* Remove Speed Controls - not supported with shared agent */}

      {/* Keep Captions Toggle - client-side only */}
      {/* Keep On-the-Go Mode - UI scaling only */}

      {isApplying && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white">Reconnecting with new voice...</div>
        </div>
      )}
    </motion.div>
  );
}
```

---

## Environment Variables

```bash
# Required voice IDs (get from ElevenLabs dashboard)
NEXT_PUBLIC_VOICE_ID_ARIA=...
NEXT_PUBLIC_VOICE_ID_SARAH=...
NEXT_PUBLIC_VOICE_ID_ALEX=...
NEXT_PUBLIC_VOICE_ID_DAVID=...

# Verify "Voice ID Override" is enabled in ElevenLabs dashboard
# Settings → Agent → Security → Enable "Voice ID Override"
```

---

## Testing Plan

### Unit Tests
1. Voice mapping functions (label ↔ ID conversion)
2. Settings merge logic (server wins, localStorage fallback)
3. Validation logic (allowed voice IDs)

### Integration Tests
1. Auth checks in Convex mutations
2. Settings persistence across page reload
3. Cross-device sync via Convex

### E2E Tests
1. Change voice → Apply → Session restarts → New voice active
2. Captions toggle → Immediate effect (no restart)
3. Settings persist after logout/login
4. Offline changes → Queue → Sync on reconnect

### Security Tests
1. Unauthorized access to other users' preferences → 401
2. Invalid voice ID → Validation error
3. Missing auth token → Error

---

## Rollout Strategy

### Phase 1: Foundation
- Backend schema + auth
- Settings sync (read-only)
- No UI changes

### Phase 2: Voice Switching Only
- Enable voice selection UI
- Apply button with restart
- Monitor for errors

### Phase 3: Full Feature
- Captions toggle
- On-the-Go mode
- Cross-device sync

---

## Risks & Mitigations

### Risk 1: Voice override not enabled in dashboard
**Mitigation**: Pre-flight check, clear admin docs, fallback to default voice

### Risk 2: Session restart disrupts user
**Mitigation**: Explicit "Apply" button with warning, debounce rapid changes

### Risk 3: Offline settings changes
**Mitigation**: Queue in localStorage, show "pending sync" badge, retry on reconnect

### Risk 4: Voice ID env vars missing
**Mitigation**: Validation at boot, throw clear error, admin diagnostic page

---

## What We're NOT Doing (Deferred)

### ❌ Speed Settings
**Why**: Requires per-user agent config (global shared agent won't work)
**Future**: Implement agent cloning with user-scoped instances (complex)

### ❌ Stability/Similarity Boost
**Why**: Same as speed - requires per-user agent
**Future**: Same as above

### ❌ Language Sync to Agent
**Why**: Adds complexity, language is UI-only for MVP
**Future**: Sync language to agent config when validated

---

## Estimated Effort (Revised)

- Backend schema + auth: 2 hours
- Voice mapper utility: 1 hour
- Settings sync layer: 3 hours
- Provider integration: 2 hours (simpler, no agent API)
- UI updates: 2 hours
- Testing: 3 hours

**Total: ~13 hours (1.5-2 working days)**

Much simpler than original plan!

---

## Success Criteria

- ✅ Voice settings persist to Convex with proper auth
- ✅ Voice changes apply via session restart
- ✅ Captions toggle works instantly (client-side)
- ✅ Settings sync across devices
- ✅ Clear UX with "Apply" button and reconnection notice
- ✅ No unauthorized access to other users' settings
- ✅ Graceful handling of offline changes
- ✅ Performance: Voice change <3s (restart + reconnect)
