import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(ROOT_DIR, '.env'));
} catch {
  // .env is optional: every setting has a default.
}

const env = (name: string): string => (process.env[name] ?? '').trim();

function flag(name: string, fallback: boolean): boolean {
  const value = env(name);
  if (value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const isProduction = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const dataDir = path.resolve(ROOT_DIR, env('DATA_DIR') || 'data');
const port = Number(env('PORT') || 4000);
/** The public address of the app, used for the links in emails. */
const appUrl = (env('APP_URL') || `http://localhost:${port}`).replace(/\/+$/, '');

type EmailProvider = 'dev' | 'resend' | 'smtp';

// Gmail shortcut: a Gmail (or Google Workspace) address plus an app password is all that is
// needed. Google shows app passwords in groups of four with spaces; the spaces are not part of it.
const gmailUser = env('GMAIL_USER');
const gmailAppPassword = env('GMAIL_APP_PASSWORD').replace(/\s+/g, '');
const gmailConfigured = Boolean(gmailUser && gmailAppPassword);

function emailProvider(): EmailProvider {
  const chosen = env('EMAIL_PROVIDER').toLowerCase();
  if (chosen === 'resend' || chosen === 'smtp' || chosen === 'dev') return chosen;
  if (chosen === 'gmail') return 'smtp';
  // No explicit choice: use whichever provider has credentials, otherwise the local inbox.
  if (gmailConfigured) return 'smtp';
  if (env('RESEND_API_KEY')) return 'resend';
  if (env('SMTP_HOST')) return 'smtp';
  return 'dev';
}

export const config = {
  isProduction,
  port,
  appUrl,
  dataDir,
  dbPath: path.join(dataDir, 'nexly.db'),
  uploadsDir: path.join(dataDir, 'uploads'),
  distDir: path.join(ROOT_DIR, 'dist'),
  demoMode: flag('DEMO_MODE', true),
  sessionDays: Number(env('SESSION_DAYS') || 14),
  cookieSecure: flag('COOKIE_SECURE', appUrl.startsWith('https://')),
  cookieName: 'nexly_session',

  email: {
    provider: emailProvider(),
    // Gmail only sends as the signed-in account, so that address is the default sender.
    from: env('EMAIL_FROM') || (gmailConfigured ? `Nexly <${gmailUser}>` : 'Nexly <no-reply@nexly.local>'),
    /** What the emails are being sent through, for the startup log and the test script. */
    label: gmailConfigured && !env('SMTP_HOST') ? `Gmail (${gmailUser})` : '',
    resendApiKey: env('RESEND_API_KEY'),
    // Overridable so the automated tests can point at a local stand-in for the Resend API.
    resendApiUrl: env('RESEND_API_URL') || 'https://api.resend.com',
    smtp:
      gmailConfigured && !env('SMTP_HOST')
        ? { host: 'smtp.gmail.com', port: 465, secure: true, user: gmailUser, pass: gmailAppPassword }
        : {
            host: env('SMTP_HOST'),
            port: Number(env('SMTP_PORT') || 587),
            secure: flag('SMTP_SECURE', false),
            user: env('SMTP_USER'),
            pass: env('SMTP_PASS'),
          },
  },
};

/**
 * The local inbox shows captured emails, including sign-in links, so it is only ever
 * available in development and only when no email provider is configured.
 */
export const localInboxEnabled = config.email.provider === 'dev' && !isProduction;
