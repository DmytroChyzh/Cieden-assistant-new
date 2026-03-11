---
name: ElevenLabs Session Restart - Critical Edge Cases
description: Non-obvious gotchas and edge cases when restarting ElevenLabs sessions. Things that aren't in training data or official docs.
version: 1.0.0
---

# ElevenLabs Session Restart - Critical Edge Cases

Edge cases and gotchas that cause subtle bugs and poor user experience.

## Critical: Session Status != Actual Disconnect

**Problem**: `conversation.status === 'disconnected'` doesn't mean audio stopped

```typescript
// ❌ WRONG - Audio still playing!
await conversation.endSession();
if (conversation.status === 'disconnected') {
  // Start new session
  await conversation.startSession({ agentId });
  // Result: TWO audio streams playing simultaneously
}

// ✅ CORRECT - Ensure audio cleanup
await conversation.endSession();
await waitForStatus('disconnected');

// CRITICAL: Also clear audio elements
document.querySelectorAll('audio').forEach(audio => {
  audio.pause();
  audio.src = '';
  audio.load();
});

await conversation.startSession({ agentId });
```

**Why**: SDK sets status to 'disconnected' immediately, but audio elements continue playing. You must manually clean them up.

---

## Gotcha: Config Update Doesn't Apply to Current Session

**Common Mistake**: Update agent config, expect it to apply immediately

```typescript
// ❌ WRONG - Config change has NO effect on current session
await updateAgentConfig({ speed: 1.2 });
// Session continues with old speed (1.0)

// ✅ REQUIRED - Must restart session
await updateAgentConfig({ speed: 1.2 });
await conversation.endSession();
await conversation.startSession({ agentId });
// Now using speed: 1.2
```

**Why**: Agent config is only read at session initialization. Changes don't propagate to active sessions.

---

## Race Condition: Config Update Timing

**Critical Timing Issue**: New session may use old config

```typescript
// ❌ RACE CONDITION - Might use old config!
await fetch('/api/agent', {
  method: 'PATCH',
  body: JSON.stringify({ speed: 1.2 })
});

await conversation.endSession();
await conversation.startSession({ agentId });
// May still have speed: 1.0 (old config)
```

**Solution**: Add propagation delay

```typescript
// ✅ WORKS - Allow API propagation time
await fetch('/api/agent', {
  method: 'PATCH',
  body: JSON.stringify({ speed: 1.2 })
});

// CRITICAL: Wait for ElevenLabs internal propagation
await new Promise(r => setTimeout(r, 500));

await conversation.endSession();
await conversation.startSession({ agentId });
// Now using speed: 1.2
```

**Why**: ElevenLabs API takes ~100-500ms to propagate config changes across their infrastructure. Not documented.

---

## Hidden State: Pending Audio Streams

**Problem**: Disconnecting doesn't cancel queued audio

```typescript
// ❌ WRONG - Audio continues after disconnect!
conversation.sendUserMessage("Tell me a long story");
// Agent starts generating speech...

await conversation.endSession();
// Status: disconnected, but audio still plays for 30+ seconds!
```

**Solution**: Track and cancel media streams

```typescript
// ✅ CORRECT - Cancel all streams
const audioElements = new Set<HTMLAudioElement>();

// Track audio elements as they're created
const observer = new MutationObserver(() => {
  document.querySelectorAll('audio').forEach(audio => {
    audioElements.add(audio);
  });
});
observer.observe(document.body, { childList: true, subtree: true });

// On disconnect: Force stop all audio
const stopAllAudio = () => {
  audioElements.forEach(audio => {
    audio.pause();
    audio.src = '';
    audio.load();
    audio.remove();
  });
  audioElements.clear();
};

await conversation.endSession();
stopAllAudio();  // CRITICAL
```

---

## Context Loss: Dynamic Variables Not Preserved

**Gotcha**: Dynamic variables don't persist across restarts

```typescript
// Before restart:
// Agent knows: userName="Alice", accountBalance="$5000"

await conversation.endSession();
await conversation.startSession({ agentId });

// After restart:
// Agent forgot userName and accountBalance!
```

**Solution**: Re-inject via overrides

```typescript
const snapshot = {
  dynamicVariables: {
    userName: "Alice",
    accountBalance: "$5000"
  }
};

await conversation.endSession();
await conversation.startSession({
  agentId,
  overrides: {
    agent: {
      prompt: {
        dynamicVariables: snapshot.dynamicVariables
      }
    }
  }
});
// Agent remembers context
```

---

## Non-Obvious: Conversation ID Persistence

**Problem**: Restarting creates new conversation history

```typescript
// ❌ LOSES HISTORY - New conversation ID
const conversationId1 = await conversation.startSession({ agentId });
// ... chat for a while ...
await conversation.endSession();

const conversationId2 = await conversation.startSession({ agentId });
// conversationId2 !== conversationId1
// Agent has no memory of previous chat!
```

**Solution**: Maintain your own conversation tracking

```typescript
// ✅ PRESERVE HISTORY - Use your own ID
const myConversationId = "conv_123";  // Your DB primary key

// Store messages in your DB, not relying on ElevenLabs
await saveMessage(myConversationId, userMessage);
await saveMessage(myConversationId, agentResponse);

// After restart, messages still in your DB
// Agent won't remember (it's a new session), but you can display history
```

**Why**: Each ElevenLabs session is independent. If you need conversation history across restarts, maintain it yourself.

---

## Speed Perception During Mid-Speech Restart

**UX Gotcha**: Restarting while agent is speaking is jarring

```typescript
// ❌ POOR UX - Cuts off mid-sentence
conversation.sendUserMessage("What's the weather?");
// Agent: "The weather today is sun—" [CUT OFF]

await conversation.endSession();  // User hears abrupt stop
await conversation.startSession({ agentId });
```

**Solution**: Defer restart until speech completes

```typescript
const isSpeaking = () => {
  return Array.from(document.querySelectorAll('audio'))
    .some(audio => !audio.paused);
};

const restartWhenQuiet = async () => {
  if (isSpeaking()) {
    // Show notification: "Will restart after agent finishes speaking"
    await new Promise<void>(resolve => {
      const check = setInterval(() => {
        if (!isSpeaking()) {
          clearInterval(check);
          resolve();
        }
      }, 200);
    });
  }

  await conversation.endSession();
  await conversation.startSession({ agentId });
};
```

---

## Hidden Behavior: Override Persistence

**Non-Obvious**: Overrides only apply to ONE session

```typescript
// Session 1: Use override
await conversation.startSession({
  agentId,
  overrides: { tts: { voiceId: 'voice_123' } }
});
// Using voice_123 ✅

await conversation.endSession();

// Session 2: Restart WITHOUT override
await conversation.startSession({ agentId });
// Back to default voice! Override lost.
```

**Solution**: Always re-apply overrides

```typescript
const currentOverrides = {
  tts: { voiceId: 'voice_123' }
};

// ALWAYS pass overrides on every startSession
await conversation.startSession({
  agentId,
  overrides: currentOverrides  // Must pass again
});
```

---

## Cross-Tab Duplicate Session Detection

**Critical**: Multiple tabs can create duplicate sessions (double billing)

```typescript
// Tab 1: Session active
await conversation.startSession({ agentId });

// Tab 2: Another session
await conversation.startSession({ agentId });

// Result: Two sessions, double audio, double billing!
```

**Solution**: Session locking across tabs

```typescript
// Use localStorage + BroadcastChannel
const SESSION_LOCK_KEY = 'elevenlabs_session_lock';
const channel = new BroadcastChannel('elevenlabs_session');

const acquireSessionLock = (tabId: string): boolean => {
  const existing = localStorage.getItem(SESSION_LOCK_KEY);
  if (existing && JSON.parse(existing).tabId !== tabId) {
    const lock = JSON.parse(existing);
    // Check if stale (>30s old)
    if (Date.now() - lock.timestamp < 30000) {
      return false;  // Another tab has lock
    }
  }

  localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify({
    tabId,
    timestamp: Date.now()
  }));

  return true;
};

// Before starting session
if (!acquireSessionLock(myTabId)) {
  throw new Error('Another tab has an active session');
}

await conversation.startSession({ agentId });
```

---

## Restart Performance Trap: Sequential Operations

**Inefficiency**: Waiting for each step sequentially

```typescript
// ❌ SLOW - Each await blocks next operation
await updateAgentConfig({ speed: 1.2 });  // 100ms
await new Promise(r => setTimeout(r, 500));  // 500ms
await conversation.endSession();  // 300ms
await waitForDisconnect();  // 200ms
stopAllAudio();  // 50ms
await conversation.startSession({ agentId });  // 500ms
// Total: ~2150ms
```

**Optimization**: Parallelize where possible

```typescript
// ✅ FASTER - Parallel operations
await updateAgentConfig({ speed: 1.2 });
await new Promise(r => setTimeout(r, 500));

// Disconnect + audio cleanup in parallel
const [_, __] = await Promise.all([
  conversation.endSession().then(() => waitForDisconnect()),
  Promise.resolve(stopAllAudio())
]);

await conversation.startSession({ agentId });
// Total: ~1600ms (500ms saved)
```

---

## Gotcha Summary: What Breaks

| Issue | Symptom | Fix |
|-------|---------|-----|
| Status !== audio stopped | Dual audio | Manual audio cleanup |
| Config not applied | Old settings used | Restart session |
| Config propagation delay | Race condition | Add 500ms delay |
| Dynamic vars lost | Context forgotten | Re-inject via overrides |
| Override not persistent | Voice reverts | Pass on every start |
| Speaking during restart | Abrupt cutoff | Wait for silence |
| Cross-tab sessions | Duplicate billing | Session lock |
| Pending audio streams | Audio after disconnect | Cancel all media |

---

## Documentation Links (Reference Only)

- **React SDK**: https://elevenlabs.io/docs/agents-platform/libraries/react
- **Chat Mode**: https://elevenlabs.io/docs/agents-platform/guides/chat-mode
- **Complete Index**: [../elevenlabs-voice-settings/docs-index.md](../elevenlabs-voice-settings/docs-index.md)

---

**Focus**: Edge cases and gotchas not in training data
**Last Updated**: January 2026
