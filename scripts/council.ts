/**
 * The Council - One-Command Launcher (npm run council)
 *
 * Bootstraps local directories, runs database migrations, compiles production
 * bundle if necessary, starts the server, and opens the browser.
 */

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CouncilDatabase } from '../src/lib/storage/db';

const PORT = process.env.PORT || '3000';
const URL = `http://localhost:${PORT}`;

function ensureDirs(): void {
  const dirs = ['data', 'logs'];
  for (const d of dirs) {
    const fullPath = path.resolve(process.cwd(), d);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

function ensureDatabase(): void {
  console.log('[Council Launcher] Checking SQLite schema migrations...');
  const db = new CouncilDatabase({ inMemory: false });
  db.close();
  console.log('[Council Launcher] Database ready at ./data/council.db.');
}

function ensureBuild(): void {
  const nextDir = path.resolve(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    console.log('[Council Launcher] No production build found. Running initial build...');
    execSync('npm run build', { stdio: 'inherit' });
  }
}

function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd = '';
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  try {
    execSync(cmd);
  } catch {
    // Non-fatal if browser opening fails
  }
}

export function launchCouncil(): void {
  console.log('====================================================');
  console.log('               THE COUNCIL                          ');
  console.log('       Eight Autonomous AI Personas & Moderator     ');
  console.log('====================================================');

  ensureDirs();
  ensureDatabase();
  ensureBuild();

  console.log(`[Council Launcher] Starting server on ${URL}...`);
  const server = spawn('npx', ['next', 'start', '-p', PORT], {
    stdio: 'inherit',
    shell: true,
  });

  // Open browser after brief server spin-up delay
  setTimeout(() => {
    console.log(`[Council Launcher] Opening browser at ${URL}`);
    openBrowser(URL);
  }, 1500);

  process.on('SIGINT', () => {
    console.log('\n[Council Launcher] Gracefully shutting down...');
    server.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
    process.exit(0);
  });
}

if (process.argv[1] && process.argv[1].endsWith('council.ts')) {
  launchCouncil();
}
