-- Migration 001: the original Nexly data model (SQLite).
-- Timestamps are ISO-8601 UTC strings. Foreign keys are enforced per connection.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE
                CHECK (length(email) BETWEEN 5 AND 254 AND email LIKE '%_@_%._%'),
  password_hash TEXT    NOT NULL,
  is_demo       INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL,
  expires_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  used_at    TEXT
);

-- One profile per user.
CREATE TABLE IF NOT EXISTS profiles (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name      TEXT    NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 80),
  profession     TEXT    NOT NULL DEFAULT '' CHECK (length(profession) <= 80),
  workplace      TEXT    NOT NULL DEFAULT '' CHECK (length(workplace) <= 80),
  specialisation TEXT    NOT NULL DEFAULT '' CHECK (length(specialisation) <= 80),
  location       TEXT    NOT NULL DEFAULT '' CHECK (length(location) <= 80),
  about          TEXT    NOT NULL DEFAULT '' CHECK (length(about) <= 1000),
  aspirations    TEXT    NOT NULL DEFAULT '' CHECK (length(aspirations) <= 600),
  photo_url      TEXT,
  linkedin_url   TEXT    NOT NULL DEFAULT '',
  onboarded      INTEGER NOT NULL DEFAULT 0 CHECK (onboarded IN (0, 1)),
  updated_at     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_profiles_onboarded ON profiles(onboarded);

-- Tag vocabularies. `curated` marks the starter vocabulary offered as suggestions.
CREATE TABLE IF NOT EXISTS skills (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) BETWEEN 1 AND 40),
  curated INTEGER NOT NULL DEFAULT 0 CHECK (curated IN (0, 1))
);

CREATE TABLE IF NOT EXISTS interests (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) BETWEEN 1 AND 40),
  curated INTEGER NOT NULL DEFAULT 0 CHECK (curated IN (0, 1))
);

CREATE TABLE IF NOT EXISTS goals (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(name)) BETWEEN 1 AND 40),
  curated INTEGER NOT NULL DEFAULT 0 CHECK (curated IN (0, 1))
);

CREATE TABLE IF NOT EXISTS profile_skills (
  user_id  INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS ix_profile_skills_skill ON profile_skills(skill_id);

CREATE TABLE IF NOT EXISTS profile_interests (
  user_id     INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  interest_id INTEGER NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, interest_id)
);
CREATE INDEX IF NOT EXISTS ix_profile_interests_interest ON profile_interests(interest_id);

CREATE TABLE IF NOT EXISTS profile_goals (
  user_id  INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  goal_id  INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, goal_id)
);

-- The kinds of people a user wants to meet (see CONNECTION_TYPES in shared/constants.ts).
CREATE TABLE IF NOT EXISTS profile_looking_for (
  user_id INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type    TEXT    NOT NULL CHECK (type IN (
            'mentor', 'mentee', 'cofounder', 'collaborator', 'project_partner',
            'hiring', 'talent', 'investor', 'founder', 'peer')),
  PRIMARY KEY (user_id, type)
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title       TEXT    NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 90),
  description TEXT    NOT NULL DEFAULT '' CHECK (length(description) <= 400),
  type        TEXT    NOT NULL DEFAULT 'Side project',
  role        TEXT    NOT NULL DEFAULT '' CHECK (length(role) <= 80),
  year        INTEGER CHECK (year IS NULL OR year BETWEEN 1970 AND 2100),
  url         TEXT    NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS project_skills (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill_id   INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, skill_id)
);

-- Legacy table from version 1. Migration 003 moves its rows into `decisions` and drops it.
CREATE TABLE IF NOT EXISTS swipes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  swiper_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction  TEXT    NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TEXT    NOT NULL,
  UNIQUE (swiper_id, target_id),
  CHECK (swiper_id <> target_id)
);
CREATE INDEX IF NOT EXISTS ix_swipes_swiper_time ON swipes(swiper_id, created_at);

-- A connection is a request that is pending, accepted or declined.
-- The expression index allows only one row per pair of users, in either direction.
CREATE TABLE IF NOT EXISTS connections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TEXT    NOT NULL,
  responded_at TEXT,
  CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_connections_pair
  ON connections (min(requester_id, addressee_id), max(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS ix_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS ix_connections_addressee ON connections(addressee_id, status);

CREATE TABLE IF NOT EXISTS notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT    NOT NULL CHECK (type IN ('connection_request', 'connection_accepted', 'welcome')),
  connection_id INTEGER REFERENCES connections(id) ON DELETE CASCADE,
  read_at       TEXT,
  created_at    TEXT    NOT NULL,
  CHECK (actor_id IS NULL OR actor_id <> user_id)
);
CREATE INDEX IF NOT EXISTS ix_notifications_user ON notifications(user_id, read_at, created_at);
