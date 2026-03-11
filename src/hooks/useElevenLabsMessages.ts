import { useCallback, useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface UseElevenLabsMessagesProps {
  conversationId: Id<"conversations"> | null;
}

export function useElevenLabsMessages({ conversationId }: UseElevenLabsMessagesProps) {
  const createMessage = useMutation(api.messages.create);
  
  // Buffer messages that arrive before conversationId is ready
  const pendingRef = useRef<Array<{ kind: 'agent' | 'user' | 'system'; message: string; metadata?: Record<string, unknown> }>>([]);

  // Flush buffered messages when conversationId becomes available
  useEffect(() => {
    if (!conversationId) return;
    if (pendingRef.current.length === 0) return;

    const toFlush = [...pendingRef.current];
    pendingRef.current = [];

    (async () => {
      for (const item of toFlush) {
        try {
          if (item.kind === 'agent') {
            await createMessage({
              conversationId,
              content: item.message,
              role: 'assistant',
              source: 'voice',
              metadata: {
                ...item.metadata,
                elevenLabsAgent: true,
                timestamp: Date.now(),
                buffered: true,
              },
            });
          } else if (item.kind === 'user') {
            const isTextMessage = item.metadata?.messageType === 'text';
            await createMessage({
              conversationId,
              content: item.message,
              role: 'user',
              source: isTextMessage ? 'text' : 'voice',
              metadata: {
                ...item.metadata,
                [isTextMessage ? 'elevenLabsTextMessage' : 'voiceTranscript']: true,
                timestamp: Date.now(),
                buffered: true,
              },
            });
          } else if (item.kind === 'system') {
            await createMessage({
              conversationId,
              content: item.message,
              role: 'system',
              source: 'voice',
              metadata: {
                ...item.metadata,
                systemEvent: true,
                timestamp: Date.now(),
                buffered: true,
              },
            });
          }
        } catch (error) {
          console.error('❌ Failed to flush buffered message:', error);
        }
      }
    })();
  }, [conversationId, createMessage]);
  
  const handleAgentMessage = useCallback(async (message: string, metadata?: Record<string, unknown>) => {
    if (!conversationId) {
      console.warn('No conversation ID yet; buffering ElevenLabs agent message');
      pendingRef.current.push({ kind: 'agent', message, metadata });
      return undefined;
    }

    try {
      console.log('💾 Saving ElevenLabs agent message to Convex:', message.slice(0, 100));
      
      const messageId = await createMessage({
        conversationId,
        content: message,
        role: 'assistant',
        source: 'voice',
        metadata: {
          ...metadata,
          elevenLabsAgent: true,
          timestamp: Date.now(),
        },
      });

      console.log('✅ ElevenLabs agent message saved:', messageId);
      return messageId;
    } catch (error) {
      console.error('❌ Failed to save ElevenLabs agent message:', error);
      throw error;
    }
  }, [conversationId, createMessage]);

  const handleUserMessage = useCallback(async (message: string, metadata?: Record<string, unknown>) => {
    if (!conversationId) {
      console.warn('No conversation ID yet; buffering user message');
      pendingRef.current.push({ kind: 'user', message, metadata });
      return undefined;
    }

    try {
      // Determine if this is a text message or voice transcript based on metadata
      const isTextMessage = metadata?.messageType === 'text';
      const source = isTextMessage ? 'text' : 'voice';
      
      console.log(`💾 Saving user ${source} message to Convex:`, message.slice(0, 100));
      
      const messageId = await createMessage({
        conversationId,
        content: message,
        role: 'user',
        source,
        metadata: {
          ...metadata,
          [isTextMessage ? 'elevenLabsTextMessage' : 'voiceTranscript']: true,
          timestamp: Date.now(),
        },
      });

      console.log(`✅ User ${source} message saved:`, messageId);
      return messageId;
    } catch (error) {
      console.error('❌ Failed to save user message:', error);
      throw error;
    }
  }, [conversationId, createMessage]);

  const handleSystemMessage = useCallback(async (message: string, metadata?: Record<string, unknown>) => {
    if (!conversationId) {
      console.warn('No conversation ID yet; buffering system message');
      pendingRef.current.push({ kind: 'system', message, metadata });
      return undefined;
    }

    try {
      console.log('💾 Saving system message to Convex:', message.slice(0, 100));
      
      const messageId = await createMessage({
        conversationId,
        content: message,
        role: 'system',
        source: 'voice',
        metadata: {
          ...metadata,
          systemEvent: true,
          timestamp: Date.now(),
        },
      });

      console.log('✅ System message saved:', messageId);
      return messageId;
    } catch (error) {
      console.error('❌ Failed to save system message:', error);
      throw error;
    }
  }, [conversationId, createMessage]);

  return {
    handleAgentMessage,
    handleUserMessage,
    handleSystemMessage,
  };
}