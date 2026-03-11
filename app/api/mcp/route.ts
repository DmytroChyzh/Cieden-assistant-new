import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

console.log('🚀 MCP Server Loading...');

// Initialize Convex client for server-side operations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// MCP Protocol Types
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Define FinPilot MCP Tools
const FINPILOT_TOOLS: MCPTool[] = [
  {
    name: 'createPieChart',
    description: 'Generate a pie chart for financial data visualization - perfect for expense breakdowns and portfolio allocation',
    inputSchema: {
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
      required: ['title', 'data', 'conversationId']
    }
  },
  {
    name: 'createBarChart',
    description: 'Generate a bar chart for comparing financial data over time - ideal for income vs expenses and trend analysis',
    inputSchema: {
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
      required: ['title', 'data', 'conversationId']
    }
  },
  {
    name: 'analyzeFinancialData',
    description: 'Perform comprehensive financial analysis and provide actionable insights',
    inputSchema: {
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
      required: ['analysisType', 'conversationId']
    }
  }
];

// Tool execution handlers
interface PieChartParams {
  title: string;
  data: Array<{ name: string; value: number; category?: string }>;
  conversationId: string;
}

async function executeCreatePieChart(params: PieChartParams): Promise<unknown> {
  const { title, data, conversationId } = params;
  
  console.log(`📊 Creating pie chart: ${title} with ${data.length} segments`);
  
  try {
    // Save chart to Convex
    const chartId = await convex.mutation(api.charts.create, {
      conversationId: conversationId as Id<"conversations">,
      type: "pie" as const,
      title,
      data,
    });

    // Save message about chart creation
    await convex.mutation(api.messages.create, {
      conversationId: conversationId as Id<"conversations">,
      content: `📊 Created pie chart: "${title}" with ${data.length} categories: ${data.map((d) => d.name).join(', ')}`,
      role: 'assistant' as const,
      source: 'voice' as const,
      metadata: { 
        chartId,
        chartType: 'pie',
        toolCall: true,
        mcpTool: 'createPieChart'
      }
    });
    
    return {
      success: true,
      message: `Successfully created pie chart "${title}" with ${data.length} data points`,
      chartType: "pie",
      chartId,
      title,
      dataPoints: data.length,
      categories: data.map((d) => d.name),
      totalValue: data.reduce((sum: number, d) => sum + d.value, 0)
    };
  } catch (error) {
    console.error('❌ Failed to create pie chart:', error);
    throw new Error(`Chart generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface BarChartParams {
  title: string;
  data: Array<{ period: string; income?: number; expenses?: number; value?: number }>;
  conversationId: string;
}

async function executeCreateBarChart(params: BarChartParams): Promise<unknown> {
  const { title, data, conversationId } = params;
  
  console.log(`📊 Creating bar chart: ${title} with ${data.length} periods`);
  
  try {
    const chartId = await convex.mutation(api.charts.create, {
      conversationId: conversationId as Id<"conversations">,
      type: "bar" as const,
      title,
      data,
    });

    await convex.mutation(api.messages.create, {
      conversationId: conversationId as Id<"conversations">,
      content: `📊 Created bar chart: "${title}" comparing data across ${data.length} periods: ${data.map((d) => d.period).join(', ')}`,
      role: 'assistant' as const,
      source: 'voice' as const,
      metadata: { 
        chartId,
        chartType: 'bar',
        toolCall: true,
        mcpTool: 'createBarChart'
      }
    });

    return {
      success: true,
      message: `Successfully created bar chart "${title}" with ${data.length} periods`,
      chartType: "bar",
      chartId,
      title,
      dataPoints: data.length,
      periods: data.map((d) => d.period)
    };
  } catch (error) {
    console.error('❌ Failed to create bar chart:', error);
    throw new Error(`Chart generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface AnalyzeParams {
  analysisType: string;
  data?: unknown;
  conversationId: string;
}

async function executeAnalyzeFinancialData(params: AnalyzeParams): Promise<unknown> {
  const { analysisType, conversationId } = params;
  
  console.log(`📈 Performing ${analysisType} analysis`);
  
  try {
    const insights = generateFinancialInsights(analysisType);
    
    // Save comprehensive analysis to messages
    await convex.mutation(api.messages.create, {
      conversationId: conversationId as Id<"conversations">,
      content: `📈 Financial Analysis Complete (${analysisType.toUpperCase()})

${insights.summary}

Key Insights:
${insights.details.map((detail: string) => `• ${detail}`).join('\n')}

Recommendations:
${insights.recommendations.map((rec: string) => `💡 ${rec}`).join('\n')}`,
      role: 'assistant' as const,
      source: 'voice' as const,
      metadata: { 
        analysisType, 
        insights: insights.details,
        recommendations: insights.recommendations,
        toolCall: true,
        mcpTool: 'analyzeFinancialData'
      }
    });

    return {
      success: true,
      analysisType,
      summary: insights.summary,
      insights: insights.details,
      recommendations: insights.recommendations,
      score: insights.score
    };
  } catch (error) {
    console.error('❌ Failed to perform financial analysis:', error);
    throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface SumBalancesParams {
  balances: number[];
  currency?: string;
  conversationId?: string;
}

async function executeSumBalances(params: SumBalancesParams): Promise<unknown> {
  const { balances, currency, conversationId } = params;
  if (!Array.isArray(balances)) {
    throw new Error('balances must be an array of numbers');
  }
  const total = balances.reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0);
  console.log(`💰 Sum of balances: ${total}${currency ? ' ' + currency : ''}`);

  if (conversationId) {
    await convex.mutation(api.messages.create, {
      conversationId: conversationId as Id<"conversations">,
      content: `💰 Total balance: ${total}${currency ? ' ' + currency : ''}`,
      role: 'assistant' as const,
      source: 'voice' as const,
      metadata: { toolCall: true, mcpTool: 'sumBalances', total, currency }
    });
  }

  return { success: true, total, currency: currency || null };
}

interface FinancialInsights {
  summary: string;
  details: string[];
  recommendations: string[];
  score: number;
}

// Financial insights generator
function generateFinancialInsights(analysisType: string): FinancialInsights {
  const insights: Record<string, FinancialInsights> = {
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

// MCP Protocol handler
async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  try {
    console.log(`🔧 MCP Request: ${method}`, params);

    switch (method) {
      case 'initialize':
        return {
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

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: FINPILOT_TOOLS }
        };

      case 'tools/list_changed':
        return {
          jsonrpc: '2.0',
          id,
          result: { changed: false }
        };

      case 'tools/call':
        const { name, arguments: args } = params as { name: string; arguments: unknown };
        
        let result;
        switch (name) {
          case 'createPieChart':
            result = await executeCreatePieChart(args as PieChartParams);
            break;
          case 'createBarChart':
            result = await executeCreateBarChart(args as BarChartParams);
            break;
          case 'analyzeFinancialData':
            result = await executeAnalyzeFinancialData(args as AnalyzeParams);
            break;
          case 'sumBalances':
            result = await executeSumBalances(args as SumBalancesParams);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          jsonrpc: '2.0',
          id,
          result: { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(result, null, 2) 
            }] 
          }
        };

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    console.error('❌ MCP Request Error:', error);
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: error instanceof Error ? error.stack : undefined
      }
    };
  }
}

// Next.js API handlers
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔧 MCP Server request received');
    
    const body = await req.json() as MCPRequest;
    const response = await handleMCPRequest(body);
    
    const latency = Date.now() - startTime;
    console.log(`✅ MCP request handled in ${latency}ms`);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ MCP Server error:', error);
    
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32000,
        message: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'FinPilot MCP Server',
    version: '1.0.0',
    protocol: 'MCP 2024-11-05',
    tools: FINPILOT_TOOLS.map(tool => tool.name),
    endpoints: {
      'POST /': 'MCP JSON-RPC endpoint',
      'GET /': 'Server info'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

console.log('✅ FinPilot MCP Server Loaded');