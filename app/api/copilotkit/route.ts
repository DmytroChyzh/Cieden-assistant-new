import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

console.log('🚀 COPILOTKIT ROUTE LOADING...');
console.log('🔑 API Key check:', !!process.env.OPENROUTER_API_KEY);

const openai = new OpenAI({ 
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://finpilot.app",
    "X-Title": "FinPilot",
  },
});

console.log('✅ OpenAI client created:', !!openai);
console.log('🔍 Client has completions:', !!openai?.completions);
console.log('🔍 Client properties:', Object.keys(openai));

// Remove the problematic 'as any' cast that was breaking the client
const serviceAdapter = new OpenAIAdapter({ 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openai: openai as any,  // Type assertion needed for CopilotKit compatibility
  model: "openai/gpt-oss-120b"
});

console.log('✅ ServiceAdapter created:', !!serviceAdapter);

const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  try {
    console.log('📨 POST request received');
    console.log('🔍 Runtime available:', !!runtime);
    console.log('🔍 ServiceAdapter available:', !!serviceAdapter);
    
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    const result = await handleRequest(req);
    console.log('✅ Request handled successfully');
    return result;
  } catch (error) {
    console.error('❌ Error in POST handler:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};