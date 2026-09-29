import { NextResponse } from 'next/server';
import { getLLMProvider } from '@/lib/providers/factory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const provider = getLLMProvider();
  const startTime = Date.now();

  try {
    const health = await provider.healthCheck();

    const hasServerApiKey = Boolean(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim().length > 5 &&
      !process.env.GEMINI_API_KEY.includes('your_gemini')
    );

    return NextResponse.json({
      status: 'healthy',
      provider: provider.providerId,
      hasServerApiKey,
      serverModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      providerHealth: health,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      latencyMs: Date.now() - startTime,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'degraded',
        provider: provider.providerId,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
