/**
 * The Council - SQLite Database Backup Script
 *
 * Atomically backs up ./data/council.db into ./data/backups/ with timestamp.
 * Retains up to 7 rotating snapshots.
 */

import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'council.db');
const BACKUP_DIR = path.join(DB_DIR, 'backups');

export function runBackup(): string {
  if (!fs.existsSync(DB_FILE)) {
    console.warn(`[Backup] Database file not found at ${DB_FILE}; skipping.`);
    return '';
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `council_backup_${timestamp}.db`);

  fs.copyFileSync(DB_FILE, backupFile);
  console.log(`[Backup] Successfully created database backup:\n  -> ${backupFile}`);

  // Also copy WAL file if present
  const walFile = `${DB_FILE}-wal`;
  if (fs.existsSync(walFile)) {
    fs.copyFileSync(walFile, `${backupFile}-wal`);
  }

  // Prune older backups keeping latest 7
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('council_backup_') && f.endsWith('.db'))
      .sort()
      .reverse();

    if (files.length > 7) {
      for (const old of files.slice(7)) {
        fs.unlinkSync(path.join(BACKUP_DIR, old));
        const oldWal = path.join(BACKUP_DIR, `${old}-wal`);
        if (fs.existsSync(oldWal)) fs.unlinkSync(oldWal);
        console.log(`[Backup] Pruned old backup: ${old}`);
      }
    }
  } catch (err: any) {
    console.warn(`[Backup] Backup pruning error:`, err?.message);
  }

  return backupFile;
}

if (process.argv[1] && process.argv[1].endsWith('backup.ts')) {
  runBackup();
}
