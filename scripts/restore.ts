/**
 * The Council - SQLite Database Restore Script
 *
 * Restores ./data/council.db from the latest backup in ./data/backups/
 * or a specific backup file passed as an argument.
 */

import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'council.db');
const BACKUP_DIR = path.join(DB_DIR, 'backups');

export function runRestore(targetFile?: string): boolean {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`[Restore] No backup directory exists at ${BACKUP_DIR}`);
    return false;
  }

  let restoreSource = targetFile;
  if (!restoreSource) {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('council_backup_') && f.endsWith('.db'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error(`[Restore] No backup files found in ${BACKUP_DIR}`);
      return false;
    }
    restoreSource = path.join(BACKUP_DIR, files[0]);
  }

  if (!fs.existsSync(restoreSource)) {
    console.error(`[Restore] Specified backup file does not exist: ${restoreSource}`);
    return false;
  }

  // Create safety copy of current DB if it exists
  if (fs.existsSync(DB_FILE)) {
    const safetyFile = `${DB_FILE}.pre-restore`;
    fs.copyFileSync(DB_FILE, safetyFile);
    console.log(`[Restore] Preserved existing database at ${safetyFile}`);
  }

  // Restore DB
  fs.copyFileSync(restoreSource, DB_FILE);
  console.log(`[Restore] Successfully restored database from:\n  ${restoreSource} -> ${DB_FILE}`);

  // Restore WAL if present
  const sourceWal = `${restoreSource}-wal`;
  const targetWal = `${DB_FILE}-wal`;
  if (fs.existsSync(sourceWal)) {
    fs.copyFileSync(sourceWal, targetWal);
  } else if (fs.existsSync(targetWal)) {
    fs.unlinkSync(targetWal);
  }

  return true;
}

if (process.argv[1] && process.argv[1].endsWith('restore.ts')) {
  const customTarget = process.argv[2];
  const ok = runRestore(customTarget);
  if (!ok) process.exit(1);
}
