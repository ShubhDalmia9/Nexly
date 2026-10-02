import { config } from '../config';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export type EmailTemplate =
  | 'reset-password'
  | 'password-changed'
  | 'connection-request'
  | 'connection-accepted'
  | 'account-deleted';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

interface LayoutOptions {
  preheader: string;
  heading: string;
  /** Paragraphs of body copy. Plain text; it is escaped here. */
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Smaller grey text under the button. */
  footnotes?: string[];
}

/**
 * The shared email frame. Email clients ignore most modern CSS, so the layout is
 * tables with inline styles, which is what renders consistently across them.
 */
function layout(options: LayoutOptions): { html: string; text: string } {
  const { preheader, heading, paragraphs, button, footnotes = [] } = options;
  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3a3b47;">${escapeHtml(text)}</p>`;
  const footnote = (text: string) =>
    `<p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#666775;">${escapeHtml(text)}</p>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f6f2;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td style="padding:0 4px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:32px;height:32px;border-radius:9px;background:#4f3fe0;color:#ffffff;font-size:18px;font-weight:700;text-align:center;line-height:32px;">N</td>
                <td style="padding-left:10px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#14141b;">Nexly</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e7e5df;border-radius:18px;padding:32px 28px;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:#14141b;">${escapeHtml(heading)}</h1>
            ${paragraphs.map(paragraph).join('\n            ')}
            ${
              button
                ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;">
              <tr>
                <td style="border-radius:999px;background:#4f3fe0;">
                  <a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(button.label)}</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px;font-size:13px;line-height:1.55;color:#666775;">If the button does not work, copy this link into your browser:</p>
            <p style="margin:0 0 18px;font-size:13px;line-height:1.55;word-break:break-all;"><a href="${escapeHtml(button.url)}" style="color:#4031c2;">${escapeHtml(button.url)}</a></p>`
                : ''
            }
            ${footnotes.map(footnote).join('\n            ')}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 4px 0;font-size:12px;line-height:1.5;color:#666775;">
            Sent by Nexly, the professional network discovery platform. <a href="${escapeHtml(config.appUrl)}" style="color:#666775;">${escapeHtml(config.appUrl.replace(/^https?:\/\//, ''))}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    heading,
    '',
    ...paragraphs.flatMap((line) => [line, '']),
    ...(button ? [`${button.label}: ${button.url}`, ''] : []),
    ...footnotes.flatMap((line) => [line, '']),
    `Nexly · ${config.appUrl}`,
  ].join('\n');

  return { html, text };
}

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || 'there';

export function resetPassword(input: { fullName: string; url: string; expiresInMinutes: number }): EmailContent {
  return {
    subject: 'Reset your Nexly password',
    ...layout({
      preheader: 'Use this link to choose a new password.',
      heading: 'Reset your password',
      paragraphs: [
        `Hi ${firstName(input.fullName)}, we received a request to reset the password for your Nexly account.`,
        'Choose a new password with the button below.',
      ],
      button: { label: 'Create a new password', url: input.url },
      footnotes: [
        `This link expires in ${input.expiresInMinutes} minutes and can be used once.`,
        'If you did not ask for this, you can ignore this email. Your password will stay the same.',
      ],
    }),
  };
}

export function passwordChanged(input: { fullName: string; resetUrl: string }): EmailContent {
  return {
    subject: 'Your Nexly password was changed',
    ...layout({
      preheader: 'A security notice about your account.',
      heading: 'Your password was changed',
      paragraphs: [
        `Hi ${firstName(input.fullName)}, the password for your Nexly account was just changed. Other devices have been signed out.`,
        'If you made this change, there is nothing more to do.',
      ],
      button: { label: 'This was not me: reset password', url: input.resetUrl },
    }),
  };
}

export function connectionRequest(input: {
  recipientName: string;
  senderName: string;
  senderRole: string;
  reasons: string[];
  url: string;
  settingsUrl: string;
}): EmailContent {
  const why = input.reasons.length > 0 ? `Why you might connect: ${input.reasons.join(', ')}.` : '';
  return {
    subject: `You have a new connection request from ${input.senderName}`,
    ...layout({
      preheader: `${input.senderName} would like to connect with you on Nexly.`,
      heading: 'You have a new connection request',
      paragraphs: [
        `Hi ${firstName(input.recipientName)}, ${input.senderName}${input.senderRole ? ` (${input.senderRole})` : ''} would like to connect with you.`,
        ...(why ? [why] : []),
      ],
      button: { label: 'View the request', url: input.url },
      footnotes: [`You can turn these emails off in your settings: ${input.settingsUrl}`],
    }),
  };
}

export function connectionAccepted(input: {
  recipientName: string;
  accepterName: string;
  accepterRole: string;
  url: string;
  settingsUrl: string;
}): EmailContent {
  return {
    subject: `Connection request accepted by ${input.accepterName}`,
    ...layout({
      preheader: 'You are now connected.',
      heading: 'Connection request accepted',
      paragraphs: [
        `Hi ${firstName(input.recipientName)}, ${input.accepterName}${input.accepterRole ? ` (${input.accepterRole})` : ''} accepted your connection request.`,
        'You can now see each other’s contact details.',
      ],
      button: { label: `View ${firstName(input.accepterName)}'s profile`, url: input.url },
      footnotes: [`You can turn these emails off in your settings: ${input.settingsUrl}`],
    }),
  };
}

export function accountDeleted(input: { fullName: string }): EmailContent {
  return {
    subject: 'Your Nexly account has been deleted',
    ...layout({
      preheader: 'Confirmation that your account and data were removed.',
      heading: 'Your account has been deleted',
      paragraphs: [
        `Hi ${firstName(input.fullName)}, this confirms that your Nexly account, profile, photos, connections and notifications have been permanently deleted.`,
        'You are welcome back at any time: signing up again creates a fresh account.',
      ],
    }),
  };
}
