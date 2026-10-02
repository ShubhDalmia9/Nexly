// Sends one real email through the configured provider, so you can confirm delivery before a demo.
// Usage: npm run email:test -- you@example.com
import { config } from '../server/config';
import { explainEmailError, sendEmail, verifyEmailSetup } from '../server/email/mailer';
import { resetPassword } from '../server/email/templates';

const to = process.argv[2];
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error('Give the address to send to:  npm run email:test -- you@example.com');
  process.exit(1);
}

if (config.email.provider === 'dev') {
  console.error(
    [
      'No email provider is configured, so nothing can be sent yet.',
      '',
      'To send through Gmail, create a file named .env in the project folder containing:',
      '',
      '  GMAIL_USER=your.address@gmail.com',
      '  GMAIL_APP_PASSWORD=the 16-character app password',
      '',
      'Create the app password at https://myaccount.google.com/apppasswords',
      '(the Google account needs 2-Step Verification turned on first).',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(`Provider: ${config.email.provider}${config.email.label ? ` · ${config.email.label}` : ''}`);
console.log(`From:     ${config.email.from}`);
console.log(`To:       ${to}`);

try {
  await verifyEmailSetup();
  console.log('Connection and sign-in: OK');
  await sendEmail({
    to,
    template: 'reset-password',
    ...resetPassword({ fullName: 'Nexly tester', url: `${config.appUrl}/reset-password?token=this-is-only-a-delivery-test`, expiresInMinutes: 30 }),
    subject: 'Nexly test email: delivery is working',
  });
  console.log(`Sent. Check the inbox (and the spam folder) of ${to}.`);
} catch (error) {
  console.error(`\nCould not send: ${explainEmailError(error)}`);
  process.exit(1);
}
