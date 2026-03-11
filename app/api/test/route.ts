import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API routes are working!',
    timestamp: Date.now()
  });
}

export async function POST() {
  return NextResponse.json({ 
    message: 'POST method working!',
    timestamp: Date.now()
  });
}