import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { agent_id } = await request.json();
    const apiKey = process.env.ELEVENLABS_API_KEY;

    // Use provided agent_id or fallback to env var
    const agentId = agent_id || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

    if (!apiKey) {
      console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
      return NextResponse.json({
        error: 'ELEVENLABS_API_KEY not configured',
        details: 'Check environment variables'
      }, { status: 500 });
    }

    if (!agentId) {
      console.error('❌ NEXT_PUBLIC_ELEVENLABS_AGENT_ID not found in environment variables');
      return NextResponse.json({
        error: 'NEXT_PUBLIC_ELEVENLABS_AGENT_ID not configured',
        details: 'Check environment variables'
      }, { status: 500 });
    }

    console.log('🔐 Requesting conversation token for agent:', agentId);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get conversation token:', response.status, errorText);
      return NextResponse.json({
        error: 'Failed to get conversation token',
        details: errorText,
        status: response.status
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('✅ Got conversation token successfully');
    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error('Error getting conversation token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}