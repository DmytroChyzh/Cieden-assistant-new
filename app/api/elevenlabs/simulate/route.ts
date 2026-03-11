import { NextRequest, NextResponse } from 'next/server';

interface ConversationHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SimulateRequest {
  message: string;
  conversationHistory?: ConversationHistoryMessage[];
}

interface ElevenLabsHistoryMessage {
  role: 'user' | 'agent';
  message: string;
  time_in_call_secs: number;
  tool_calls?: unknown[];
  tool_results?: unknown[];
  feedback?: null;
  llm_override?: null;
  conversation_turn_metrics?: null;
  rag_retrieval_info?: null;
  llm_usage?: null;
  interrupted?: boolean;
  original_message?: null;
  source_medium?: null;
}

interface SimulateResponse {
  response: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
      console.error('❌ Missing ElevenLabs configuration');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing ElevenLabs configuration' 
      }, { status: 500 });
    }

    // Parse JSON with better error handling
    let body: SimulateRequest;
    try {
      const rawBody = await request.text();
      console.log('📥 Raw request body length:', rawBody.length);
      console.log('📥 Raw request preview:', rawBody.slice(0, 200));
      
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 });
    }

    const { message, conversationHistory = [] } = body;
    const debug = Boolean((body as SimulateRequest & { debug?: boolean })?.debug);

    if (!message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message is required' 
      }, { status: 400 });
    }

    console.log('📤 Sending text message to ElevenLabs simulate API:', message.slice(0, 100));
    console.log('📚 Conversation history length:', conversationHistory.length);

    // Format conversation history for ElevenLabs API with all required fields
    // Safety filters:
    // - Only allow 'user'/'assistant' roles from client, then convert assistant -> agent
    // - Compact consecutive duplicates to enforce alternation
    const compactedHistory = conversationHistory
      .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
      .map((msg) => ({ role: msg.role, content: msg.content.trim() }))
      .filter((msg) => msg.content.length > 0)
      .reduce<ConversationHistoryMessage[]>((acc, curr) => {
        const last = acc[acc.length - 1];
        if (!last || last.role !== curr.role) acc.push(curr);
        return acc;
      }, [])
      .slice(-6);

    const elevenLabsHistory = compactedHistory.map((msg, index) => ({
      role: msg.role === 'assistant' ? 'agent' : 'user' as 'user' | 'agent',
      message: msg.content,
      time_in_call_secs: index * 1 // More granular timing - 1 second between messages
    }));

    console.log('🔍 ElevenLabs API request:', {
      agentId,
      historyLength: elevenLabsHistory.length,
      userMessage: message.slice(0, 50) + '...',
      requestUrl: `https://api.elevenlabs.io/v1/convai/agents/${agentId}/simulate-conversation`
    });

    // Debug: Log the actual payload being sent
    const simulationSpec = {
      partial_conversation_history: elevenLabsHistory.length > 0 ? elevenLabsHistory : [],
      simulated_user_config: {
        first_message: message
      }
    };
    console.log('📝 simulation_specification being sent:', JSON.stringify(simulationSpec, null, 2));

    // Call real ElevenLabs simulate conversation API
    console.log('🔥 Using real ElevenLabs simulate conversation API');
    
    try {
      const t0 = Date.now();
      const controller = new AbortController();
      // use shorter timeout for no-history; longer for with-history
      const timeoutMs = elevenLabsHistory.length === 0 ? 5000 : 9000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}/simulate-conversation`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ simulation_specification: simulationSpec }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const t1 = Date.now();
      console.log('⏱️ ElevenLabs latency ms:', t1 - t0);

      if (!elevenLabsResponse.ok) {
        const errorText = await elevenLabsResponse.text();
        console.error('❌ ElevenLabs API error:', elevenLabsResponse.status, errorText);
        throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status} - ${errorText}`);
      }

      const elevenLabsData = await elevenLabsResponse.json();
      console.log('📥 ElevenLabs response structure:', {
        hasSimulatedConversation: !!elevenLabsData.simulated_conversation,
        conversationLength: elevenLabsData.simulated_conversation?.length || 0,
        lastMessage: elevenLabsData.simulated_conversation?.[elevenLabsData.simulated_conversation?.length - 1]
      });

      // Extract the AI response from the simulated conversation
      const simulatedConversation = elevenLabsData.simulated_conversation;
      if (!simulatedConversation || !Array.isArray(simulatedConversation)) {
        throw new Error('Invalid response format from ElevenLabs API');
      }

      // Find the last agent message in the conversation
      const lastAgentMessage = simulatedConversation
        .slice()
        .reverse()
        .find((msg: ElevenLabsHistoryMessage) => msg.role === 'agent' && msg.message);

      if (!lastAgentMessage || !lastAgentMessage.message) {
        throw new Error('No agent response found in simulated conversation');
      }

      const aiResponse = lastAgentMessage.message;
      console.log('✅ AI response extracted:', aiResponse.slice(0, 100));

      const result: SimulateResponse & { debugInfo?: unknown } = {
        success: true,
        response: aiResponse
      };
      if (debug) {
        result.debugInfo = {
          request: simulationSpec,
          historySentCount: elevenLabsHistory.length,
          latencyMs: t1 - t0,
        };
      }

      return NextResponse.json(result);
    } catch (elevenLabsError) {
      console.error('❌ ElevenLabs API call failed:', elevenLabsError);
      
      // Return error response
      const errorPayload: SimulateResponse & { debugInfo?: unknown } = { 
        response: '',
        success: false,
        error: 'Failed to get AI response from ElevenLabs'
      };
      if (debug) {
        errorPayload.debugInfo = { request: simulationSpec };
      }
      return NextResponse.json(errorPayload, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Error in simulate API endpoint:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}