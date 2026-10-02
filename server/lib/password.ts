import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';

// Passwords are hashed with scrypt and a per-user random salt. The parameters
// are stored alongside the hash so they can be raised later without a migration.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function encode(salt: Buffer, key: Buffer): string {
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P }, (error, key) => {
      if (error) reject(error);
      else resolve(encode(salt, key));
    });
  });
}

/** Synchronous variant for the seed script. */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  return encode(salt, scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P }));
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return Promise.resolve(false);
  const expected = Buffer.from(keyB64, 'base64');
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      Buffer.from(saltB64, 'base64'),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p) },
      (error, key) => {
        if (error) reject(error);
        else resolve(key.length === expected.length && timingSafeEqual(key, expected));
      },
    );
  });
}
