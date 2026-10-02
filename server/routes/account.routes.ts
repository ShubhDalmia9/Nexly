import { Router } from 'express';
import { nowIso, run } from '../db/connection';
import { clearSessionCookie, currentUserId, requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/security';
import {
  changePassword,
  deleteAccount,
  getSecurityOverview,
  getSessionUser,
  revokeOtherSessions,
  updateSettings,
} from '../services/auth.service';
import { changePasswordSchema, deleteAccountSchema, nameSchema, parse, settingsSchema } from '../validation/schemas';

// Account settings. Every route acts on the signed-in account only: the user id comes from the
// session and is never read from the request.
export const accountRouter = Router();
accountRouter.use(requireAuth);

accountRouter.get('/security', (req, res) => {
  res.json(getSecurityOverview(currentUserId(req), req.sessionId));
});

accountRouter.put('/settings', (req, res) => {
  updateSettings(currentUserId(req), parse(settingsSchema, req.body));
  res.json({ user: getSessionUser(currentUserId(req)) });
});

accountRouter.put('/name', (req, res) => {
  const { fullName } = parse(nameSchema, req.body);
  run('UPDATE profiles SET full_name = ?, updated_at = ? WHERE user_id = ?', fullName, nowIso(), currentUserId(req));
  res.json({ user: getSessionUser(currentUserId(req)) });
});

accountRouter.post('/password', rateLimit({ windowMs: 10 * 60 * 1000, max: 10 }), async (req, res) => {
  await changePassword(currentUserId(req), parse(changePasswordSchema, req.body), req.sessionId);
  res.json({ user: getSessionUser(currentUserId(req)) });
});

accountRouter.post('/sessions/revoke-others', (req, res) => {
  const revoked = revokeOtherSessions(currentUserId(req), req.sessionId);
  res.json({ revoked, security: getSecurityOverview(currentUserId(req), req.sessionId) });
});

accountRouter.post('/delete', rateLimit({ windowMs: 10 * 60 * 1000, max: 10 }), async (req, res) => {
  await deleteAccount(currentUserId(req), parse(deleteAccountSchema, req.body));
  clearSessionCookie(res);
  res.json({ ok: true });
});
