-- Migration 002: real account system, richer profiles, image records and LinkedIn imports.

-- ---------- Accounts ----------

-- An account's email is verified before the account exists (email sign-up) or by the
-- identity provider (Google). Accounts created before this migration are treated as verified.
ALTER TABLE users ADD COLUMN email_verified_at TEXT;
UPDATE users SET email_verified_at = created_at;

-- Passwords move to their own table: an account that only signs in with Google has no row here.
CREATE TABLE password_credentials (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);
INSERT INTO password_credentials (user_id, password_hash, updated_at)
  SELECT id, password_hash, created_at FROM users;
ALTER TABLE users DROP COLUMN password_hash;

-- Sign-in identities from external providers. One Google identity maps to one account,
-- and an account has at most one identity per provider.
CREATE TABLE oauth_accounts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT    NOT NULL CHECK (provider IN ('google')),
  provider_user_id TEXT    NOT NULL,
  email            TEXT    NOT NULL COLLATE NOCASE,
  created_at       TEXT    NOT NULL,
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

-- One row per in-flight OAuth redirect. Holds the PKCE verifier and nonce server-side;
-- the browser only carries the random `state`, which is stored here as a hash.
CREATE TABLE oauth_states (
  state_hash    TEXT PRIMARY KEY,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'linkedin')),
  purpose       TEXT NOT NULL CHECK (purpose IN ('login', 'link', 'import')),
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  code_verifier TEXT NOT NULL,
  nonce         TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL
);

-- Email verification and password reset links. Only the SHA-256 hash of each token is stored.
-- A verification token is `verified` when the link is opened and `used` when the password is set.
DROP TABLE password_resets;
CREATE TABLE email_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  purpose     TEXT    NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  email       TEXT    NOT NULL COLLATE NOCASE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  full_name   TEXT,
  token_hash  TEXT    NOT NULL UNIQUE,
  created_at  TEXT    NOT NULL,
  expires_at  TEXT    NOT NULL,
  verified_at TEXT,
  used_at     TEXT,
  CHECK (purpose <> 'reset_password' OR user_id IS NOT NULL)
);
CREATE INDEX ix_email_tokens_email ON email_tokens(email, purpose);

ALTER TABLE sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN last_seen_at TEXT;

CREATE TABLE user_settings (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  discoverable    INTEGER NOT NULL DEFAULT 1 CHECK (discoverable IN (0, 1)),
  notify_requests INTEGER NOT NULL DEFAULT 1 CHECK (notify_requests IN (0, 1)),
  notify_accepted INTEGER NOT NULL DEFAULT 1 CHECK (notify_accepted IN (0, 1)),
  email_requests  INTEGER NOT NULL DEFAULT 1 CHECK (email_requests IN (0, 1)),
  email_accepted  INTEGER NOT NULL DEFAULT 1 CHECK (email_accepted IN (0, 1)),
  updated_at      TEXT    NOT NULL
);
INSERT INTO user_settings (user_id, updated_at) SELECT id, created_at FROM users;

-- The local mailbox used when no email provider is configured (development only).
-- With a real provider nothing is stored here, so no link tokens are ever kept in plaintext.
CREATE TABLE dev_mailbox (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  html       TEXT NOT NULL,
  text       TEXT NOT NULL,
  template   TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ---------- Richer profiles ----------

ALTER TABLE profiles ADD COLUMN headline TEXT NOT NULL DEFAULT '' CHECK (length(headline) <= 160);

-- Dates are 'YYYY' or 'YYYY-MM'. A NULL end date means "present".
CREATE TABLE experiences (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title       TEXT    NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
  company     TEXT    NOT NULL DEFAULT '' CHECK (length(company) <= 100),
  location    TEXT    NOT NULL DEFAULT '' CHECK (length(location) <= 80),
  start_date  TEXT    CHECK (start_date IS NULL OR start_date GLOB '[12][0-9][0-9][0-9]*'),
  end_date    TEXT    CHECK (end_date IS NULL OR end_date GLOB '[12][0-9][0-9][0-9]*'),
  description TEXT    NOT NULL DEFAULT '' CHECK (length(description) <= 600),
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_experiences_user ON experiences(user_id);

CREATE TABLE education (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  school     TEXT    NOT NULL CHECK (length(trim(school)) BETWEEN 1 AND 120),
  degree     TEXT    NOT NULL DEFAULT '' CHECK (length(degree) <= 100),
  field      TEXT    NOT NULL DEFAULT '' CHECK (length(field) <= 100),
  start_year INTEGER CHECK (start_year IS NULL OR start_year BETWEEN 1950 AND 2100),
  end_year   INTEGER CHECK (end_year IS NULL OR end_year BETWEEN 1950 AND 2100),
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_education_user ON education(user_id);

CREATE TABLE certifications (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name     TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  issuer   TEXT    NOT NULL DEFAULT '' CHECK (length(issuer) <= 100),
  year     INTEGER CHECK (year IS NULL OR year BETWEEN 1950 AND 2100),
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_certifications_user ON certifications(user_id);

-- ---------- Images ----------

-- Every uploaded image is recorded with its owner, so files are never orphaned and one member
-- cannot attach another member's upload. The image bytes live in file storage, not in this table.
CREATE TABLE images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT    NOT NULL CHECK (kind IN ('avatar', 'project')),
  storage_key TEXT    NOT NULL UNIQUE,
  url         TEXT    NOT NULL UNIQUE,
  mime        TEXT    NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes       INTEGER NOT NULL CHECK (bytes > 0),
  created_at  TEXT    NOT NULL
);
CREATE INDEX ix_images_user ON images(user_id, kind);

ALTER TABLE projects ADD COLUMN image_url TEXT;

-- ---------- LinkedIn imports ----------

-- What an import retrieved, kept as a draft until the member reviews and confirms it.
CREATE TABLE profile_imports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source       TEXT    NOT NULL CHECK (source IN ('pdf', 'export', 'oauth', 'provider', 'sample')),
  linkedin_url TEXT    NOT NULL DEFAULT '',
  result_json  TEXT    NOT NULL,
  created_at   TEXT    NOT NULL,
  applied_at   TEXT
);
CREATE INDEX ix_profile_imports_user ON profile_imports(user_id, created_at);
