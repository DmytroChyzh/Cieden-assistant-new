import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
      return NextResponse.json({ error: 'Missing ElevenLabs configuration' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to get signed URL:', response.statusText);
      return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ signed_url: data.signed_url });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let agent_id: string | undefined;
    try {
      const text = await request.text();
      if (text && text.trim().length > 0) {
        const body = JSON.parse(text) as { agent_id?: string };
        agent_id = body?.agent_id;
      }
    } catch {
      // Empty or invalid JSON body — use env fallback
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;

    // Use provided agent_id or fallback to env var
    const agentId = agent_id || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

    // Enhanced validation with detailed error messages
    if (!apiKey) {
      console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
      return NextResponse.json({ 
        error: 'ELEVENLABS_API_KEY not configured',
        details: 'Check Vercel environment variables'
      }, { status: 500 });
    }

    if (!agentId) {
      console.error('❌ NEXT_PUBLIC_ELEVENLABS_AGENT_ID not found in environment variables');
      return NextResponse.json({ 
        error: 'NEXT_PUBLIC_ELEVENLABS_AGENT_ID not configured',
        details: 'Check Vercel environment variables'
      }, { status: 500 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Requesting signed URL for agent:', agentId);
      console.log('🔍 API Key validation:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        agentId,
        requestUrl: `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`
      });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get signed URL:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to get signed URL', 
        details: errorText,
        status: response.status
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('✅ Got signed URL successfully');
    return NextResponse.json({ signed_url: data.signed_url });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}