---
name: ElevenLabs Voice Settings - Non-Obvious Gotchas
description: Critical gotchas, limitations, and non-obvious behaviors when managing ElevenLabs voice settings that aren't in standard documentation.
version: 1.0.0
---

# ElevenLabs Voice Settings - Non-Obvious Knowledge

Critical gotchas and limitations that will save you hours of debugging.

## Critical Limitation: Override Scope

**❌ Common Misconception**: Runtime overrides work for all voice settings

**✅ Reality**: Only `voice_id` supported in React SDK overrides

```typescript
// ❌ DOES NOT WORK - Will be ignored silently
overrides: {
  tts: {
    voiceId: 'new_voice',
    speed: 1.2,           // IGNORED
    stability: 0.8        // IGNORED
  }
}

// ✅ WORKS - Only voice_id
overrides: {
  tts: {
    voiceId: 'new_voice'  // This works
  }
}

// For speed/stability: Must update agent config + restart session
```

**Why This Matters**: You cannot dynamically change speech speed without restarting the session. This affects UX design.

---

## Gotcha: camelCase vs snake_case Inconsistency

**Problem**: ElevenLabs uses different casing in different contexts

```typescript
// ❌ WRONG - Won't work in React SDK
overrides: {
  tts: {
    voice_id: 'xyz'  // snake_case - API style
  }
}

// ✅ CORRECT - React SDK uses camelCase
overrides: {
  tts: {
    voiceId: 'xyz'   // camelCase - SDK style
  }
}

// But in API requests, use snake_case:
{
  "conversation_config": {
    "tts": {
      "voice_id": "xyz",      // snake_case
      "similarity_boost": 0.75 // snake_case
    }
  }
}
```

**Rule of Thumb**:
- React SDK overrides: `camelCase` (voiceId)
- API requests: `snake_case` (voice_id, similarity_boost)

---

## Hidden Requirement: Security Override Toggle

**Symptom**: Override set correctly, but voice doesn't change. No errors shown.

**Cause**: Override permissions disabled in agent settings (disabled by default)

**Solution**: Must enable in ElevenLabs Dashboard
1. Agent → Security tab
2. Enable "Voice ID Override"

**Non-Obvious**: This is a security setting, not a feature flag. You can set overrides in code, but they'll be silently ignored if not enabled in dashboard.

---

## Timing Gotcha: Config Update Race Condition

**Problem**: Agent config updated via API, but session uses old config

```typescript
// ❌ RACE CONDITION - New session may use old config
await updateAgentConfig({ speed: 1.2 });
await conversation.startSession({ agentId });  // May still have speed: 1.0
```

**Solution**: Add small delay after config update

```typescript
// ✅ WORKS - Allow API propagation time
await updateAgentConfig({ speed: 1.2 });
await new Promise(r => setTimeout(r, 500));  // Wait 500ms
await conversation.startSession({ agentId });
```

**Why**: ElevenLabs API takes ~100-500ms to propagate config changes internally. Not documented.

---

## Voice Cache Invalidation

**Problem**: Fetching voices can return stale data

```typescript
// ❌ STALE - Newly added voices won't appear
const voices = await fetch('/v1/voices');
// User added voice via dashboard 5 mins ago - not in list!
```

**Solution**: ElevenLabs caches voice list. Force refresh:

```typescript
// ✅ FORCE FRESH - Add cache-busting
const voices = await fetch('/v1/voices', {
  headers: {
    'xi-api-key': apiKey,
    'Cache-Control': 'no-cache'  // Force fresh data
  }
});
```

**Or**: Client-side cache with TTL of 5-10 minutes, not 24 hours.

---

## Stability Range Trap

**Common Assumption**: stability 0-1 is linear

**Reality**: Sweet spots at specific ranges

```typescript
// ❌ Misleading - 0.5 is NOT "middle ground"
stability: 0.5  // Often too emotional/unstable

// ✅ Recommended ranges (from testing, not docs)
stability: 0.65-0.75  // Professional/consistent (most use cases)
stability: 0.40-0.50  // Emotional/dynamic (storytelling)
stability: 0.85-0.95  // Robotic/very stable (avoid unless needed)
```

**Non-Obvious**: Values below 0.4 can cause unpredictable voice changes mid-sentence. Values above 0.9 sound monotone.

---

## Similarity Boost Distortion Threshold

**Problem**: Cranking similarity_boost to max doesn't improve quality

```typescript
// ❌ TOO HIGH - Causes audio distortion
similarity_boost: 0.95  // Clips, artifacts, sounds worse

// ✅ OPTIMAL - Balance accuracy vs quality
similarity_boost: 0.75-0.85  // Sweet spot
```

**Why**: Higher values force the model to match the original voice exactly, which can introduce artifacts. Not linear improvement.

---

## Speed Perception Non-Linearity

**Trap**: speed multipliers don't match perception

```typescript
// User perceives these as:
speed: 0.8  // "Very slow" (feels 50% slower)
speed: 0.9  // "Slightly slow"
speed: 1.0  // "Normal"
speed: 1.1  // "Slightly fast"
speed: 1.2  // "Very fast" (feels 50% faster)

// ❌ Linear slider 0.7-1.2 feels wrong to users
// ✅ Use presets: Slow(0.85), Normal(1.0), Fast(1.15)
```

**Recommendation**: Don't expose raw speed slider. Use 3-4 labeled presets.

---

## textOnly Mode Billing Trap

**Critical**: Setting textOnly incorrectly still charges for audio

```typescript
// ❌ INCOMPLETE - Still generates audio and charges!
const conversation = useConversation({
  textOnly: true  // Not enough!
});

// ✅ REQUIRED - Both flags needed
const conversation = useConversation({
  textOnly: true,              // SDK flag
  overrides: {
    conversation: {
      textOnly: true            // Override flag
    }
  }
});
```

**Why**: SDK flag + override flag both required. Using only one will still generate audio and charge you. Not documented clearly.

---

## Voice Language Mismatch Silent Failure

**Problem**: Voice supports English, agent language is Spanish → poor quality, no error

```typescript
// ❌ SILENT QUALITY DEGRADATION
const rachel = voices.find(v => v.name === 'Rachel');  // English voice
// Agent configured for Spanish language
// Voice will speak Spanish but with heavy accent, low quality
```

**Solution**: Validate voice language matches agent language

```typescript
const validateVoiceLanguage = (voice: Voice, agentLang: string) => {
  const voiceLang = voice.labels?.language;
  const targetLang = agentLang.split('-')[0]; // 'es-ES' → 'es'

  if (voiceLang !== targetLang) {
    console.warn(`Voice ${voice.name} is ${voiceLang}, agent is ${targetLang}`);
    return false;
  }
  return true;
};
```

---

## Model Selection Impact on Latency

**Non-Obvious**: Model choice dramatically affects latency, not just quality

```typescript
// Latency differences (not in docs):
model_id: 'eleven_turbo_v2_5'      // ~200-300ms latency
model_id: 'eleven_multilingual_v2' // ~500-800ms latency
model_id: 'eleven_flash_v2_5'      // ~100-150ms latency (newest)

// ✅ For voice chat: Use eleven_flash_v2_5 or eleven_turbo_v2_5
// ❌ For voice chat: Avoid eleven_multilingual_v2 (too slow)
```

**Recommendation**: eleven_flash_v2_5 for conversational AI, multilingual only if actually needed.

---

## optimize_streaming_latency Actual Impact

**Trap**: Setting to max (4) doesn't always help

```typescript
// Common belief:
optimize_streaming_latency: 4  // "Max speed, always best"

// Reality (from testing):
optimize_streaming_latency: 3  // Best quality/speed tradeoff
optimize_streaming_latency: 4  // Faster but noticeable quality drop

// ✅ Recommended
optimize_streaming_latency: 3  // Production default
optimize_streaming_latency: 4  // Only if latency critical
```

**Why**: Level 4 uses aggressive compression that can introduce artifacts. Level 3 is the sweet spot.

---

## WebSocket vs WebRTC Mode Differences

**Critical**: textOnly ONLY works with WebSocket, not WebRTC

```typescript
// ❌ WRONG - textOnly ignored with WebRTC
connectionType: 'webrtc',
overrides: {
  conversation: {
    textOnly: true  // IGNORED - WebRTC always has audio
  }
}

// ✅ CORRECT - Must use websocket for text-only
connectionType: 'websocket',  // Required for textOnly
overrides: {
  conversation: {
    textOnly: true
  }
}
```

**Why**: WebRTC is designed for real-time audio. WebSocket is for text/audio hybrid.

---

## VAD (Voice Activity Detection) Scores

**New Feature** (April 2025): ElevenLabs now provides real-time VAD scores

### What It Is

VAD scores indicate the probability that the user is speaking:
- **Range**: 0 to 1
- **0.0**: No speech detected
- **0.5+**: Likely speaking
- **0.9+**: High confidence speaking

### How to Enable

**Step 1: Dashboard Configuration**
1. Open ElevenLabs dashboard → Agents → Your Agent
2. Navigate to **Advanced** tab
3. Enable "Send VAD Scores to Client"

**Step 2: React SDK Integration**

```typescript
const conversation = useConversation({
  agentId: 'your-agent-id',

  // VAD callbacks
  onVadScore: (score: number) => {
    console.log('VAD score:', score);

    const isSpeaking = score > 0.5;  // Threshold
    setIsUserSpeaking(isSpeaking);
  },

  onInterruption: () => {
    console.log('User interrupted agent');
    // Handle interruption (e.g., stop agent audio)
  }
});
```

### Recommended Thresholds

```typescript
// Conservative (fewer false positives)
const THRESHOLD_CONSERVATIVE = 0.65;

// Balanced (recommended for most use cases)
const THRESHOLD_BALANCED = 0.5;

// Sensitive (catches quiet speech, more false positives)
const THRESHOLD_SENSITIVE = 0.35;
```

### Common Use Cases

**1. Speaking Indicator UI**
```typescript
onVadScore: (score: number) => {
  setUserSpeaking(score > 0.5);
  setVadConfidence(score);  // For visual strength
}
```

**2. Audio Level Replacement**

```typescript
// ❌ OLD: Manual Web Audio API analysis
const analyser = audioContext.createAnalyser();
// Complex amplitude calculation...

// ✅ NEW: Use VAD scores directly
onVadScore: (score: number) => {
  setAudioLevel(score);  // Already normalized 0-1
}
```

**3. Interruption Handling**

```typescript
onInterruption: () => {
  // Stop agent audio immediately
  conversation.endSession();

  // Show interruption feedback
  showToast('Agent interrupted');
}
```

### Gotchas

**1. Event Must Be Enabled**
- If callback set but not firing → Check dashboard Advanced tab
- Event is **disabled by default** (for backward compatibility)

**2. Latency Considerations**
- VAD scores arrive ~50-100ms after speech detection
- For real-time visualizations, add smoothing:

```typescript
let smoothedVad = 0;
const SMOOTHING = 0.3;

onVadScore: (score: number) => {
  smoothedVad = (1 - SMOOTHING) * score + SMOOTHING * smoothedVad;
  setDisplayScore(smoothedVad);
}
```

**3. Background Noise**
- VAD can trigger on background noise (TV, music, etc.)
- Tune threshold based on expected environment
- Consider adding "noise gate" logic:

```typescript
onVadScore: (score: number) => {
  // Only count as speaking if sustained above threshold
  if (score > 0.5) {
    speakingFrames++;
  } else {
    speakingFrames = 0;
  }

  const isSpeaking = speakingFrames > 3;  // ~300ms sustained
}
```

**4. Works in Both Modes**
- VAD available in **WebRTC** (voice mode)
- VAD available in **WebSocket** (text mode with microphone)
- Not available when mic is disabled

### Benefits Over Manual Analysis

| Approach | VAD Scores | Manual Audio Analysis |
|----------|------------|----------------------|
| Accuracy | High (ML-based) | Medium (amplitude-based) |
| CPU Usage | None (server-side) | High (client FFT) |
| Noise Handling | Excellent | Poor |
| Setup | 1 callback | ~50 lines of Web Audio API |
| Latency | ~50-100ms | ~10-30ms |

**Recommendation**: Use VAD for speaking detection, keep manual analysis only for audio level visualization if needed.

---

## Key Gotchas Summary

| Gotcha | Impact | Solution |
|--------|--------|----------|
| Only voice_id in overrides | Can't change speed dynamically | Update agent config + restart |
| camelCase vs snake_case | Silent failures | SDK: camelCase, API: snake_case |
| Security toggle required | Overrides ignored | Enable in dashboard |
| Config update race condition | Old config used | Add 500ms delay |
| textOnly needs both flags | Still billed for audio | Set SDK + override flags |
| stability sweet spots | Poor voice quality | Use 0.65-0.75 for most cases |
| similarity_boost > 0.85 | Audio distortion | Keep at 0.75-0.85 |
| Voice language mismatch | Quality degradation | Validate language match |
| VAD not firing | Missing event | Enable in dashboard Advanced tab |
| VAD background noise | False positives | Tune threshold or add noise gate |

---

## Documentation Links (Reference Only)

- **API Reference**: https://elevenlabs.io/docs/api-reference/agents/create
- **Overrides**: https://elevenlabs.io/docs/agents-platform/customization/personalization/overrides
- **Complete Index**: [docs-index.md](./docs-index.md)

---

**Focus**: Non-obvious gotchas and edge cases
**Last Updated**: January 2026
