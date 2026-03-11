# Waveform Visualization Architecture

**Last Updated**: January 17, 2025
**Status**: Production (SDK-Native Implementation)

## Overview

FinPilot's waveform visualization provides real-time visual feedback for voice interactions by displaying audio amplitude for both user speech and agent responses. The system uses **ElevenLabs React SDK native methods** to extract audio data without custom Web Audio API implementation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ElevenLabs React SDK                         │
│  ┌────────────────────┐         ┌─────────────────────────┐   │
│  │  onVadScore        │         │ getOutputByteFrequency  │   │
│  │  (User Audio)      │         │ Data() (Agent Audio)    │   │
│  └─────────┬──────────┘         └──────────┬──────────────┘   │
└────────────┼───────────────────────────────┼──────────────────┘
             │                               │
             │ Real-time callbacks           │ 150ms polling
             │ (0-1 VAD score)              │ (Uint8Array freq data)
             ▼                               ▼
┌────────────────────────────────────────────────────────────────┐
│              ElevenLabsProvider (Context Layer)                │
│  ┌──────────────────────┐    ┌──────────────────────────────┐ │
│  │ State:               │    │ Methods:                      │ │
│  │ - vadScore           │    │ - registerVadHandler()        │ │
│  │ - isUserSpeakingVAD  │    │ - conversation ref            │ │
│  └──────────────────────┘    └──────────────────────────────┘ │
└────────────┬───────────────────────────────┬──────────────────┘
             │                               │
             │ Context API                   │ Ref access
             ▼                               ▼
┌────────────────────────────────────────────────────────────────┐
│                useVoiceRecording Hook                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ User Audio Flow:                                         │ │
│  │ 1. Read from context: vadScore, isUserSpeakingVAD       │ │
│  │ 2. No processing needed (SDK provides 0-1 normalized)   │ │
│  │                                                          │ │
│  │ Agent Audio Flow (NEW - SDK Native):                    │ │
│  │ 1. Poll conversation.getOutputByteFrequencyData() @150ms│ │
│  │ 2. Calculate: avg = sum(frequencies) / length           │ │
│  │ 3. Normalize: level = min(avg / 128, 1)                 │ │
│  │ 4. Callback: onAgentAudioLevel(level)                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────┬───────────────────────────────┬──────────────────┘
             │                               │
             │ Props                         │ Callback
             ▼                               ▼
┌────────────────────────────────────────────────────────────────┐
│           UnifiedChatInput / MobileUnifiedChatInput            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ State:                                                   │ │
│  │ - agentAudioLevel (from callback)                       │ │
│  │ - userVadScore (from context)                           │ │
│  │ - isUserSpeakingVAD (from context)                      │ │
│  │                                                          │ │
│  │ Effect: onVoiceAudioUpdate callback                     │ │
│  │ → Passes (isUserSpeaking, userVad, agentLevel) to parent│ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────┬───────────────────────────────────────────────────┘
             │
             │ onVoiceAudioUpdate callback
             ▼
┌────────────────────────────────────────────────────────────────┐
│                    VoiceChatPage / Parent                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ State:                                                   │ │
│  │ - isUserSpeaking                                         │ │
│  │ - userAudioLevel                                         │ │
│  │ - agentAudioLevel                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────┬───────────────────────────────────────────────────┘
             │
             │ Props
             ▼
┌────────────────────────────────────────────────────────────────┐
│                    SpeakingHUD Component                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Renders: WaveformIndicator (left) + WaveformIndicator    │ │
│  │          (right)                                         │ │
│  │                                                          │ │
│  │ Props passed:                                            │ │
│  │ - Left:  audioLevel={agentAudioLevel}                   │ │
│  │ - Right: audioLevel={userAudioLevel}                    │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

## Data Sources

### User Audio (SDK VAD - Voice Activity Detection)

**Source**: ElevenLabs SDK `onVadScore` callback
**Location**: [ElevenLabsProvider.tsx:658-683](../src/providers/ElevenLabsProvider.tsx#L658-683)

```typescript
onVadScore: (score: number) => {
  if (sessionModeRef.current !== 'voice' || isUnmountingRef.current) return;

  const delta = Math.abs(score - lastVadScoreRef.current);
  const isSpeaking = score > VAD_THRESHOLD; // 0.5 threshold

  // Update state with throttling (delta > 0.02)
  if (delta > 0.02) {
    setVadScore(score);
    lastVadScoreRef.current = score;
  }

  if (lastIsSpeakingRef.current !== isSpeaking) {
    setIsUserSpeakingVAD(isSpeaking);
    lastIsSpeakingRef.current = isSpeaking;
  }

  // Emit to registered VAD handlers (optional additional listeners)
  vadHandlersRef.current.forEach(handler => {
    handler(score, isSpeaking);
  });
}
```

**Data Format**:
- **Type**: `number` (0-1 scale)
- **Update Frequency**: Real-time callbacks from SDK (throttled with 0.02 delta)
- **Threshold**: 0.5 for speaking detection
- **Context Exposure**: `vadScore` and `isUserSpeakingVAD` state

### Agent Audio (SDK Frequency Data)

**Source**: ElevenLabs SDK `conversation.getOutputByteFrequencyData()`
**Location**: [useVoiceRecording.ts:205-236](../src/components/unified/hooks/useVoiceRecording.ts#L205-236)

```typescript
// Voice status monitoring (agent speaking state + audio level)
useEffect(() => {
  if (!isRecording || conversation.status !== 'connected') return;

  const interval = setInterval(() => {
    const conv = conversationRef.current;
    if (conv) {
      // Track agent speaking state from SDK
      const isSpeaking = conv.isSpeaking || false;
      setVoiceStatus(isSpeaking ? 'speaking' : 'listening');

      // Get agent audio level from SDK (uses Web Audio API internally)
      if (typeof conv.getOutputByteFrequencyData === 'function') {
        const frequencyData = conv.getOutputByteFrequencyData();
        if (frequencyData && frequencyData.length > 0) {
          // Calculate average amplitude (same math as Web Audio API analyzers)
          let sum = 0;
          for (let i = 0; i < frequencyData.length; i++) {
            sum += frequencyData[i];
          }
          const average = sum / frequencyData.length;
          const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1

          // Notify parent component
          onAgentAudioLevel?.(normalizedLevel);
        }
      }
    }
  }, 150); // Poll every 150ms

  return () => clearInterval(interval);
}, [isRecording, conversation.status]);
```

**Data Format**:
- **Raw Type**: `Uint8Array` (frequency bins from Web Audio API AnalyserNode)
- **Processed Type**: `number` (0-1 scale, averaged amplitude)
- **Update Frequency**: 150ms polling interval
- **Algorithm**: Average of all frequency bins, normalized by dividing by 128
- **Callback**: `onAgentAudioLevel(level)` to parent component

## Data Flow Path

### 1. SDK → Provider (User Audio)

```typescript
// ElevenLabs SDK invokes callback
onVadScore: (score: number) => {
  setVadScore(score);              // Update context state
  setIsUserSpeakingVAD(isSpeaking); // Update boolean state
}

// Exposed via context
const { vadScore, isUserSpeakingVAD } = useElevenLabsConversation();
```

### 2. SDK → Hook (Agent Audio)

```typescript
// Polling in useVoiceRecording hook
const frequencyData = conversation.getOutputByteFrequencyData();
const average = sum / frequencyData.length;
const normalizedLevel = Math.min(average / 128, 1);
onAgentAudioLevel?.(normalizedLevel); // Callback to parent
```

### 3. Hook → Input Component

```typescript
// UnifiedChatInput.tsx
const [agentAudioLevel, setAgentAudioLevel] = useState(0);

const { ... } = useVoiceRecording({
  conversationId,
  onTranscript: (text) => onMessage?.(text, 'voice'),
  onStatusChange,
  onAgentAudioLevel: setAgentAudioLevel, // Receive agent audio updates
  actionHandlers
});

const { vadScore: userVadScore, isUserSpeakingVAD } = useElevenLabsConversation();
```

### 4. Input Component → Page

```typescript
// Effect to notify parent
useEffect(() => {
  if (onVoiceAudioUpdate) {
    // User: SDK VAD from provider, Agent: SDK getOutputByteFrequencyData()
    onVoiceAudioUpdate(isUserSpeakingVAD, userVadScore, agentAudioLevel);
  }
}, [onVoiceAudioUpdate, isUserSpeakingVAD, userVadScore, agentAudioLevel]);
```

### 5. Page → HUD

```typescript
// VoiceChatPage state
const [isUserSpeaking, setIsUserSpeaking] = useState(false);
const [userAudioLevel, setUserAudioLevel] = useState(0);
const [agentAudioLevel, setAgentAudioLevel] = useState(0);

// Callback handler
const handleVoiceAudioUpdate = (isUserSpeaking, userLevel, agentLevel) => {
  setIsUserSpeaking(isUserSpeaking);
  setUserAudioLevel(userLevel);
  setAgentAudioLevel(agentLevel);
};

// Pass to HUD
<SpeakingHUD
  voiceStatus={voiceStatus}
  isUserSpeaking={isUserSpeaking}
  isAgentSpeaking={isAgentSpeaking}
  userAudioLevel={userAudioLevel}
  agentAudioLevel={agentAudioLevel}
  settings={settings}
  anchorId="unified-chat-input-root"
/>
```

### 6. HUD → Waveform Indicators

```typescript
// SpeakingHUD renders two waveforms
<div className="absolute left-4">
  <WaveformIndicator
    audioLevel={agentAudioLevel}  // Agent audio (left side)
    quality="good"
    isVisible={true}
    isActive={agentAudioLevel > 0.01}
    side="left"
  />
</div>

<div className="absolute right-4">
  <WaveformIndicator
    audioLevel={userAudioLevel}   // User audio (right side)
    quality="good"
    isVisible={true}
    isActive={userAudioLevel > 0.01}
    side="right"
  />
</div>
```

## Key Files

### Core Implementation

| File | Role | Key Responsibilities |
|------|------|---------------------|
| [ElevenLabsProvider.tsx](../src/providers/ElevenLabsProvider.tsx) | Context Provider | - Wraps SDK `useConversation` hooks<br>- Exposes `vadScore` state for user audio<br>- Provides `conversation` ref for agent audio |
| [useVoiceRecording.ts](../src/components/unified/hooks/useVoiceRecording.ts) | Voice Hook | - Polls SDK for agent audio data<br>- Calculates agent audio level<br>- Invokes `onAgentAudioLevel` callback<br>- Tracks `isSpeaking` state |
| [UnifiedChatInput.tsx](../src/components/unified/UnifiedChatInput.tsx) | Input Component | - Receives agent audio via callback<br>- Reads user audio from context<br>- Aggregates and passes to parent |
| [MobileUnifiedChatInput.tsx](../src/components/unified/MobileUnifiedChatInput.tsx) | Mobile Input | Same as UnifiedChatInput (mobile variant) |

### Visualization Components

| File | Role | Key Responsibilities |
|------|------|---------------------|
| [SpeakingHUD.tsx](../src/components/voice/SpeakingHUD.tsx) | HUD Layout | - Positions waveforms (left/right)<br>- Shows/hides based on voice status<br>- Passes audio levels to indicators |
| [WaveformIndicator.tsx](../src/components/unified/WaveformIndicator.tsx) | Waveform UI | - Renders 5 animated bars<br>- Animates based on `audioLevel` prop<br>- Different styles for left/right sides |

### Parent Pages

| File | Role | Key Responsibilities |
|------|------|---------------------|
| [page.tsx](../app/voice-chat/page.tsx) | Voice Chat Page | - Manages audio level state<br>- Provides `onVoiceAudioUpdate` callback<br>- Renders SpeakingHUD |

## Important Implementation Details

### Dependency Array (Critical)

In [useVoiceRecording.ts:236](../src/components/unified/hooks/useVoiceRecording.ts#L236), the effect dependencies are:

```typescript
}, [isRecording, conversation.status]);
//                                     ⚠️ DO NOT add onAgentAudioLevel here!
```

**Why `onAgentAudioLevel` is NOT a dependency**:
- It's a callback we **call**, not state we **read**
- Adding it causes the effect to restart on every render
- This breaks voice status monitoring (interval gets cleared/recreated)
- Callbacks are optional (`?.()`) and stable anyway

### Normalization Algorithm

Both user and agent audio are normalized to 0-1 scale, but differently:

**User Audio (SDK VAD)**:
- Already normalized by SDK (0-1 range)
- No processing needed
- Threshold: 0.5 for speaking detection

**Agent Audio (Frequency Data)**:
```typescript
// Input: Uint8Array with values 0-255 per frequency bin
// Process: Average all bins
const average = sum / frequencyData.length; // 0-255 range
// Normalize: Divide by 128 (middle of 0-255) and cap at 1
const normalizedLevel = Math.min(average / 128, 1); // 0-1 range
```

### Update Frequencies

| Data Source | Frequency | Method |
|-------------|-----------|--------|
| User VAD | Real-time callbacks | SDK `onVadScore` (throttled delta > 0.02) |
| Agent Audio | 150ms polling | `setInterval` in effect |
| UI Updates | Frame-by-frame | React state + Framer Motion animations |

## Historical Context

### Previous Implementation (Removed)

**File**: `useAudioAnalysis.ts` (~280 lines) - **REMOVED**

Used custom Web Audio API implementation with:
- `AudioContext` management
- `createMediaElementSource()` for agent audio
- `createMediaStreamSource()` for user audio
- Module-level caching for sources
- Complex error handling for `InvalidStateError`

**Why Removed**:
- Over-engineered solution
- SDK already provides the data we need
- 95% code reduction (280 → 15 lines)
- Better maintainability (updates with SDK)

### Migration (January 2025)

**Before**:
```typescript
const { speakerLevel } = useAudioAnalysis({
  enableSpeakerAnalysis: voiceStatus === 'speaking'
});
```

**After**:
```typescript
const [agentAudioLevel, setAgentAudioLevel] = useState(0);
useVoiceRecording({
  onAgentAudioLevel: setAgentAudioLevel
});
```

## Debugging

### Console Logs

Key logs to watch:

```typescript
// ElevenLabsProvider.tsx - User VAD updates
console.log('VAD Score:', score, 'Speaking:', isSpeaking);

// useVoiceRecording.ts - Agent audio polling
console.log('Agent Audio Level:', normalizedLevel);

// UnifiedChatInput.tsx - Audio state updates
console.log('Audio Update:', { isUserSpeaking, userVad, agentLevel });
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No waveforms appear | Voice not connected | Check `conversation.status === 'connected'` |
| Waveforms don't animate | Audio level always 0 | Verify SDK polling is running (check console) |
| Voice recording broken | Dependency array wrong | Ensure `onAgentAudioLevel` NOT in dependencies |
| Jumpy/flickering waveforms | Update frequency too high | Check throttling (delta > 0.02 for VAD) |

### Testing Checklist

- [ ] User waveform (right) animates when speaking
- [ ] Agent waveform (left) animates during responses
- [ ] Waveforms match actual audio amplitude (not hardcoded)
- [ ] Works in both desktop and mobile views
- [ ] No errors in console
- [ ] Voice recording/playback works correctly

## Performance Considerations

### Optimization Strategies

1. **VAD Throttling**: Only update state when delta > 0.02 to reduce re-renders
2. **Polling Frequency**: 150ms provides smooth visualization without excessive CPU usage
3. **Conditional Rendering**: HUD only renders when `voiceStatus !== 'idle'`
4. **Framer Motion**: GPU-accelerated animations for waveform bars
5. **useCallback**: Stable callback references prevent unnecessary effect re-runs

### Resource Usage

- **CPU**: Minimal (150ms polling + averaging ~128 numbers)
- **Memory**: ~1KB (Uint8Array buffer + state)
- **Network**: None (data already in SDK)
- **GPU**: Framer Motion uses CSS transforms (GPU-accelerated)

## Future Enhancements

Potential improvements:

1. **Frequency Bands**: Instead of averaging all frequencies, visualize different bands (bass, mid, treble)
2. **Adaptive Polling**: Adjust polling frequency based on speaking state
3. **Peak Detection**: Track and display peak levels for more dynamic visualization
4. **Smoothing**: Apply exponential moving average for smoother transitions
5. **WebRTC Stats**: Integrate network quality indicators (packet loss, jitter)

## References

- [ElevenLabs React SDK Docs](https://elevenlabs.io/docs/agents-platform/libraries/react)
- [Web Audio API - AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [Framer Motion Animations](https://www.framer.com/motion/)
- [Voice Activity Detection (VAD)](https://en.wikipedia.org/wiki/Voice_activity_detection)

---

**Document Version**: 1.0
**Last Reviewed**: January 17, 2025
**Maintainer**: FinPilot Team
