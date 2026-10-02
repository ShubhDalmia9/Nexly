import { randomBytes } from 'node:crypto';
import { LIMITS } from '../../shared/constants';
import { all, get, nowIso, run } from '../db/connection';
import { HttpError, badRequest, forbidden } from '../lib/errors';
import { storage } from '../storage';

export type ImageKind = 'avatar' | 'project';

interface ImageRow {
  id: number;
  user_id: number;
  kind: ImageKind;
  storage_key: string;
  url: string;
}

const FORMATS = [
  { mime: 'image/jpeg', extension: 'jpg', matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', extension: 'png', matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  {
    mime: 'image/webp',
    extension: 'webp',
    matches: (b: Buffer) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
] as const;

/**
 * Identifies an image by its leading bytes rather than by the file name or the type the browser
 * claimed, so a renamed script or HTML file is rejected.
 */
function detectFormat(bytes: Buffer) {
  if (bytes.length === 0) throw badRequest('That file is empty. Choose an image to upload.');
  if (bytes.length > LIMITS.photoBytes) {
    throw new HttpError(413, 'FILE_TOO_LARGE', `That image is too large. The limit is ${LIMITS.photoBytes / 1024 / 1024} MB.`);
  }
  const format = FORMATS.find((candidate) => candidate.matches(bytes));
  if (!format) throw new HttpError(415, 'UNSUPPORTED_IMAGE', 'That file is not a supported image. Use a JPG, PNG or WebP.');
  return format;
}

async function removeRows(rows: ImageRow[]): Promise<void> {
  for (const row of rows) {
    run('DELETE FROM images WHERE id = ?', row.id);
    await storage.delete(row.storage_key).catch((error) => console.error('[nexly] Could not delete image file', row.storage_key, error));
  }
}

/** Validates and stores an upload, recording who owns it. */
export async function saveImage(userId: number, kind: ImageKind, bytes: Buffer): Promise<{ id: number; url: string }> {
  const format = detectFormat(bytes);
  const key = `${kind === 'avatar' ? 'u' : 'p'}${userId}-${randomBytes(8).toString('hex')}.${format.extension}`;
  const url = await storage.put(key, bytes, format.mime);
  const { lastId } = run(
    'INSERT INTO images (user_id, kind, storage_key, url, mime, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId,
    kind,
    key,
    url,
    format.mime,
    bytes.length,
    nowIso(),
  );
  return { id: lastId, url };
}

/** Replaces the member's profile photo and deletes the previous file. */
export async function setAvatar(userId: number, bytes: Buffer): Promise<string> {
  const previous = all<ImageRow>("SELECT * FROM images WHERE user_id = ? AND kind = 'avatar'", userId);
  const { url } = await saveImage(userId, 'avatar', bytes);
  run('UPDATE profiles SET photo_url = ?, updated_at = ? WHERE user_id = ?', url, nowIso(), userId);
  await removeRows(previous);
  return url;
}

export async function removeAvatar(userId: number): Promise<void> {
  run('UPDATE profiles SET photo_url = NULL, updated_at = ? WHERE user_id = ?', nowIso(), userId);
  await removeRows(all<ImageRow>("SELECT * FROM images WHERE user_id = ? AND kind = 'avatar'", userId));
}

/**
 * Rejects a profile save that references an image the member did not upload. This is what stops
 * someone attaching (or later deleting) another member's image by editing the request.
 */
export function assertOwnsProjectImages(userId: number, urls: string[]): void {
  for (const url of urls) {
    const row = get<ImageRow>("SELECT * FROM images WHERE url = ? AND kind = 'project'", url);
    if (!row || row.user_id !== userId) throw forbidden('That project image does not belong to your account.');
  }
}

/** Deletes project images the member uploaded but is no longer using on any project. */
export async function removeUnusedProjectImages(userId: number, olderThanMinutes = 0): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
  const unused = all<ImageRow>(
    `SELECT i.* FROM images i
     WHERE i.user_id = ? AND i.kind = 'project' AND i.created_at <= ?
       AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.user_id = i.user_id AND p.image_url = i.url)`,
    userId,
    cutoff,
  );
  await removeRows(unused);
}

/** Startup housekeeping: uploads that were never attached to anything (an abandoned form, a crashed save). */
export async function removeOrphanedImages(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const orphans = all<ImageRow>(
    `SELECT i.* FROM images i
     WHERE i.created_at <= ?
       AND ((i.kind = 'project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.image_url = i.url))
         OR (i.kind = 'avatar' AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.photo_url = i.url)))`,
    cutoff,
  );
  await removeRows(orphans);
  return orphans.length;
}

/** Removes every file a member uploaded. Called before their account is deleted. */
export async function removeAllImages(userId: number): Promise<void> {
  await removeRows(all<ImageRow>('SELECT * FROM images WHERE user_id = ?', userId));
}
