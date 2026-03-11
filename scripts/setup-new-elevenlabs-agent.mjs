#!/usr/bin/env node
/**
 * Full setup script for a NEW ElevenLabs Conversational AI agent.
 * Configures: system prompt (Cieden persona) + first message + all client tools (incl. show_about, show_process, show_getting_started).
 *
 * Requires: .env.local with ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID
 * Run: node scripts/setup-new-elevenlabs-agent.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env.local');

if (!existsSync(envPath)) {
  console.error('Missing .env.local');
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
  console.error('Missing ELEVENLABS_API_KEY or NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
  process.exit(1);
}

const BASE = 'https://api.elevenlabs.io/v1/convai';
const headers = {
  'Content-Type': 'application/json',
  'xi-api-key': apiKey,
};

// ─── Step 1: Update agent prompt + first message ───

const systemPrompt = `{{agent_context}}

Answer in the same language the user writes in. Use the available tools when relevant.
When user asks about portfolio, cases, pricing, engagement models, or estimates — call the appropriate tool to show interactive cards instead of just text.`;

const firstMessage = "Hi! I'm the Cieden AI Design Assistant. I can help with UI/UX design, product design, and collaboration — cases, estimates, and engagement models. How can I help you today?";

console.log('=== Setting up ElevenLabs agent ===');
console.log('Agent ID:', agentId);
console.log('');

console.log('Step 1/2: Updating system prompt and first message...');

const agentBody = {
  conversation_config: {
    agent: {
      prompt: {
        prompt: systemPrompt,
      },
      first_message: firstMessage,
    },
  },
};

const agentRes = await fetch(`${BASE}/agents/${agentId}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify(agentBody),
});

if (!agentRes.ok) {
  const err = await agentRes.text();
  console.error('Failed to update agent prompt:', agentRes.status, err);
  process.exit(1);
}

console.log('  Prompt and first message set.');

// ─── Step 2: Register all 17 client tools ───

console.log('Step 2/2: Registering client tools...');

const toolConfigs = [
  'show_balance',
  'show_savings_goal',
  'show_document_id',
  'create_pie_chart',
  'create_bar_chart',
  'show_loans',
  'show_lending_options',
  'show_credit_score',
  'show_emi_info',
  'start_quiz',
  'update_quiz',
  'show_cases',
  'show_case_details',
  'show_best_case',
  'show_engagement_models',
  'generate_estimate',
  'open_calculator',
  'show_about',
  'show_process',
  'show_getting_started',
  'show_support',
];

// First, get existing tools on the agent
const getRes = await fetch(`${BASE}/agents/${agentId}`, { headers });
if (!getRes.ok) {
  console.error('Failed to fetch agent:', getRes.status);
  process.exit(1);
}

const agentData = await getRes.json();
const existingTools = agentData?.conversation_config?.agent?.tools || [];
const existingToolNames = existingTools
  .filter(t => t.type === 'client')
  .map(t => t.name);

console.log(`  Found ${existingTools.length} existing tools: ${existingToolNames.join(', ') || '(none)'}`);

let added = 0;
let skipped = 0;

for (const toolName of toolConfigs) {
  if (existingToolNames.includes(toolName)) {
    console.log(`  [skip] ${toolName} (already exists)`);
    skipped++;
    continue;
  }

  const configPath = resolve(root, 'tool_configs', `${toolName}.json`);
  if (!existsSync(configPath)) {
    console.warn(`  [warn] ${toolName}: config not found at ${configPath}`);
    continue;
  }

  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  const toolPayload = {
    type: 'client',
    name: config.name,
    description: config.description,
    expects_response: config.expects_response ?? false,
    response_timeout_secs: config.response_timeout_secs ?? 20,
    parameters: config.parameters,
  };

  const toolRes = await fetch(`${BASE}/agents/${agentId}/add-tool`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toolPayload),
  });

  if (toolRes.ok) {
    console.log(`  [added] ${toolName}`);
    added++;
  } else {
    const errText = await toolRes.text();
    console.error(`  [error] ${toolName}: ${toolRes.status} ${errText}`);

    // If add-tool endpoint doesn't exist, try PATCH approach
    if (toolRes.status === 404) {
      console.log('  Note: add-tool endpoint not available. Tools must be added via dashboard or CLI.');
      console.log('  Stopping tool registration. Please add tools manually.');
      break;
    }
  }
}

console.log('');
console.log('=== Setup complete ===');
console.log(`  Prompt: set to Cieden persona with {{agent_context}}`);
console.log(`  First message: set`);
console.log(`  Tools: ${added} added, ${skipped} already existed`);
console.log('');
if (added < toolConfigs.length - skipped) {
  console.log('Some tools may need to be added manually in the ElevenLabs dashboard:');
  console.log('  https://elevenlabs.io → Conversational AI → Your agent → Tools tab');
  console.log('');
  console.log('Tool names to add (type: client):');
  for (const t of toolConfigs) {
    if (!existingToolNames.includes(t)) {
      console.log(`  - ${t}`);
    }
  }
}
console.log('');
console.log('Next: restart dev server (npm run dev) and test at /voice-chat');
