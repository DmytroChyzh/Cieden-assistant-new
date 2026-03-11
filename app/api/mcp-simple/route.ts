import { NextRequest, NextResponse } from 'next/server';

// Simple MCP server test without dependencies
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('🔧 MCP Simple Request:', body);
    
    if (body.method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'createPieChart',
              description: 'Generate a pie chart for financial data visualization',
              inputSchema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  data: { type: 'array' },
                  conversationId: { type: 'string' }
                },
                required: ['title', 'data']
              }
            },
            {
              name: 'sumBalances',
              description: 'Compute the total balance from a list of numbers and log it',
              input_schema: {
                type: 'object',
                properties: {
                  balances: { type: 'array', items: { type: 'number' } },
                  currency: { type: 'string' }
                },
                required: ['balances']
              }
            }
          ]
        }
      });
    }
    
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32601,
        message: `Method not found: ${body.method}`
      }
    });
    
  } catch (error) {
    console.error('❌ MCP Simple Error:', error);
    
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
    message: 'MCP Simple Server',
    methods: ['POST'],
    endpoints: ['tools/list']
  });
}