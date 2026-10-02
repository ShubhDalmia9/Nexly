import fs from 'node:fs';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { config } from '../config';

export type SqlParam = string | number | bigint | null;

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

// Every query in the app goes through a prepared statement with bound
// parameters; statements are cached by their SQL text.
const statements = new Map<string, StatementSync>();

function prepare(sql: string): StatementSync {
  let statement = statements.get(sql);
  if (!statement) {
    statement = db.prepare(sql);
    statements.set(sql, statement);
  }
  return statement;
}

export function all<T>(sql: string, ...params: SqlParam[]): T[] {
  return prepare(sql).all(...params) as T[];
}

export function get<T>(sql: string, ...params: SqlParam[]): T | undefined {
  return prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, ...params: SqlParam[]): { changes: number; lastId: number } {
  const result = prepare(sql).run(...params);
  return { changes: Number(result.changes), lastId: Number(result.lastInsertRowid) };
}

let depth = 0;

/** Runs `fn` atomically. Nested calls join the outer transaction through savepoints. */
export function transaction<T>(fn: () => T): T {
  const savepoint = `sp_${depth}`;
  db.exec(depth === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${savepoint}`);
  depth += 1;
  try {
    const result = fn();
    depth -= 1;
    db.exec(depth === 0 ? 'COMMIT' : `RELEASE ${savepoint}`);
    return result;
  } catch (error) {
    depth -= 1;
    db.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
    throw error;
  }
}

/** Clears cached statements; required before dropping tables they reference. */
export function resetStatementCache(): void {
  statements.clear();
}

export function nowIso(): string {
  return new Date().toISOString();
}
