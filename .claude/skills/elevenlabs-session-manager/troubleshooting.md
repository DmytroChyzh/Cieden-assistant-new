# Session Restart Troubleshooting Guide

Universal debug guide for common ElevenLabs session restart issues.

## Diagnostic Checklist

### Quick Health Check

Run through this checklist when restart issues occur:

```typescript
const diagnoseRestartIssue = () => {
  console.log('🔍 Session Restart Diagnostics');
  console.log('================================');

  // 1. Connection Status
  console.log('Connection Status:', conversation.status);
  console.log('Session Mode:', sessionMode);
  console.log('Is Transitioning:', isTransitioning);

  // 2. Environment
  console.log('Agent ID:', process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
  console.log('API Key:', process.env.ELEVENLABS_API_KEY ? 'Present' : 'Missing');

  // 3. State
  console.log('Voice Settings:', currentSettings);
  console.log('Pending Changes:', hasChanges);

  // 4. Cross-Tab
  console.log('Tab ID:', tabId);
  console.log('Other Tab Active:', isOtherTabActive);
  console.log('Session Lock:', localStorage.getItem('elevenlabs_session_lock'));

  // 5. Audio
  const audioElements = document.querySelectorAll('audio');
  console.log('Active Audio Elements:', audioElements.length);
  audioElements.forEach((audio, i) => {
    console.log(`  Audio ${i}:`, { src: audio.src, paused: audio.paused });
  });

  // 6. Recent Errors
  console.log('Last Error:', lastError);
};
```

Run in browser console to diagnose issues.

---

## Common Issues

### Issue 1: "Restart takes too long (>5s)"

**Symptoms**:
- Loading indicator shows for extended time
- Eventually times out
- User sees "Failed to restart"

**Possible Causes**:
1. Network latency
2. Agent config not synced
3. Audio streams not cleaned up
4. Connection state stuck

**Diagnosis**:
```typescript
// Check network
console.time('get-signed-url');
const url = await fetch('/api/elevenlabs/signed-url');
console.timeEnd('get-signed-url'); // Should be <500ms

// Check audio cleanup
const audioCount = document.querySelectorAll('audio').length;
console.log('Active audio elements:', audioCount); // Should be 0 before restart

// Check connection state
console.log('Previous status:', previousStatus);
console.log('Current status:', conversation.status);
```

**Solutions**:
```typescript
// Solution 1: Force cleanup before restart
const forceCleanup = async () => {
  // Stop all audio
  document.querySelectorAll('audio').forEach(audio => {
    audio.pause();
    audio.src = '';
    audio.remove();
  });

  // Force disconnect
  if (conversation.status !== 'disconnected') {
    conversation.endSession();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Clear state
  stopAllAudioStreams();
  resetConnectionState();
};

// Solution 2: Add shorter timeout with retry
const restartWithTimeout = async (settings: VoiceSettings) => {
  const timeout = 3000; // 3s timeout

  const restartPromise = restartWithConfig(settings);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Restart timeout')), timeout)
  );

  try {
    await Promise.race([restartPromise, timeoutPromise]);
  } catch (error) {
    if (error.message === 'Restart timeout') {
      // Force cleanup and retry
      await forceCleanup();
      await restartWithConfig(settings); // Retry once
    } else {
      throw error;
    }
  }
};
```

---

### Issue 2: "Voice override not working"

**Symptoms**:
- Voice_id changed but voice sounds the same
- No error messages
- Restart appears successful

**Possible Causes**:
1. Override not enabled in agent security settings
2. Override syntax incorrect
3. Voice_id doesn't exist
4. Wrong conversation instance

**Diagnosis**:
```bash
# Check agent config
curl "https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}"

# Look for security settings
# "allow_voice_override": true should be present

# Check if voice exists
curl "https://api.elevenlabs.io/v1/voices/${VOICE_ID}" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}"
```

**Solutions**:
```typescript
// Solution 1: Enable override in dashboard
// Go to: ElevenLabs Dashboard → Agent → Security → Enable "Voice ID Override"

// Solution 2: Verify override syntax
const conversation = useConversation({
  overrides: {
    tts: {
      voiceId: voiceId  // Must be 'voiceId', not 'voice_id'
    }
  }
});

// Solution 3: Log override being sent
await conversation.startSession({
  agentId,
  connectionType: 'webrtc',
  overrides: {
    tts: {
      voiceId: newVoiceId
    }
  }
});
console.log('🎤 Started session with voice override:', newVoiceId);

// Solution 4: Validate voice_id before override
const validateVoiceId = async (voiceId: string): Promise<boolean> => {
  const voices = await fetchVoices();
  return voices.some(v => v.voice_id === voiceId);
};
```

---

### Issue 3: "Conversation context lost after restart"

**Symptoms**:
- Agent forgets previous conversation
- Dynamic variables reset
- User has to re-introduce themselves

**Possible Causes**:
1. Snapshot not captured
2. Restore logic not called
3. Wrong conversation_id
4. Dynamic variables not preserved

**Diagnosis**:
```typescript
// Before restart
const beforeSnapshot = {
  conversationId: currentConversationId,
  messageCount: messages.length,
  dynamicVars: getCurrentDynamicVariables()
};
console.log('Before restart:', beforeSnapshot);

// After restart
const afterSnapshot = {
  conversationId: currentConversationId,
  messageCount: messages.length,
  dynamicVars: getCurrentDynamicVariables()
};
console.log('After restart:', afterSnapshot);

// Compare
console.log('Context preserved:', {
  sameConversation: beforeSnapshot.conversationId === afterSnapshot.conversationId,
  messagesDelta: afterSnapshot.messageCount - beforeSnapshot.messageCount,
  varsDelta: Object.keys(afterSnapshot.dynamicVars).length - Object.keys(beforeSnapshot.dynamicVars).length
});
```

**Solutions**:
```typescript
// Solution 1: Implement snapshot/restore
const restartWithContextPreservation = async (settings: VoiceSettings) => {
  // Capture state
  const snapshot = {
    conversationId: currentConversationId,
    dynamicVariables: getCurrentDynamicVariables(),
    lastMessages: messages.slice(-5) // Last 5 messages
  };

  // Restart
  await restartWithConfig(settings);

  // Restore conversation_id
  setCurrentConversationId(snapshot.conversationId);

  // Restore dynamic variables via override
  if (Object.keys(snapshot.dynamicVariables).length > 0) {
    // Send contextual update
    await conversation.sendUserMessage(
      `[Context: ${JSON.stringify(snapshot.dynamicVariables)}]`
    );
  }
};

// Solution 2: Use Convex to persist context
const saveContextToConvex = async (conversationId: string) => {
  await convex.mutation(api.conversations.saveContext, {
    conversationId,
    context: {
      dynamicVariables: getCurrentDynamicVariables(),
      lastMessageId: messages[messages.length - 1]?.id
    }
  });
};

const restoreContextFromConvex = async (conversationId: string) => {
  const context = await convex.query(api.conversations.getContext, {
    conversationId
  });

  if (context) {
    // Restore state
    setDynamicVariables(context.dynamicVariables);
  }
};
```

---

### Issue 4: "Duplicate sessions created"

**Symptoms**:
- Two audio streams playing simultaneously
- Double billing
- Cross-tab coordination not working

**Possible Causes**:
1. Session lock not acquired
2. Previous session not fully disconnected
3. Multiple tabs calling restart simultaneously
4. Race condition in connection logic

**Diagnosis**:
```typescript
// Check session lock
const lock = localStorage.getItem('elevenlabs_session_lock');
console.log('Session Lock:', lock ? JSON.parse(lock) : 'None');

// Check active sessions
console.log('Tab ID:', tabId);
console.log('Is Other Tab Active:', isOtherTabActive);
console.log('Session Mode:', sessionMode);

// Check audio elements
const audioElements = document.querySelectorAll('audio');
console.log('Audio Elements:', audioElements.length); // Should be 0 or 1
```

**Solutions**:
```typescript
// Solution 1: Enforce single session via lock
const restartWithLockEnforcement = async (settings: VoiceSettings) => {
  // Check if another tab has lock
  if (isOtherTabActive) {
    throw new Error('Another tab has an active session');
  }

  // Try acquire lock
  const lockAcquired = tryAcquireSessionLock(tabId, sessionMode);
  if (!lockAcquired) {
    throw new Error('Could not acquire session lock');
  }

  try {
    // Ensure previous session is fully disconnected
    await ensureFullyDisconnected();

    // Restart
    await restartWithConfig(settings);
  } finally {
    // Lock held until next disconnect
  }
};

// Solution 2: Wait for full disconnect with verification
const ensureFullyDisconnected = async (maxWait: number = 10000) => {
  const startTime = Date.now();

  while (true) {
    // Check all disconnect conditions
    const isFullyDisconnected =
      conversation.status === 'disconnected' &&
      document.querySelectorAll('audio').length === 0 &&
      !isTextConnectedRef.current &&
      voiceConnectionStateRef.current === 'disconnected';

    if (isFullyDisconnected) {
      console.log('✅ Fully disconnected, safe to restart');
      return;
    }

    if (Date.now() - startTime > maxWait) {
      console.warn('⚠️ Timeout waiting for full disconnect, forcing cleanup');
      // Force cleanup
      stopAllAudioStreams();
      resetConnectionState();
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }
};
```

---

### Issue 5: "Agent config changes not applying"

**Symptoms**:
- Speed/stability changes don't take effect
- Voice sounds the same after restart
- No errors shown

**Possible Causes**:
1. Agent config not pushed to ElevenLabs
2. Restarted with wrong agent_id
3. CLI sync failed silently
4. Cached config

**Diagnosis**:
```bash
# Check local config
cat agent_configs/prod/support_agent.json

# Check remote config
curl "https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" | jq '.conversation_config.tts'

# Check CLI status
agents status

# Check last push time
agents list --format json | jq '.[] | {name, last_updated}'
```

**Solutions**:
```typescript
// Solution 1: Verify config push
const updateAgentConfigWithVerification = async (settings: VoiceSettings) => {
  // Update local config
  const configPath = 'agent_configs/prod/support_agent.json';
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  config.conversation_config.tts = {
    ...config.conversation_config.tts,
    speed: settings.speed,
    stability: settings.stability,
    similarity_boost: settings.similarity
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Push to ElevenLabs
  await runCommand('agents push');

  // Verify push succeeded
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for API

  const remoteConfig = await fetchAgentConfig(agentId);
  const pushSucceeded =
    remoteConfig.tts.speed === settings.speed &&
    remoteConfig.tts.stability === settings.stability;

  if (!pushSucceeded) {
    throw new Error('Config push verification failed');
  }

  console.log('✅ Config verified on remote');
};

// Solution 2: Use API directly (bypass CLI)
const updateViaAPI = async (settings: VoiceSettings) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      method: 'PATCH',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_config: {
          tts: {
            speed: settings.speed,
            stability: settings.stability,
            similarity_boost: settings.similarity
          }
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`API update failed: ${response.statusText}`);
  }

  console.log('✅ Config updated via API');
};
```

---

## Error Messages Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| "Failed to acquire session lock" | Another tab is active | Close other tabs or release lock |
| "Restart timeout" | Took too long | Force cleanup and retry |
| "Voice override not enabled" | Security setting disabled | Enable in dashboard |
| "Connection already exists" | Duplicate session | Ensure full disconnect |
| "Invalid voice_id" | Voice doesn't exist | Validate before restart |
| "Config push failed" | CLI/API error | Check credentials, retry |

## Debug Mode

Enable verbose logging:

```typescript
// Add to ElevenLabsProvider
const DEBUG_MODE = process.env.NODE_ENV !== 'production';

const log = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log('[ElevenLabs]', ...args);
  }
};

// Use throughout restart logic
log('🔄 Starting restart with settings:', settings);
log('📡 Current status:', conversation.status);
log('✅ Restart complete');
```

## Performance Monitoring

Track restart performance:

```typescript
const monitorRestart = async (
  restartFn: () => Promise<void>
) => {
  const startTime = performance.now();
  const metrics = {
    startTime,
    stages: {} as Record<string, number>
  };

  try {
    // Mark stages
    console.time('disconnect');
    await conversation.endSession();
    console.timeEnd('disconnect');
    metrics.stages.disconnect = performance.now() - startTime;

    console.time('cleanup');
    clearAudioStreams();
    console.timeEnd('cleanup');
    metrics.stages.cleanup = performance.now() - startTime;

    console.time('reconnect');
    await conversation.startSession({...});
    console.timeEnd('reconnect');
    metrics.stages.reconnect = performance.now() - startTime;

    // Total time
    const totalTime = performance.now() - startTime;
    console.log('📊 Restart Metrics:', {
      total: `${totalTime.toFixed(0)}ms`,
      stages: metrics.stages
    });

    // Alert if slow
    if (totalTime > 3000) {
      console.warn('⚠️ Slow restart detected:', totalTime);
    }
  } catch (error) {
    console.error('❌ Restart failed:', error, metrics);
    throw error;
  }
};
```

## Testing Utilities

```typescript
// Simulate restart scenarios
const testRestart = {
  // Test quick voice switch
  quickSwitch: async () => {
    const before = conversation.status;
    await restartWithVoice('test_voice_id');
    const after = conversation.status;
    console.assert(after === 'connected', 'Should reconnect');
  },

  // Test full restart
  fullRestart: async () => {
    const before = performance.now();
    await restartWithConfig({ speed: 1.2 });
    const elapsed = performance.now() - before;
    console.assert(elapsed < 3000, 'Should complete in <3s');
  },

  // Test error recovery
  errorRecovery: async () => {
    // Simulate error
    conversation.endSession(); // Don't await
    await new Promise(r => setTimeout(r, 100));

    // Should recover
    await recoverFromError();
    console.assert(conversation.status === 'connected', 'Should recover');
  }
};

// Run all tests
Object.entries(testRestart).forEach(([name, fn]) => {
  console.log(`🧪 Testing ${name}...`);
  fn().then(() => console.log(`✅ ${name} passed`))
       .catch(e => console.error(`❌ ${name} failed:`, e));
});
```

## Support Resources

- **Session Lock Docs**: [../utils/crossTabSession.ts](../utils/crossTabSession.ts)
- **Provider Implementation**: [ElevenLabsProvider.tsx](../../src/providers/ElevenLabsProvider.tsx)
- **Voice Settings Skill**: [../elevenlabs-voice-settings/skill.md](../elevenlabs-voice-settings/skill.md)
- **ElevenLabs Support**: https://help.elevenlabs.io/

---

**Last Updated**: January 2026
**Maintained by**: FinPilot Development Team
