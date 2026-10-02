// Checks that a database created by the first version of Nexly upgrades cleanly and keeps its data.
// Usage: npx tsx scripts/check-upgrade.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexly-upgrade-'));
process.env.DATA_DIR = dataDir;

// Build a version-1 database by hand: the first migration only, with one account in it.
const migrations = path.join(import.meta.dirname, '..', 'server', 'db', 'migrations');
const old = new DatabaseSync(path.join(dataDir, 'nexly.db'));
old.exec('PRAGMA foreign_keys = ON;');
old.exec(fs.readFileSync(path.join(migrations, '001_initial.sql'), 'utf8'));
old.exec(`
  INSERT INTO users (id, email, password_hash, created_at) VALUES (1, 'old@example.com', 'scrypt$placeholder', '2026-01-01T00:00:00.000Z');
  INSERT INTO profiles (user_id, full_name, profession, onboarded, updated_at) VALUES (1, 'Old Member', 'Engineer', 1, '2026-01-01T00:00:00.000Z');
  INSERT INTO sessions (user_id, token_hash, created_at, expires_at) VALUES (1, 'abc', '2026-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z');
  INSERT INTO projects (user_id, title) VALUES (1, 'An old project');
  INSERT INTO users (id, email, password_hash, created_at) VALUES (2, 'other@example.com', 'scrypt$placeholder', '2026-01-01T00:00:00.000Z');
  INSERT INTO swipes (swiper_id, target_id, direction, created_at) VALUES (1, 2, 'right', '2026-01-02T00:00:00.000Z'), (2, 1, 'left', '2026-01-03T00:00:00.000Z');
`);
old.close();

const { applySchema } = await import('../server/db/migrate');
const { db } = await import('../server/db/connection');
const { getSessionUser } = await import('../server/services/auth.service');

try {
  const result = applySchema();
  assert.deepEqual(result, { from: 1, to: 5 });
  assert.deepEqual(applySchema(), { from: 5, to: 5 }, 'running it again changes nothing');

  const user = getSessionUser(1);
  assert.equal(user.email, 'old@example.com');
  assert.equal(user.settings.discoverable, true);
  assert.deepEqual(user.profile.experience, []);
  assert.equal(user.profile.headline, '');

  const columns = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((column) => column.name);
  assert.ok(!columns.includes('password_hash'), 'users no longer holds password hashes');
  const credential = db.prepare('SELECT password_hash FROM password_credentials WHERE user_id = 1').get() as { password_hash: string };
  assert.equal(credential.password_hash, 'scrypt$placeholder');
  const decisions = db.prepare('SELECT viewer_id, target_id, action FROM decisions ORDER BY id').all();
  assert.deepEqual(
    decisions.map((row) => ({ ...row })),
    [
      { viewer_id: 1, target_id: 2, action: 'connect' },
      { viewer_id: 2, target_id: 1, action: 'skip' },
    ],
    'earlier decisions are carried over under their new names',
  );
  console.log('Upgrade check passed: a version-1 database migrates to version 5 with its data intact.');
} finally {
  db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
