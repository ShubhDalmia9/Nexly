import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR, config } from '../config';

/**
 * Tells whether the code this server process is running is older than the code on disk.
 *
 * In development the pages are compiled on demand, so the browser always gets the newest
 * frontend, but the server only picks up its own changes when it is restarted. A server left
 * running across an update then answers the new pages with old behaviour, and they hang or come
 * back empty. Detecting that lets the app say "restart me" instead of failing in confusing ways.
 */

const startedAt = Date.now();
const WATCHED = ['server', 'shared', '.env'];
const RECHECK_MS = 3_000;

let lastCheck = 0;
let lastAnswer = false;

function newestChange(target: string): number {
  let stats: fs.Stats;
  try {
    stats = fs.statSync(target);
  } catch {
    return 0;
  }
  if (!stats.isDirectory()) return stats.mtimeMs;
  let newest = 0;
  for (const entry of fs.readdirSync(target)) newest = Math.max(newest, newestChange(path.join(target, entry)));
  return newest;
}

export function serverCodeChangedSinceStart(): boolean {
  if (config.isProduction) return false;
  const now = Date.now();
  if (now - lastCheck < RECHECK_MS) return lastAnswer;
  lastCheck = now;
  lastAnswer = WATCHED.some((name) => newestChange(path.join(ROOT_DIR, name)) > startedAt);
  return lastAnswer;
}
