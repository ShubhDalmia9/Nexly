import { Router } from 'express';
import { API_VERSION } from '../../shared/constants';
import type { AuthOptions, SessionResponse } from '../../shared/types';
import { localInboxEnabled } from '../config';
import { serverCodeChangedSinceStart } from '../lib/freshness';
import { clearSessionCookie, startSession } from '../middleware/auth';
import { rateLimit } from '../middleware/security';
import {
  checkResetToken,
  destroySession,
  getSessionUser,
  logIn,
  requestPasswordReset,
  resetPassword,
  signUp,
} from '../services/auth.service';
import { emailOnlySchema, logInSchema, parse, resetPasswordSchema, signupSchema, tokenSchema } from '../validation/schemas';

const TEN_MINUTES = 10 * 60 * 1000;
const emailKey = (req: { body?: { email?: unknown } }) =>
  typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

export const authRouter = Router();

// Answers "who am I?" for the app shell. Signed-out visitors get `null` rather than a 401,
// because not being signed in is an ordinary state on the public pages.
authRouter.get('/me', (req, res) => {
  const session: SessionResponse = {
    user: req.user ? getSessionUser(req.user.id) : null,
    api: API_VERSION,
    restartNeeded: serverCodeChangedSinceStart(),
  };
  res.json(session);
});

authRouter.get('/options', (_req, res) => {
  const options: AuthOptions = { localInbox: localInboxEnabled };
  res.json(options);
});

// ---------- Sign up ----------

// Creates the account and signs it in.
authRouter.post('/signup', rateLimit({ windowMs: TEN_MINUTES, max: 8, key: emailKey }), async (req, res) => {
  const userId = await signUp(parse(signupSchema, req.body));
  startSession(req, res, userId);
  res.status(201).json({ user: getSessionUser(userId) });
});

// ---------- Log in / out ----------

authRouter.post('/login', rateLimit({ windowMs: TEN_MINUTES, max: 10, key: emailKey }), async (req, res) => {
  const input = parse(logInSchema, req.body);
  const user = await logIn(input.email, input.password);
  startSession(req, res, user.id);
  res.json({ user: getSessionUser(user.id) });
});

authRouter.post('/logout', (req, res) => {
  if (req.sessionToken) destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ---------- Password reset ----------

authRouter.post('/forgot-password', rateLimit({ windowMs: TEN_MINUTES, max: 6, key: emailKey }), async (req, res) => {
  await requestPasswordReset(parse(emailOnlySchema, req.body).email);
  res.status(202).json({ ok: true });
});

authRouter.post('/reset-password/check', rateLimit({ windowMs: TEN_MINUTES, max: 30 }), (req, res) => {
  res.json(checkResetToken(parse(tokenSchema, req.body).token));
});

authRouter.post('/reset-password', rateLimit({ windowMs: TEN_MINUTES, max: 10 }), async (req, res) => {
  const { token, password } = parse(resetPasswordSchema, req.body);
  await resetPassword(token, password);
  res.json({ ok: true });
});
