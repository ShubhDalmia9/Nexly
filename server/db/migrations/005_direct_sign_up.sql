-- Version 5: an account is created directly from a name, an email address and a password.
-- The email address is the login identifier; only password resets use emailed links.

DELETE FROM email_tokens WHERE purpose <> 'reset_password';
ALTER TABLE email_tokens DROP COLUMN full_name;
ALTER TABLE email_tokens DROP COLUMN verified_at;
ALTER TABLE users DROP COLUMN email_verified_at;

-- Emails from the earlier sign-up flow no longer lead anywhere.
DELETE FROM dev_mailbox WHERE template IN ('verify-email', 'account-exists');
