#!/usr/bin/env node
/**
 * Create client tools in ElevenLabs and attach them to the agent.
 * Run: node scripts/push-tools-to-agent.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env.local');

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
const BASE = 'https://api.elevenlabs.io/v1/convai';
const headers = { 'Content-Type': 'application/json', 'xi-api-key': apiKey };

const toolNames = [
  'show_cases', 'show_case_details', 'show_best_case',
  'show_engagement_models', 'generate_estimate', 'open_calculator',
  'show_balance', 'show_savings_goal', 'show_document_id',
  'create_pie_chart', 'create_bar_chart', 'show_loans',
  'show_lending_options', 'show_credit_score', 'show_emi_info',
  'start_quiz', 'update_quiz',
];

console.log(`=== Pushing ${toolNames.length} tools to agent ${agentId} ===\n`);

// Step 1: Create each tool via POST /v1/convai/tools/create
const toolIds = [];

for (const name of toolNames) {
  const cfgPath = resolve(root, 'tool_configs', `${name}.json`);
  if (!existsSync(cfgPath)) {
    console.warn(`[skip] ${name}: no config`);
    continue;
  }

  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  const payload = {
    tool_config: {
      type: 'client',
      name: cfg.name,
      description: cfg.description,
      expects_response: cfg.expects_response ?? false,
      response_timeout_secs: cfg.response_timeout_secs ?? 20,
      parameters: cfg.parameters,
    },
  };

  const res = await fetch(`${BASE}/tools`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const data = await res.json();
    const id = data.tool_id || data.id;
    toolIds.push(id);
    console.log(`[created] ${name} -> ${id}`);
  } else {
    const err = await res.text();
    console.error(`[error] ${name}: ${res.status} ${err.substring(0, 200)}`);

    if (res.status === 404) {
      console.log('\nTool creation endpoints not available via API.');
      console.log('Tools must be added manually in the ElevenLabs dashboard.');
      console.log('Go to: https://elevenlabs.io -> Conversational AI -> Agent -> Tools tab');
      console.log('\nAdd these as "Client" type tools:');
      toolNames.forEach(t => console.log(`  - ${t}`));
      process.exit(0);
    }
  }
}

if (toolIds.length === 0) {
  console.log('\nNo tools created. Exiting.');
  process.exit(0);
}

// Step 2: Attach tool IDs to agent
console.log(`\nAttaching ${toolIds.length} tools to agent...`);

const patchBody = {
  conversation_config: {
    agent: {
      prompt: {
        tool_ids: toolIds,
      },
    },
  },
};

const patchRes = await fetch(`${BASE}/agents/${agentId}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify(patchBody),
});

if (patchRes.ok) {
  console.log('Done! All tools attached to agent.');
} else {
  const err = await patchRes.text();
  console.error('Failed to attach tools:', patchRes.status, err.substring(0, 500));
}
