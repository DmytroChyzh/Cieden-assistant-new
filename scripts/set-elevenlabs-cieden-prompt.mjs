#!/usr/bin/env node
/**
 * Set ElevenLabs Conversational AI agent system prompt to Cieden-only.
 * This REMOVES any bank/financial assistant text from the agent on ElevenLabs servers.
 *
 * Requires: .env.local with ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID
 * Run: node scripts/set-elevenlabs-cieden-prompt.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env.local');

if (!existsSync(envPath)) {
  console.error('Missing .env.local. Create it with ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) return [null, null];
      return [m[1].trim(), m[2].trim().replace(/^["']|["']$/g, '')];
    })
    .filter(([k]) => k)
);

const apiKey = env.ELEVENLABS_API_KEY;
const agentId = env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

if (!apiKey || !agentId) {
  console.error('Missing ELEVENLABS_API_KEY or NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local');
  process.exit(1);
}

const promptText = `{{agent_context}}

Answer in the same language the user writes in. Use the available tools when relevant.`;

const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;

const body = {
  conversation_config: {
    agent: {
      prompt: {
        prompt: promptText,
      },
    },
  },
};

console.log('Updating ElevenLabs agent prompt to Cieden-only ({{agent_context}})...');
console.log('Agent ID:', agentId);

const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const err = await res.text();
  console.error('API error:', res.status, err);
  process.exit(1);
}

console.log('Done. Agent system prompt is now set to use {{agent_context}}. Start a new chat to see Cieden assistant (no bank).');
