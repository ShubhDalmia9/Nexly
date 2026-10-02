import { createHash, randomBytes } from 'node:crypto';

/** A URL-safe random token. Only its SHA-256 hash is ever stored. */
export function createToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
