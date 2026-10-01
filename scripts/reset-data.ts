/**
 * The Council - Database Reset Script
 *
 * Backs up existing data, deletes current SQLite database, and creates
 * a fresh database with all migrations applied.
 */

import fs from 'node:fs';
import path from 'node:path';
import { runBackup } from './backup';
import { CouncilDatabase } from '../src/lib/storage/db';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'council.db');

export function runReset(): void {
  console.log('[Reset] Performing safety backup before resetting data...');
  runBackup();

  const filesToDelete = [
    DB_FILE,
    `${DB_FILE}-wal`,
    `${DB_FILE}-shm`,
  ];

  for (const f of filesToDelete) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`[Reset] Removed: ${f}`);
    }
  }

  console.log('[Reset] Initializing pristine database with schema migrations...');
  const db = new CouncilDatabase({ inMemory: false });
  db.close();

  console.log('[Reset] Database successfully reset and migrated at ./data/council.db.');
}

if (process.argv[1] && process.argv[1].endsWith('reset-data.ts')) {
  runReset();
}
