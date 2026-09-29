import { NextRequest, NextResponse } from 'next/server';
import { GeminiProvider } from '@/lib/providers/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = body?.apiKey?.trim();
    const modelId = body?.modelId?.trim() || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json(
        { ok: false, error: 'API key is too short or missing' },
        { status: 400 }
      );
    }

    const provider = new GeminiProvider(apiKey, modelId);
    const health = await provider.healthCheck();

    if (health.ok) {
      return NextResponse.json({
        ok: true,
        modelId: provider.getModelId(),
        latencyMs: health.latencyMs,
      });
    } else {
      return NextResponse.json(
        { ok: false, error: health.error || 'Health check failed for provided API key' },
        { status: 401 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to validate Gemini API key' },
      { status: 500 }
    );
  }
}
