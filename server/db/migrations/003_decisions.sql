-- Migration 003: discovery is button-based. Each profile a member acts on is recorded as a
-- decision, either "connect" or "skip", replacing the earlier left/right table.

CREATE TABLE decisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     TEXT    NOT NULL CHECK (action IN ('connect', 'skip')),
  created_at TEXT    NOT NULL,
  -- One decision per (viewer, target), so nobody is recorded, or shown, twice.
  UNIQUE (viewer_id, target_id),
  CHECK (viewer_id <> target_id)
);

INSERT INTO decisions (id, viewer_id, target_id, action, created_at)
  SELECT id, swiper_id, target_id, CASE direction WHEN 'right' THEN 'connect' ELSE 'skip' END, created_at
  FROM swipes;

DROP TABLE swipes;

CREATE INDEX ix_decisions_viewer_time ON decisions(viewer_id, created_at);
