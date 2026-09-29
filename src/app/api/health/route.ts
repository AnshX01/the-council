import { NextResponse } from 'next/server';
import { getLLMProvider } from '@/lib/providers/factory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const provider = getLLMProvider();
  const startTime = Date.now();

  try {
    const health = await provider.healthCheck();

    return NextResponse.json({
      status: 'healthy',
      provider: provider.providerId,
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
