/**
 * Clean Test Sessions Script (R10)
 *
 * Removes leftover test sessions created by test fixtures from the primary DB.
 * Default mode: dry-run (lists matching sessions without modifying DB).
 * Pass --yes or -y to perform the deletion.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "data", "council.db");

if (!fs.existsSync(dbPath)) {
  console.log(`Database file not found at ${dbPath}`);
  process.exit(0);
}

const db = new DatabaseSync(dbPath);

const isExecute = process.argv.includes("--yes") || process.argv.includes("-y");

const TEST_PATTERNS = [
  "%test%",
  "%Stream Unit Test%",
  "%Rerun: Updated Al%",
  "%Over many years%",
  "%Should a bootstra%",
  "%Career vs. Family%",
  "%AI Regulation%",
  "%Startup Dilemma%",
  "%non-existent-session%",
  "%Simulated%",
];

try {
  const query = `
    SELECT id, title, query, created_at, status
    FROM sessions
    WHERE ${TEST_PATTERNS.map(() => `(title LIKE ? OR query LIKE ?)`).join(" OR ")}
    ORDER BY created_at DESC
  `;

  const params: string[] = [];
  for (const p of TEST_PATTERNS) {
    params.push(p, p);
  }

  const matchingRows = db.prepare(query).all(...params) as Array<{
    id: string;
    title: string | null;
    query: string;
    created_at: number;
    status: string;
  }>;

  if (matchingRows.length === 0) {
    console.log("No test fixture sessions found in primary database.");
    process.exit(0);
  }

  console.log(`Found ${matchingRows.length} test fixture session(s) in primary database:`);
  console.log("───────────────────────────────────────────────────────────────────");
  for (const row of matchingRows) {
    const title = row.title || row.query.slice(0, 50);
    const dateStr = new Date(row.created_at).toISOString();
    console.log(`• [${row.id.slice(0, 8)}] (${row.status}) "${title}" (${dateStr})`);
  }
  console.log("───────────────────────────────────────────────────────────────────");

  if (!isExecute) {
    console.log("\n[DRY RUN]: No sessions deleted.");
    console.log("To delete these test sessions, re-run with: npm run clean-test-sessions -- --yes");
    process.exit(0);
  }

  // Deletion mode
  const ids = matchingRows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  db.exec("BEGIN TRANSACTION;");
  try {
    // Delete session_events first
    db.prepare(`DELETE FROM session_events WHERE session_id IN (${placeholders})`).run(...ids);
    // Delete sessions
    db.prepare(`DELETE FROM sessions WHERE id IN (${placeholders})`).run(...ids);
    db.exec("COMMIT;");
    console.log(`\n✅ Successfully deleted ${ids.length} test session(s) from primary database.`);
  } catch (err) {
    db.exec("ROLLBACK;");
    console.error("Failed to delete test sessions:", err);
    process.exit(1);
  }
} catch (err) {
  console.error("Database query failed:", err);
  process.exit(1);
} finally {
  db.close();
}
