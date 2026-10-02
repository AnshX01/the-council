/**
 * The Council - Engine Diagnostics CLI
 * Run with: npm run diag:engine
 */

import { resolveEngineConfig } from '../src/lib/config/engine';
import { GeminiProvider } from '../src/lib/providers/gemini';
import { GoogleGenAI } from '@google/genai';

async function main() {
  console.log('====================================================');
  console.log('           THE COUNCIL — ENGINE DIAGNOSTICS          ');
  console.log('====================================================\n');

  const config = resolveEngineConfig();

  console.log(`Mode:            ${config.mode.toUpperCase()}`);
  console.log(`Reason:          ${config.reason}`);
  console.log(`Key Source:      ${config.keySource}`);
  console.log(`Key (Masked):    ${config.keyLast4 ? `••••${config.keyLast4}` : 'none'}`);
  console.log(`Configured Model:${config.model} (${config.modelSource})`);
  console.log('----------------------------------------------------');

  if (config.mode === 'simulation') {
    console.log(`\nℹ️  Chamber is running in SIMULATION mode.`);
    console.log(`Reason: ${config.reason}`);
    console.log(`All sessions will use deterministic MockProvider archetypes at $0 cost.`);
    process.exit(0);
  }

  console.log(`\nProbing Gemini API with configured model: ${config.model}...`);
  const startTime = Date.now();

  try {
    const provider = new GeminiProvider(config.apiKey, config.model);
    const health = await provider.healthCheck();

    if (health.ok) {
      console.log(`✅ SUCCESS! Gemini responded in ${health.latencyMs}ms.`);
      console.log(`Model:           ${health.model}`);

      // List models accessible with this key
      try {
        console.log('\nDiscovering accessible models from Google Gen AI SDK...');
        const ai = new GoogleGenAI({ apiKey: config.apiKey! });
        const list = await ai.models.list();
        const models: string[] = [];
        for await (const m of list) {
          const cleanId = (m.name || '').replace(/^models\//, '');
          if (cleanId.startsWith('gemini') && !cleanId.includes('1.5') && !cleanId.includes('embedding')) {
            models.push(cleanId);
          }
        }
        console.log(`Found ${models.length} modern Gemini models:`);
        models.slice(0, 10).forEach((m) => console.log(`  - ${m}`));
      } catch (err: any) {
        console.log(`(Model listing skipped: ${err?.message || 'unknown'})`);
      }

      console.log('\n====================================================');
      console.log('       ENGINE IS LIVE AND DELIBERATION-READY        ');
      console.log('====================================================');
      process.exitCode = 0;
    } else {
      console.error(`❌ FAILED: Health probe did not succeed.`);
      console.error(`Error Code:    ${health.errorCode}`);
      console.error(`Clean Message: ${health.cleanMessage || health.error}`);
      console.error(`Latency:       ${health.latencyMs}ms`);
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error(`❌ FATAL ERROR probing Gemini:`, err?.message || err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal diagnostic script error:', err);
  process.exit(1);
});
