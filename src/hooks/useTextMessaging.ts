import { useCallback, useRef, useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useElevenLabsMessages } from './useElevenLabsMessages';
import {
  useElevenLabsConversation,
  type NormalizedMessageEvent
} from '@/src/providers/ElevenLabsProvider';
import { ActionHandlers } from '@/src/utils/toolBridge';
import { useContextInjection } from '@/src/hooks/useContextInjection';

interface UseTextMessagingProps {
  conversationId: Id<"conversations"> | null;
  actionHandlers?: ActionHandlers; // optional, accepted for compatibility
}

export function useTextMessaging({ conversationId, actionHandlers }: UseTextMessagingProps) {
  // Inject recent context once per text session connection
  useContextInjection({ conversationId });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const responseResolverRef = useRef<((msg: string) => void) | null>(null);
  const lastUserMessageIdRef = useRef<string | undefined>(undefined);

  // Get conversation history for context
  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );

  // Hook for storing messages in Convex
  const { handleAgentMessage, handleUserMessage } = useElevenLabsMessages({ conversationId });

  // Get conversation from provider
  const {
    conversation,
    sendTextMessage: sendMessage,
    resetTextIdleTimer,
    startText,
    sessionMode,
    registerTextHandler
  } = useElevenLabsConversation();

  // Create message handler with useCallback to prevent infinite loops
  const handleMessage = useCallback(async (event: NormalizedMessageEvent) => {
    const source = event?.source;
    const message = event?.message;
    if (!message) return;

    if (source === 'ai') {
      // Persist AI messages
      try {
        await handleAgentMessage(message, {
          elevenLabsTextResponse: true,
          via: 'websocket',
          timestamp: Date.now(),
          userMessageId: lastUserMessageIdRef.current
        });
      } catch (e) {
        console.error('❌ Failed to save AI message:', e);
      }
      // Resolve waiter if present
      if (responseResolverRef.current) {
        responseResolverRef.current(message);
        responseResolverRef.current = null;
      }
    }
  }, [handleAgentMessage]);

  // Setup message handler
  useEffect(() => {
    const unsubscribe = registerTextHandler(handleMessage);
    return () => {
      unsubscribe();
    };
  }, [handleMessage, registerTextHandler]);


  const sendTextMessage = useCallback(async (message: string) => {
    if (!conversationId || !message.trim()) {
      console.warn('❌ Cannot send message: missing conversationId or empty message');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📤 Sending text message:', message.slice(0, 100));

      // Save user message to Convex (display immediately)
      const userMessageId = await handleUserMessage(message, {
        messageType: 'text',
        timestamp: Date.now()
      });

      console.log('✅ User text message saved:', userMessageId);
      lastUserMessageIdRef.current = userMessageId;

      // Ensure text session is active
      if (sessionMode !== 'voice') {
        await startText();
      }

      // Prepare a one-time waiter for the first AI reply after sending
      const aiReplyPromise = new Promise<string>((resolve) => {
        responseResolverRef.current = resolve;
      });

      // Send the message via provider
      const didSend = await sendMessage(message.trim());
      if (!didSend) {
        console.warn('ElevenLabs text transport reported a send failure.');
      }
      resetTextIdleTimer();

      // Await AI reply with timeout safeguard
      const timeoutMs = 25000;
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => {
          if (responseResolverRef.current) responseResolverRef.current = null;
          reject(new Error('Timed out waiting for AI reply'));
        }, timeoutMs);
      });

      let aiResponse = '';
      try {
        aiResponse = await Promise.race([aiReplyPromise, timeoutPromise]);
      } catch (e) {
        console.warn('⌛ No AI reply within timeout');
      }

      // Activity -> reset idle timer and keep session open for subsequent messages
      resetTextIdleTimer();

      return {
        userMessageId,
        agentMessageId: undefined,
        response: aiResponse || undefined
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Text messaging error:', {
        error: err,
        message: errorMessage,
        conversationStatus: conversation.status,
        conversationId
      });

      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, handleUserMessage, conversation, sessionMode, startText, sendMessage, resetTextIdleTimer]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendTextMessage,
    isLoading,
    error,
    clearError,
    conversationHistory: messages || [],
  };
}
