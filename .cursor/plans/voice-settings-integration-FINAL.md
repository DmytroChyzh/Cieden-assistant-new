# Voice Settings Integration Plan - FINAL (Research-Backed)

## Research Summary

**Documentation Sources Verified:**
1. ✅ ElevenLabs Overrides: https://elevenlabs.io/docs/agents-platform/customization/personalization/overrides
2. ✅ ElevenLabs React SDK: https://elevenlabs.io/docs/agents-platform/libraries/react
3. ✅ Project Skill Docs: `.claude/skills/elevenlabs-voice-settings/skill.md`
4. ✅ Codex Peer Review: Independent code analysis

## ElevenLabs API Capabilities (Official)

### ✅ Per-Session Overrides (Supported)
According to official documentation, these can be overridden dynamically:

```typescript
overrides: {
  agent: {
    prompt: { prompt: string },    // System instructions
    firstMessage: string,           // Opening greeting
    language: string                // Conversation language
  },
  tts: {
    voiceId: string                // ✅ Voice selection
  },
  conversation: {
    textOnly: boolean              // ✅ Billing mode
  }
}
```

### ❌ Agent-Level Only (NOT Overridable)
These require global agent configuration updates:
- `speed` (0.7-1.2 range) - Must update agent config
- `stability` (0-1 range) - Must update agent config
- `similarity_boost` - Must update agent config
- TTS model selection - Must update agent config

**Critical Constraint:** Updating agent config affects ALL users globally (multi-tenant blocker).

---

## MVP Scope Decision

Based on research, we implement **Voice-Only Settings** for MVP:

### ✅ Phase 1 (MVP - Ship This)
1. **Voice Selection** - Per-user, instant switching via overrides
2. **Captions Toggle** - Client-side only (UI preference)
3. **On-the-Go Mode** - Client-side only (UI scaling)
4. **Settings Persistence** - Save to Convex with auth

### ⏸️ Phase 2 (Future - Requires Architecture)
1. **Speed Settings** - Needs per-user agent instances (complex)
2. **Stability/Boost** - Same as speed
3. **Language Sync** - Sync UI language to agent config

---

## Implementation Plan (MVP - Voice Only)

### Phase 1: Backend Schema

**File:** `convex/schema.ts`

```typescript
userPreferences: defineTable({
  userId: v.string(),

  // Existing
  lendingViewMode: v.optional(v.union(v.literal("compact"), v.literal("full"))),
  theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
  language: v.optional(v.string()),

  // Voice settings (MVP - voice only)
  voiceId: v.string(),           // Canonical ElevenLabs voice ID
  captionsEnabled: v.boolean(),  // UI preference only
  goModeEnabled: v.boolean(),    // UI preference only

  // Server timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user", ["userId"]),  // Required for efficient queries
```

**File:** `convex/userPreferences.ts`

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Allowed voice IDs (from env vars)
const ALLOWED_VOICES = [
  process.env.NEXT_PUBLIC_VOICE_ID_ARIA!,
  process.env.NEXT_PUBLIC_VOICE_ID_SARAH!,
  process.env.NEXT_PUBLIC_VOICE_ID_ALEX!,
  process.env.NEXT_PUBLIC_VOICE_ID_DAVID!,
].filter(Boolean);

// Get user preferences (authenticated)
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null; // Not logged in
    }

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", identity.subject))
      .first();

    // Return defaults if no prefs found
    return prefs || {
      userId: identity.subject,
      voiceId: ALLOWED_VOICES[0], // Default to first voice
      captionsEnabled: true,
      goModeEnabled: false,
      lendingViewMode: "compact",
      theme: "system",
      language: "en",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
});

// Update voice settings (authenticated, validated)
export const updateVoiceSettings = mutation({
  args: {
    voiceId: v.optional(v.string()),
    captionsEnabled: v.optional(v.boolean()),
    goModeEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Auth: Derive userId from session (NEVER trust client)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate voiceId is in allowed list
    if (args.voiceId && !ALLOWED_VOICES.includes(args.voiceId)) {
      throw new Error(`Invalid voice ID. Must be one of: ${ALLOWED_VOICES.join(", ")}`);
    }

    const userId = identity.subject;
    const now = Date.now();

    // Upsert with server-side timestamps
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        voiceId: args.voiceId || ALLOWED_VOICES[0],
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

### Phase 2: Voice ID Mapping

**File:** `src/utils/voiceMapping.ts`

```typescript
// Voice ID mapping (from env - validated at build time)
export const VOICE_MAPPING = {
  'young-female': process.env.NEXT_PUBLIC_VOICE_ID_ARIA!,
  'mature-female': process.env.NEXT_PUBLIC_VOICE_ID_SARAH!,
  'young-male': process.env.NEXT_PUBLIC_VOICE_ID_ALEX!,
  'mature-male': process.env.NEXT_PUBLIC_VOICE_ID_DAVID!,
} as const;

export type VoiceLabel = keyof typeof VOICE_MAPPING;

// Reverse mapping for UI
export const VOICE_ID_TO_LABEL = Object.fromEntries(
  Object.entries(VOICE_MAPPING).map(([label, id]) => [id, label as VoiceLabel])
) as Record<string, VoiceLabel>;

// Validation at module load
if (Object.values(VOICE_MAPPING).some(id => !id)) {
  throw new Error("Missing NEXT_PUBLIC_VOICE_ID_* environment variables");
}

export function getLabelFromId(voiceId: string): VoiceLabel | null {
  return VOICE_ID_TO_LABEL[voiceId] || null;
}

export function getIdFromLabel(label: string): string | null {
  return VOICE_MAPPING[label as VoiceLabel] || null;
}

// Get all available voices for UI
export function getAvailableVoices() {
  return Object.entries(VOICE_MAPPING).map(([label, id]) => ({
    label: label as VoiceLabel,
    id,
    name: formatVoiceName(label),
  }));
}

function formatVoiceName(label: string): string {
  return label.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}
```

---

### Phase 3: Settings Hook (with Convex Sync)

**File:** `src/components/unified/hooks/useSettings.ts`

```typescript
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState, useEffect, useCallback } from 'react';
import { getLabelFromId, getIdFromLabel, VOICE_MAPPING } from '@/utils/voiceMapping';

export interface Settings {
  voice: string;  // UI label (young-female, etc.)
  language: string;
  captionsEnabled: boolean;
  goModeEnabled: boolean;
  visuals?: VisualSettings;
}

const DEFAULT_SETTINGS: Settings = {
  voice: 'young-female',
  language: 'hi-IN',
  captionsEnabled: true,
  goModeEnabled: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch from Convex (authenticated)
  const convexPrefs = useQuery(api.userPreferences.get);
  const updateConvexSettings = useMutation(api.userPreferences.updateVoiceSettings);

  // Load: Server wins, localStorage as fallback
  useEffect(() => {
    if (!convexPrefs) return;

    // SSR-safe localStorage access
    const getLocalSettings = () => {
      if (typeof window === 'undefined') return {};
      const stored = localStorage.getItem('finpilot-voice-settings');
      return stored ? JSON.parse(stored) : {};
    };

    const localSettings = getLocalSettings();

    // Merge: Server > localStorage > Defaults
    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...localSettings,
      // Server wins for synced fields
      voice: convexPrefs.voiceId
        ? getLabelFromId(convexPrefs.voiceId) || DEFAULT_SETTINGS.voice
        : localSettings.voice || DEFAULT_SETTINGS.voice,
      captionsEnabled: convexPrefs.captionsEnabled ?? localSettings.captionsEnabled ?? true,
      goModeEnabled: convexPrefs.goModeEnabled ?? localSettings.goModeEnabled ?? false,
    };

    setSettings(merged);
    setIsLoaded(true);
  }, [convexPrefs]);

  // Save: localStorage (instant) + Convex (persistent)
  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };

    // Immediate: localStorage for instant feedback
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('finpilot-voice-settings', JSON.stringify(newSettings));
    }

    // Persistent: Convex (async with error handling)
    if (updates.voice || updates.captionsEnabled !== undefined || updates.goModeEnabled !== undefined) {
      setIsSyncing(true);
      try {
        await updateConvexSettings({
          voiceId: updates.voice ? getIdFromLabel(updates.voice) : undefined,
          captionsEnabled: updates.captionsEnabled,
          goModeEnabled: updates.goModeEnabled,
        });
      } catch (error) {
        console.error('Failed to sync settings:', error);
        // Could show toast: "Settings saved locally, will sync when online"
      } finally {
        setIsSyncing(false);
      }
    }
  }, [settings, updateConvexSettings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finpilot-voice-settings');
    }
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
    isSyncing,
  };
}
```

---

### Phase 4: ElevenLabsProvider Integration

**File:** `src/providers/ElevenLabsProvider.tsx`

Add voice override to existing provider:

```typescript
export function ElevenLabsProvider({ children, ... }: Props) {
  const { settings } = useSettings();

  // Get current voiceId from settings
  const voiceId = settings.voice ? getIdFromLabel(settings.voice) : null;

  // Voice mode with override
  const voiceConversation = useConversation({
    micMuted: false,
    volume: 1.0,
    clientTools: createClientTools(actionHandlers ?? null),

    // Apply voice override if available
    overrides: voiceId ? {
      tts: {
        voiceId,
      }
    } : undefined,
  });

  // Text mode with override
  const textConversation = useConversation({
    textOnly: true,
    overrides: {
      conversation: {
        textOnly: true,  // Dual flags for billing protection
      },
      ...(voiceId ? {
        tts: {
          voiceId,
        }
      } : {}),
    },
    clientTools: createClientTools(actionHandlers ?? null),
  });

  // Rest of provider unchanged...
}
```

---

### Phase 5: Settings Panel UI

**File:** `src/components/unified/SettingsPanel.tsx`

```typescript
export function SettingsPanel({ onClose }: Props) {
  const { settings, updateSettings, isSyncing } = useSettings();
  const { sessionMode, conversation } = useElevenLabsConversation();
  const [pendingVoice, setPendingVoice] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const hasVoiceChanged = pendingVoice && pendingVoice !== settings.voice;
  const isSessionActive = sessionMode === 'voice' || sessionMode === 'text';

  const handleVoiceSelect = (voiceLabel: string) => {
    setPendingVoice(voiceLabel);
  };

  const handleApplyVoice = async () => {
    if (!pendingVoice || !hasVoiceChanged) return;

    setIsApplying(true);
    try {
      // Update settings (syncs to Convex)
      await updateSettings({ voice: pendingVoice });

      // If session active, restart to apply new voice
      if (isSessionActive) {
        await conversation.endSession();
        await new Promise(r => setTimeout(r, 300)); // Brief pause

        // Restart in same mode
        if (sessionMode === 'voice') {
          await startVoice();
        } else if (sessionMode === 'text') {
          await startText();
        }
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
        <label className="text-sm font-medium text-white/70">
          Voice
        </label>

        <div className="grid grid-cols-2 gap-2">
          {getAvailableVoices().map((voice) => (
            <button
              key={voice.id}
              onClick={() => handleVoiceSelect(voice.label)}
              disabled={isApplying}
              className={cn(
                "px-4 py-3 rounded-xl border transition-all",
                (pendingVoice || settings.voice) === voice.label
                  ? "bg-white/20 border-white/40 text-white"
                  : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
              )}
            >
              {voice.name}
            </button>
          ))}
        </div>

        {/* Apply Button (only if changed and session active) */}
        {hasVoiceChanged && isSessionActive && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleApplyVoice}
            disabled={isApplying}
            className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium disabled:opacity-50"
          >
            {isApplying ? 'Reconnecting...' : 'Apply Voice (will reconnect)'}
          </motion.button>
        )}

        {/* Immediate apply if no active session */}
        {hasVoiceChanged && !isSessionActive && (
          <button
            onClick={() => updateSettings({ voice: pendingVoice })}
            className="w-full py-2 text-sm text-blue-400 hover:text-blue-300"
          >
            Save for next session
          </button>
        )}
      </div>

      {/* Captions Toggle - No restart needed */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Live Captions</span>
        <Switch
          checked={settings.captionsEnabled}
          onCheckedChange={(enabled) => updateSettings({ captionsEnabled: enabled })}
        />
      </div>

      {/* On-the-Go Mode - No restart needed */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">On-the-Go Mode</span>
        <Switch
          checked={settings.goModeEnabled}
          onCheckedChange={(enabled) => updateSettings({ goModeEnabled: enabled })}
        />
      </div>

      {/* Sync indicator */}
      {isSyncing && (
        <div className="text-xs text-white/50 text-center">
          Syncing...
        </div>
      )}

      {/* Speed Settings Removed - Not supported per-session */}
      {/* Future: Show "Speed settings coming soon" message */}
    </motion.div>
  );
}
```

---

## Environment Variables

```bash
# Required voice IDs (get from ElevenLabs dashboard)
NEXT_PUBLIC_VOICE_ID_ARIA=voice_id_here
NEXT_PUBLIC_VOICE_ID_SARAH=voice_id_here
NEXT_PUBLIC_VOICE_ID_ALEX=voice_id_here
NEXT_PUBLIC_VOICE_ID_DAVID=voice_id_here

# Verify "Voice ID Override" is enabled in ElevenLabs dashboard:
# Settings → Agent → Security → Enable "Voice ID Override"
```

---

## Testing Plan

### Unit Tests
1. Voice mapping functions (label ↔ ID)
2. Settings merge logic (server > localStorage > defaults)
3. Validation (allowed voice IDs only)

### Integration Tests
1. Auth checks in Convex (reject unauthenticated)
2. Settings persistence across reload
3. Cross-device sync via Convex

### E2E Tests
1. Select voice → Apply → Session restarts → New voice active
2. Captions toggle → Immediate effect (no restart)
3. Offline changes → Queue → Sync on reconnect
4. Invalid voice ID → Validation error

---

## Risks & Mitigations

### Risk 1: Voice override not enabled in dashboard
**Mitigation:**
- Add pre-flight check on app load
- Show admin warning if disabled
- Provide setup documentation

### Risk 2: Session restart disrupts user
**Mitigation:**
- Explicit "Apply" button with warning
- Only restart if session active
- Graceful reconnect with brief pause

### Risk 3: Cross-tab conflicts
**Mitigation:**
- Existing cross-tab lock prevents duplicate sessions
- Settings update broadcasts via BroadcastChannel

---

## What We're NOT Doing (Future Phase)

### ❌ Speed Settings
**Why:** Requires agent-level config (global, affects all users)
**Future:** Implement per-user agent instances with agent cloning/pooling

### ❌ Stability/Similarity Boost
**Why:** Same limitation as speed
**Future:** Same solution as speed

### ❌ Language Sync to Agent
**Why:** Adds complexity, language is UI-only for MVP
**Future:** Sync when multi-language agents validated

---

## Success Criteria

- ✅ Voice selection persists to Convex with auth
- ✅ Voice changes apply via session restart
- ✅ Captions/Go-Mode toggles work instantly
- ✅ Settings sync across devices
- ✅ No unauthorized access to other users' settings
- ✅ Graceful handling of offline changes
- ✅ Performance: Voice change <3s (restart + reconnect)
- ✅ No billing surprises (textOnly mode verified)

---

## Estimated Effort

- Phase 1: Backend schema + auth - 2 hours
- Phase 2: Voice mapping - 1 hour
- Phase 3: Settings hook - 2 hours
- Phase 4: Provider integration - 2 hours
- Phase 5: UI updates - 2 hours
- Testing + debugging - 3 hours

**Total: ~12 hours (1.5-2 working days)**

---

## Implementation Order

1. ✅ Environment variables setup
2. ✅ Voice mapping utility
3. ✅ Backend schema + mutations
4. ✅ Settings hook with Convex sync
5. ✅ Provider integration (overrides)
6. ✅ UI updates (Settings Panel)
7. ✅ Testing + verification

This plan is backed by official ElevenLabs documentation and project research.
