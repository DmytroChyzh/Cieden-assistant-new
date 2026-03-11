"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useElevenLabsMessages } from '@/src/hooks/useElevenLabsMessages';
import { Id } from '@/convex/_generated/dataModel';
import {
  useElevenLabsConversation,
  type NormalizedMessageEvent
} from '@/src/providers/ElevenLabsProvider';
import { extractContextFromMessages } from '@/src/utils/agentContext';

interface UseTextInputProps {
  conversationId?: Id<"conversations"> | null;
  onMessage?: (message: string) => void;
  onDailyLimitReached?: (error: { code: number; reason: string }) => void;
  /** Optional handler for messages before a conversation / auth is ready */
  onPreAuthMessage?: (message: string) => Promise<void> | void;
}

export function useTextInput({
  conversationId,
  onMessage,
  onDailyLimitReached,
  onPreAuthMessage
}: UseTextInputProps) {
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buffered persistence for messages until conversationId is available
  const { handleUserMessage } = useElevenLabsMessages({ conversationId: conversationId ?? null });

  // Direct mutation for AI responses (not buffered - AI only responds after conversationId exists)
  const createMessage = useMutation(api.messages.create);

  const {
    sessionMode,
    startText,
    sendTextMessage: sendViaProvider,
    registerTextHandler,
    registerTextErrorHandler,
    resetTextIdleTimer,
    isTextConnected,
    setPendingConversationHistory
  } = useElevenLabsConversation();

  // Get conversation history for context (used to pass dynamic variables at session start)
  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );

  // Persist AI responses from the ElevenLabs WebSocket
  useEffect(() => {
    const unsubscribe = registerTextHandler(async (event: NormalizedMessageEvent) => {
      if (event.source !== 'ai' || event.via !== 'websocket') return;
      if (!conversationId) return;

      try {
        await createMessage({
          conversationId,
          content: event.message,
          role: 'assistant',
          source: 'text',
          metadata: {
            elevenLabsTextResponse: true,
            via: 'websocket',
            timestamp: Date.now()
          }
        });
      } catch (error) {
        console.error('Failed to persist ElevenLabs text response:', error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, createMessage, registerTextHandler]);

  // Surface transport errors (e.g. daily limit reached)
  useEffect(() => {
    const unsubscribe = registerTextErrorHandler((error) => {
      console.error('🚫 ElevenLabs text transport error:', error);
      onDailyLimitReached?.(error);
    });
    return () => {
      unsubscribe();
    };
  }, [onDailyLimitReached, registerTextErrorHandler]);

  // Handle typing indicator
  const handleInputChange = useCallback((text: string) => {
    setTextInput(text);
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, []);

  // Send text message
  const sendTextMessage = useCallback(async () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;

    // Pre-auth / no-conversation flow: let caller handle onboarding logic and skip Convex/ElevenLabs
    if (!conversationId) {
      setTextInput('');
      onMessage?.(trimmed);
      if (onPreAuthMessage) {
        await onPreAuthMessage(trimmed);
      }
      return;
    }

    setTextInput('');
    setCanSend(false);

    try {
      console.log('📝 Sending text message via ElevenLabs:', trimmed);

      // Optimistically reflect in UI
      onMessage?.(trimmed);

      // Persist user message via buffered hook (handles missing conversationId)
      try {
        await handleUserMessage(trimmed, {
          messageType: 'text',
          via: sessionMode === 'voice' ? 'webrtc' : 'websocket',
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Failed to persist user text message:', error);
      }

      if (sessionMode !== 'voice') {
        // Wait briefly for prior messages to load (previous session only)
        let tries = 0;
        while (typeof messages === 'undefined' && tries < 10) {
          // 10 * 50ms = 500ms max
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, 50));
          tries++;
        }

        const prior = Array.isArray(messages)
          ? messages.map(m => ({ role: m.role, content: m.content || '' }))
          : [];
        const conversationHistory = prior.length
          ? extractContextFromMessages(prior)
          : undefined;

        console.log('[useTextInput] startText history debug (prior only)', {
          loaded: typeof messages !== 'undefined',
          count: Array.isArray(messages) ? messages.length : 0,
          hasHistory: !!conversationHistory,
          length: conversationHistory?.length ?? 0,
          preview: conversationHistory ? conversationHistory.slice(0, 400) : '(none)'
        });

        // Seed pending history for provider autostart or next session
        setPendingConversationHistory?.(conversationHistory);
        // Only start if not connected to avoid restarts
        if (!isTextConnected) {
          await startText(conversationHistory);
        }
      }

      let didSend = await sendViaProvider(trimmed);
      if (!didSend && sessionMode === 'text') {
        // Retry once after brief delay (SDK status may be syncing)
        console.log('⚠️ First send attempt failed, retrying after 100ms...');
        await new Promise(resolve => setTimeout(resolve, 100));
        didSend = await sendViaProvider(trimmed);
      }

      if (!didSend) {
        throw new Error('Text transport reported a send failure');
      }

      resetTextIdleTimer();
    } catch (error) {
      console.error('Failed to send ElevenLabs text message:', error);
      setTextInput(trimmed);
    } finally {
      setCanSend(true);
    }
  }, [conversationId, textInput, onMessage, createMessage, sessionMode, startText, sendViaProvider, resetTextIdleTimer, messages, isTextConnected, setPendingConversationHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Send a specific message directly (for programmatic sends)
  const sendSpecificMessage = useCallback(async (message: string) => {
    if (!conversationId) {
      console.warn('❌ Cannot send text: missing conversationId');
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) return;

    try {
      console.log('📝 Sending specific message via ElevenLabs:', trimmed);

      // Optimistically reflect in UI
      onMessage?.(trimmed);

      // Persist user message immediately for chat history
      try {
        await createMessage({
          conversationId,
          content: trimmed,
          role: 'user',
          source: 'text',
          metadata: {
            via: sessionMode === 'voice' ? 'webrtc' : 'websocket',
            timestamp: Date.now()
          }
        });
      } catch (error) {
        console.error('Failed to persist user text message:', error);
      }

      if (sessionMode !== 'voice') {
        let tries = 0;
        while (typeof messages === 'undefined' && tries < 10) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, 50));
          tries++;
        }

        const prior = Array.isArray(messages)
          ? messages.map(m => ({ role: m.role, content: m.content || '' }))
          : [];
        const conversationHistory = prior.length
          ? extractContextFromMessages(prior)
          : undefined;

        console.log('[useTextInput] startText (specific) history debug (prior only)', {
          loaded: typeof messages !== 'undefined',
          count: Array.isArray(messages) ? messages.length : 0,
          hasHistory: !!conversationHistory,
          length: conversationHistory?.length ?? 0,
          preview: conversationHistory ? conversationHistory.slice(0, 400) : '(none)'
        });
        // Seed pending history and only start if not connected
        setPendingConversationHistory?.(conversationHistory);
        if (!isTextConnected) {
          await startText(conversationHistory);
        }
      }

      let didSend = await sendViaProvider(trimmed);
      if (!didSend && sessionMode === 'text') {
        // Retry once after brief delay (SDK status may be syncing)
        console.log('⚠️ First send attempt failed, retrying after 100ms...');
        await new Promise(resolve => setTimeout(resolve, 100));
        didSend = await sendViaProvider(trimmed);
      }

      if (!didSend) {
        throw new Error('Text transport reported a send failure');
      }

      resetTextIdleTimer();
    } catch (error) {
      console.error('Failed to send ElevenLabs text message:', error);
      throw error;
    }
  }, [conversationId, onMessage, createMessage, sessionMode, startText, sendViaProvider, resetTextIdleTimer, messages, isTextConnected, setPendingConversationHistory]);

  // Apply prior-only history once messages are loaded (handles autostart race)
  const priorHistoryAppliedRef = useRef(false);
  useEffect(() => {
    if (priorHistoryAppliedRef.current) return;
    // Only for text mode workflows (do nothing if in voice)
    if (sessionMode === 'voice') return;
    if (!Array.isArray(messages) || messages.length === 0) return;

    const prior = messages.map(m => ({ role: m.role, content: m.content || '' }));
    const conversationHistory = prior.length
      ? extractContextFromMessages(prior)
      : undefined;

    if (conversationHistory && conversationHistory.length > 0) {
      priorHistoryAppliedRef.current = true;
      console.log('[useTextInput] applying prior-only history (pending seed)', {
        count: messages.length,
        length: conversationHistory.length,
        preview: conversationHistory.slice(0, 400)
      });
      // Seed history so provider autostart can use it; avoid restart if connected
      setPendingConversationHistory?.(conversationHistory);
      if (!isTextConnected) {
        void startText(conversationHistory);
      }
    }
  }, [messages, sessionMode, startText, isTextConnected, setPendingConversationHistory]);

  return {
    textInput,
    setTextInput: handleInputChange,
    sendTextMessage,
    sendSpecificMessage,
    isTyping,
    canSend,
    isWebSocketConnected: isTextConnected
  };
}
