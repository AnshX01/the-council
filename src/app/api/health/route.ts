import { NextResponse } from 'next/server';
import { getLLMProvider } from '@/lib/providers/factory';
import { resolveEngineConfig } from '@/lib/config/engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const engine = resolveEngineConfig();
  const provider = getLLMProvider();
  const startTime = Date.now();

  try {
    const health = await provider.healthCheck();

    return NextResponse.json({
      status: 'healthy',
      engineMode: engine.mode,
      engineReason: engine.reason,
      provider: provider.providerId,
      hasServerApiKey: Boolean(engine.apiKey && engine.mode === 'live'),
      serverModel: engine.model,
      keyLast4: engine.keyLast4,
      keySource: engine.keySource,
      providerHealth: health,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      latencyMs: Date.now() - startTime,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'degraded',
        engineMode: engine.mode,
        provider: provider.providerId,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
