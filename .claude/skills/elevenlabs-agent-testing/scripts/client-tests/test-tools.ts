#!/usr/bin/env bun
/**
 * Client Tool Handler Test
 *
 * Tests: All 11 client tool handlers are invoked correctly
 * Purpose: Verify our tool registration and handler logic works
 *
 * Usage: bun run .claude/skills/elevenlabs-agent-testing/scripts/client-tests/test-tools.ts
 */

import { Conversation } from '@elevenlabs/client';
import { createClientTools } from '@/src/config/elevenLabsTools';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface ToolTest {
  name: string;
  handlerName: string;
  prompts: string[];
}

interface TestResult {
  toolName: string;
  passed: boolean;
  duration: number;
  handlerCalled: boolean;
  promptUsed: string;
  error?: string;
}

// Define all 11 tools with test prompts
const TOOL_TESTS: ToolTest[] = [
  {
    name: 'show_balance',
    handlerName: 'onShowBalance',
    prompts: ['Show my balance', 'What is my balance?', 'How much money do I have?']
  },
  {
    name: 'show_savings_goal',
    handlerName: 'onShowSavingsGoal',
    prompts: ['Show my savings goal', 'What are my savings goals?']
  },
  {
    name: 'show_document_id',
    handlerName: 'onShowDocumentId',
    prompts: ['Show my ID document', 'Display my documents']
  },
  {
    name: 'create_pie_chart',
    handlerName: 'onCreatePieChart',
    prompts: ['Create a pie chart', 'Show me a spending pie chart']
  },
  {
    name: 'create_bar_chart',
    handlerName: 'onCreateBarChart',
    prompts: ['Create a bar chart', 'Show me a bar chart of my spending']
  },
  {
    name: 'show_loans',
    handlerName: 'onShowLoans',
    prompts: ['Show my loans', 'What loans do I have?']
  },
  {
    name: 'show_lending_options',
    handlerName: 'onShowLendingOptions',
    prompts: ['Show lending options', 'What loan options are available?']
  },
  {
    name: 'show_credit_score',
    handlerName: 'onShowCreditScore',
    prompts: ['Show my credit score', 'What is my credit score?']
  },
  {
    name: 'show_emi_info',
    handlerName: 'onShowEmiInfo',
    prompts: ['What is EMI?', 'Explain EMI to me']
  },
  {
    name: 'start_quiz',
    handlerName: 'onStartQuiz',
    prompts: ['Start a loan quiz', 'Help me choose a loan']
  },
  {
    name: 'update_quiz',
    handlerName: 'onUpdateQuiz',
    prompts: ['Select option 1', 'Next question'] // Context-dependent
  }
];

async function testToolHandler(toolTest: ToolTest): Promise<TestResult> {
  const start = Date.now();
  let handlerCalled = false;
  let calledWith: any = null;

  try {
    // Get signed URL
    const response = await fetch(`${API_BASE}/api/elevenlabs/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return {
        toolName: toolTest.name,
        passed: false,
        duration: Date.now() - start,
        handlerCalled: false,
        promptUsed: toolTest.prompts[0],
        error: 'Failed to get signed URL'
      };
    }

    const { signed_url } = await response.json();

    // Create mock handlers that log when called
    const mockHandlers: any = {};

    // Create handler for this specific tool
    const handlerKey = toolTest.handlerName;
    mockHandlers[handlerKey] = async (params: any) => {
      handlerCalled = true;
      calledWith = params;
      console.log(`  🔧 Handler called: ${toolTest.name}`);
      return undefined;
    };

    // Add no-op handlers for other tools to avoid errors
    const allHandlerNames = TOOL_TESTS.map(t => t.handlerName);
    allHandlerNames.forEach(name => {
      if (!mockHandlers[name]) {
        mockHandlers[name] = async () => undefined;
      }
    });

    const conversation = await Conversation.startSession({
      signed_url,
      connectionType: 'websocket',
      clientTools: createClientTools(mockHandlers),
      onMessage: (msg: any) => {
        // Silent - we're just checking if handler is called
      }
    });

    // Try first prompt
    const prompt = toolTest.prompts[0];
    await conversation.sendTextMessage(prompt);

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));

    conversation.endSession();

    return {
      toolName: toolTest.name,
      passed: handlerCalled,
      duration: Date.now() - start,
      handlerCalled,
      promptUsed: prompt,
      error: handlerCalled ? undefined : 'Handler was not called'
    };

  } catch (error: any) {
    return {
      toolName: toolTest.name,
      passed: false,
      duration: Date.now() - start,
      handlerCalled: false,
      promptUsed: toolTest.prompts[0],
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('🔧 CLIENT TOOL HANDLER TESTS');
  console.log('━'.repeat(50));
  console.log('Testing all 11 tool handlers...');
  console.log('');

  const results: TestResult[] = [];

  for (const toolTest of TOOL_TESTS) {
    console.log(`Testing ${toolTest.name}...`);
    const result = await testToolHandler(toolTest);
    results.push(result);

    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.toolName} (${result.duration}ms)`);
    console.log(`   Prompt: "${result.promptUsed}"`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    console.log('');
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log('━'.repeat(50));
  console.log(`📊 Results: ${passed}/${total} tools tested successfully`);
  console.log(`⏱️  Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  console.log('');

  if (allPassed) {
    console.log('✨ All tool handlers working correctly!');
  } else {
    console.log('⚠️  Some tool handlers failed');
    console.log('');
    console.log('Failed tools:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.toolName}: ${r.error}`);
    });
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
