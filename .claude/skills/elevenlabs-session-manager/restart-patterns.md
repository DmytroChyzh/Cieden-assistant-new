# Session Restart Patterns

Universal restart scenarios and implementation patterns for any ElevenLabs integration.

## Pattern Catalog

### 1. Instant Voice Switch Pattern

**Scenario**: User selects different voice from dropdown

**User Expectation**: Immediate switch, no interruption

**Implementation**:
```typescript
const handleVoiceChange = async (voiceId: string) => {
  // Update UI immediately (optimistic)
  updateSettings({ voice: voiceId });

  // Show subtle indicator
  setIsTransitioning(true);

  try {
    // Quick restart with override
    await restartWithVoice(voiceId);

    // Success feedback
    toast.success(`Voice changed to ${getVoiceName(voiceId)}`);
  } catch (error) {
    // Revert UI
    updateSettings({ voice: previousVoiceId });
    toast.error('Could not change voice');
  } finally {
    setIsTransitioning(false);
  }
};
```

**Timing**: ~500ms
**User Impact**: Minimal, voice changes mid-conversation

---

### 2. Settings Apply Pattern

**Scenario**: User adjusts speed/stability sliders, clicks "Apply"

**User Expectation**: Changes take effect, brief pause acceptable

**Implementation**:
```typescript
const handleApplySettings = async () => {
  // Show clear feedback
  setRestartStage('updating');
  toast.loading('Updating voice settings...', { id: 'apply' });

  try {
    // Capture state
    const snapshot = captureSessionSnapshot();

    // Update config
    await updateAgentConfig({
      speed: settings.speed,
      stability: settings.stability,
      similarity_boost: settings.similarity
    });

    setRestartStage('disconnecting');

    // Restart session
    await conversation.endSession();
    await waitForDisconnect();

    setRestartStage('connecting');

    await conversation.startSession({
      agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
      connectionType: sessionMode === 'voice' ? 'webrtc' : 'websocket'
    });

    // Restore context
    await restoreSessionSnapshot(snapshot);

    toast.success('Settings applied!', { id: 'apply' });
  } catch (error) {
    toast.error('Failed to apply settings', { id: 'apply' });
  } finally {
    setRestartStage(null);
  }
};
```

**Timing**: ~2-3s
**User Impact**: Moderate, clear progress indicators

---

### 3. Profile Quick Switch Pattern

**Scenario**: User taps preset profile (Professional, Casual, etc.)

**User Expectation**: Instant switch to preset configuration

**Implementation**:
```typescript
const voiceProfiles = {
  professional: {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    speed: 1.0,
    stability: 0.7,
    similarity: 0.8
  },
  casual: {
    voiceId: 'AZnzlk1XvdvUeBnXmlld',
    speed: 1.1,
    stability: 0.5,
    similarity: 0.75
  }
};

const switchProfile = async (profileName: string) => {
  const profile = voiceProfiles[profileName];

  // Optimistic UI update
  updateSettings(profile);

  try {
    // Check if only voice changed
    const onlyVoiceChanged =
      profile.speed === currentSettings.speed &&
      profile.stability === currentSettings.stability;

    if (onlyVoiceChanged) {
      // Quick switch
      await restartWithVoice(profile.voiceId);
    } else {
      // Full restart with hybrid approach
      await hybridRestart(profile);
    }

    toast.success(`Switched to ${profileName} profile`);
  } catch (error) {
    // Revert
    updateSettings(previousSettings);
    toast.error('Could not switch profile');
  }
};
```

**Timing**: 500ms (voice only) or 2s (full config)
**User Impact**: Low, smart optimization

---

### 4. Error Recovery Pattern

**Scenario**: Connection lost, user clicks "Reconnect"

**User Expectation**: Restore session to working state

**Implementation**:
```typescript
const recoverFromError = async () => {
  toast.loading('Reconnecting...', { id: 'recover' });

  try {
    // Force cleanup
    if (conversation.status !== 'disconnected') {
      try {
        await conversation.endSession();
      } catch {}
    }

    clearAudioStreams();
    resetConnectionState();

    // Start fresh with current settings
    await conversation.startSession({
      agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
      connectionType: sessionMode === 'voice' ? 'webrtc' : 'websocket',
      overrides: {
        tts: {
          voiceId: settings.voice
        }
      }
    });

    toast.success('Reconnected!', { id: 'recover' });
  } catch (error) {
    toast.error('Could not reconnect. Please refresh.', { id: 'recover' });
  }
};
```

**Timing**: ~2-3s
**User Impact**: High (already in error state)

---

### 5. Smooth Transition Pattern

**Scenario**: User changes settings while agent is speaking

**User Expectation**: Current speech finishes, then settings apply

**Implementation**:
```typescript
const deferredRestart = async (settings: VoiceSettings) => {
  // Queue restart
  setPendingRestart(settings);

  // Show indicator
  toast('Settings will apply after current response', {
    icon: '⏳',
    duration: 3000
  });

  // Wait for speech to finish
  await waitForSpeechComplete();

  // Apply restart
  if (pendingRestart) {
    await restartWithConfig(pendingRestart);
    setPendingRestart(null);
  }
};

const waitForSpeechComplete = (): Promise<void> => {
  return new Promise(resolve => {
    const checkSpeech = () => {
      const audioElements = document.querySelectorAll('audio');
      const isPlaying = Array.from(audioElements).some(audio => !audio.paused);

      if (!isPlaying) {
        resolve();
      } else {
        setTimeout(checkSpeech, 500);
      }
    };

    checkSpeech();
  });
};
```

**Timing**: Variable (depends on speech length)
**User Impact**: Low, respects conversation flow

---

### 6. Batch Update Pattern

**Scenario**: User changes multiple settings in quick succession

**User Expectation**: All changes apply together, single restart

**Implementation**:
```typescript
const useBatchedRestart = () => {
  const [pendingSettings, setPendingSettings] = useState<Partial<VoiceSettings> | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const queueSettingChange = (updates: Partial<VoiceSettings>) => {
    // Accumulate changes
    setPendingSettings(prev => ({ ...prev, ...updates }));

    // Reset debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Apply after 2s of no changes
    debounceTimer.current = setTimeout(() => {
      if (pendingSettings) {
        applyBatchedSettings(pendingSettings);
        setPendingSettings(null);
      }
    }, 2000);
  };

  const applyBatchedSettings = async (settings: Partial<VoiceSettings>) => {
    toast.loading('Applying changes...', { id: 'batch' });

    try {
      await restartWithConfig(settings);
      toast.success(`${Object.keys(settings).length} settings updated`, { id: 'batch' });
    } catch (error) {
      toast.error('Failed to apply changes', { id: 'batch' });
    }
  };

  return { queueSettingChange };
};
```

**Timing**: Debounced (2s after last change)
**User Impact**: Very low, smart batching

---

### 7. Background Update Pattern

**Scenario**: Admin updates agent config via dashboard/CLI

**User Expectation**: Changes apply on next session

**Implementation**:
```typescript
// Poll for config changes (optional)
useEffect(() => {
  const pollInterval = setInterval(async () => {
    const latestConfig = await fetchAgentConfig();

    if (hasConfigChanged(currentConfig, latestConfig)) {
      // Show notification
      toast.info(
        <div>
          <p>New voice settings available</p>
          <button onClick={applyConfigUpdate}>Apply Now</button>
        </div>,
        { duration: Infinity }
      );
    }
  }, 60000); // Check every minute

  return () => clearInterval(pollInterval);
}, []);

const applyConfigUpdate = async () => {
  // Restart with latest config
  await restartWithConfig(latestConfig);
};
```

**Timing**: User-controlled
**User Impact**: None (opt-in)

---

## Pattern Selection Matrix

| User Action | Settings Changed | Pattern | Timing | Interruption |
|-------------|------------------|---------|--------|--------------|
| Select voice | voice_id only | Instant Switch | ~500ms | Minimal |
| Adjust speed slider | speed | Settings Apply | ~2-3s | Moderate |
| Tap profile preset | multiple | Quick Switch | ~500ms-2s | Low |
| Click "Apply" | multiple | Settings Apply | ~2-3s | Moderate |
| Connection error | N/A | Error Recovery | ~2-3s | High |
| Change while speaking | any | Smooth Transition | Variable | None |
| Rapid changes | multiple | Batch Update | ~2s debounce | None |
| Admin update | any | Background | User choice | None |

## UI Component Examples

### Restart Button
```tsx
<Button
  onClick={handleApplySettings}
  disabled={!hasChanges || isTransitioning}
  className="relative"
>
  {isTransitioning ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin mr-2" />
      Applying...
    </>
  ) : (
    <>
      <Check className="w-4 h-4 mr-2" />
      Apply Changes
    </>
  )}
</Button>
```

### Profile Selector
```tsx
<div className="grid grid-cols-2 gap-2">
  {Object.entries(voiceProfiles).map(([name, profile]) => (
    <Button
      key={name}
      onClick={() => switchProfile(name)}
      variant={currentProfile === name ? 'default' : 'outline'}
    >
      {name}
    </Button>
  ))}
</div>
```

### Pending Changes Indicator
```tsx
{hasChanges && !isTransitioning && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg"
  >
    <AlertCircle className="w-4 h-4 inline mr-2" />
    Restart to apply changes
  </motion.div>
)}
```

## Best Practices

1. **Always provide feedback**: Users should know when changes apply
2. **Use appropriate strategy**: Quick switch when possible, full restart when needed
3. **Preserve context**: Save conversation state before restart
4. **Handle errors gracefully**: Provide fallback and retry logic
5. **Respect conversation flow**: Don't interrupt agent mid-speech
6. **Batch rapid changes**: Avoid multiple restarts in short time
7. **Show progress**: Clear indicators during restart
8. **Test cross-tab**: Ensure restarts coordinate across tabs

## Testing

```typescript
// Test instant switch
test('instant voice switch', async () => {
  await handleVoiceChange('new_voice_id');
  expect(elapsedTime).toBeLessThan(1000);
});

// Test batch update
test('batch update debounce', async () => {
  queueSettingChange({ speed: 1.1 });
  queueSettingChange({ stability: 0.7 });
  queueSettingChange({ similarity: 0.8 });

  // Should only restart once
  await waitFor(3000);
  expect(restartCount).toBe(1);
});

// Test smooth transition
test('defer restart during speech', async () => {
  // Start agent speaking
  simulateAgentSpeech();

  // Change settings
  await deferredRestart({ speed: 1.2 });

  // Should wait for speech
  expect(restartCalled).toBe(false);

  // After speech ends
  await waitForSpeechComplete();
  expect(restartCalled).toBe(true);
});
```
