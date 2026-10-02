import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { nowIso, run } from '../db/connection';
import type { EmailContent, EmailTemplate } from './templates';

export interface OutgoingEmail extends EmailContent {
  to: string;
  template: EmailTemplate;
}

export class EmailDeliveryError extends Error {}

type Transport = (email: OutgoingEmail) => Promise<void>;

/**
 * Local inbox (development only). Nothing leaves the machine: the message is stored so it
 * can be read at /inbox, which lets sign-up and password reset be completed before an email
 * provider is connected.
 */
const devTransport: Transport = async (email) => {
  run(
    'INSERT INTO dev_mailbox (to_email, subject, html, text, template, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    email.to,
    email.subject,
    email.html,
    email.text,
    email.template,
    nowIso(),
  );
  // Keep the mailbox small.
  run('DELETE FROM dev_mailbox WHERE id NOT IN (SELECT id FROM dev_mailbox ORDER BY id DESC LIMIT 200)');
  console.log(`[nexly] Email kept in the local inbox: "${email.subject}" → ${email.to}`);
};

/** Resend (https://resend.com) over its HTTP API. */
const resendTransport: Transport = async (email) => {
  let response: Response;
  try {
    response = await fetch(`${config.email.resendApiUrl}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.email.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.email.from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new EmailDeliveryError(`Resend could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new EmailDeliveryError(`Resend rejected the email (HTTP ${response.status}): ${detail.slice(0, 300)}`);
  }
};

let smtpClient: Transporter | null = null;

/** Any SMTP server: Gmail with an app password, Outlook, Mailgun, Amazon SES, Brevo and so on. */
const smtpTransport: Transport = async (email) => {
  const { host, port, secure, user, pass } = config.email.smtp;
  smtpClient ??= nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    connectionTimeout: 15_000,
    socketTimeout: 20_000,
  });
  try {
    await smtpClient.sendMail({ from: config.email.from, to: email.to, subject: email.subject, html: email.html, text: email.text });
  } catch (error) {
    throw new EmailDeliveryError(`The SMTP server did not accept the email: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const TRANSPORTS: Record<typeof config.email.provider, Transport> = {
  dev: devTransport,
  resend: resendTransport,
  smtp: smtpTransport,
};

/** Sends an email through the configured provider. Rejects with EmailDeliveryError if it cannot be handed over. */
export async function sendEmail(email: OutgoingEmail): Promise<void> {
  if (config.email.provider === 'dev' && config.isProduction) {
    // No provider and not in development: never store or expose the message. Make the gap obvious instead.
    console.warn(`[nexly] No email provider is configured, so "${email.subject}" to ${email.to} was NOT sent. Set EMAIL_PROVIDER.`);
    throw new EmailDeliveryError('No email provider is configured.');
  }
  await TRANSPORTS[config.email.provider](email);
}

/**
 * Checks that the configured provider will accept mail, without sending anything: for SMTP this
 * connects, negotiates TLS and signs in. Used by `npm run email:test` to give a precise error.
 */
export async function verifyEmailSetup(): Promise<void> {
  if (config.email.provider !== 'smtp') return;
  const { host, port, secure, user, pass } = config.email.smtp;
  const probe = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined, connectionTimeout: 15_000 });
  try {
    await probe.verify();
  } finally {
    probe.close();
  }
}

/** Turns the common delivery failures into what to do about them. */
export function explainEmailError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/535|Username and Password not accepted|Invalid login|BadCredentials/i.test(message)) {
    return 'The mail server rejected the sign-in. For Gmail, GMAIL_APP_PASSWORD must be an app password (not the normal Google password) created by the same account as GMAIL_USER.';
  }
  if (/534|Application-specific password required/i.test(message)) {
    return 'This Google account needs an app password. Turn on 2-Step Verification, then create one at https://myaccount.google.com/apppasswords';
  }
  if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ESOCKET|timeout/i.test(message)) {
    return 'The mail server could not be reached. Check the internet connection; some school or office networks block outgoing mail ports (465 and 587).';
  }
  return message;
}

/** For notifications that must never fail the action that triggered them. */
export function sendEmailInBackground(email: OutgoingEmail): void {
  sendEmail(email).catch((error) => {
    console.error(`[nexly] Could not send "${email.template}" email to ${email.to}:`, error instanceof Error ? error.message : error);
  });
}

/** One line for the server log at startup, so it is always clear where email is going. */
export function describeEmailSetup(): string {
  switch (config.email.provider) {
    case 'resend':
      return `Email: Resend, sending as ${config.email.from}`;
    case 'smtp':
      return `Email: ${config.email.label || `SMTP via ${config.email.smtp.host}:${config.email.smtp.port}`}, sending as ${config.email.from}`;
    default:
      return config.isProduction
        ? 'Email: NOT CONFIGURED. Sign-up and password reset emails cannot be sent. Set EMAIL_PROVIDER.'
        : `Email: local inbox. Open ${config.appUrl}/inbox to read what Nexly sends`;
  }
}
