import { computeCompletion } from '../../shared/completion';
import type { SecurityOverview, SessionInfo, SessionUser, UserSettings } from '../../shared/types';
import { config } from '../config';
import { all, get, nowIso, run, transaction } from '../db/connection';
import { EmailDeliveryError, sendEmail, sendEmailInBackground } from '../email/mailer';
import * as templates from '../email/templates';
import { HttpError, badRequest } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/password';
import { createToken, hashToken } from '../lib/tokens';
import { removeAllImages } from './image.service';
import { createNotification } from './notification.service';
import { getProfile } from './profile.service';

const RESET_TOKEN_MINUTES = 30;
/** Minimum gap between two password-reset emails to the same address. */
const EMAIL_COOLDOWN_SECONDS = 45;

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

// ---------- Session user ----------

interface SettingsRow {
  discoverable: number;
  notify_requests: number;
  notify_accepted: number;
  email_requests: number;
  email_accepted: number;
}

export function getSettings(userId: number): UserSettings {
  const row = get<SettingsRow>('SELECT * FROM user_settings WHERE user_id = ?', userId);
  return {
    discoverable: row ? row.discoverable === 1 : true,
    notifyRequests: row ? row.notify_requests === 1 : true,
    notifyAccepted: row ? row.notify_accepted === 1 : true,
    emailRequests: row ? row.email_requests === 1 : true,
    emailAccepted: row ? row.email_accepted === 1 : true,
  };
}

export function updateSettings(userId: number, settings: UserSettings): UserSettings {
  run(
    `INSERT INTO user_settings (user_id, discoverable, notify_requests, notify_accepted, email_requests, email_accepted, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET discoverable = excluded.discoverable, notify_requests = excluded.notify_requests,
       notify_accepted = excluded.notify_accepted, email_requests = excluded.email_requests,
       email_accepted = excluded.email_accepted, updated_at = excluded.updated_at`,
    userId,
    settings.discoverable ? 1 : 0,
    settings.notifyRequests ? 1 : 0,
    settings.notifyAccepted ? 1 : 0,
    settings.emailRequests ? 1 : 0,
    settings.emailAccepted ? 1 : 0,
    nowIso(),
  );
  return getSettings(userId);
}

export function getSessionUser(userId: number): SessionUser {
  const account = get<{ email: string; is_demo: number; created_at: string }>(
    'SELECT email, is_demo, created_at FROM users WHERE id = ?',
    userId,
  )!;
  const profile = getProfile(userId);
  return {
    id: userId,
    email: account.email,
    isSeeded: account.is_demo === 1,
    createdAt: account.created_at,
    profile,
    completion: computeCompletion(profile),
    settings: getSettings(userId),
  };
}

// ---------- Sessions ----------

export function createSession(userId: number, userAgent: string): string {
  const token = createToken();
  const now = nowIso();
  run(
    'INSERT INTO sessions (user_id, token_hash, created_at, expires_at, user_agent, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)',
    userId,
    hashToken(token),
    now,
    hoursFromNow(config.sessionDays * 24),
    userAgent.slice(0, 300),
    now,
  );
  return token;
}

export function findSession(token: string): { id: number; email: string; sessionId: number } | undefined {
  const session = get<{ id: number; email: string; sessionId: number; last_seen_at: string | null }>(
    `SELECT u.id, u.email, s.id AS sessionId, s.last_seen_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    hashToken(token),
    nowIso(),
  );
  if (!session) return undefined;
  // Record activity at most every few minutes rather than on every request.
  if (!session.last_seen_at || Date.now() - new Date(session.last_seen_at).getTime() > 5 * 60_000) {
    run('UPDATE sessions SET last_seen_at = ? WHERE id = ?', nowIso(), session.sessionId);
  }
  return { id: session.id, email: session.email, sessionId: session.sessionId };
}

export function destroySession(token: string): void {
  run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token));
}

function describeDevice(userAgent: string): string {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : '';
  const system = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  if (browser && system) return `${browser} on ${system}`;
  return browser || system || 'Unknown device';
}

export function getSecurityOverview(userId: number, currentSessionId: number | undefined): SecurityOverview {
  const sessions: SessionInfo[] = all<{ id: number; user_agent: string; created_at: string; last_seen_at: string | null }>(
    'SELECT id, user_agent, created_at, last_seen_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_seen_at DESC',
    userId,
    nowIso(),
  ).map((row) => ({
    id: row.id,
    current: row.id === currentSessionId,
    device: describeDevice(row.user_agent),
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  }));
  const credential = get<{ updated_at: string }>('SELECT updated_at FROM password_credentials WHERE user_id = ?', userId);
  return { sessions, passwordChangedAt: credential?.updated_at ?? null };
}

export function revokeOtherSessions(userId: number, keepSessionId: number | undefined): number {
  return run('DELETE FROM sessions WHERE user_id = ? AND id <> ?', userId, keepSessionId ?? -1).changes;
}

// ---------- Account creation ----------

const emailTaken = () => {
  const message = 'An account with this email already exists. Log in instead.';
  return new HttpError(409, 'EMAIL_TAKEN', message, { email: message });
};

function createAccount(input: { email: string; fullName: string; passwordHash: string }): number {
  const now = nowIso();
  try {
    return transaction(() => {
      const { lastId } = run('INSERT INTO users (email, created_at) VALUES (?, ?)', input.email, now);
      run('INSERT INTO password_credentials (user_id, password_hash, updated_at) VALUES (?, ?, ?)', lastId, input.passwordHash, now);
      run('INSERT INTO profiles (user_id, full_name, updated_at) VALUES (?, ?, ?)', lastId, input.fullName, now);
      run('INSERT INTO user_settings (user_id, updated_at) VALUES (?, ?)', lastId, now);
      createNotification({ userId: lastId, actorId: null, type: 'welcome' });
      return lastId;
    });
  } catch (error) {
    // Two requests racing for the same email: the UNIQUE constraint is the final arbiter.
    if (error instanceof Error && /UNIQUE constraint failed: users\.email/.test(error.message)) throw emailTaken();
    throw error;
  }
}

const accountByEmail = (email: string) => get<{ id: number; email: string }>('SELECT id, email FROM users WHERE email = ?', email);

function profileName(userId: number): string {
  return get<{ full_name: string }>('SELECT full_name FROM profiles WHERE user_id = ?', userId)?.full_name ?? '';
}

async function deliver(email: Parameters<typeof sendEmail>[0]): Promise<void> {
  try {
    await sendEmail(email);
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      console.error('[nexly]', error.message);
      throw new HttpError(502, 'EMAIL_NOT_SENT', 'We could not send that email just now. Please try again in a minute.');
    }
    throw error;
  }
}

/** Stops the reset form being used to flood someone's inbox. */
function enforceCooldown(email: string): void {
  const latest = get<{ created_at: string }>(
    "SELECT created_at FROM email_tokens WHERE email = ? AND purpose = 'reset_password' ORDER BY id DESC LIMIT 1",
    email,
  );
  if (latest && Date.now() - new Date(latest.created_at).getTime() < EMAIL_COOLDOWN_SECONDS * 1000) {
    throw new HttpError(429, 'EMAIL_COOLDOWN', 'We sent an email a moment ago. Please wait a minute before asking for another.');
  }
}

// ---------- Sign up ----------

/** Creates the account. The email address is simply what the member logs in with. */
export async function signUp(input: { fullName: string; email: string; password: string }): Promise<number> {
  if (accountByEmail(input.email)) throw emailTaken();
  const passwordHash = await hashPassword(input.password);
  return createAccount({ email: input.email, fullName: input.fullName, passwordHash });
}

// ---------- Log in ----------

const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');

export async function logIn(email: string, password: string): Promise<{ id: number; email: string }> {
  const user = get<{ id: number; email: string; password_hash: string | null }>(
    `SELECT u.id, u.email, c.password_hash FROM users u
     LEFT JOIN password_credentials c ON c.user_id = u.id WHERE u.email = ?`,
    email,
  );
  // Verify against a dummy hash when there is nothing to check, so response time reveals nothing.
  const valid = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (user && user.password_hash && valid) return { id: user.id, email: user.email };

  throw new HttpError(401, 'INVALID_CREDENTIALS', 'That email or password is incorrect.');
}

// ---------- Password reset ----------

/** Sends a reset link if the address has an account. The caller always gets the same answer. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = accountByEmail(email);
  if (!user) return;
  enforceCooldown(user.email);

  const token = createToken();
  transaction(() => {
    run("DELETE FROM email_tokens WHERE user_id = ? AND purpose = 'reset_password'", user.id);
    run(
      `INSERT INTO email_tokens (purpose, email, user_id, token_hash, created_at, expires_at)
       VALUES ('reset_password', ?, ?, ?, ?, ?)`,
      user.email,
      user.id,
      hashToken(token),
      nowIso(),
      hoursFromNow(RESET_TOKEN_MINUTES / 60),
    );
  });
  await deliver({
    to: user.email,
    template: 'reset-password',
    ...templates.resetPassword({
      fullName: profileName(user.id),
      url: `${config.appUrl}/reset-password?token=${token}`,
      expiresInMinutes: RESET_TOKEN_MINUTES,
    }),
  });
}

interface ResetTokenRow {
  id: number;
  email: string;
  user_id: number;
  expires_at: string;
  used_at: string | null;
}

function readResetToken(token: string): ResetTokenRow {
  const row = get<ResetTokenRow>("SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = 'reset_password'", hashToken(token));
  if (!row) throw new HttpError(400, 'TOKEN_INVALID', 'This reset link is not valid. It may have been replaced by a newer one.');
  if (row.used_at) throw new HttpError(400, 'TOKEN_USED', 'This reset link has already been used.');
  if (row.expires_at <= nowIso()) throw new HttpError(400, 'TOKEN_EXPIRED', 'This reset link has expired. Request a new one.');
  return row;
}

/** Lets the reset page show "link expired" before the visitor types a new password. */
export function checkResetToken(token: string): { email: string } {
  return { email: readResetToken(token).email };
}

function sendPasswordChangedNotice(userId: number, email: string): void {
  // The members that come with the app have addresses that cannot receive email.
  if (get('SELECT 1 FROM users WHERE id = ? AND is_demo = 1', userId)) return;
  sendEmailInBackground({
    to: email,
    template: 'password-changed',
    ...templates.passwordChanged({ fullName: profileName(userId), resetUrl: `${config.appUrl}/forgot-password` }),
  });
}

function storePassword(userId: number, passwordHash: string): void {
  run(
    `INSERT INTO password_credentials (user_id, password_hash, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at`,
    userId,
    passwordHash,
    nowIso(),
  );
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const row = readResetToken(token);
  const passwordHash = await hashPassword(password);
  transaction(() => {
    storePassword(row.user_id, passwordHash);
    run('UPDATE email_tokens SET used_at = ? WHERE id = ?', nowIso(), row.id);
    // Signing out everywhere means a stolen session does not survive a password reset.
    run('DELETE FROM sessions WHERE user_id = ?', row.user_id);
  });
  sendPasswordChangedNotice(row.user_id, row.email);
}

// ---------- Settings: password and account ----------

async function confirmPassword(userId: number, password: string): Promise<void> {
  const credential = get<{ password_hash: string }>('SELECT password_hash FROM password_credentials WHERE user_id = ?', userId);
  if (!credential || !(await verifyPassword(password, credential.password_hash))) {
    throw new HttpError(400, 'WRONG_PASSWORD', 'That is not your current password.', { currentPassword: 'That is not your current password.' });
  }
}

export async function changePassword(
  userId: number,
  input: { currentPassword: string; newPassword: string },
  keepSessionId: number | undefined,
): Promise<void> {
  await confirmPassword(userId, input.currentPassword);
  const passwordHash = await hashPassword(input.newPassword);
  transaction(() => {
    storePassword(userId, passwordHash);
    revokeOtherSessions(userId, keepSessionId);
  });
  const { email } = get<{ email: string }>('SELECT email FROM users WHERE id = ?', userId)!;
  sendPasswordChangedNotice(userId, email);
}

/** Permanently deletes the account and everything attached to it. */
export async function deleteAccount(userId: number, input: { password: string }): Promise<void> {
  const account = get<{ email: string; is_demo: number }>('SELECT email, is_demo FROM users WHERE id = ?', userId)!;
  // The members that come with the app stay, so there is always someone to discover.
  if (account.is_demo === 1) throw badRequest('This account cannot be deleted.');
  await confirmPassword(userId, input.password);

  const fullName = profileName(userId);
  await removeAllImages(userId);
  // Every table that references the user cascades from this one delete.
  run('DELETE FROM users WHERE id = ?', userId);
  run('DELETE FROM email_tokens WHERE email = ?', account.email);
  sendEmailInBackground({ to: account.email, template: 'account-deleted', ...templates.accountDeleted({ fullName }) });
}

// ---------- Housekeeping ----------

export function cleanExpired(): void {
  const now = nowIso();
  run('DELETE FROM sessions WHERE expires_at <= ?', now);
  // Keep spent and expired links for a day so "already used" and "expired" can be told apart.
  run('DELETE FROM email_tokens WHERE expires_at <= ?', new Date(Date.now() - 24 * 3_600_000).toISOString());
}
