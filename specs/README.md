# ElevenLabs Provider Specifications

This directory contains comprehensive specifications for the ElevenLabs Provider implementation using the Spec DSL format.

## Overview

The ElevenLabs Provider manages conversational AI sessions in two modes:
- **Text Mode**: WebSocket-based text conversations (no audio charges)
- **Voice Mode**: WebRTC-based voice conversations (with microphone and speakers)

It also handles:
- Cross-tab coordination (prevent duplicate sessions)
- Mode switching (text ↔ voice transitions)
- Resource management (connections, timers, locks, audio streams)
- Error handling and recovery

## Specification Files

### Main Component

**[providers/elevenlabs-provider.spec](providers/elevenlabs-provider.spec)**
- Main provider component specification
- Props, state architecture, resources
- Public methods and event handlers
- Overview of all workflows and dependencies

### Core Workflows

**[workflows/text-session-lifecycle.spec](workflows/text-session-lifecycle.spec)**
- WebSocket-based text session management
- Connection states: idle → connecting → connected → disconnecting → idle
- Handles: signed URL fetching, dynamic variables, idle timeout, message queuing
- Critical: Stale disconnect event handling, pending history application

**[workflows/voice-session-lifecycle.spec](workflows/voice-session-lifecycle.spec)**
- WebRTC-based voice session management
- Connection states: idle → connecting → connected → disconnecting → idle
- Handles: session locking, force takeover, retry logic (2 attempts), voice transcripts
- Critical: Cross-tab coordination, audio stream cleanup, heartbeat system

**[workflows/cross-tab-coordination.spec](workflows/cross-tab-coordination.spec)**
- Coordinates sessions across multiple browser tabs
- Uses: BroadcastChannel (messaging) + localStorage (session lock)
- Prevents: Duplicate voice sessions (duplicate billing)
- Allows: Concurrent text sessions across tabs

**[workflows/mode-switching.spec](workflows/mode-switching.spec)**
- Orchestrates transitions between modes
- Transitions: idle ↔ text ↔ voice
- Ensures: Clean resource cleanup, context preservation, <500ms latency
- Prevents: Concurrent transitions (single-flight enforcement)

### Reference Documents

**[elevenlabs-invariants-and-errors.spec](elevenlabs-invariants-and-errors.spec)**
- Consolidates all invariants across workflows
- Comprehensive error scenario catalog
- Testing checklist and monitoring setup
- Debug procedures and known bugs
- Performance SLOs and compliance requirements

## Quick Start

### For Developers

1. **Start here**: [providers/elevenlabs-provider.spec](providers/elevenlabs-provider.spec)
   - Understand the component structure and resources

2. **Understand workflows**:
   - Read [workflows/text-session-lifecycle.spec](workflows/text-session-lifecycle.spec)
   - Read [workflows/voice-session-lifecycle.spec](workflows/voice-session-lifecycle.spec)
   - Read [workflows/cross-tab-coordination.spec](workflows/cross-tab-coordination.spec)
   - Read [workflows/mode-switching.spec](workflows/mode-switching.spec)

3. **Review invariants**: [elevenlabs-invariants-and-errors.spec](elevenlabs-invariants-and-errors.spec)
   - Critical for testing and debugging

### For Testing

1. **Test each workflow independently**:
   - Follow test cases in each workflow spec
   - Verify all invariants hold

2. **Test error scenarios**:
   - Use error scenario catalog in [elevenlabs-invariants-and-errors.spec](elevenlabs-invariants-and-errors.spec)
   - Verify recovery mechanisms

3. **Integration testing**:
   - Mode switching scenarios
   - Cross-tab scenarios (2-3 tabs)
   - Resource leak testing (memory profiling)

### For Debugging

1. **Identify symptom** (e.g., stale disconnect, resource leak, stuck transition)

2. **Find related workflow**:
   - Connection issues → Text or Voice lifecycle
   - Multi-tab issues → Cross-tab coordination
   - Mode switch issues → Mode switching
   - Resource leaks → Check all workflows

3. **Check invariants**:
   - Which invariant is violated?
   - See [elevenlabs-invariants-and-errors.spec](elevenlabs-invariants-and-errors.spec)

4. **Follow debug procedure**:
   - Check state transitions
   - Review error logs
   - Verify resource cleanup

## Key Concepts

### Resources

All workflows define resources that must be cleaned up:
- **Connections**: WebSocket (text), WebRTC (voice)
- **Locks**: Session lock (voice only, in localStorage)
- **Timers**: Idle timer (text), heartbeat timer (both)
- **Streams**: Audio streams (voice), transcript streams (voice)
- **Promises**: Waiters (connection/disconnection events)
- **Queues**: Pending message queues (both modes)

### State Machines

Each workflow defines states and transitions:
- **States**: Named states (idle, connecting, connected, etc.)
- **Transitions**: How to move between states
- **Invariants**: What must always be true
- **Error scenarios**: What can go wrong and how to recover

### Performance Budgets

All workflows define time budgets:
- Text start: <2 seconds
- Voice start: <3 seconds
- Mode switch (text ↔ voice): <500 ms (critical UX)
- Resource cleanup: <1 second

### Observability

All workflows define events to emit:
- state_enter / state_exit
- transition_start / transition_end
- resource_create / resource_cleanup
- session_owner_set / session_owner_clear

## Critical Bugs & Mitigations

From [elevenlabs-invariants-and-errors.spec](elevenlabs-invariants-and-errors.spec):

1. **Stale disconnect events** (Text) - MITIGATED
   - Guard: textConnectionStateRef check in onDisconnect

2. **Pending history timing** (Text) - MITIGATED
   - Auto-restart session if history needs to be applied

3. **Concurrent starts** (Text, Voice) - MITIGATED
   - Reentrancy guards (isTextStartingRef, isVoiceStartingRef)

4. **Waiter cleanup** (Both) - PARTIALLY MITIGATED
   - Clear stale waiters on new session start

5. **Audio stream leaks** (Voice) - MITIGATED
   - Multiple cleanup points (stop, unmount, pagehide)

6. **Cross-tab staleness** (Voice) - MITIGATED
   - 30-second staleness check + heartbeat system

## Compliance

### Critical (Billing & Privacy)

- ✅ No audio charges in text mode (dual textOnly flags)
- ✅ No duplicate voice sessions (session lock enforcement)
- ✅ Microphone released on voice end (cleanup in multiple places)

### Required (UX & Reliability)

- ✅ Mode switches <500 ms (fast-stop optimization)
- ✅ No stuck transitions (single-flight + timeout)
- ✅ Cross-tab coordination (BroadcastChannel + localStorage)

## Maintenance

When modifying the provider:

1. **Update specifications first**
   - Identify which workflow is affected
   - Update state machine if needed
   - Add new invariants or error scenarios

2. **Review all related workflows**
   - Mode switching affects text/voice lifecycles
   - Cross-tab affects voice lifecycle
   - Check dependencies

3. **Update invariants document**
   - Add new invariants
   - Document new error scenarios
   - Update testing checklist

4. **Run full test suite**
   - Unit tests (per workflow)
   - Integration tests (cross-workflow)
   - Manual tests (multi-tab, rapid switching)
   - Performance tests (latency, memory)

## Related Documentation

- [src/providers/ElevenLabsProvider.tsx](../src/providers/ElevenLabsProvider.tsx) - Implementation
- [CLAUDE.md](../CLAUDE.md) - Project overview and context
- [.claude/skills/elevenlabs-agent-cli/](../.claude/skills/elevenlabs-agent-cli/) - Tool management
- [.claude/skills/elevenlabs-agent-testing/](../.claude/skills/elevenlabs-agent-testing/) - Testing strategy

## Questions?

If you have questions about:
- **What a workflow does**: Read the workflow spec
- **Why something is designed this way**: Check "Design Decisions" section in specs
- **How to debug an issue**: See [elevenlabs-invariants-and-errors.spec](elevenlabs-invariants-and-errors.spec)
- **How to test**: See "Testing Strategy" in each workflow spec

## Version History

- **v2.0** (2025-01-25): Comprehensive retroactive specification
  - Main provider spec
  - 4 workflow specs (text, voice, cross-tab, mode-switching)
  - Invariants and error scenarios consolidation
  - Known bugs documented with mitigations

---

**Note**: These specifications are written in the Spec DSL format (TOML-style) for deterministic code generation and clear requirements. See [.claude/skills/spec/](../.claude/skills/spec/) for DSL documentation.
