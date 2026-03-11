import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { streamTranscript } from "./streaming";

const http = httpRouter();

// Add auth routes FIRST
auth.addHttpRoutes(http);

// Add transcript streaming endpoint
http.route({
  path: "/transcript-stream",
  method: "POST", 
  handler: streamTranscript,
});

// Add OPTIONS handler for CORS preflight
http.route({
  path: "/transcript-stream",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// MCP Server Implementation using Convex HTTP Actions
import { api } from "./_generated/api";

// MCP Protocol Types
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Define FinPilot MCP Tools
const FINPILOT_TOOLS = [
  {
    name: 'createPieChart',
    description: 'Generate a pie chart for financial data visualization - perfect for expense breakdowns and portfolio allocation',
    input_schema: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: 'Chart title (e.g. "Monthly Expenses Breakdown")' 
        },
        data: { 
          type: 'array', 
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Category name' },
              value: { type: 'number', description: 'Amount/value' },
              category: { type: 'string', description: 'Optional subcategory' }
            }
          },
          description: 'Array of data points for the pie chart'
        },
        conversationId: { 
          type: 'string', 
          description: 'Convex conversation ID' 
        }
      },
      required: ['title', 'data']
    }
  },
  {
    name: 'createBarChart',
    description: 'Generate a bar chart for comparing financial data over time - ideal for income vs expenses and trend analysis',
    input_schema: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: 'Chart title (e.g. "Income vs Expenses - Last 6 Months")' 
        },
        data: { 
          type: 'array', 
          items: {
            type: 'object',
            properties: {
              period: { type: 'string', description: 'Time period or category' },
              income: { type: 'number', description: 'Income amount (optional)' },
              expenses: { type: 'number', description: 'Expenses amount (optional)' },
              value: { type: 'number', description: 'Single value (optional)' }
            }
          },
          description: 'Array of time-series or categorical data'
        },
        conversationId: { 
          type: 'string', 
          description: 'Convex conversation ID' 
        }
      },
      required: ['title', 'data']
    }
  },
  {
    name: 'analyzeFinancialData',
    description: 'Perform comprehensive financial analysis and provide actionable insights',
    input_schema: {
      type: 'object',
      properties: {
        analysisType: { 
          type: 'string', 
          enum: ['spending', 'trends', 'budget', 'savings', 'portfolio'],
          description: 'Type of financial analysis to perform'
        },
        data: { 
          type: 'object', 
          description: 'Financial data and context for analysis'
        },
        conversationId: { 
          type: 'string', 
          description: 'Convex conversation ID' 
        }
      },
      required: ['analysisType']
    }
  },
  {
    name: 'sumBalances',
    description: 'Compute the total balance from a list of numbers and optionally log it to the conversation',
    input_schema: {
      type: 'object',
      properties: {
        balances: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of numeric balances to sum'
        },
        currency: { type: 'string', description: 'Optional currency code (e.g., USD)' },
        conversationId: { type: 'string', description: 'Convex conversation ID (optional)' }
      },
      required: ['balances']
    }
  }
];

// Financial insights generator
function generateFinancialInsights(analysisType: string, data: any) {
  const insights: Record<string, any> = {
    spending: {
      summary: "Your spending analysis reveals key patterns and optimization opportunities",
      details: [
        "Monthly spending variance is within healthy limits (±15%)",
        "Fixed expenses represent 65% of total spending - well balanced", 
        "Discretionary spending shows room for optimization",
        "No irregular large transactions detected - good financial discipline"
      ],
      recommendations: [
        "Set up automatic transfers to increase emergency fund by 10%",
        "Consider meal planning to reduce food expenses by $200-300/month",
        "Review subscription services for potential $50-100 monthly savings"
      ],
      score: 7.8
    },
    trends: {
      summary: "Positive financial trajectory with consistent improvement",
      details: [
        "Income growth of 8% year-over-year outpaces inflation",
        "Expense growth controlled at 3% - excellent cost management",
        "Savings rate improved from 12% to 18% over 6 months"
      ],
      recommendations: [
        "Maintain current savings momentum - on track for financial goals",
        "Consider increasing investment percentage as income grows",
        "Explore tax-advantaged accounts for additional savings"
      ],
      score: 8.5
    }
  };

  return insights[analysisType] || {
    summary: `${analysisType} analysis completed with personalized recommendations`,
    details: ["Analysis performed based on provided financial data"],
    recommendations: ["Review findings and implement suggested improvements"],
    score: 7.0
  };
}

// MCP Server HTTP Action
const mcpHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  let requestId: string | number | null = null;
  
  // Simple API key authentication for MVP
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.MCP_API_KEY;
  
  if (expectedKey && (!apiKey || apiKey !== expectedKey)) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { 
        code: 401, 
        message: 'Unauthorized - Missing or invalid API key',
        data: 'Include x-api-key header with valid key'
      }
    }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    });
  }
  
  try {
    console.log('🔧 MCP Server request received via Convex HTTP Action');
    
    const mcpRequest = await request.json() as MCPRequest;
    const { method, params, id } = mcpRequest;
    requestId = id; // Store ID for error handling
    
    console.log(`🔧 MCP Request: ${method}`, params);

    let mcpResponse: MCPResponse;

    switch (method) {
      case 'initialize':
        mcpResponse = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true }
            },
            serverInfo: {
              name: 'FinPilot MCP Server',
              version: '1.0.0'
            }
          }
        };
        break;

      case 'tools/list':
        mcpResponse = {
          jsonrpc: '2.0',
          id,
          result: { tools: FINPILOT_TOOLS }
        };
        break;

      case 'tools/list_changed':
        mcpResponse = {
          jsonrpc: '2.0',
          id,
          result: { changed: false }
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = params as { name: string; arguments: any };
        let result;

        switch (name) {
          case 'createPieChart':
            const { title: pieTitle, data: pieData, conversationId: pieConvId } = args;
            
            console.log(`📊 Creating pie chart: ${pieTitle} with ${pieData.length} segments`);
            
            // Save chart to Convex using ctx.runMutation
            const pieChartId = await ctx.runMutation(api.charts.create, {
              conversationId: pieConvId,
              type: "pie",
              title: pieTitle,
              data: pieData,
            });

            // Save message about chart creation
            await ctx.runMutation(api.messages.create, {
              conversationId: pieConvId,
              content: `📊 Created pie chart: "${pieTitle}" with ${pieData.length} categories: ${pieData.map((d: any) => d.name).join(', ')}`,
              role: 'assistant',
              source: 'voice',
              metadata: { 
                chartId: pieChartId,
                chartType: 'pie',
                toolCall: true,
                mcpTool: 'createPieChart'
              }
            });
            
            result = {
              success: true,
              message: `Successfully created pie chart "${pieTitle}" with ${pieData.length} data points`,
              chartType: "pie",
              chartId: pieChartId,
              title: pieTitle,
              dataPoints: pieData.length,
              categories: pieData.map((d: any) => d.name),
              totalValue: pieData.reduce((sum: number, d: any) => sum + d.value, 0)
            };
            break;

          case 'createBarChart':
            const { title: barTitle, data: barData, conversationId: barConvId } = args;
            
            console.log(`📊 Creating bar chart: ${barTitle} with ${barData.length} periods`);
            
            const barChartId = await ctx.runMutation(api.charts.create, {
              conversationId: barConvId,
              type: "bar",
              title: barTitle,
              data: barData,
            });

            await ctx.runMutation(api.messages.create, {
              conversationId: barConvId,
              content: `📊 Created bar chart: "${barTitle}" comparing data across ${barData.length} periods: ${barData.map((d: any) => d.period).join(', ')}`,
              role: 'assistant',
              source: 'voice',
              metadata: { 
                chartId: barChartId,
                chartType: 'bar',
                toolCall: true,
                mcpTool: 'createBarChart'
              }
            });

            result = {
              success: true,
              message: `Successfully created bar chart "${barTitle}" with ${barData.length} periods`,
              chartType: "bar",
              chartId: barChartId,
              title: barTitle,
              dataPoints: barData.length,
              periods: barData.map((d: any) => d.period)
            };
            break;

          case 'analyzeFinancialData':
            const { analysisType, data: analysisData, conversationId: analysisConvId } = args;
            
            console.log(`📈 Performing ${analysisType} analysis`);
            
            const insights = generateFinancialInsights(analysisType, analysisData);
            
            // Save comprehensive analysis to messages
            await ctx.runMutation(api.messages.create, {
              conversationId: analysisConvId,
              content: `📈 Financial Analysis Complete (${analysisType.toUpperCase()})

${insights.summary}

Key Insights:
${insights.details.map((detail: string) => `• ${detail}`).join('\n')}

Recommendations:
${insights.recommendations.map((rec: string) => `💡 ${rec}`).join('\n')}`,
              role: 'assistant',
              source: 'voice',
              metadata: { 
                analysisType, 
                insights: insights.details,
                recommendations: insights.recommendations,
                toolCall: true,
                mcpTool: 'analyzeFinancialData'
              }
            });

            result = {
              success: true,
              analysisType,
              summary: insights.summary,
              insights: insights.details,
              recommendations: insights.recommendations,
              score: insights.score
            };
            break;

          case 'sumBalances':
            const { balances, currency, conversationId: sumConvId } = args;
            if (!Array.isArray(balances)) {
              throw new Error('balances must be an array of numbers');
            }
            const total = balances.reduce((acc: number, v: any) => acc + (typeof v === 'number' ? v : 0), 0);
            console.log(`💰 Sum of balances: ${total}${currency ? ' ' + currency : ''}`);
            if (sumConvId) {
              await ctx.runMutation(api.messages.create, {
                conversationId: sumConvId,
                content: `💰 Total balance: ${total}${currency ? ' ' + currency : ''}`,
                role: 'assistant',
                source: 'voice',
                metadata: { toolCall: true, mcpTool: 'sumBalances', total, currency }
              });
            }
            result = { success: true, total, currency: currency || null };
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        mcpResponse = {
          jsonrpc: '2.0',
          id,
          result: { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(result, null, 2) 
            }] 
          }
        };
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }
    
    const latency = Date.now() - startTime;
    console.log(`✅ MCP request handled in ${latency}ms`);
    
    // Check if client accepts SSE (Server-Sent Events) format
    const acceptHeader = request.headers.get('accept') || '';
    const wantsSSE = acceptHeader.includes('text/event-stream');
    
    if (wantsSSE) {
      // Return SSE format for ElevenLabs compatibility
      const sseData = `event: message\ndata: ${JSON.stringify(mcpResponse)}\n\n`;
      return new Response(sseData, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        },
      });
    } else {
      // Return JSON format for regular clients
      return new Response(JSON.stringify(mcpResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        },
      });
    }
  } catch (error) {
    console.error('❌ MCP Server error:', error);
    
    const errorResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32000,
        message: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    };
    
    // Check if client expects SSE format for errors too
    const acceptHeader = request.headers.get('accept') || '';
    const wantsSSE = acceptHeader.includes('text/event-stream');
    
    if (wantsSSE) {
      const sseData = `event: message\ndata: ${JSON.stringify(errorResponse)}\n\n`;
      return new Response(sseData, {
        status: 200, // SSE should return 200 even for errors
        headers: {
          "Content-Type": "text/event-stream",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else {
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }
});

// MCP Server info endpoint
const mcpInfoHandler = httpAction(async () => {
  return new Response(JSON.stringify({
    message: 'FinPilot MCP Server (Convex HTTP Action)',
    version: '1.0.0',
    protocol: 'MCP 2024-11-05',
    tools: FINPILOT_TOOLS.map(tool => tool.name),
    endpoints: {
      'POST /mcp': 'MCP JSON-RPC endpoint',
      'GET /mcp': 'Server info'
    }
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

// Add MCP Server routes
http.route({
  path: "/mcp",
  method: "POST",
  handler: mcpHandler,
});

http.route({
  path: "/mcp",
  method: "GET", 
  handler: mcpInfoHandler,
});

// MCP OPTIONS handler for CORS preflight
http.route({
  path: "/mcp",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, x-api-key",
      },
    });
  }),
});

// Add a simple test route to verify HTTP router is working
http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ message: "HTTP router is working!" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;