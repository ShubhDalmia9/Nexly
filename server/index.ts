import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import express, { type Express } from 'express';
import { createApp } from './app';
import { ROOT_DIR, config } from './config';
import { applySchema, isDatabaseEmpty } from './db/migrate';
import { seedDatabase } from './db/seed';
import { describeEmailSetup, explainEmailError, verifyEmailSetup } from './email/mailer';
import { errorHandler } from './middleware/errors';
import { cleanExpired } from './services/auth.service';
import { removeOrphanedImages } from './services/image.service';

async function attachFrontend(app: Express, server: http.Server): Promise<void> {
  if (config.isProduction) {
    const indexHtml = path.join(config.distDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      throw new Error('No production build found. Run "npm run build" before "npm start".');
    }
    app.use(express.static(config.distDir, { index: false, maxAge: '1h' }));
    // Client-side routing: any other GET returns the app shell.
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
    return;
  }

  // Development: run Vite inside this server so the UI and API share one port.
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: ROOT_DIR,
    appType: 'spa',
    server: { middlewareMode: true, hmr: { server } },
  });
  app.use(vite.middlewares);
}

/**
 * Stops a second copy from starting while one is already running. This runs before the database is
 * touched: a newer copy upgrading the database underneath an older running one would break it.
 */
function assertPortFree(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EADDRINUSE') return reject(error);
      console.error(
        [
          `[nexly] Port ${port} is already in use, so Nexly is probably still running in another terminal.`,
          '[nexly] Stop that copy first (press Ctrl+C in its terminal), then run "npm run dev" again.',
          '[nexly] To run on a different port instead, set PORT in the .env file.',
        ].join('\n'),
      );
      process.exit(1);
    });
    probe.once('listening', () => probe.close(() => resolve()));
    probe.listen(port);
  });
}

async function main(): Promise<void> {
  await assertPortFree(config.port);
  const migration = applySchema();
  if (migration.from > 0 && migration.to > migration.from) {
    console.log(`[nexly] Database upgraded from schema version ${migration.from} to ${migration.to}.`);
  }
  if (config.demoMode && isDatabaseEmpty()) {
    const { people } = await seedDatabase();
    console.log(`[nexly] Added ${people} member profiles to the new database.`);
  }
  cleanExpired();
  await removeOrphanedImages();

  const app = createApp();
  const server = http.createServer(app);
  await attachFrontend(app, server);
  app.use(errorHandler);

  server.listen(config.port, () => {
    console.log(`[nexly] Ready on ${config.appUrl} (${config.isProduction ? 'production' : 'development'})`);
    console.log(`[nexly] ${describeEmailSetup()}`);
    // Check the mail sign-in now, so a wrong address or app password shows up here and not at the first sign-up.
    if (config.email.provider === 'smtp') {
      verifyEmailSetup()
        .then(() => console.log('[nexly] Email: connected and signed in. Send yourself a test with "npm run email:test -- you@example.com".'))
        .catch((error) => console.error(`[nexly] Email is NOT working: ${explainEmailError(error)}`));
    }
  });
}

main().catch((error) => {
  console.error('[nexly] Failed to start:', error);
  process.exit(1);
});
