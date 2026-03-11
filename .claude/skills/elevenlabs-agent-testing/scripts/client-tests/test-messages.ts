#!/usr/bin/env bun
/**
 * Client Message Format Documentation Test
 *
 * Tests: Documents all message event types and formats from onMessage
 * Purpose: Understand what data we receive from ElevenLabs agent
 *
 * Usage: bun run .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-messages.ts
 */

import { Conversation } from '@elevenlabs/client';
import { writeFileSync } from 'fs';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface MessageSample {
  type: string;
  count: number;
  samples: any[];
}

async function documentMessageFormats() {
  console.log('📨 CLIENT MESSAGE FORMAT DOCUMENTATION');
  console.log('━'.repeat(50));
  console.log('Collecting message samples from agent...');
  console.log('');

  try {
    // Get signed URL
    const response = await fetch(`${API_BASE}/api/elevenlabs/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error('❌ Failed to get signed URL');
      process.exit(1);
    }

    const { signed_url } = await response.json();

    const messageSamples: Map<string, MessageSample> = new Map();
    const allMessages: any[] = [];

    const conversation = await Conversation.startSession({
      signed_url,
      connectionType: 'websocket',
      onMessage: (msg: any) => {
        allMessages.push(msg);

        // Determine message type
        let type: string;
        if (typeof msg === 'string') {
          type = 'string';
        } else if (typeof msg === 'object' && msg.type) {
          type = msg.type;
        } else {
          type = 'unknown';
        }

        // Store sample
        if (!messageSamples.has(type)) {
          messageSamples.set(type, {
            type,
            count: 0,
            samples: []
          });
        }

        const sample = messageSamples.get(type)!;
        sample.count++;

        // Keep up to 3 samples per type
        if (sample.samples.length < 3) {
          sample.samples.push(msg);
        }
      }
    });

    console.log('✅ Connected to agent');
    console.log('');

    // Send various messages to trigger different event types
    const testMessages = [
      'Hello',
      'Show my balance',
      'Create a pie chart',
      'What is EMI?'
    ];

    for (const testMsg of testMessages) {
      console.log(`Sending: "${testMsg}"`);
      await conversation.sendTextMessage(testMsg);
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    conversation.endSession();

    console.log('');
    console.log('━'.repeat(50));
    console.log('📊 MESSAGE ANALYSIS');
    console.log('━'.repeat(50));
    console.log('');

    console.log(`Total messages received: ${allMessages.length}`);
    console.log(`Unique message types: ${messageSamples.size}`);
    console.log('');

    // Display samples by type
    messageSamples.forEach((sample, type) => {
      console.log(`\n📋 Message Type: ${type} (${sample.count} occurrences)`);
      console.log('─'.repeat(50));

      sample.samples.forEach((msg, index) => {
        console.log(`\nSample ${index + 1}:`);
        console.log(JSON.stringify(msg, null, 2));
      });
    });

    // Save to file
    const documentation = {
      generatedAt: new Date().toISOString(),
      totalMessages: allMessages.length,
      messageTypes: Array.from(messageSamples.entries()).map(([type, sample]) => ({
        type,
        count: sample.count,
        samples: sample.samples
      })),
      allMessages: allMessages.slice(0, 20) // First 20 for reference
    };

    const outputPath = '.claude/skills/elevenlabs-agent-testing/references/message-formats-captured.json';
    writeFileSync(outputPath, JSON.stringify(documentation, null, 2));

    console.log('');
    console.log('━'.repeat(50));
    console.log(`✅ Documentation saved to: ${outputPath}`);
    console.log('');

    // Print summary
    console.log('📝 Summary of Message Types:');
    messageSamples.forEach((sample, type) => {
      console.log(`  - ${type}: ${sample.count} messages`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

documentMessageFormats().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
