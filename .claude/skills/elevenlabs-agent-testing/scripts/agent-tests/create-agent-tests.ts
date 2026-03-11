#!/usr/bin/env bun
/**
 * Agent Test Generator
 *
 * Purpose: Generate ElevenLabs native test configs for all 11 client tools
 * Output: Creates test_configs/*.json files and updates tests.json
 *
 * Usage: bun run .claude/skills/elevenlabs-agent-testing/scripts/agent-tests/create-agent-tests.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface ToolTestConfig {
  name: string;
  prompts: string[];
  description: string;
}

// Define all 11 tools with multiple test prompts
const TOOL_CONFIGS: ToolTestConfig[] = [
  {
    name: 'show_balance',
    description: 'Verify agent calls show_balance tool when user asks about their balance',
    prompts: [
      'Show my balance',
      'What is my balance?',
      'How much money do I have?',
      'Check my account balance'
    ]
  },
  {
    name: 'show_savings_goal',
    description: 'Verify agent calls show_savings_goal when user asks about savings',
    prompts: [
      'Show my savings goal',
      'What are my savings goals?',
      'Display my savings targets'
    ]
  },
  {
    name: 'show_document_id',
    description: 'Verify agent calls show_document_id when user asks about documents',
    prompts: [
      'Show my ID document',
      'Display my documents',
      'Show my identification'
    ]
  },
  {
    name: 'create_pie_chart',
    description: 'Verify agent creates pie chart for spending visualization',
    prompts: [
      'Create a pie chart',
      'Show me a spending pie chart',
      'Visualize my expenses as a pie chart',
      'Make a pie chart of my spending'
    ]
  },
  {
    name: 'create_bar_chart',
    description: 'Verify agent creates bar chart for data visualization',
    prompts: [
      'Create a bar chart',
      'Show me a bar chart of my spending',
      'Make a bar graph of my expenses'
    ]
  },
  {
    name: 'show_loans',
    description: 'Verify agent shows user their existing loans',
    prompts: [
      'Show my loans',
      'What loans do I have?',
      'Display my current loans'
    ]
  },
  {
    name: 'show_lending_options',
    description: 'Verify agent displays available lending options',
    prompts: [
      'Show lending options',
      'What loan options are available?',
      'Show me what loans I can get',
      'Display available loan products'
    ]
  },
  {
    name: 'show_credit_score',
    description: 'Verify agent shows credit score information',
    prompts: [
      'Show my credit score',
      'What is my credit score?',
      'Check my credit rating'
    ]
  },
  {
    name: 'show_emi_info',
    description: 'Verify agent explains EMI (Equated Monthly Installment)',
    prompts: [
      'What is EMI?',
      'Explain EMI to me',
      'Tell me about EMI',
      'What does EMI mean?'
    ]
  },
  {
    name: 'start_quiz',
    description: 'Verify agent starts loan eligibility quiz',
    prompts: [
      'Start a loan quiz',
      'Help me choose a loan',
      'I need help picking the right loan',
      'Start the loan questionnaire'
    ]
  },
  {
    name: 'update_quiz',
    description: 'Verify agent updates quiz state (requires active quiz)',
    prompts: [
      'Select option 1',
      'Next question',
      'Go to previous question',
      'Show results'
    ]
  }
];

function createToolTest(config: ToolTestConfig) {
  return {
    name: `test_${config.name}`,
    type: 'tool_call',
    description: config.description,
    config: {
      test_cases: config.prompts.map(prompt => ({
        user_message: prompt,
        expected_tool: config.name,
        parameter_validation: {
          method: 'llm_evaluation',
          criteria: 'Parameters are appropriate for the user request'
        },
        timeout_ms: 5000
      }))
    }
  };
}

function generateAllTests() {
  console.log('🤖 AGENT TEST GENERATOR');
  console.log('━'.repeat(50));
  console.log('');

  // Ensure test_configs directory exists
  const testConfigsDir = 'test_configs';
  if (!existsSync(testConfigsDir)) {
    mkdirSync(testConfigsDir, { recursive: true });
    console.log('✅ Created test_configs/ directory');
  }

  const testsRegistry: any[] = [];

  // Generate test config for each tool
  TOOL_CONFIGS.forEach((toolConfig, index) => {
    const testConfig = createToolTest(toolConfig);
    const filename = `test_${toolConfig.name}.json`;
    const filepath = join(testConfigsDir, filename);

    // Write test config file
    writeFileSync(filepath, JSON.stringify(testConfig, null, 2));

    // Add to registry
    testsRegistry.push({
      name: `test_${toolConfig.name}`,
      type: 'client',
      config: `test_configs/${filename}`
    });

    console.log(`✅ Created test_${toolConfig.name}.json (${toolConfig.prompts.length} test cases)`);
  });

  // Update tests.json registry
  const testsJsonPath = 'tests.json';
  const testsJson = {
    tests: testsRegistry
  };

  writeFileSync(testsJsonPath, JSON.stringify(testsJson, null, 2));

  console.log('');
  console.log('✅ Updated tests.json registry');
  console.log('');
  console.log('━'.repeat(50));
  console.log('📊 Summary');
  console.log('━'.repeat(50));
  console.log(`  Tools tested: ${TOOL_CONFIGS.length}`);
  console.log(`  Total test cases: ${TOOL_CONFIGS.reduce((sum, c) => sum + c.prompts.length, 0)}`);
  console.log(`  Files created: ${TOOL_CONFIGS.length + 1} (${TOOL_CONFIGS.length} configs + tests.json)`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review generated test configs in test_configs/');
  console.log('  2. Push tests to ElevenLabs: agents push-tests');
  console.log('  3. Run tests: agents test "Support agent"');
  console.log('');
}

generateAllTests();
