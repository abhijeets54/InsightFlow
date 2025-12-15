import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    keyLength: process.env.GEMINI_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('GEMINI') || k.startsWith('NEXT_PUBLIC'))
  });
}
