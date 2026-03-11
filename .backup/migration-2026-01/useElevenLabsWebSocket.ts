"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface WebSocketTranscriptEvent {
  type: 'user_transcript';
  user_transcription_event: {
    user_transcript: string;
  };
}

interface WebSocketAgentResponseEvent {
  type: 'agent_response';
  agent_response_event: {
    agent_response: string;
  };
}

interface WebSocketEvent {
  type: string;
  [key: string]: unknown;
}

interface UseElevenLabsWebSocketProps {
  agentId: string;
  conversationId?: Id<"conversations"> | null;
  onUserTranscript?: (transcript: string) => void;
  onAgentResponse?: (response: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  onDailyLimitReached?: (error: { code: number; reason: string }) => void;
  initialContext?: Array<{ role: 'user' | 'assistant'; content: string }>; // Optional initial context
  textOnly?: boolean; // Metadata flag for tracking text-only connections
}

export function useElevenLabsWebSocket({
  agentId,
  conversationId,
  onUserTranscript,
  onAgentResponse,
  onConnectionChange,
  onDailyLimitReached,
  initialContext,
  textOnly = false
}: UseElevenLabsWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const lastConnectTimeRef = useRef<number>(0);
  const triedSignedRef = useRef(false);
  const initSentRef = useRef(false);
  const initializedRef = useRef(false);
  const pendingMessagesRef = useRef<string[]>([]);
  const createdStreamRef = useRef(false);

  // Convex mutations for streaming
  const createStream = useMutation(api.streaming.createTranscriptStream);
  const updateStream = useMutation(api.streaming.updateStreamingTranscript);
  const completeStream = useMutation(api.streaming.completeTranscriptStream);

  const connect = useCallback(async (webrtcConversationId?: string | null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket already connecting, skipping duplicate request');
      return;
    }
    
    // Debounce rapid connections to prevent React lifecycle issues
    const now = Date.now();
    if (now - lastConnectTimeRef.current < 1000) {
      console.log('🚫 Connection debounced - too soon after last attempt');
      return;
    }
    lastConnectTimeRef.current = now;

    const openWebSocket = (url: string, usingSigned: boolean) => {
      const ws = new WebSocket(url);
      
      ws.onopen = async () => {
        console.log('✅ WebSocket connected successfully (transcript listening mode)');
        triedSignedRef.current = usingSigned || triedSignedRef.current;
        initSentRef.current = false;
        initializedRef.current = false;
        createdStreamRef.current = false;

        // Determine if we need to send conversation initiation
        // ALWAYS send init for text-only mode to ensure override is applied
        // For voice mode, only send if it's a new conversation (not joining existing WebRTC)
        const shouldSendInit = textOnly || (!usingSigned && !url.includes('conversation_id'));

        console.log('🔍 Init payload decision:', {
          usingSigned,
          hasConversationId: url.includes('conversation_id'),
          textOnly,
          shouldSendInit,
          reason: shouldSendInit
            ? (textOnly ? 'text-only mode requires override' : 'new conversation')
            : 'joining existing conversation'
        });

        if (shouldSendInit) {
          console.log('🗣️ Sending conversation initiation over WebSocket');
          try {
            const initPayload = {
              type: 'conversation_initiation_client_data',
              conversation_initiation_client_data: {
                agent_id: agentId,
                conversation_config_override: {
                  agent: {
                    first_message: '',
                  },
                  conversation: {
                    text_only: textOnly,
                  },
                },
                metadata: {
                  source: textOnly ? 'text_only_ws' : 'text_ws',
                },
              },
            } as Record<string, unknown>;

            console.log('[useElevenLabsWebSocket] sending init payload', JSON.stringify(initPayload));
            ws.send(JSON.stringify(initPayload));
            initSentRef.current = true;
          } catch (e) {
            console.error('❌ Failed to send WS initiation payload:', e);
          }
        } else {
          console.log('⏭️ Skipping init payload - joining existing conversation');
        }

        setIsConnected(true);
        reconnectAttempts.current = 0;

        console.log('[useElevenLabsWebSocket] onConnectionChange(true)');
        onConnectionChange?.(true);
      };

      ws.onmessage = async (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          
          // Enhanced logging for all WebSocket events
          console.log('🔍 WebSocket Event:', {
            type: data.type,
            timestamp: new Date().toISOString(),
            eventData: data
          });

          switch (data.type) {
            case 'user_transcript':
              const transcriptEvent = data as unknown as WebSocketTranscriptEvent;
              const userTranscript = transcriptEvent.user_transcription_event.user_transcript;
              
              console.log('📝 User Transcript (WebSocket):', userTranscript);
              
              // Stream to Convex
              if (currentStreamId) {
                try {
                  await updateStream({
                    streamId: currentStreamId,
                    content: userTranscript,
                    isComplete: true // WebSocket sends final transcripts
                  });
                } catch (error) {
                  console.error('Failed to update WebSocket stream:', error);
                }
              }
              
              onUserTranscript?.(userTranscript);
              break;

            case 'agent_response':
              const responseEvent = data as unknown as WebSocketAgentResponseEvent;
              const agentResponse = responseEvent.agent_response_event.agent_response;
              
              console.log('🤖 Agent Response (WebSocket):', agentResponse);
              onAgentResponse?.(agentResponse);
              break;

            case 'ping':
              // Server heartbeat; no client action required in application protocol
              const pingEvent = (data as { ping_event?: { event_id?: string; ping_ms?: number; [key: string]: unknown } }).ping_event;
              console.log('📡 Ping received (no reply sent)', {
                eventId: pingEvent?.event_id,
                pingMs: pingEvent?.ping_ms
              });
              break;

            case 'conversation_initiation_metadata':
              const metadataEvent = (data as { conversation_initiation_metadata_event?: { conversation_id?: string; agent_output_audio_format?: string; user_input_audio_format?: string; [key: string]: unknown } }).conversation_initiation_metadata_event;

              // Check if audio formats are present when text_only is true
              if (textOnly && (metadataEvent?.agent_output_audio_format || metadataEvent?.user_input_audio_format)) {
                console.error('🚨 AGENT CONFIGURATION ERROR:', {
                  issue: 'Agent is sending audio formats despite text_only: true',
                  conversationId: metadataEvent?.conversation_id,
                  audioFormat: metadataEvent?.agent_output_audio_format,
                  inputFormat: metadataEvent?.user_input_audio_format,
                  textOnly,
                  solution: [
                    '1. Go to ElevenLabs Dashboard',
                    '2. Navigate to agent Security tab',
                    '3. Enable "Allow conversation overrides"',
                    '4. Alternatively, set agent default to text_only: true in Conversation tab'
                  ]
                });
              } else {
                console.log('🎬 Conversation initiated successfully:', {
                  conversationId: metadataEvent?.conversation_id,
                  audioFormat: metadataEvent?.agent_output_audio_format,
                  inputFormat: metadataEvent?.user_input_audio_format,
                  fullData: data
                });
              }
              initializedRef.current = true;
              // Create Convex stream once per initiated conversation
              if (conversationId && !createdStreamRef.current) {
                try {
                  const streamId = await createStream({ conversationId });
                  setCurrentStreamId(streamId);
                  createdStreamRef.current = true;
                  console.log('📝 Created WebSocket transcript stream:', streamId);
                } catch (error) {
                  console.error('Failed to create WebSocket transcript stream:', error);
                }
              }
              // Send initial context if provided
              if (initialContext && initialContext.length > 0 && !createdStreamRef.current) {
                console.log(`📚 Sending ${initialContext.length} messages as initial context`);
                const contextMessage = `Previous conversation:\n${initialContext.map(m => `${m.role}: ${m.content}`).join('\n')}`;
                try {
                  ws.send(JSON.stringify({
                    type: 'contextual_update',
                    contextual_update: contextMessage
                  }));
                  console.log('✅ Initial context sent via WebSocket');
                } catch (e) {
                  console.error('❌ Failed to send initial context:', e);
                }
              }

              // Flush any pending messages queued before init
              if (pendingMessagesRef.current.length > 0) {
                const queue = [...pendingMessagesRef.current];
                pendingMessagesRef.current = [];
                queue.forEach(msg => {
                  try {
                    ws.send(JSON.stringify({ type: 'user_message', text: msg }));
                  } catch (e) {
                    console.error('❌ Failed to flush queued message:', e);
                  }
                });
              }
              break;

            case 'audio':
              // Audio events should NOT arrive in text-only mode
              const audioEvent = (data as { audio_event?: { event_id?: string; audio_base_64?: string; [key: string]: unknown } }).audio_event;
              if (textOnly) {
                console.warn('⚠️ Received audio event in text-only mode (should not happen)', {
                  eventId: audioEvent?.event_id,
                  hasAudio: !!audioEvent?.audio_base_64,
                  textOnly,
                  message: 'Agent may not respect text_only override - check ElevenLabs dashboard Security settings'
                });
              } else {
                console.log('🔊 Audio event received (expected in voice mode)', {
                  eventId: audioEvent?.event_id,
                  hasAudio: !!audioEvent?.audio_base_64
                });
              }
              break;

            case 'agent_response_correction':
              const correctionEvent = (data as { agent_response_correction_event?: { original_agent_response?: string; corrected_agent_response?: string; [key: string]: unknown } }).agent_response_correction_event;
              console.log('✏️ Agent Response Correction:', {
                original: correctionEvent?.original_agent_response,
                corrected: correctionEvent?.corrected_agent_response
              });
              // Update the agent response if callback provided
              if (correctionEvent?.corrected_agent_response) {
                onAgentResponse?.(correctionEvent.corrected_agent_response);
              }
              break;

            case 'client_tool_call':
              const toolCall = (data as { client_tool_call?: { tool_name?: string; tool_call_id?: string; parameters?: Record<string, unknown>; [key: string]: unknown } }).client_tool_call;
              console.log('🛠️ Client Tool Call:', {
                toolName: toolCall?.tool_name,
                toolCallId: toolCall?.tool_call_id,
                parameters: toolCall?.parameters
              });
              // TODO: Implement client-side tool execution
              console.warn('⚠️ Client tool calls not yet implemented');
              break;

            case 'agent_tool_response':
              const toolResponse = (data as { agent_tool_response?: { tool_name?: string; tool_call_id?: string; tool_type?: string; is_error?: boolean; [key: string]: unknown } }).agent_tool_response;
              console.log('🤖🛠️ Agent Tool Response:', {
                toolName: toolResponse?.tool_name,
                toolCallId: toolResponse?.tool_call_id,
                toolType: toolResponse?.tool_type,
                isError: toolResponse?.is_error
              });
              
              // Handle specific tools
              if (toolResponse?.tool_name === 'end_call') {
                console.log('📞 Agent ended the call using End Call tool');
                // The WebRTC connection should handle the actual disconnection
              } else if (toolResponse?.tool_name === 'skip_turn') {
                console.log('⏭️ Agent used skip turn tool');
              } else if (toolResponse?.tool_name?.includes('transfer')) {
                console.log('📞 Agent initiated call transfer:', toolResponse.tool_name);
              } else if (toolResponse?.is_error) {
                console.warn(`❌ Agent tool ${toolResponse.tool_name} failed`);
              } else {
                console.log(`🛠️ Agent used tool: ${toolResponse?.tool_name}`);
              }
              break;

            case 'vad_score':
              const vadEvent = (data as { vad_score_event?: { vad_score?: number; [key: string]: unknown } }).vad_score_event;
              // Only log high confidence scores to avoid spam
              if (vadEvent?.vad_score && vadEvent.vad_score > 0.7) {
                console.log('🎤 Voice Activity Detected:', {
                  score: vadEvent.vad_score,
                  confidence: vadEvent.vad_score > 0.9 ? 'high' : 'medium'
                });
              }
              break;

            default:
              console.log('❓ Unknown WebSocket event type:', {
                type: data.type,
                keys: Object.keys(data),
                fullData: data
              });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = async (event) => {
        console.log('🔌 WebSocket disconnected - DETAILED:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          timestamp: new Date().toISOString(),
          agentId: agentId,
          wsUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`
        });
        
        // If unauthorized and we haven't tried a signed URL, fetch and retry with signed URL
        const unauthorized = event.code === 3000 || (event.reason && event.reason.toLowerCase().includes('authorize'));
        if (unauthorized && !triedSignedRef.current) {
          try {
            console.log('🔁 Falling back to signed URL after authorization failure...');
            const resp = await fetch('/api/elevenlabs/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agent_id: agentId })
            });
            if (!resp.ok) {
              const txt = await resp.text();
              throw new Error(`Signed URL fetch failed: ${resp.status} ${txt}`);
            }
            const data = await resp.json();
            const signedUrl = data?.signed_url as string | undefined;
            if (!signedUrl) throw new Error('Signed URL missing in response');
            triedSignedRef.current = true;
            console.log('🔐 Reconnecting with signed URL');
            // Replace current socket with signed one
            wsRef.current = null;
            initSentRef.current = false;
            initializedRef.current = false;
            createdStreamRef.current = false;
            openWebSocket(signedUrl, true);
            return; // Do not proceed with generic reconnection flow
          } catch (e) {
            console.error('❌ Signed URL fallback failed:', e);
          }
        } else if (unauthorized && triedSignedRef.current) {
          // Stop reconnection loop if already tried signed and still unauthorized
          console.error('🚫 Authorization failed even with signed URL; stopping reconnection attempts.');
          setIsConnected(false);
          console.log('[useElevenLabsWebSocket] onConnectionChange(false) due to unauthorized');
          onConnectionChange?.(false);
          return;
        }
        
        // Check for daily limit reached error
        const isDailyLimitReached = event.code === 4300 || 
          (event.reason && event.reason.toLowerCase().includes('daily limit'));
        
        if (isDailyLimitReached) {
          console.error('🚫 DAILY LIMIT REACHED:', {
            code: event.code,
            reason: event.reason,
            message: 'ElevenLabs agent has reached its daily limit. Reconnection disabled.',
            agentId: agentId
          });
          
          // Notify parent component about daily limit
          onDailyLimitReached?.({
            code: event.code,
            reason: event.reason
          });
          
          // Stop any pending reconnection attempts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          reconnectAttempts.current = maxReconnectAttempts; // Prevent further attempts
        }
        
        // Specific error 1006 analysis
        if (event.code === 1006) {
          console.error('❌ ERROR 1006: Abnormal closure detected:', {
            possibleCauses: [
              'Agent authentication required (enable_auth: true)',
              'Invalid agent ID: ' + agentId,
              'Agent requires allowlist configuration (add localhost:3000)',
              'Network connectivity issue',
              'ElevenLabs service issue'
            ],
            recommendations: [
              'Check agent settings in ElevenLabs dashboard',
              'Verify agent ID is correct',
              'Add "localhost:3000" to agent allowlist',
              'Enable authentication and use signed URLs',
              'Check browser network console for more details'
            ],
            agentId: agentId,
            currentOrigin: window?.location?.origin || 'unknown',
            url: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`
          });
        }
        
        setIsConnected(false);
        console.log('[useElevenLabsWebSocket] onConnectionChange(false) via onclose');
        onConnectionChange?.(false);
        
        // Complete stream on disconnect
        if (currentStreamId) {
          completeStream({ streamId: currentStreamId }).catch(console.error);
          setCurrentStreamId(null);
        }

        // Attempt reconnection if not intentional (exclude normal close, abnormal close, and daily limit)
        if (event.code !== 1000 && event.code !== 1006 && !isDailyLimitReached && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (isDailyLimitReached) {
          console.log('🚫 Reconnection disabled due to daily limit reached');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error - DETAILED:', {
          error: error,
          agentId: agentId,
          timestamp: new Date().toISOString(),
          wsUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`,
          errorType: error.type || 'unknown',
          errorTarget: error.target || 'unknown'
        });
        setIsConnected(false);
        console.log('[useElevenLabsWebSocket] onConnectionChange(false) due to onerror');
        onConnectionChange?.(false);
      };

      wsRef.current = ws;
    };

    try {
      console.log('🔌 Connecting to ElevenLabs WebSocket...');
      console.log('🔍 Agent ID verification:', {
        agentId,
        agentIdLength: agentId?.length,
        agentIdType: typeof agentId,
        envVar: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
        isValidFormat: /^agent_[a-z0-9]+$/.test(agentId || '')
      });

      // Prefer signed URL first to avoid authorization closes
      try {
        console.log('🔐 Requesting signed URL for initial connection...');
        const resp = await fetch('/api/elevenlabs/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agentId })
        });
        if (resp.ok) {
          const data = await resp.json();
          const signedUrl = data?.signed_url as string | undefined;
          if (signedUrl) {
            triedSignedRef.current = true;
            openWebSocket(signedUrl, true);
            return;
          }
        } else {
          console.warn('⚠️ Signed URL request failed, falling back to direct URL');
        }
      } catch (e) {
        console.warn('⚠️ Signed URL request error, falling back to direct URL:', e);
      }

      // Fallback to direct connection
      let wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
      if (webrtcConversationId) {
        wsUrl += `&conversation_id=${webrtcConversationId}`;
        console.log('🎯 Connecting WebSocket to specific WebRTC conversation:', webrtcConversationId);
      } else {
        console.log('⚠️ No WebRTC conversation ID provided - WebSocket will create separate conversation');
      }
      openWebSocket(wsUrl, false);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
      console.log('[useElevenLabsWebSocket] onConnectionChange(false) due to outer catch');
      onConnectionChange?.(false);
    }
  }, [agentId, conversationId, createStream, updateStream, completeStream, onUserTranscript, onAgentResponse, onConnectionChange, onDailyLimitReached, currentStreamId, initialContext, textOnly]);

  const disconnect = useCallback(async () => {
    console.log('🔌 Disconnecting WebSocket...');
    console.trace('[useElevenLabsWebSocket] disconnect invoked', {
      hasSocket: Boolean(wsRef.current),
      currentStreamId
    });
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Complete stream
    if (currentStreamId) {
      try {
        await completeStream({ streamId: currentStreamId });
        console.log('✅ Completed WebSocket stream:', currentStreamId);
      } catch (error) {
        console.error('Failed to complete WebSocket stream:', error);
      }
      setCurrentStreamId(null);
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    console.log('[useElevenLabsWebSocket] onConnectionChange(false) via disconnect');
    onConnectionChange?.(false);
  }, [currentStreamId, completeStream, onConnectionChange]);

  // Send audio data (for future use)
  const sendAudio = useCallback((audioData: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        user_audio_chunk: audioData
      }));
    }
  }, []);

  // Send contextual updates without interrupting
  const sendContextualUpdate = useCallback((context: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send contextual update: WebSocket not connected');
      return false;
    }
    try {
      wsRef.current.send(JSON.stringify({
        type: 'contextual_update',
        contextual_update: context
      }));
      console.log('📚 Sent contextual update via WebSocket:', context);
      return true;
    } catch (error) {
      console.error('Failed to send contextual update via WebSocket:', error);
      return false;
    }
  }, []);

  // Send text message to ElevenLabs agent via WebSocket
  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (!initializedRef.current) {
        console.log('⏳ Queuing message until conversation initialization completes');
        pendingMessagesRef.current.push(text);
        // Ensure init is sent at least once
        if (!initSentRef.current) {
          try {
            const initPayload = {
              type: 'conversation_initiation_client_data',
              conversation_initiation_client_data: {
                agent_id: agentId,
                conversation_config_override: {
                  agent: {
                    first_message: '',
                  },
                  conversation: {
                    text_only: textOnly,
                  },
                },
                metadata: {
                  source: textOnly ? 'text_only_ws' : 'text_ws',
                },
              },
            } as Record<string, unknown>;

            console.log('[useElevenLabsWebSocket] sending init payload (queued)', JSON.stringify(initPayload));
            wsRef.current.send(JSON.stringify(initPayload));
            initSentRef.current = true;
          } catch (e) {
            console.error('❌ Failed to send WS initiation payload (queued):', e);
          }
        }
        return true;
      }

      console.log('📤 Sending text message to ElevenLabs:', text);
      wsRef.current.send(JSON.stringify({ type: 'user_message', text }));
      return true;
    } else {
      console.warn('❌ Cannot send text message - WebSocket not connected');
      return false;
    }
  }, []);

  // Cleanup on unmount only - completely independent to prevent premature cleanup
  useEffect(() => {
    return () => {
      // Direct cleanup without depending on changing functions
      if (wsRef.current) {
        console.log('🧹 Component cleanup - closing WebSocket...');
        wsRef.current.close(1000, 'Component unmount');
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  return {
    isConnected,
    connect,
    disconnect,
    sendAudio,
    sendContextualUpdate,
    sendTextMessage,
    currentStreamId
  };
}
