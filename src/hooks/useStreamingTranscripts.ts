/**
 * React Hook for Streaming Transcripts
 * 
 * This hook integrates ElevenLabs voice streaming with Convex real-time updates
 * for proof of concept development. Focus on core functionality and UX.
 */

import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface StreamingTranscriptOptions {
  conversationId: Id<"conversations">;
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}

export function useStreamingTranscripts({
  conversationId,
  onInterimTranscript,
  onFinalTranscript
}: StreamingTranscriptOptions) {
  
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamIdRef = useRef<string | null>(null);
  
  // Convex mutations and queries
  const startStream = useMutation(api.streaming.startStreamingTranscript);
  const updateStream = useMutation(api.streaming.updateStreamingTranscript);
  const activeStreams = useQuery(api.streaming.getStreamingTranscripts, { conversationId });
  
  // Start a new transcript stream
  const startTranscriptStream = useCallback(async () => {
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await startStream({
        conversationId,
        streamId,
      });
      
      setCurrentStreamId(streamId);
      streamIdRef.current = streamId;
      setIsStreaming(true);
      
      return streamId;
    } catch (error) {
      console.error('Failed to start transcript stream:', error);
      return null;
    }
  }, [conversationId, startStream]);
  
  // Handle interim transcript updates
  const handleInterimTranscript = useCallback(async (text: string) => {
    if (!streamIdRef.current || !text.trim()) return;
    
    try {
      await updateStream({
        streamId: streamIdRef.current,
        content: text,
        isComplete: false,
      });
      
      onInterimTranscript?.(text);
    } catch (error) {
      console.error('Failed to update interim transcript:', error);
    }
  }, [updateStream, onInterimTranscript]);
  
  // Handle final transcript
  const handleFinalTranscript = useCallback(async (text: string) => {
    if (!streamIdRef.current || !text.trim()) return;
    
    try {
      await updateStream({
        streamId: streamIdRef.current,
        content: text,
        isComplete: true,
      });
      
      onFinalTranscript?.(text);
      
      // Reset stream state
      setCurrentStreamId(null);
      streamIdRef.current = null;
      setIsStreaming(false);
      
    } catch (error) {
      console.error('Failed to finalize transcript:', error);
    }
  }, [updateStream, onFinalTranscript]);
  
  // Cancel current stream
  const cancelStream = useCallback(() => {
    setCurrentStreamId(null);
    streamIdRef.current = null;
    setIsStreaming(false);
  }, []);
  
  return {
    // State
    currentStreamId,
    isStreaming,
    activeStreams,
    
    // Actions
    startTranscriptStream,
    handleInterimTranscript,
    handleFinalTranscript,
    cancelStream,
  };
}