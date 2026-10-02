import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { config } from './config';
import { attachUser } from './middleware/auth';
import { apiNotFound } from './middleware/errors';
import { sameOriginOnly, securityHeaders } from './middleware/security';
import { accountRouter } from './routes/account.routes';
import { authRouter } from './routes/auth.routes';
import { inboxRouter } from './routes/inbox.routes';
import { importRouter } from './routes/import.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { peopleRouter } from './routes/people.routes';
import { profileRouter } from './routes/profile.routes';

/** Builds the Express app with the API mounted. The caller attaches the frontend and the error handler. */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);

  // Uploaded images. Files are served as inert content: no scripts, no sniffing.
  app.use(
    '/uploads',
    express.static(config.uploadsDir, {
      maxAge: '7d',
      index: false,
      setHeaders: (res) => res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox"),
    }),
  );

  const api = express.Router();
  api.use(cookieParser());
  api.use(sameOriginOnly);
  // JSON everywhere; the image and import-file routes read their own binary bodies.
  api.use(express.json({ limit: '300kb' }));
  api.use(attachUser);
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.use('/auth', authRouter);
  api.use('/account', accountRouter);
  api.use('/profile', profileRouter);
  api.use('/import', importRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/inbox', inboxRouter);
  api.use('/', peopleRouter);
  api.use(apiNotFound);

  app.use('/api', api);
  return app;
}
