# FinPilot Development Backlog

## High Priority Issues

### 1. Fix Agent Session Termination Handling
**Problem**: When ElevenLabs agent calls `end_call` tool, it causes abrupt WebRTC disconnection that triggers hot reloads and interrupts conversation flow.

**Impact**: 
- Agent's final message lost (appears in Convex but not voice widget)
- Audio cuts off mid-response  
- Hot reload interrupts user experience
- Missing tool call events
- Unprofessional conversation endings

**Recommended Solution**: Hybrid approach combining Event Interceptor + Conversation Summary Bridge

#### Phase 1: Technical Foundation (Event Interceptor with State Persistence)
- [ ] Implement tool call event buffering system
- [ ] Add state persistence across hot reloads/crashes
- [ ] Create smart recovery for interrupted terminations
- [ ] Add development mode resilience
- [ ] Capture tool call events before connection loss

#### Phase 2: UX Enhancement (Conversation Summary Bridge)
- [ ] Add automatic conversation summary generation
- [ ] Implement graceful closure UI with professional messaging
- [ ] Integrate summaries with Convex for dashboard persistence
- [ ] Add fallback recovery with user communication
- [ ] Transform termination issues into value-added features

**Timeline**: 10-14 days
**Priority**: High - affects user trust and professional experience

---

### 2. Remove Debug Information from Voice UI
**Problem**: POC debug information is still visible in production UI, making it look unprofessional.

**Current Debug Elements to Remove**:
```
POC: SDK Only Mode 🚀 | WebSocket: Disabled | SDK Stream: 9q71md99
Live Transcript (Stream: 9q71md99):
Starting...
Status: Active | Updated: 22:30:19
```

**Tasks**:
- [ ] Remove "POC: SDK Only Mode 🚀" text from voice button status
- [ ] Hide "WebSocket: Disabled" status message
- [ ] Remove SDK stream ID display from UI
- [ ] Clean up "Live Transcript (Stream: xxx)" debug section
- [ ] Keep internal logging but hide from user-facing UI
- [ ] Replace with clean, professional status indicators

**Files to Modify**:
- `src/features/voice/components/VoiceButton.tsx`

**Timeline**: 1-2 hours
**Priority**: Medium - affects UI polish and professionalism

---

## Future Enhancements

### Voice Feature Improvements
- [ ] Add voice activity visualization
- [ ] Implement conversation history persistence
- [ ] Add voice command shortcuts
- [ ] Support multiple conversation contexts

### Error Handling Enhancements  
- [ ] Add comprehensive error boundaries for voice features
- [ ] Implement retry mechanisms for failed connections
- [ ] Add network connectivity monitoring
- [ ] Create fallback text-only mode

### Performance Optimizations
- [ ] Optimize Convex streaming for large conversations
- [ ] Add conversation archiving for old sessions  
- [ ] Implement lazy loading for conversation history
- [ ] Add conversation compression for storage efficiency

### Integration Features
- [ ] Add voice command integration with financial tools
- [ ] Implement voice-to-chart generation
- [ ] Add voice-activated portfolio analysis
- [ ] Support voice-driven financial planning workflows