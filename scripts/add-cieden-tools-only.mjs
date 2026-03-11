#!/usr/bin/env node
/**
 * Add ONLY the 5 new Cieden tools to the ElevenLabs agent (show_about, show_process, show_getting_started, show_case_details, show_support).
 * Your dashboard already has: show_cases, show_best_case, show_engagement_models, generate_estimate, open_calculator.
 *
 * Requires: .env.local with ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID
 * Run: node scripts/add-cieden-tools-only.mjs
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
  console.error('Missing ELEVENLABS_API_KEY or NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local');
  process.exit(1);
}

const BASE = 'https://api.elevenlabs.io/v1/convai';
const headers = {
  'Content-Type': 'application/json',
  'xi-api-key': apiKey,
};

// Only the 5 NEW Cieden tools (you already have show_cases, show_best_case, show_engagement_models, generate_estimate, open_calculator)
const NEW_CIEDEN_TOOLS = [
  'show_about',
  'show_process',
  'show_getting_started',
  'show_case_details',
  'show_support',
];

console.log('=== Adding 5 new Cieden tools to ElevenLabs agent ===');
console.log('Agent ID:', agentId);
console.log('');

const getRes = await fetch(`${BASE}/agents/${agentId}`, { headers });
if (!getRes.ok) {
  console.error('Failed to fetch agent:', getRes.status, await getRes.text());
  process.exit(1);
}

const agentData = await getRes.json();
const existingTools = agentData?.conversation_config?.agent?.tools || [];
const existingNames = existingTools.filter((t) => t.type === 'client').map((t) => t.name);

console.log('Existing client tools:', existingNames.join(', ') || '(none)');
console.log('');

let added = 0;
for (const toolName of NEW_CIEDEN_TOOLS) {
  if (existingNames.includes(toolName)) {
    console.log(`  [skip] ${toolName} (already in agent)`);
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
    parameters: config.parameters || { type: 'object', properties: {}, required: [] },
  };

  const toolRes = await fetch(`${BASE}/agents/${agentId}/add-tool`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toolPayload),
  });

  if (toolRes.ok) {
    console.log(`  [added] ${toolName}`);
    added++;
    existingNames.push(toolName);
  } else {
    const errText = await toolRes.text();
    console.error(`  [error] ${toolName}: ${toolRes.status} ${errText}`);
  }
}

console.log('');
if (added > 0) {
  console.log(`Done. ${added} new tool(s) added. Refresh the ElevenLabs dashboard to see them.`);
} else if (existingNames.length >= 10) {
  console.log('All 5 new Cieden tools are already in the agent (or API returned errors). Check dashboard.');
} else {
  console.log('If no tools were added, the add-tool API may not be available.');
  console.log('Add the 5 tools manually in ElevenLabs: Agents → Cieden assistant → Tools → Add tool → Client tool.');
  console.log('Names: show_about, show_process, show_getting_started, show_case_details, show_support');
  console.log('Copy name + description from tool_configs/*.json');
}
