"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useElevenLabsMessages } from '@/src/hooks/useElevenLabsMessages';
import {
  useElevenLabsConversation,
  type NormalizedMessageEvent
} from '@/src/providers/ElevenLabsProvider';
import { ActionHandlers } from '@/src/utils/toolBridge';
import { buildDynamicVariables, extractContextFromMessages } from '@/src/utils/agentContext';
import { CIEDEN_FIRST_MESSAGE } from '@/src/config/ciedenAgentContext';
import { useContextInjection } from '@/src/hooks/useContextInjection';
import { testMicrophoneAccess, checkMediaPermissions } from '@/src/utils/debugAudio';
import { startPerfTimer, isDiagnosticsEnabled } from '@/src/utils/perf';
import { getGuestIdentityFromCookie } from '@/src/utils/guestIdentity';

interface UseVoiceRecordingProps {
  conversationId?: Id<"conversations"> | null;
  onTranscript?: (transcript: string) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'listening' | 'speaking') => void;
  onAgentAudioLevel?: (level: number) => void;
  actionHandlers?: ActionHandlers;
}

export function useVoiceRecording({
  conversationId,
  onTranscript,
  onStatusChange,
  onAgentAudioLevel,
  actionHandlers
}: UseVoiceRecordingProps) {
  // Inject recent context once per session (shared behavior with text)
  useContextInjection({ conversationId: conversationId || null });
  const ENABLE_AUDIO_DEBUG = false;
  const [isRecording, setIsRecording] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  // NOTE: Waveform data used by GoMode component for decorative visualization
  // Real-time audio levels are in ElevenLabsProvider.vadScore (user) and Web Audio API (agent)
  const [userWaveformData, setUserWaveformData] = useState<number[]>(new Array(50).fill(0));
  const [agentWaveformData, setAgentWaveformData] = useState<number[]>(new Array(50).fill(0));
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const conversationRef = useRef<any>(null);

  // Convex mutations
  const startStream = useMutation(api.streaming.startStreamingTranscript);
  const updateStream = useMutation(api.streaming.updateStreamingTranscript);

  // ElevenLabs message bridge
  const { handleAgentMessage, handleUserMessage } = useElevenLabsMessages({
    conversationId: conversationId || null
  });

  // Get conversation history for context
  const guestId = getGuestIdentityFromCookie()?.guestId;
  const messages = useQuery(
    api.messages.list,
    conversationId
      ? {
          conversationId,
          ...(guestId ? { guestId } : {}),
        }
      : "skip"
  );

  // Get conversation from provider
  const {
    conversation,
    startVoice,
    stopVoice,
    sessionMode,
    registerVoiceHandler,
    streamId,
    sendVoiceMessage: sendVoiceTransportMessage,
    sendContextualUpdateOverSocket
  } = useElevenLabsConversation();

  const handlerUnsubscribeRef = useRef<(() => void) | null>(null);
  const streamGuardRef = useRef(false);
  const contextSentRef = useRef(false);
  const previousSessionModeRef = useRef<'idle' | 'text' | 'voice'>(sessionMode);
  const lastStatusRef = useRef<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const DEBUG_VOICE = false;
  const isStartingRef = useRef(false);

  // Store conversation ref for later use
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Handle voice session connection
  useEffect(() => {
    const previousMode = previousSessionModeRef.current;
    previousSessionModeRef.current = sessionMode;

    if (sessionMode === 'voice' && previousMode !== 'voice') {
      console.log('🔌 Voice connected successfully via provider');
      setIsRecording(true);

      contextSentRef.current = false;

      if (conversationId && !streamGuardRef.current) {
        const newStreamId = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        streamGuardRef.current = true;
        startStream({
          conversationId,
          streamId: newStreamId,
          userId: "current-user"
        }).then(() => {
          setCurrentStreamId(newStreamId);
          console.log('📝 Created voice transcript stream:', newStreamId);
        }).catch((error: any) => {
          streamGuardRef.current = false;
          console.error('Failed to create voice transcript stream:', error);
        });
      } else if (streamId) {
        setCurrentStreamId(streamId);
        streamGuardRef.current = true;
      }
    }

    // Context injection now handled by useContextInjection

    if (sessionMode === 'idle' && previousMode === 'voice') {
      console.log('🔌 Voice disconnected');
      setIsRecording(false);
      setVoiceStatus('idle');
      onStatusChange?.('idle');

      contextSentRef.current = false;

      // Cleanup stream state (messages already saved individually)
      if (currentStreamId) {
        setCurrentStreamId(null);
      }

      streamGuardRef.current = false;
    }
  }, [sessionMode, conversation, messages, conversationId, currentStreamId, streamId, startStream, updateStream, onStatusChange]);

  // Create message handler with useCallback to prevent infinite loops
  const handleMessage = useCallback(async (event: NormalizedMessageEvent) => {
    const source = event?.source;
    const message = event?.message;
    if (!message) return;

    if (ENABLE_AUDIO_DEBUG) {
      console.log('📩 Voice Message Event:', {
        source,
        message: message.substring(0, 100),
        status: conversation?.status
      });
    }

    if (source === 'user') {
      // User said something - show transcript
      setTranscript(message);
      onTranscript?.(message);

      // Save user message to Convex
      handleUserMessage(message, {
        isVoice: true,
        elevenLabsTranscript: true,
        timestamp: Date.now()
      }).catch((error: any) => {
        console.error('Failed to save user voice message:', error);
      });

      // Update stream with user transcript if exists
      if (currentStreamId) {
        updateStream({
          streamId: currentStreamId,
          content: `User: ${message}`,
          isComplete: false
        }).catch((error: any) => {
          console.error('Failed to update voice transcript stream:', error);
        });
      }
    } else if (source === 'ai') {
      // Agent response - save to Convex
      handleAgentMessage(message, {
        elevenLabsVoiceResponse: true,
        timestamp: Date.now()
      }).catch((error: any) => {
        console.error('Failed to save agent voice message:', error);
      });

      // Update stream with agent response if exists
      if (currentStreamId) {
        updateStream({
          streamId: currentStreamId,
          content: `Agent: ${message}`,
          isComplete: false
        }).catch((error: any) => {
          console.error('Failed to update voice transcript stream:', error);
        });
      }
    }
  }, [currentStreamId, updateStream, handleAgentMessage, handleUserMessage, onTranscript, conversation?.status, ENABLE_AUDIO_DEBUG]);

  // Setup message handler
  useEffect(() => {
    handlerUnsubscribeRef.current?.();
    handlerUnsubscribeRef.current = registerVoiceHandler(handleMessage);
    return () => {
      handlerUnsubscribeRef.current?.();
      handlerUnsubscribeRef.current = null;
    };
  }, [handleMessage, registerVoiceHandler]);

  // Voice status monitoring (agent speaking state + audio level)
  useEffect(() => {
    if (!isRecording || conversation?.status !== 'connected') return;

    const interval = setInterval(() => {
      const conv = conversationRef.current;
      if (conv) {
        // Track agent speaking state from SDK
        const isSpeaking = conv.isSpeaking || false;
        const newStatus: 'speaking' | 'listening' = isSpeaking ? 'speaking' : 'listening';
        setVoiceStatus(newStatus);
        if (lastStatusRef.current !== newStatus) {
          onStatusChange?.(newStatus);
          lastStatusRef.current = newStatus;
        }

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

            if (DEBUG_VOICE) {
              try { console.debug('[voice] agentLevel', { normalizedLevel, bins: frequencyData.length }); } catch (_) {}
            }
            // Notify parent component
            onAgentAudioLevel?.(normalizedLevel);
          } else if (isSpeaking) {
            // Soft fallback if SDK returned no data while speaking
            onAgentAudioLevel?.(0.5);
          }
        } else if (isSpeaking) {
          // Soft fallback if frequency API is not available in the current environment
          onAgentAudioLevel?.(0.5);
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isRecording, conversation?.status]);

  // User speaking detection (simplified - real VAD is in provider)
  // This is kept for backward compatibility with local hook state
  useEffect(() => {
    // Simple detection: user is potentially speaking when in listening mode
    const isLikelyListening = voiceStatus === 'listening' && isRecording;

    setIsUserSpeaking(isLikelyListening);

    if (ENABLE_AUDIO_DEBUG) {
      console.log('🎤 Voice status:', {
        voiceStatus,
        isRecording,
        isUserSpeaking: isLikelyListening
      });
    }
  }, [voiceStatus, isRecording, ENABLE_AUDIO_DEBUG]);

  const startRecording = useCallback(async () => {
    if (isStartingRef.current) {
      console.log('⏭️ Voice session already starting, skipping');
      return;
    }
    isStartingRef.current = true;
    try {
      const startTime = performance.now();
      const perfTimer = startPerfTimer('voice.hook_start');
      console.log('🎬 Starting voice call...');

      // Check if session is already active
      if (sessionMode === 'voice') {
        console.log('⚡ Voice session already active');
        setIsRecording(true);
        return;
      }

      // REMOVED: Manual getUserMedia call that was interfering with SDK
      // The ElevenLabs SDK will handle microphone permissions internally
      // when starting the WebRTC session

      setVoiceStatus('connecting');
      onStatusChange?.('connecting');

      console.log('🚀 Initiating voice session via provider...');

      // Debug: Test microphone access before starting voice
      if (ENABLE_AUDIO_DEBUG) {
        console.log('🎤 Running microphone test...');
        checkMediaPermissions();
        const micTest = await testMicrophoneAccess();
        console.log('🎤 Microphone test result:', micTest);
      }

      // Wait up to 500ms only if messages are undefined to avoid losing prior context on first load
      const waitStart = performance.now();
      let tries = 0;
      while (typeof messages === 'undefined' && tries < 10) {
         
        await new Promise(r => setTimeout(r, 50));
        tries++;
      }
      const waitForMessagesMs = performance.now() - waitStart;
      if (isDiagnosticsEnabled()) {
        perfTimer.mark('waitForMessages_done', { waitForMessagesMs: Math.round(waitForMessagesMs) });
      }

      const prior = Array.isArray(messages)
        ? messages.map(m => ({ role: m.role, content: m.content || '' }))
        : [];

      // Use larger token budget only for voice starts
      const buildHistoryStart = performance.now();
      const conversationHistory = prior.length
        ? extractContextFromMessages(prior, 2000)
        : undefined;
      const buildHistoryMs = performance.now() - buildHistoryStart;
      if (isDiagnosticsEnabled()) {
        perfTimer.mark('buildHistory_done', { buildHistoryMs: Math.round(buildHistoryMs), priorCount: prior.length });
      }

      const hasAssistantHistory = Array.isArray(messages) && messages.some(m => m.role === 'assistant');
      const initialGreeting = hasAssistantHistory ? '' : CIEDEN_FIRST_MESSAGE;

      const providerStart = performance.now();
      await startVoice(initialGreeting, conversationHistory);
      const providerMs = performance.now() - providerStart;
      if (isDiagnosticsEnabled()) {
        perfTimer.mark('provider_done', { providerMs: Math.round(providerMs) });
      }

      const totalSetupMs = performance.now() - startTime;
      console.log(`🎯 Total setup time: ${totalSetupMs}ms`);
      if (isDiagnosticsEnabled()) {
        perfTimer.mark('complete', {
          totalSetupMs: Math.round(totalSetupMs),
        });
      }

    } catch (error) {
      console.error('❌ Failed to start voice session:', error);
      setVoiceStatus('idle');
      setIsRecording(false);
      onStatusChange?.('idle');
    } finally {
      isStartingRef.current = false;
    }
  }, [sessionMode, startVoice, onStatusChange, messages]);

  const stopRecording = useCallback(async () => {
    try {
      await stopVoice();
      setIsRecording(false);
      setVoiceStatus('idle');
      onStatusChange?.('idle');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [stopVoice, onStatusChange]);

  const sendMessage = useCallback(async (message: string) => {
    // Use ref to get latest conversation without causing re-renders
    const conv = conversationRef.current;
    if (!isRecording || conv?.status !== 'connected') {
      console.warn('Cannot send message: not recording or not connected');
      return;
    }

    try {
      await sendVoiceTransportMessage(message);
      console.log('📤 Sent user message via voice conversation');
    } catch (error) {
      console.error('Failed to send user message:', error);
    }
  }, [isRecording, sendVoiceTransportMessage]);

  const sendContextualUpdate = useCallback((context: string) => {
    // STRICT TYPE CHECK - reject non-strings (prevents infinite loop state setter issues)
    if (typeof context !== 'string') {
      console.error('❌ Invalid contextual update type:', typeof context, context);
      return false;
    }

    // Reject empty/whitespace-only strings
    if (context.trim().length === 0) {
      console.warn('⚠️ Empty contextual update ignored');
      return false;
    }

    const conv = conversationRef.current;
    const convStatus = conv?.status;
    console.log('🔄 Routing contextual update:', { sessionMode, convStatus, context: context.substring(0, 100) });

    // Route based on session mode and connection status
    if (sessionMode === 'voice' || convStatus === 'connected') {
      // Use SDK WebRTC for voice mode
      if (conv?.status !== 'connected') {
        console.warn('⚠️ Cannot send contextual update: voice conversation not connected', {
          status: conv?.status,
          sessionMode
        });
        return false;
      }

      try {
        if (typeof conv?.sendContextualUpdate === 'function') {
          conv.sendContextualUpdate(context);
          console.log('📚 Sent contextual update via SDK WebRTC:', context);
          return true;
        } else {
          console.warn('sendContextualUpdate function not available on conversation');
          return false;
        }
      } catch (error) {
        console.error('Failed to send contextual update via SDK:', error);
        return false;
      }
    } else if (sessionMode === 'text') {
      // Use custom WebSocket for text mode
      if (typeof sendContextualUpdateOverSocket === 'function') {
        return sendContextualUpdateOverSocket(context);
      } else {
        console.warn('sendContextualUpdateOverSocket not available');
        return false;
      }
    } else {
      console.warn('Cannot send contextual update: no active session', { sessionMode });
      return false;
    }
  }, [sessionMode, sendContextualUpdateOverSocket]);

  return {
    // Core functions
    startRecording,
    stopRecording,
    sendVoiceMessage: sendMessage,
    sendContextualUpdate,

    // State
    isRecording,
    isUserSpeaking,
    voiceStatus,
    transcript,

    // Visualization data (may be unused - see Phase 4 audit)
    userWaveformData,
    agentWaveformData,

    // Direct conversation access (for advanced use)
    conversation,
  };
}
