import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from '../config';
import { all, db, get, resetStatementCache } from './connection';

const MIGRATIONS_DIR = path.join(ROOT_DIR, 'server', 'db', 'migrations');

/** Migration files, applied in name order. `PRAGMA user_version` records how many have run. */
function migrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d{3}_.+\.sql$/.test(file))
    .sort();
}

function currentVersion(): number {
  const version = get<{ user_version: number }>('PRAGMA user_version')!.user_version;
  // Databases created before migrations were numbered already have the first one applied.
  if (version === 0 && get("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'")) return 1;
  return version;
}

/** Brings the database up to date. Safe to call on every start. */
export function applySchema(): { from: number; to: number } {
  const files = migrationFiles();
  const from = currentVersion();
  for (let index = from; index < files.length; index += 1) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, files[index]), 'utf8');
    resetStatementCache();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${index + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${files[index]} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { from, to: files.length };
}

export function dropAllTables(): void {
  resetStatementCache();
  db.exec('PRAGMA foreign_keys = OFF;');
  const tables = all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
  for (const { name } of tables) db.exec(`DROP TABLE IF EXISTS "${name}";`);
  db.exec('PRAGMA user_version = 0; PRAGMA foreign_keys = ON;');
  resetStatementCache();
}

export function isDatabaseEmpty(): boolean {
  const row = get<{ count: number }>('SELECT COUNT(*) AS count FROM users');
  return !row || row.count === 0;
}
