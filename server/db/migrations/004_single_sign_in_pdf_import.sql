-- Version 4: accounts sign in with email and password only, and a LinkedIn profile is imported
-- straight from its PDF into the profile form. The tables that only served other sign-in methods
-- and stored import drafts are no longer used.

DROP TABLE IF EXISTS oauth_accounts;
DROP TABLE IF EXISTS oauth_states;
DROP INDEX IF EXISTS ix_profile_imports_user;
DROP TABLE IF EXISTS profile_imports;

-- The members that come with the app get addresses on a reserved, non-deliverable domain.
UPDATE users SET email = replace(email, '@nexly.demo', '@nexly.example') WHERE is_demo = 1 AND email LIKE '%@nexly.demo';
