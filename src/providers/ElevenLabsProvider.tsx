"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from 'react';
import { useConversation, type Status, type DisconnectionDetails } from '@elevenlabs/react';
import { VoiceTransport, type VoiceTransportHandle } from './transports/VoiceTransport';
import { createClientTools } from '@/src/config/elevenLabsTools';
import { CIEDEN_AGENT_CONTEXT } from '@/src/config/ciedenAgentContext';
import { stopAllAudioStreams } from '@/src/utils/mediaStreamTracker';
import { type ActionHandlers } from '../utils/toolBridge';
import { startPerfTimer, perfLog, isDiagnosticsEnabled } from '@/src/utils/perf';
import {
  SessionLock,
  SessionMessage,
  SessionState,
  generateTabId,
  isSessionStale,
  createSessionChannel
} from '@/src/utils/crossTabSession';
import { useElevenLabsMessages } from '@/src/hooks/useElevenLabsMessages';
import { type Id } from '@/convex/_generated/dataModel';

export type SessionMode = 'idle' | 'text' | 'voice';
export type TransportKind = 'websocket' | 'webrtc';

export interface NormalizedMessageEvent {
  source: 'ai' | 'user';
  message: string;
  via: TransportKind;
  raw?: unknown;
}

interface TextTransportError {
  code: number;
  reason: string;
}

interface ElevenLabsContextValue {
  conversation: ReturnType<typeof useConversation>;
  sessionMode: SessionMode;
  isTransitioning: boolean;
  isTextConnected: boolean;
  isVoiceTransportConnected: boolean;
  streamId: string | null;

  // Cross-tab state
  isOtherTabActive: boolean;
  otherTabMode: 'text' | 'voice' | null;
  tabId: string;

  // VAD (Voice Activity Detection) state
  vadScore: number;
  isUserSpeakingVAD: boolean;

  startText: (conversationHistory?: string) => Promise<void>;
  stopText: () => Promise<void>;
  startVoice: (initialGreeting?: string, conversationHistory?: string) => Promise<void>;
  stopVoice: () => Promise<void>;
  sendTextMessage: (message: string) => Promise<boolean>;
  sendVoiceMessage: (message: string) => Promise<void>;
  queueToolMessage: (content: string, metadata?: Record<string, unknown>) => void;
  registerTextHandler: (
    handler: (event: NormalizedMessageEvent) => Promise<void> | void
  ) => () => void;
  registerVoiceHandler: (
    handler: (event: NormalizedMessageEvent) => Promise<void> | void
  ) => () => void;
  registerTextErrorHandler: (
    handler: (error: TextTransportError) => void
  ) => () => void;
  resetTextIdleTimer: () => void;
  sendContextualUpdateOverSocket: (text: string) => boolean;
  setVoicePreferences: (prefs: { voiceId: string | null; speed: number | null }) => void;
  restartVoiceIfActive: () => Promise<void>;
  setPendingConversationHistory?: (history?: string) => void;
}

interface Waiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

interface ToolResponseLike {
  tool_name?: string;
  tool_type?: string;
  is_error?: boolean;
}

type ConversationLike = ReturnType<typeof useConversation> & {
  sendContextualUpdate?: (text: string) => void;
  sendUserMessage?: (text: string) => void;
};

const ElevenLabsContext = createContext<ElevenLabsContextValue | null>(null);

const TEXT_CONNECT_TIMEOUT_MS = 8000;
const TEXT_DISCONNECT_TIMEOUT_MS = 5000;
const VOICE_CONNECT_TIMEOUT_MS = 10000;
const TEXT_IDLE_CLOSE_MS = 5 * 60 * 1000;
const TEXT_WS_AUTOSTART = process.env.NEXT_PUBLIC_TEXT_WS_AUTOSTART !== 'false';

// ElevenLabs/ConvAI can hard-fail on very large payloads.
// Keep full text in Convex/UI; only truncate what we send over transport.
const MAX_TRANSPORT_CHARS = 12000;
const truncateForTransport = (text: string) => {
  if (text.length <= MAX_TRANSPORT_CHARS) return text;
  const head = Math.floor(MAX_TRANSPORT_CHARS / 2);
  const tail = MAX_TRANSPORT_CHARS - head;
  return `${text.slice(0, head)}\n...\n${text.slice(-tail)}`;
};

const resolveWaiters = (waitersRef: MutableRefObject<Waiter[]>) => {
  const waiters = waitersRef.current.splice(0, waitersRef.current.length);
  waiters.forEach(waiter => {
    try {
      waiter.resolve();
    } catch (error) {
      console.error('Failed to resolve ElevenLabs waiter', error);
    }
  });
};

const rejectWaiters = (waitersRef: MutableRefObject<Waiter[]>, error: Error) => {
  const waiters = waitersRef.current.splice(0, waitersRef.current.length);
  waiters.forEach(waiter => {
    try {
      waiter.reject(error);
    } catch (err) {
      console.error('Failed to reject ElevenLabs waiter', err);
    }
  });
};

const shallowEqualVoicePreferences = (
  a: { voiceId: string | null; speed: number | null },
  b: { voiceId: string | null; speed: number | null }
) => a.voiceId === b.voiceId && a.speed === b.speed;

const waitForState = (
  check: () => boolean,
  waitersRef: MutableRefObject<Waiter[]>,
  timeoutMs: number,
  timeoutMessage: string
) => {
  if (check()) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      waitersRef.current = waitersRef.current.filter(waiter => waiter.timeoutId !== timeoutId);
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    const waiter: Waiter = {
      resolve: () => {
        clearTimeout(timeoutId);
        waitersRef.current = waitersRef.current.filter(w => w !== waiter);
        resolve();
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        waitersRef.current = waitersRef.current.filter(w => w !== waiter);
        reject(error);
      },
      timeoutId
    };

    waitersRef.current.push(waiter);
  });
};

const fastStopText = async (
  textConversation: ReturnType<typeof useConversation>,
  textConnectionStateRef: MutableRefObject<'idle' | 'connecting' | 'connected'>,
  textDisconnectWaitersRef: MutableRefObject<Waiter[]>,
  label: string,
  timeoutMs: number
) => {
  if (!textConversation || textConversation.status !== 'connected') {
    return;
  }

  // CRITICAL: Reset ref before endSession to allow onDisconnect handler to proceed
  textConnectionStateRef.current = 'idle';

  // Register waiter BEFORE calling endSession to avoid race if disconnect happens immediately
  const disconnectPromise = waitForState(
    () => textConversation.status !== 'connected',
    textDisconnectWaitersRef,
    timeoutMs,
    `Timed out waiting for text disconnect (${label})`
  );

  try {
    await textConversation.endSession();
  } catch (error) {
    console.warn(`[fastStopText] endSession failed (${label}):`, error);
  }

  try {
    await disconnectPromise;
  } catch (error) {
    console.warn(`[fastStopText] Disconnect timeout (${label}):`, error);
  }
};

/** Shallow, size-safe summary for console diagnostics (voice WebRTC events). */
function summarizeElevenLabsEventForDiag(event: unknown): Record<string, unknown> {
  if (event == null) {
    return { shape: 'nullish' };
  }
  if (typeof event === 'string') {
    return { shape: 'string', length: event.length, head: event.slice(0, 120) };
  }
  if (typeof event !== 'object') {
    return { shape: typeof event };
  }
  const r = event as Record<string, unknown>;
  const keys = Object.keys(r);
  const peek = (key: string): unknown => {
    const v = r[key];
    if (typeof v === 'string') {
      return { len: v.length, head: v.slice(0, 100) };
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = v as Record<string, unknown>;
      const nk = Object.keys(nested).slice(0, 12);
      return { nestedKeys: nk };
    }
    return typeof v;
  };
  const type = typeof r.type === 'string' ? r.type : undefined;
  const out: Record<string, unknown> = {
    shape: 'object',
    type,
    keyCount: keys.length,
    keys: keys.slice(0, 28)
  };
  for (const k of [
    'message',
    'text',
    'agent_response',
    'user_transcript',
    'source',
    'agent_response_event',
    'user_transcription_event'
  ]) {
    if (k in r) {
      out[k] = peek(k);
    }
  }
  return out;
}

const normalizeIncomingEvent = (event: unknown): { source: 'ai' | 'user'; message: string } | null => {
  try {
    const recordEvent = (typeof event === 'object' && event !== null)
      ? (event as Record<string, unknown>)
      : undefined;

    const type = typeof recordEvent?.type === 'string' ? (recordEvent?.type as string) : undefined;

    if (type === 'agent_response') {
      const agentResponse =
        typeof recordEvent?.agent_response === 'string' ? recordEvent.agent_response : null;
      const message =
        typeof recordEvent?.message === 'string' ? recordEvent.message : null;
      const text = typeof recordEvent?.text === 'string' ? recordEvent.text : null;
      const nestedResponse = typeof recordEvent?.agent_response_event === 'object' && recordEvent.agent_response_event !== null
        ? (recordEvent.agent_response_event as Record<string, unknown>).agent_response
        : null;
      const resolved = agentResponse ?? message ?? text ?? (typeof nestedResponse === 'string' ? nestedResponse : null);
      if (resolved) {
        return { source: 'ai', message: resolved };
      }
    }

    if (recordEvent?.agent_response_event && typeof recordEvent.agent_response_event === 'object') {
      const nested = (recordEvent.agent_response_event as Record<string, unknown>).agent_response;
      if (typeof nested === 'string') {
        return { source: 'ai', message: nested };
      }
    }

    if (type === 'user_transcript') {
      const userTranscript =
        typeof recordEvent?.user_transcript === 'string' ? recordEvent.user_transcript : null;
      const nestedTranscript = typeof recordEvent?.user_transcription_event === 'object' && recordEvent.user_transcription_event !== null
        ? (recordEvent.user_transcription_event as Record<string, unknown>).user_transcript
        : null;
      const resolved = userTranscript ?? (typeof nestedTranscript === 'string' ? nestedTranscript : null);
      if (resolved) {
        return { source: 'user', message: resolved };
      }
    }

    const message = typeof recordEvent?.message === 'string' ? recordEvent.message : null;
    const source = typeof recordEvent?.source === 'string' ? (recordEvent.source as string) : null;
    if (message && (source === 'ai' || source === 'user')) {
      return { source, message };
    }

    if (typeof event === 'string') {
      return { source: 'ai', message: event };
    }
  } catch (error) {
    console.error('Failed to normalize ElevenLabs event', error, event);
  }

  if (isDiagnosticsEnabled()) {
    console.info('[VoiceDiag] normalizeIncomingEvent: unmatched shape', summarizeElevenLabsEventForDiag(event));
  }
  return null;
};

const emitToHandlers = (
  handlersRef: MutableRefObject<Set<(event: NormalizedMessageEvent) => Promise<void> | void>>,
  event: NormalizedMessageEvent
) => {
  const handlers = Array.from(handlersRef.current);
  handlers.forEach(handler => {
    Promise.resolve(handler(event)).catch(error => {
      console.error('ElevenLabs handler failed', error);
    });
  });
};

const emitErrorToHandlers = (
  handlersRef: MutableRefObject<Set<(error: TextTransportError) => void>>,
  error: TextTransportError
) => {
  const handlers = Array.from(handlersRef.current);
  handlers.forEach(handler => {
    try {
      handler(error);
    } catch (err) {
      console.error('ElevenLabs text error handler failed', err);
    }
  });
};

export function ElevenLabsProvider({
  children,
  actionHandlers,
  conversationId,
  startStream,
  updateStream
}: {
  children: React.ReactNode;
  actionHandlers?: ActionHandlers;
  conversationId?: Id<"conversations"> | null;
  startStream?: (params: { conversationId: string; streamId: string; userId: string }) => Promise<void>;
  updateStream?: (params: { streamId: string; content: string; isComplete: boolean }) => Promise<void>;
}) {
  const [sessionMode, setSessionMode] = useState<SessionMode>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isTextConnected, setIsTextConnected] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [isVoiceTransportConnected, setIsVoiceTransportConnected] = useState(false);
  const [voicePreferences, setVoicePreferences] = useState<{ voiceId: string | null; speed: number | null }>({
    voiceId: null,
    speed: null
  });

  // VAD (Voice Activity Detection) state
  const [vadScore, setVadScore] = useState<number>(0);
  const [isUserSpeakingVAD, setIsUserSpeakingVAD] = useState(false);
  const VAD_THRESHOLD = 0.5; // Threshold for considering user as speaking
  const lastVadScoreRef = useRef<number>(0);
  const lastIsSpeakingRef = useRef<boolean>(false);
  const vadLogLastRef = useRef<number>(0);
  const DEBUG_VAD_TELEMETRY = true;

  // Use buffered message persistence for tool calls
  const { handleAgentMessage } = useElevenLabsMessages({ conversationId: conversationId ?? null });
  // Memoize client tools to avoid re-instantiating on each render
  const clientToolsMemo = useMemo(() => createClientTools(actionHandlers ?? null), [actionHandlers]);

  // Cross-tab coordination
  const tabId = useMemo(() => generateTabId(), []);
  const sessionChannel = useMemo(() => createSessionChannel(), []);
  const [isOtherTabActive, setIsOtherTabActive] = useState(false);
  const [otherTabMode, setOtherTabMode] = useState<'text' | 'voice' | null>(null);

  const sessionModeRef = useRef<SessionMode>(sessionMode);
  const isTextConnectedRef = useRef(isTextConnected);
  const textConnectionStateRef = useRef<'idle' | 'connecting' | 'connected'>('idle');
  const transitionPromiseRef = useRef<Promise<void> | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceStreamInitializedRef = useRef(false);
  const hasAutostartedRef = useRef(false);
  const voiceConnectionStateRef = useRef<'idle' | 'connecting' | 'connected'>('idle');
  const conversationIdRef = useRef<string | null>(null);
  const isUnmountingRef = useRef(false);
  const textDynVarsAppliedRef = useRef<boolean>(false);
  const isTextStartingRef = useRef<boolean>(false);
  const pendingTextHistoryRef = useRef<string | null>(null);
  const lastAppliedVoicePreferencesRef = useRef<{ voiceId: string | null; speed: number | null }>({
    voiceId: null,
    speed: null
  });
  // Expose stopVoice to earlier-declared callbacks without TDZ issues
  const stopVoiceFnRef = useRef<(() => Promise<void>) | null>(null);
  const setPendingConversationHistory = useCallback((history?: string) => {
    if (typeof history === 'string' && history.length > 0) {
      pendingTextHistoryRef.current = history;
      console.log('[ElevenLabsProvider] pending text history set', { length: history.length });
    } else {
      pendingTextHistoryRef.current = null;
    }
  }, []);

  const textConnectWaitersRef = useRef<Waiter[]>([]);
  const textDisconnectWaitersRef = useRef<Waiter[]>([]);
  const voiceConnectWaitersRef = useRef<Waiter[]>([]);
  const voiceDisconnectWaitersRef = useRef<Waiter[]>([]);

  const textHandlersRef = useRef<Set<(event: NormalizedMessageEvent) => Promise<void> | void>>(new Set());
  const voiceHandlersRef = useRef<Set<(event: NormalizedMessageEvent) => Promise<void> | void>>(new Set());
  const textErrorHandlersRef = useRef<Set<(error: TextTransportError) => void>>(new Set());

  // Queues for messages sent before transports are connected
  const pendingTextQueueRef = useRef<string[]>([]);
  const pendingVoiceQueueRef = useRef<string[]>([]);
  const MAX_QUEUE = 50;

  const enqueueMessage = useCallback((queue: string[], message: string) => {
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push(message);
  }, []);

  useEffect(() => {
    sessionModeRef.current = sessionMode;
  }, [sessionMode]);

  useEffect(() => {
    isTextConnectedRef.current = isTextConnected;
  }, [isTextConnected]);

  const waitForNoTransition = useCallback(async () => {
    if (!transitionPromiseRef.current) return;
    try {
      await transitionPromiseRef.current;
    } catch (error) {
      console.error('Previous ElevenLabs transition failed', error);
    }
  }, []);

  const updateVoicePreferences = useCallback((prefs: { voiceId: string | null; speed: number | null }) => {
    setVoicePreferences(prev => {
      const normalized = {
        voiceId: prefs?.voiceId ?? null,
        speed: typeof prefs?.speed === 'number' ? prefs.speed : null
      } as { voiceId: string | null; speed: number | null };

      if (shallowEqualVoicePreferences(prev, normalized)) {
        return prev;
      }

      return normalized;
    });
  }, []);

  const runTransition = useCallback(async (operation: () => Promise<void>) => {
    await waitForNoTransition();

    const transition = (async () => {
      setIsTransitioning(true);
      try {
        await operation();
      } finally {
        setIsTransitioning(false);
        transitionPromiseRef.current = null;
      }
    })();

    transitionPromiseRef.current = transition;
    await transition;
  }, [waitForNoTransition]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // Heartbeat to keep session alive
  useEffect(() => {
    if (sessionMode === 'idle') return;

    const channel = sessionChannel;
    const heartbeat = setInterval(() => {
      // Only keep the cross-tab lock fresh for voice sessions
      if (sessionModeRef.current === 'voice') {
        SessionLock.updateHeartbeat(tabId);
      }

      // Also broadcast heartbeat
      if (channel) {
        try {
          channel.postMessage({
            type: 'SESSION_HEARTBEAT',
            payload: {
              conversationId: conversationIdRef.current || '',
              mode: sessionModeRef.current,
              tabId,
              timestamp: Date.now()
            }
          } as SessionMessage);
        } catch (error) {
          if (process.env.NODE_ENV !== 'development') {
            console.warn('BroadcastChannel heartbeat post failed:', error);
          }
        }
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(heartbeat);
  }, [sessionMode, tabId]);

  // Listen for cross-tab messages
  useEffect(() => {
    const channel = sessionChannel;
    if (!channel) return;

    const handleMessage = (event: MessageEvent<SessionMessage>) => {
      const { type, payload } = event.data;

      // Ignore messages from our own tab
      if ('tabId' in payload && payload.tabId === tabId) return;

      console.log(`📡 Cross-tab message from ${('tabId' in payload) ? payload.tabId : 'unknown'}:`, type);

      switch (type) {
        case 'SESSION_STARTED':
          const state = payload as SessionState;
          if (state.tabId !== tabId) {
            setIsOtherTabActive(true);
            setOtherTabMode(state.mode);
            console.log(`🚫 Another tab started ${state.mode} session`);
          }
          break;

        case 'SESSION_ENDED':
          setIsOtherTabActive(false);
          setOtherTabMode(null);
          console.log('✅ Other tab ended session');
          break;

        case 'SESSION_HEARTBEAT':
          const heartbeat = payload as SessionState;
          if (heartbeat.tabId !== tabId) {
            setIsOtherTabActive(true);
            setOtherTabMode(heartbeat.mode);
          }
          break;

        case 'FORCE_STOP_VOICE': {
          const { newOwner } = payload as { newOwner: string };
          if (sessionModeRef.current === 'voice' && tabId !== newOwner) {
            console.log('🎤 Voice session force stopped by another tab');
            void (async () => { await stopVoice(); })();
          }
          break;
        }

        case 'CLAIM_SESSION':
          // Another tab wants to claim orphaned session
          if (sessionModeRef.current !== 'idle') {
            console.warn('⚠️ Another tab claiming session while we\'re active');
          }
          break;
      }
    };

    channel.onmessage = handleMessage;

    return () => {
      try {
        channel.onmessage = null;
      } catch {
        // ignore
      }
    };
  }, [tabId, setIsOtherTabActive, setOtherTabMode]);

  // Check for orphaned sessions on mount
  useEffect(() => {
    const existingLock = SessionLock.get();

    if (existingLock) {
      if (isSessionStale(existingLock)) {
        console.log('🧹 Cleaning up stale session lock');
        SessionLock.clear();
      } else {
        console.log('🔒 Existing session found in another tab:', existingLock);
        setIsOtherTabActive(true);
        setOtherTabMode(existingLock.mode);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const channel = sessionChannel;
    return () => {
      isUnmountingRef.current = true;
      // Only clear lock if this tab owns it
      const currentLock = SessionLock.get();
      if (currentLock && currentLock.tabId === tabId) {
        SessionLock.clear();
        if (channel) {
          try {
            channel.postMessage({
              type: 'SESSION_ENDED',
              payload: { tabId, conversationId: conversationIdRef.current || '', mode: null, timestamp: Date.now() }
            } as SessionMessage);
          } catch {
            // Ignore if channel is already closed
          }
        }
      }

      if (channel) {
        try {
          channel.close();
        } catch {}
      }
    };
  }, [tabId]);

  // ============================================================================
  // VOICE MODE TRANSPORT WRAPPER (Keyed per attempt)
  // ============================================================================
  const voiceRef = useRef<VoiceTransportHandle | null>(null);
  const [voiceAttemptId, setVoiceAttemptId] = useState<string | null>(null);
  const voiceMountReadyCallback = useRef<(() => void) | null>(null);
  const voiceAttemptIdRef = useRef<string | null>(null);
  const attemptTimersRef = useRef<Map<string, ReturnType<typeof startPerfTimer>>>(new Map());

  useEffect(() => {
    voiceAttemptIdRef.current = voiceAttemptId;
  }, [voiceAttemptId]);

  const handleVoiceStatus = useCallback(({ status }: { status: Status }) => {
    if (status === 'connected') {
      console.log('✅ WebRTC connected');
      setIsTransitioning(false);
      setIsVoiceTransportConnected(true);
      voiceConnectionStateRef.current = 'connected';
      resolveWaiters(voiceConnectWaitersRef);

      // Perf: connected event
      try {
        const id = voiceAttemptIdRef.current || undefined;
        if (id) {
          const t = attemptTimersRef.current.get(id);
          t?.mark('connected_event', { attemptId: id });
        } else if (isDiagnosticsEnabled()) {
          perfLog('voice.connected_event', {});
        }
      } catch {}

      if (conversationId && startStream && !voiceStreamInitializedRef.current) {
        const streamId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        voiceStreamInitializedRef.current = true;
        startStream({
          conversationId,
          streamId,
          userId: 'current-user'
        })
          .then(() => {
            setCurrentStreamId(streamId);
            console.log('📝 Created voice transcript stream', streamId);
          })
          .catch(error => {
            console.error('Failed to create voice transcript stream', error);
            voiceStreamInitializedRef.current = false;
          });
      }

      // Flush any queued voice messages
      try {
        while (pendingVoiceQueueRef.current.length && voiceRef.current?.getStatus() === 'connected') {
          const msg = pendingVoiceQueueRef.current.shift()!;
          try {
            voiceRef.current?.sendUserMessage(truncateForTransport(msg));
          } catch (e) {
            console.error('Failed to flush queued voice message', e);
          }
        }
      } catch (e) {
        console.error('Voice queue flush failed', e);
      }
    }

    if (status === 'disconnected') {
      // Treat as transient until onDisconnect fires; do not flip sessionMode or reset UI here
      setIsVoiceTransportConnected(false);
      voiceConnectionStateRef.current = 'idle';
      resolveWaiters(voiceDisconnectWaitersRef);
    }
  }, [conversationId, startStream, updateStream]);

  const handleVoiceDisconnect = useCallback((details: DisconnectionDetails) => {
    console.log('🔌 WebRTC disconnected, reason:', details.reason);
    setIsVoiceTransportConnected(false);

    // Perf: disconnected event
    try {
      const id = voiceAttemptIdRef.current || undefined;
      if (id) {
        const t = attemptTimersRef.current.get(id);
        t?.mark('disconnected_event', { attemptId: id, reason: details.reason });
      } else if (isDiagnosticsEnabled()) {
        perfLog('voice.disconnected_event', { reason: details.reason });
      }
    } catch {}

    if (sessionModeRef.current === 'voice') {
      setSessionMode('idle');
      sessionModeRef.current = 'idle';

      // Release cross-tab lock
      const currentLock = SessionLock.get();
      if (currentLock && currentLock.tabId === tabId) {
        SessionLock.clear();
        if (sessionChannel) {
          try {
            sessionChannel.postMessage({
              type: 'SESSION_ENDED',
              payload: { tabId, conversationId: conversationIdRef.current || '', mode: null, timestamp: Date.now() }
            } as SessionMessage);
          } catch {
            // ignore if channel is closed
          }
        }
      }
    }

    voiceConnectionStateRef.current = 'idle';
    if (!isUnmountingRef.current) {
      setVadScore(0);
      setIsUserSpeakingVAD(false);
    }
    lastVadScoreRef.current = 0;
    lastIsSpeakingRef.current = false;
    resolveWaiters(voiceDisconnectWaitersRef);
  }, [tabId, sessionChannel]);

  const handleVoiceMessage = useCallback((event: unknown) => {
    const mode = sessionModeRef.current;
    if (mode !== 'voice') {
      if (isDiagnosticsEnabled()) {
        console.info('[VoiceDiag] handleVoiceMessage skipped: sessionMode is not voice', {
          sessionMode: mode,
          eventSummary: summarizeElevenLabsEventForDiag(event)
        });
      }
      return;
    }
    const normalized = normalizeIncomingEvent(event);
    if (!normalized) {
      return;
    }
    if (isDiagnosticsEnabled()) {
      console.info('[VoiceDiag] handleVoiceMessage → emit to voice handlers', {
        source: normalized.source,
        messageLen: normalized.message.length,
        messageHead: normalized.message.slice(0, 80),
        handlerCount: voiceHandlersRef.current.size
      });
    }
    emitToHandlers(voiceHandlersRef, { ...normalized, via: 'webrtc', raw: event });
  }, []);

  const handleVoiceError = useCallback((error: unknown) => {
    // Robust, defensive error handling for ElevenLabs voice/WebRTC issues.
    // We never assume a particular shape of the error object to avoid
    // "Cannot read properties of undefined" style crashes.
    console.error('❌ ElevenLabs voice error', error);

    const err = (typeof error === 'object' && error !== null)
      ? (error as Record<string, unknown>)
      : {};
    const errorType: string | undefined =
      (typeof err.error_type === 'string' ? err.error_type : undefined) ||
      (typeof err.type === 'string' ? err.type : undefined) ||
      (typeof err.name === 'string' ? err.name : undefined) ||
      (typeof error === 'string' ? 'STRING_ERROR' : undefined);
    const errorCode =
      (typeof err.code === 'number' || typeof err.code === 'string' ? err.code : undefined) ??
      (typeof err.error_code === 'number' || typeof err.error_code === 'string' ? err.error_code : undefined) ??
      (typeof err.status === 'number' || typeof err.status === 'string' ? err.status : undefined);
    const reason: string | undefined =
      (typeof err.reason === 'string' ? err.reason : undefined) ||
      (typeof err.message === 'string' ? err.message : undefined) ||
      (typeof error === 'string' ? error : undefined);

    // Log a normalized summary so we can understand what's going on from console only.
    if (errorType || errorCode || reason) {
      console.error('[ElevenLabsProvider] Normalized voice error details', {
        errorType,
        errorCode,
        reason
      });
    }

    // Best‑effort classification of common SDK/WebRTC issues so it's easier
    // to see what went wrong without digging into the raw object.
    try {
      const reasonText = (reason || '').toLowerCase();
      const typeText = (errorType || '').toLowerCase();

      if (typeText.includes('data') && typeText.includes('channel') || reasonText.includes('datachannel')) {
        console.warn(
          '[ElevenLabsProvider] Detected WebRTC DataChannel error. This is often caused by network/VPN/firewall issues, ' +
            'strict corporate proxies, or unstable connectivity. Try disabling VPN/proxy, changing network, or using a different browser.'
        );
      } else if (reasonText.includes('permission') || reasonText.includes('microphone')) {
        console.warn(
          '[ElevenLabsProvider] Microphone/permission issue. Please re-check browser microphone permissions for this site ' +
            'and ensure no other app is exclusively using the microphone.'
        );
      } else if (reasonText.includes('ice') || reasonText.includes('candidate')) {
        console.warn(
          '[ElevenLabsProvider] WebRTC ICE negotiation error. This can be related to blocked STUN/TURN servers or ' +
            'restricted corporate networks.'
        );
      } else if (reasonText.includes('daily') && reasonText.includes('limit')) {
        console.warn('[ElevenLabsProvider] ElevenLabs daily usage limit reached for this API key/agent.');
      }
    } catch (classificationError) {
      console.error('[ElevenLabsProvider] Failed to classify voice error', classificationError);
    }
  }, []);

  const handleVoiceAgentTool = useCallback((toolResponse: unknown) => {
    const tool = (typeof toolResponse === 'object' && toolResponse !== null)
      ? (toolResponse as ToolResponseLike)
      : {};
    console.log('🔧 Agent tool executed:', toolResponse);
    if (tool.tool_name === 'end_call' && tool.tool_type === 'system' && !tool.is_error) {
      console.log('📞 Agent called end_call - waiting for natural disconnect');
      setTimeout(() => {
        if (sessionModeRef.current === 'voice') {
          console.log('⏱️ Initiating cleanup after end_call');
          try {
            stopVoiceFnRef.current?.().catch(e => console.error('Cleanup after end_call failed:', e));
          } catch (e) {
            console.error('Cleanup after end_call invocation failed:', e);
          }
        }
      }, 2000);
    }
  }, []);

  const handleVoiceVad = useCallback(({ vadScore }: { vadScore: number }) => {
    const score = vadScore;
    if (sessionModeRef.current !== 'voice' || isUnmountingRef.current) return;
    const delta = Math.abs(score - lastVadScoreRef.current);
    const isSpeaking = score > VAD_THRESHOLD;
    if (delta > 0.02) {
      setVadScore(score);
      lastVadScoreRef.current = score;
    }
    if (lastIsSpeakingRef.current !== isSpeaking) {
      setIsUserSpeakingVAD(isSpeaking);
      lastIsSpeakingRef.current = isSpeaking;
    }
    if (DEBUG_VAD_TELEMETRY) {
      const now = Date.now();
      if (now - vadLogLastRef.current > 1500) {
        try {
          const fmt = (n: number) => Math.max(0, Math.min(1, n)).toFixed(3);
          console.log('[telemetry] vad', { score: fmt(score), isSpeaking });
        } catch {}
        vadLogLastRef.current = now;
      }
    }
  }, []);

  const handleVoiceInterruption = useCallback(() => {
    if (sessionModeRef.current !== 'voice') return;
    console.log('⚠️ User interrupted agent (voice mode)');
  }, []);

  const handleVoiceDebug = useCallback((message: unknown) => {
    console.log('🐛 Voice mode debug:', message);
  }, []);

  // ============================================================================
  // TEXT MODE CONVERSATION (WebSocket via React SDK)
  // ============================================================================
  const textConversation = useConversation({
    // CRITICAL: BOTH flags required for text-only mode to work without audio charges
    textOnly: true,  // SDK-level flag
    overrides: {
      conversation: {
        textOnly: true  // Runtime override
      }
    },

    // Register all client tools (now they work in text mode!)
    clientTools: createClientTools(actionHandlers ?? null),

    // Callbacks for text mode
    onConnect: () => {
      console.log('✅ Text WebSocket connected');
      setIsTextConnected(true);
      isTextConnectedRef.current = true;
      textConnectionStateRef.current = 'connected';
      resolveWaiters(textConnectWaitersRef);

      // Flush any queued text messages
      try {
        while (pendingTextQueueRef.current.length && textConversation.status === 'connected') {
          const msg = pendingTextQueueRef.current.shift()!;
          try {
            textConversation.sendUserMessage(truncateForTransport(msg));
          } catch (error) {
            console.error('Failed to flush queued text message', error);
          }
        }
      } catch (error) {
        console.error('Text queue flush failed', error);
      }
    },

    onDisconnect: (details: DisconnectionDetails) => {
      console.log('🔌 Text WebSocket disconnected', {
        reason: details.reason,
        currentConnectionState: textConnectionStateRef.current
      });

      // If we thought we were connected but the socket died, reset state
      // so the next sendTextMessage triggers a fresh startText().
      if (textConnectionStateRef.current === 'connected') {
        console.warn('⚠️ Text WebSocket dropped while connected — resetting to allow reconnect');
        textConnectionStateRef.current = 'idle';
        isTextConnectedRef.current = false;
        setIsTextConnected(false);
        textDynVarsAppliedRef.current = false;
        if (sessionModeRef.current === 'text') {
          setSessionMode('idle');
          sessionModeRef.current = 'idle';
        }
        resolveWaiters(textDisconnectWaitersRef);
        return;
      }

      // Ignore stale disconnects while connecting (old session teardown)
      if (textConnectionStateRef.current === 'connecting') {
        console.warn('⚠️ Ignoring disconnect event during connecting phase');
        return;
      }

      // Safe to reset state - we're truly idle
      setIsTextConnected(false);
      isTextConnectedRef.current = false;
      textDynVarsAppliedRef.current = false;

      if (sessionModeRef.current === 'text') {
        setSessionMode('idle');
        sessionModeRef.current = 'idle';
      }

      if (!isUnmountingRef.current) {
        setVadScore(0);
        setIsUserSpeakingVAD(false);
      }
      lastVadScoreRef.current = 0;
      lastIsSpeakingRef.current = false;

      resolveWaiters(textDisconnectWaitersRef);
    },

    onMessage: (event: unknown) => {
      console.log('📨 Text mode message received:', event);

      if (sessionModeRef.current !== 'text') {
        return;
      }

      const normalized = normalizeIncomingEvent(event);
      if (!normalized) return;

      emitToHandlers(textHandlersRef, {
        ...normalized,
        via: 'websocket',
        raw: event
      });
    },

    onError: (error: unknown) => {
      console.error('❌ Text mode error:', error);

      // Check for daily limit error
      const errorObj = (typeof error === 'object' && error !== null)
        ? (error as { code?: number; reason?: string })
        : undefined;
      if (errorObj?.code === 1008 || errorObj?.reason?.includes('daily limit')) {
        emitErrorToHandlers(textErrorHandlersRef, {
          code: errorObj.code || 1008,
          reason: errorObj.reason || 'Daily limit reached'
        });
      }
    },

    onDebug: (message: unknown) => {
      console.log('🐛 Text mode debug:', message);
    },
    onAgentToolResponse: (toolResponse: unknown) => {
      const tool = (typeof toolResponse === 'object' && toolResponse !== null)
        ? (toolResponse as ToolResponseLike)
        : {};
      console.log('🔧 Agent tool executed (text):', toolResponse);

      if (tool.tool_name === 'end_call' && tool.tool_type === 'system' && !tool.is_error) {
        console.log('📞 Agent called end_call in text mode - waiting for natural disconnect');
        // Server doesn't auto-disconnect, we need to trigger cleanup
        // Wait briefly for final messages, then force disconnect

        setTimeout(() => {
          if (sessionModeRef.current === 'text') {
            console.log('⏱️ Initiating text cleanup after end_call');
            stopText().catch(e => console.error('Cleanup after end_call failed:', e));
          }
        }, 2000);
      }
    },
    onInterruption: () => {
      if (sessionModeRef.current !== 'text') return;
      console.log('⚠️ User interrupted agent (text mode)');
    }
  });

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '';

  const stopVoice = useCallback(async () => {
    console.log('[stopVoice] Called', {
      sessionMode: sessionModeRef.current,
      status: voiceRef.current?.getStatus(),
      isTransitioning: transitionPromiseRef.current !== null
    });

    if (sessionModeRef.current !== 'voice') {
      console.log('[stopVoice] Skipping - not in voice mode');
      return;
    }

    await runTransition(async () => {
      console.log('[stopVoice] Inside transition');

      // Always try to end the session to force internal cleanup, even if status shows disconnected
      try {
        await voiceRef.current?.endSession();
      } catch {}

      // Wait briefly for onDisconnect/teardown to settle
      await new Promise(resolve => setTimeout(resolve, 250));

      // Force cleanup if onDisconnect didn't handle it
      if (sessionModeRef.current === 'voice') {
        console.log('[stopVoice] onDisconnect did not fire, forcing mode change');
        setSessionMode('idle');
        sessionModeRef.current = 'idle';
        voiceConnectionStateRef.current = 'idle';

        // Release cross-tab lock
        const currentLock = SessionLock.get();
        if (currentLock && currentLock.tabId === tabId) {
          SessionLock.clear();
          if (sessionChannel) {
            try {
              sessionChannel.postMessage({
                type: 'SESSION_ENDED',
                payload: { tabId, conversationId: conversationIdRef.current || '', mode: null, timestamp: Date.now() }
              } as SessionMessage);
            } catch {}
          }
        }
      }

      // Reset VAD state as part of forced cleanup
      if (!isUnmountingRef.current) {
        setVadScore(0);
        setIsUserSpeakingVAD(false);
      }
      lastVadScoreRef.current = 0;
      lastIsSpeakingRef.current = false;

      // Minimal, audio-only cleanup using tracked streams
      try {
        stopAllAudioStreams();
      } catch (error) {
        console.error('[stopVoice] Error during audio stream cleanup:', error);
      }

      conversationIdRef.current = null;
      console.log('[stopVoice] Completed');
    });
  }, [runTransition, tabId, sessionChannel]);

  // Keep the latest stopVoice available to earlier-declared callbacks
  useEffect(() => {
    stopVoiceFnRef.current = stopVoice;
  }, [stopVoice]);

  const stopText = useCallback(async () => {
    console.log('[ElevenLabsProvider] stopText invoked', {
      sessionMode: sessionModeRef.current,
      textConversationStatus: textConversation.status,
      tabId
    });

    if (sessionModeRef.current !== 'text' && textConversation.status === 'disconnected') {
      console.log('[ElevenLabsProvider] Not in text mode or already disconnected');
      return;
    }

    await runTransition(async () => {
      textConnectionStateRef.current = 'idle';

    // Register waiter BEFORE calling endSession to avoid race if disconnect happens immediately
    const disconnectPromise = waitForState(
      () => textConversation.status !== 'connected' || !isTextConnectedRef.current,
      textDisconnectWaitersRef,
      TEXT_DISCONNECT_TIMEOUT_MS,
      'Timed out waiting for text transport to disconnect'
    );

    if (textConversation.status === 'connected') {
      console.log('[ElevenLabsProvider] Ending text session');
      try {
        await textConversation.endSession();
      } catch (error) {
        console.error('[ElevenLabsProvider] Failed to end text session:', error);
      }
    }

    try {
      await disconnectPromise;
      console.log('[ElevenLabsProvider] Text transport disconnected successfully');
    } catch (error) {
      console.warn('[ElevenLabsProvider] Text transport disconnection timed out', error);
    }

      // Ensure any lingering audio tracks are stopped
      try {
        stopAllAudioStreams();
      } catch (error) {
        console.error('[ElevenLabsProvider] Error during text audio cleanup:', error);
      }
      // Don't set mode here - let onDisconnect handle it to ensure cleanup runs
      // setSessionMode('idle');
      // sessionModeRef.current = 'idle';
      conversationIdRef.current = null;
    });
  }, [runTransition, textConversation, tabId, sessionChannel]);

  // Cleanup on unmount and pagehide
  useEffect(() => {
    const onPageHide = () => {
      try { stopAllAudioStreams(); } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', onPageHide, { once: true });
    }
    return () => {
      try { stopAllAudioStreams(); } catch {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onPageHide);
      }
    };
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (sessionModeRef.current !== 'text' || textConnectionStateRef.current !== 'connected') {
      return;
    }

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      console.log('Text transport idle timeout – closing session');
      void stopText();
    }, TEXT_IDLE_CLOSE_MS);
  }, [stopText]);

  const startText = useCallback(async (conversationHistory?: string) => {
    if (isTextStartingRef.current) {
      if (typeof conversationHistory === 'string' && conversationHistory.length > 0) {
        pendingTextHistoryRef.current = conversationHistory;
        console.log('[ElevenLabsProvider] Queued pending text history while start is in progress', {
          length: conversationHistory.length
        });
      }
      console.log('[ElevenLabsProvider] startText skipped: already starting');
      return;
    }
    console.log('[ElevenLabsProvider] startText invoked', {
      sessionMode: sessionModeRef.current,
      textConversationStatus: textConversation.status,
      tabId,
      isOtherTabActive
    });
    isTextStartingRef.current = true;

    // Check if already in text mode and connected
    // Use our ref in addition to SDK status for more reliable state tracking
    if (sessionModeRef.current === 'text' && (textConversation.status === 'connected' || textConnectionStateRef.current === 'connected')) {
      if (conversationHistory && !textDynVarsAppliedRef.current) {
        console.log('[ElevenLabsProvider] Restarting text session to apply dynamic variables');
        try {
          // Ensure onDisconnect handler is not ignored
          textConnectionStateRef.current = 'idle';

          // Register waiter BEFORE calling endSession to avoid race
          const disconnectPromise = waitForState(
            () => textConversation.status !== 'connected' || !isTextConnectedRef.current,
            textDisconnectWaitersRef,
            TEXT_DISCONNECT_TIMEOUT_MS,
            'Timed out waiting for text transport to disconnect (reconfigure)'
          );

          await textConversation.endSession();
          await disconnectPromise;
        } catch {}
        // fall through to start a fresh session with dynamic variables
      } else {
        console.log('[ElevenLabsProvider] Text mode already active and connected');
        isTextStartingRef.current = false;
        return;
      }
    }

    try {
      await runTransition(async () => {
        console.log('[ElevenLabsProvider] Starting text mode transition');

        // Stop voice if active
        if (sessionModeRef.current === 'voice') {
          console.log('[ElevenLabsProvider] Stopping voice before starting text');
          await stopVoice();
        }

        setSessionMode('text');
        sessionModeRef.current = 'text';
        textConnectionStateRef.current = 'connecting';

        try {
          // Get signed URL for WebSocket connection.
          // First request on a cold deployment can intermittently fail; retry briefly.
          const fetchSignedUrl = async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            try {
              return await fetch('/api/elevenlabs/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_id: agentId }),
                signal: controller.signal
              });
            } finally {
              clearTimeout(timeout);
            }
          };

          console.log('[ElevenLabsProvider] Fetching signed URL for text mode');
          let response = await fetchSignedUrl();
          if (!response.ok) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            console.warn('[ElevenLabsProvider] Signed URL first attempt failed, retrying once', {
              status: response.status,
            });
            response = await fetchSignedUrl();
          }

          if (!response.ok) {
            throw new Error(`Failed to get signed URL: ${response.status}`);
          }

          const { signed_url } = await response.json();
          // Use pending history if none provided
          if (!conversationHistory && pendingTextHistoryRef.current) {
            conversationHistory = pendingTextHistoryRef.current;
          }
          const dv: Record<string, string | number | boolean> = {
            agent_context: CIEDEN_AGENT_CONTEXT,
            ...(typeof conversationHistory === 'string' && conversationHistory.length > 0
              ? { conversation_history: conversationHistory }
              : {})
          };
          console.log('[ElevenLabsProvider] Got signed URL, starting text session with dynamicVariables (agent_context + optional history)');

          // Start session with WebSocket (signedUrl triggers WebSocket mode)
          const conversationIdResult = await textConversation.startSession({
            signedUrl: signed_url,
            connectionType: 'websocket',
            dynamicVariables: dv
          });
          textDynVarsAppliedRef.current = typeof conversationHistory === 'string' && conversationHistory.length > 0;
          if (textDynVarsAppliedRef.current) {
            pendingTextHistoryRef.current = null;
          }

          console.log('[ElevenLabsProvider] Text session started:', conversationIdResult);

          // CRITICAL: Wait for connection (SDK doesn't queue messages!)
          // Check if already connected before waiting
          if (textConversation.status !== 'connected') {
            await waitForState(
              () => textConversation.status === 'connected' || textConnectionStateRef.current === 'connected',
              textConnectWaitersRef,
              TEXT_CONNECT_TIMEOUT_MS,
              'Timed out waiting for text transport to connect'
            );
          }

          console.log('[ElevenLabsProvider] Text transport connected successfully');

          // Store conversation ID
          conversationIdRef.current = conversationIdResult || null;

          // Text mode is now concurrent across tabs: no locks or start broadcasts

        } catch (error) {
          const isAbort = error instanceof Error && error.name === 'AbortError';
          if (isAbort) {
            console.warn('[ElevenLabsProvider] Signed URL request timed out or was aborted');
          } else {
            console.error('[ElevenLabsProvider] Failed to start text session:', error);
            try {
              const err = error as { code?: unknown; reason?: unknown; wasClean?: boolean };
              const details = {
                code: err?.code,
                reason: err?.reason,
                wasClean: err?.wasClean,
              };
              if (details.code != null || details.reason != null || typeof details.wasClean === 'boolean') {
                console.warn('[ElevenLabsProvider] WebSocket close details:', details);
              }
            } catch {
              // ignore
            }
          }
          textConnectionStateRef.current = 'idle';
          setSessionMode('idle');
          sessionModeRef.current = 'idle';
          if (!isAbort) throw error;
        }
      });
    } finally {
      isTextStartingRef.current = false;
      // If a pending history was queued while starting and not yet applied, re-start with it
      if (!textDynVarsAppliedRef.current && pendingTextHistoryRef.current) {
        const pending = pendingTextHistoryRef.current;
        pendingTextHistoryRef.current = null;
        if (typeof pending === 'string' && pending.length > 0) {
          // Fire and forget to avoid blocking the current call stack
          setTimeout(() => {
            void startText(pending);
          }, 0);
        }
      }
    }
  }, [runTransition, stopVoice, textConversation, agentId, tabId, isOtherTabActive, sessionChannel]);

  useEffect(() => {
    if (!TEXT_WS_AUTOSTART) {
      return;
    }
    if (hasAutostartedRef.current) {
      return;
    }
    // Don't autostart if already in voice mode
    if (sessionModeRef.current !== 'idle') {
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    hasAutostartedRef.current = true;
    // Wait briefly for pending conversation history, but keep first-turn latency low.
    (async () => {
      const MAX_WAIT_MS = 150;
      const STEP_MS = 50;
      const start = Date.now();
      try {
        while (!pendingTextHistoryRef.current && (Date.now() - start) < MAX_WAIT_MS) {
          await new Promise(r => setTimeout(r, STEP_MS));
        }
        await startText(pendingTextHistoryRef.current ?? undefined);
      } catch (error) {
        console.error('Failed to autostart ElevenLabs text session:', error);
        hasAutostartedRef.current = false;
      }
    })();
  }, [startText]);

  const startVoice = useCallback(async (_initialGreeting?: string, conversationHistory?: string) => {
    if (!agentId) {
      throw new Error('NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not configured');
    }

    // Reset transport readiness before starting a new connection attempt
    setIsVoiceTransportConnected(false);

    const appliedVoicePreferences = { ...voicePreferences };
    try {
      console.log('[startVoice] Applied voice preferences', appliedVoicePreferences);
    } catch {}

    // Force takeover if another non-stale voice session exists in a different tab
    const existingLock = SessionLock.get();
    if (existingLock?.mode === 'voice' && !isSessionStale(existingLock) && existingLock.tabId !== tabId) {
      console.log('🎤 Forcing previous voice session to stop');
      if (sessionChannel) {
        try {
          sessionChannel.postMessage({
            type: 'FORCE_STOP_VOICE',
            payload: { newOwner: tabId }
          } as SessionMessage);
        } catch {
          // ignore
        }
      }
      const takeoverStart = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      await new Promise(r => setTimeout(r, 300));
      try {
        const waited =
          (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) -
          takeoverStart;
        if (isDiagnosticsEnabled()) {
          perfLog('voice.force_stop_previous_tab_wait', { waitedMs: Math.round(waited) });
        }
      } catch {}
    }

    if (sessionModeRef.current === 'voice' && voiceRef.current?.getStatus() === 'connected') {
      return;
    }

    // Non-blocking cleanup of any existing text session; do not await
    if (
      textConversation.status === 'connected' ||
      textConversation.status === 'connecting' ||
      textConnectionStateRef.current === 'connected'
    ) {
      // Set to 'idle' so onDisconnect handler processes the event (not ignored as stale)
      textConnectionStateRef.current = 'idle';
      try {
        void textConversation.endSession();
      } catch {}
    }

    await runTransition(async () => {
      setSessionMode('voice');
      sessionModeRef.current = 'voice';
      voiceConnectionStateRef.current = 'connecting';
      // Clear any stale waiters from previous sessions
      rejectWaiters(voiceConnectWaitersRef, new Error('Clearing stale waiters - starting new voice session'));
      rejectWaiters(voiceDisconnectWaitersRef, new Error('Clearing stale waiters - starting new voice session'));

      // Start session with only the required parameters
      // Note: clientTools are defined in useConversation so they work in both text and voice modes
      let voiceConversationId: string | undefined | null = null;
      // Do not send overrides.agent.firstMessage: ElevenLabs rejects the session when the agent
      // has "first_message" overrides disabled (Analysis shows: "Override for field 'first_message' is not allowed by config").
      // Greeting comes from the agent's configured First message in the ElevenLabs dashboard.

      const buildVoiceOverrides = () => {
        const ttsOverrides: { voiceId?: string; speed?: number } = {};

        if (appliedVoicePreferences.voiceId) {
          ttsOverrides.voiceId = appliedVoicePreferences.voiceId;
        }

        if (appliedVoicePreferences.speed != null) {
          ttsOverrides.speed = appliedVoicePreferences.speed;
        }

        const overrides: {
          tts?: { voiceId?: string; speed?: number };
        } = {};

        if (Object.keys(ttsOverrides).length > 0) {
          overrides.tts = ttsOverrides;
        }

        return overrides;
      };

      try {
        console.log('[startVoice] Attempt 1/2: starting voice session');
        const dv1: Record<string, string | number | boolean> = {
          agent_context: CIEDEN_AGENT_CONTEXT,
          ...(typeof conversationHistory === 'string' && conversationHistory.length > 0
            ? { conversation_history: conversationHistory }
            : {})
        };
        // Mount a fresh transport for this attempt and wait for it to be ready
        const attemptId = crypto.randomUUID();
        const readyPromise = new Promise<void>(resolve => { voiceMountReadyCallback.current = resolve; });
        setVoiceAttemptId(attemptId);
        // Perf: create timer and mark enter as soon as attemptId is known
        const timer1 = startPerfTimer('voice.start', { attemptId, attempt: 1 });
        attemptTimersRef.current.set(attemptId, timer1);
        timer1.mark('enter', { prefs: appliedVoicePreferences });
        await readyPromise;
        timer1.mark('transport_mounted');

        const overrides1 = buildVoiceOverrides();
        try {
          console.log('[startVoice] Attempt 1 overrides payload', JSON.stringify(overrides1));
          console.log('[startVoice] voicePreferences at call time:', JSON.stringify(appliedVoicePreferences));
        } catch {}

        timer1.mark('startSession_call');
        voiceConversationId = await voiceRef.current!.startSession({
          agentId,
          connectionType: "webrtc",
          dynamicVariables: dv1,
          overrides: overrides1
        });
        timer1.mark('startSession_return', { conversationId: voiceConversationId || undefined });

        await waitForState(
          () => voiceConnectionStateRef.current === 'connected' || voiceRef.current?.getStatus() === 'connected',
          voiceConnectWaitersRef,
          VOICE_CONNECT_TIMEOUT_MS,
          'Timed out waiting for voice transport connection'
        );
        timer1.mark('connected');
      } catch (err) {
        // Optional fallback: if parallel sessions are not allowed, quickly stop text and retry once
        console.warn('[startVoice] Attempt 1 failed. Fast-stopping text and retrying voice start...', err);
        try {
          const id = voiceAttemptIdRef.current || undefined;
          if (id) {
            attemptTimersRef.current.get(id)?.mark('attempt1_failed', {
              reason: err instanceof Error ? err.message : String(err)
            });
          }
        } catch {}
        try {
          // Fast-stop text if connected
          const fastStopStart = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
          await fastStopText(textConversation, textConnectionStateRef, textDisconnectWaitersRef, 'fast-stop', 1500);
          try {
            const waited =
              (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) -
              fastStopStart;
            const id = voiceAttemptIdRef.current || undefined;
            if (id) {
              attemptTimersRef.current.get(id)?.mark('fast_stop_text_done', { ms: Math.round(waited) });
            } else if (isDiagnosticsEnabled()) {
              perfLog('voice.fast_stop_text_done', { ms: Math.round(waited) });
            }
          } catch {}

          // Clear any stale voice connect waiters before retrying
          rejectWaiters(voiceConnectWaitersRef, new Error('Clearing stale waiters - retrying voice session'));

          // Re-establish voice mode before retry to prevent UI state flicker
          // This ensures isRecording/isCallActive stay true during the retry window
          setSessionMode('voice');
          sessionModeRef.current = 'voice';
          voiceConnectionStateRef.current = 'connecting';

          console.log('[startVoice] Attempt 2/2: retrying voice session start');
          const dv2: Record<string, string | number | boolean> = {
            agent_context: CIEDEN_AGENT_CONTEXT,
            ...(typeof conversationHistory === 'string' && conversationHistory.length > 0
              ? { conversation_history: conversationHistory }
              : {})
          };
          // New attemptId to force remount
          const attemptId2 = crypto.randomUUID();
          const readyPromise2 = new Promise<void>(resolve => { voiceMountReadyCallback.current = resolve; });
          setVoiceAttemptId(attemptId2);
          const timer2 = startPerfTimer('voice.start', { attemptId: attemptId2, attempt: 2 });
          attemptTimersRef.current.set(attemptId2, timer2);
          timer2.mark('enter', { prefs: appliedVoicePreferences });
          await readyPromise2;
          timer2.mark('transport_mounted');

          const overrides2 = buildVoiceOverrides();
          try {
            console.log('[startVoice] Attempt 2 overrides payload', overrides2);
          } catch {}

          timer2.mark('startSession_call');
          voiceConversationId = await voiceRef.current!.startSession({
            agentId,
            connectionType: "webrtc",
            dynamicVariables: dv2,
            overrides: overrides2
          });
          timer2.mark('startSession_return', { conversationId: voiceConversationId || undefined });

          await waitForState(
            () => voiceConnectionStateRef.current === 'connected' || voiceRef.current?.getStatus() === 'connected',
            voiceConnectWaitersRef,
            5000,
            'Timed out waiting for voice transport connection (retry)'
          );
          timer2.mark('connected');
        } catch (retryErr) {
          setSessionMode('idle');
          sessionModeRef.current = 'idle';
          voiceConnectionStateRef.current = 'idle';
          throw retryErr;
        }
      }

      lastAppliedVoicePreferencesRef.current = { ...appliedVoicePreferences };

      // Store conversation ID
      conversationIdRef.current = voiceConversationId || voiceRef.current?.getId?.() || null;

      // Acquire cross-tab lock AFTER successful connection
      const sessionState: SessionState = {
        conversationId: voiceConversationId || voiceRef.current?.getId?.() || '',
        mode: 'voice',
        tabId,
        timestamp: Date.now()
      };

      SessionLock.set(sessionState);
      console.log('🔒 Acquired session lock for voice mode');
      // Perf: lock acquired
      try {
        const id = voiceAttemptIdRef.current || undefined;
        if (id) {
          attemptTimersRef.current.get(id)?.mark('lock_acquired', { attemptId: id });
        } else if (isDiagnosticsEnabled()) {
          perfLog('voice.lock_acquired', {});
        }
      } catch {}

      // Broadcast to other tabs
      if (sessionChannel) {
        try {
          sessionChannel.postMessage({
            type: 'SESSION_STARTED',
            payload: sessionState
          } as SessionMessage);
        } catch {
          // Ignore if channel is closed
        }
      }
    });
  }, [agentId, runTransition, tabId, sessionChannel, voicePreferences]);

  const restartVoiceIfActive = useCallback(async () => {
    await waitForNoTransition();

    if (sessionModeRef.current !== 'voice' || voiceRef.current?.getStatus() !== 'connected') {
      return;
    }

    if (shallowEqualVoicePreferences(voicePreferences, lastAppliedVoicePreferencesRef.current)) {
      return;
    }

    console.log('[ElevenLabsProvider] Restarting voice session to apply new preferences', {
      requested: voicePreferences,
      applied: lastAppliedVoicePreferencesRef.current
    });

    try {
      await stopVoice();
      await startVoice();
    } catch (error) {
      console.error('[ElevenLabsProvider] Failed to restart voice session with updated preferences', error);
    }
  }, [startVoice, stopVoice, voicePreferences, waitForNoTransition]);

  /** Pull site KB excerpts into the agent via contextual update (feature-flagged). */
  const injectSiteKbContextIfEnabled = useCallback(
    async (userText: string) => {
      if (process.env.NEXT_PUBLIC_CIEDEN_KB_CONTEXT !== 'true') return;
      const t = userText.trim();
      if (t.length < 3) return;
      if (
        t.startsWith('TOOL_CALL:') ||
        t.startsWith('[ESTIMATE') ||
        t.startsWith('__GUEST_') ||
        t.includes('[ESTIMATE MODE]')
      ) {
        return;
      }

      let contextBlock: string | undefined;
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        if (!origin) return;
        const res = await fetch(`${origin}/api/kb/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: t, limit: 8 }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { contextBlock?: string };
        contextBlock = data.contextBlock?.trim();
      } catch {
        return;
      }
      if (!contextBlock) return;

      const isTextMode = sessionModeRef.current === 'text';
      const activeConv = (
        isTextMode
          ? textConversation
          : (voiceRef.current?.getConversation() ?? textConversation)
      ) as ConversationLike;

      if (activeConv.status !== 'connected') return;

      const payload = truncateForTransport(contextBlock);
      if (typeof activeConv.sendContextualUpdate === 'function') {
        activeConv.sendContextualUpdate(payload);
      } else if (isTextMode && typeof activeConv.sendUserMessage === 'function') {
        try {
          activeConv.sendUserMessage(`[CONTEXT_UPDATE]: ${payload}`);
        } catch {
          /* ignore */
        }
      }
    },
    [textConversation],
  );

  const sendVoiceMessage = useCallback(
    async (message: string) => {
      if (sessionModeRef.current !== 'voice') {
        console.warn('Cannot send voice message: not in voice mode');
        return;
      }

      if (voiceRef.current?.getStatus() !== 'connected') {
        console.warn('Cannot send voice message: not connected');
        return;
      }

      const trimmed = message.trim();
      try {
        await injectSiteKbContextIfEnabled(trimmed);
      } catch {
        /* optional KB */
      }

      console.log('📤 Sending voice message:', message);
      try {
        voiceRef.current?.sendUserMessage(truncateForTransport(message));
      } catch (error) {
        console.error('Failed to send voice message:', error);
      }
    },
    [injectSiteKbContextIfEnabled],
  );

  const sendTextMessage = useCallback(async (message: string): Promise<boolean> => {
    // Shortcut: if user types a tool name (e.g. "show_cases", "show balance"), run that tool only — don't also send to agent to avoid duplicate cards
    const trimmed = message.trim();
    const toolKey = trimmed.toLowerCase().replace(/\s+/g, '_');
    const handlers = actionHandlers ?? null;
    if (handlers && typeof (handlers as Record<string, unknown>)[toolKey] === 'function') {
      try {
        await (handlers as Record<string, (p: unknown) => Promise<unknown>>)[toolKey]({});
        return true; // card already shown; skip sending to agent
      } catch (e) {
        console.error('Tool shortcut failed:', e);
      }
    }

    const isEstimate = trimmed.includes('[ESTIMATE MODE]') || trimmed.includes('ESTIMATE MODE');
    if (!isEstimate) {
      try {
        await injectSiteKbContextIfEnabled(trimmed);
      } catch {
        /* optional KB */
      }
    }

    // Support sending text while in voice mode via WebRTC
    if (sessionModeRef.current === 'voice') {
      if (voiceRef.current?.getStatus() === 'connected') {
        try {
          voiceRef.current?.sendUserMessage(truncateForTransport(message));
          return true;
        } catch (error) {
          console.error('Failed to send text message via WebRTC:', error);
          return false;
        }
      }
      // Queue and ensure connection attempt is underway
      // IMPORTANT: queue must also be truncated, because flush later sends the queued raw msg.
      enqueueMessage(pendingVoiceQueueRef.current, truncateForTransport(message));
      try {
        await startVoice();
      } catch {}
      return true; // queued successfully
    }

    // Default: text mode via WebSocket
    // Check both SDK status and our ref for reliability
    if (textConversation.status === 'connected' || (sessionModeRef.current === 'text' && textConnectionStateRef.current === 'connected')) {
      try {
        textConversation.sendUserMessage(truncateForTransport(message));
        return true;
      } catch (error) {
        console.error('Failed to send text message via WebSocket:', error);
        return false;
      }
    }

    // Queue and ensure connection attempt is underway
    // Ensure queued payload is also truncated.
    enqueueMessage(pendingTextQueueRef.current, truncateForTransport(message));
    try {
      await startText();
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Failed to start text transport';
      emitErrorToHandlers(textErrorHandlersRef, { code: 0, reason });
      return false;
    }
    return true; // queued successfully
  }, [
    actionHandlers,
    enqueueMessage,
    injectSiteKbContextIfEnabled,
    startText,
    startVoice,
    textConversation,
  ]);

  // NOTE: We intentionally avoid ending sessions in a generic effect cleanup because
  // React StrictMode and HMR can trigger cleanup immediately after connect in dev.

  const registerTextHandler = useCallback<ElevenLabsContextValue['registerTextHandler']>((handler) => {
    textHandlersRef.current.add(handler);
    return () => {
      textHandlersRef.current.delete(handler);
    };
  }, []);

  const registerVoiceHandler = useCallback<ElevenLabsContextValue['registerVoiceHandler']>((handler) => {
    voiceHandlersRef.current.add(handler);
    return () => {
      voiceHandlersRef.current.delete(handler);
    };
  }, []);

  const registerTextErrorHandler = useCallback<ElevenLabsContextValue['registerTextErrorHandler']>((handler) => {
    textErrorHandlersRef.current.add(handler);
    return () => {
      textErrorHandlersRef.current.delete(handler);
    };
  }, []);

  const queueToolMessage = useCallback((content: string, metadata?: Record<string, unknown>) => {
    // Use buffered persistence hook - automatically queues if conversationId is null
    // and flushes when it becomes available
    handleAgentMessage(content, {
      ...metadata,
      toolCall: true,
      timestamp: Date.now()
    }).catch(error => {
      console.error('Failed to queue/save tool message:', error);
    });
  }, [handleAgentMessage]);

  return (
    <ElevenLabsContext.Provider
      value={{
        // Expose the active conversation based on mode
        conversation: (sessionModeRef.current === 'voice'
          ? (voiceRef.current?.getConversation() ?? textConversation)
          : textConversation),
        sessionMode,
        isTransitioning,
        isTextConnected,
        isVoiceTransportConnected,
        streamId: currentStreamId,

        // Cross-tab state
        isOtherTabActive,
        otherTabMode,
        tabId,

        // VAD state
        vadScore,
        isUserSpeakingVAD,

        // Methods
        startText,
        stopText,
        startVoice,
        stopVoice,
        sendTextMessage,
        sendVoiceMessage,
        queueToolMessage,
        registerTextHandler,
        registerVoiceHandler,
        registerTextErrorHandler,
        resetTextIdleTimer: resetIdleTimer,
        sendContextualUpdateOverSocket: (text: string) => {
          // Only allow non-empty strings to be sent to the SDK/agent
          if (typeof text !== 'string' || text.trim().length === 0) {
            return false;
          }
          const isText = sessionModeRef.current === 'text';
          const activeConv = (isText ? textConversation : (voiceRef.current?.getConversation() ?? textConversation)) as ConversationLike;
          if (activeConv.status === 'connected') {
            if (typeof activeConv.sendContextualUpdate === 'function') {
              activeConv.sendContextualUpdate(truncateForTransport(text));
              return true;
            }
            if (isText && typeof activeConv.sendUserMessage === 'function') {
              try {
                activeConv.sendUserMessage(`[CONTEXT_UPDATE]: ${truncateForTransport(text)}`);
                return true;
              } catch {}
            }
          }
          return false;
        },
        setVoicePreferences: updateVoicePreferences,
        restartVoiceIfActive,
        setPendingConversationHistory
      }}
    >
      {voiceAttemptId && (
        <VoiceTransport
          key={voiceAttemptId}
          ref={voiceRef}
          attemptId={voiceAttemptId}
          onMountReady={() => voiceMountReadyCallback.current?.()}
          // Hook-level options (callbacks, tools)
          micMuted={false}
          volume={1.0}
          clientTools={clientToolsMemo}
          onStatusChange={handleVoiceStatus}
          onDisconnect={handleVoiceDisconnect}
          onMessage={handleVoiceMessage}
          onError={handleVoiceError}
          onAgentToolResponse={handleVoiceAgentTool}
          onVadScore={handleVoiceVad}
          onInterruption={handleVoiceInterruption}
          onDebug={handleVoiceDebug}
        />
      )}
      {children}
    </ElevenLabsContext.Provider>
  );
}

export function useElevenLabsConversation() {
  const context = useContext(ElevenLabsContext);
  if (!context) {
    throw new Error('useElevenLabsConversation must be used within ElevenLabsProvider');
  }
  return context;
}
