#!/usr/bin/env bun
/**
 * Client Connection Test
 *
 * Tests: Connection establishment, message reception, basic communication
 * Purpose: Verify our client can connect to ElevenLabs agent and receive messages
 *
 * Usage: bun run .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-connection.ts
 */

import { Conversation } from '@elevenlabs/client';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

async function testSignedUrl(): Promise<TestResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${API_BASE}/api/elevenlabs/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return {
        name: 'Signed URL Generation',
        passed: false,
        duration: Date.now() - start,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();

    if (!data.signed_url) {
      return {
        name: 'Signed URL Generation',
        passed: false,
        duration: Date.now() - start,
        error: 'No signed_url in response'
      };
    }

    return {
      name: 'Signed URL Generation',
      passed: true,
      duration: Date.now() - start,
      details: { urlLength: data.signed_url.length }
    };
  } catch (error: any) {
    return {
      name: 'Signed URL Generation',
      passed: false,
      duration: Date.now() - start,
      error: error.message
    };
  }
}

async function testWebSocketConnection(): Promise<TestResult> {
  const start = Date.now();

  try {
    // Get signed URL
    const response = await fetch(`${API_BASE}/api/elevenlabs/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return {
        name: 'WebSocket Connection',
        passed: false,
        duration: Date.now() - start,
        error: 'Failed to get signed URL'
      };
    }

    const { signed_url } = await response.json();

    // Attempt connection
    const messages: any[] = [];
    const conversation = await Conversation.startSession({
      signed_url,
      connectionType: 'websocket',
      onMessage: (msg: any) => {
        messages.push(msg);
      },
      onError: (error: any) => {
        console.error('Connection error:', error);
      }
    });

    // Send test message
    await conversation.sendTextMessage("Hello");

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Cleanup
    conversation.endSession();

    const passed = messages.length > 0;

    return {
      name: 'WebSocket Connection',
      passed,
      duration: Date.now() - start,
      details: {
        messagesReceived: messages.length,
        messageTypes: [...new Set(messages.map((m: any) => typeof m === 'object' ? m.type : 'string'))]
      },
      error: passed ? undefined : 'No messages received from agent'
    };
  } catch (error: any) {
    return {
      name: 'WebSocket Connection',
      passed: false,
      duration: Date.now() - start,
      error: error.message
    };
  }
}

async function testMessageReception(): Promise<TestResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${API_BASE}/api/elevenlabs/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const { signed_url } = await response.json();

    const messages: any[] = [];
    const messageTypes: Set<string> = new Set();

    const conversation = await Conversation.startSession({
      signed_url,
      connectionType: 'websocket',
      onMessage: (msg: any) => {
        messages.push(msg);
        const type = typeof msg === 'object' && msg.type ? msg.type : typeof msg;
        messageTypes.add(type);
      }
    });

    await conversation.sendTextMessage("Show my balance");
    await new Promise(resolve => setTimeout(resolve, 3000));

    conversation.endSession();

    return {
      name: 'Message Reception',
      passed: messages.length > 0,
      duration: Date.now() - start,
      details: {
        totalMessages: messages.length,
        uniqueTypes: Array.from(messageTypes),
        hasAgentResponse: messageTypes.has('agent_response'),
        hasToolResponse: messageTypes.has('agent_tool_response')
      }
    };
  } catch (error: any) {
    return {
      name: 'Message Reception',
      passed: false,
      duration: Date.now() - start,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('🔌 CLIENT CONNECTION TESTS');
  console.log('━'.repeat(50));
  console.log('');

  const tests = [
    testSignedUrl,
    testWebSocketConnection,
    testMessageReception
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await test();
    results.push(result);

    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name} (${result.duration}ms)`);

    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2).split('\\n').join('\\n   '));
    }

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    console.log('');
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log('━'.repeat(50));
  console.log(`📊 Results: ${passed}/${total} passed (${Math.round(passed/total * 100)}%)`);
  console.log(`⏱️  Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  console.log('');

  if (allPassed) {
    console.log('✨ All connection tests passed!');
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
