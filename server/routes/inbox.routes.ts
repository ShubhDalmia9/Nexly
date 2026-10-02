import { type NextFunction, type Request, type Response, Router } from 'express';
import type { InboxEmail } from '../../shared/types';
import { localInboxEnabled } from '../config';
import { all, run } from '../db/connection';
import { notFound } from '../lib/errors';

/**
 * The local inbox: the emails Nexly has written while no email provider is connected, so the
 * password-reset links can be opened on the same computer. Those emails
 * contain sign-in links, so this only exists in development, only without a provider, and only
 * answers requests from this machine.
 */
export const inboxRouter = Router();

inboxRouter.use((req: Request, _res: Response, next: NextFunction) => {
  const address = req.socket.remoteAddress ?? '';
  const local = address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
  if (!localInboxEnabled || !local) throw notFound('That endpoint does not exist.');
  next();
});

inboxRouter.get('/', (_req, res) => {
  const emails: InboxEmail[] = all<{ id: number; to_email: string; subject: string; html: string; text: string; template: string; created_at: string }>(
    'SELECT * FROM dev_mailbox ORDER BY id DESC LIMIT 100',
  ).map((row) => ({
    id: row.id,
    to: row.to_email,
    subject: row.subject,
    html: row.html,
    text: row.text,
    template: row.template,
    createdAt: row.created_at,
  }));
  res.json({ emails });
});

inboxRouter.delete('/', (_req, res) => {
  run('DELETE FROM dev_mailbox');
  res.json({ ok: true });
});
