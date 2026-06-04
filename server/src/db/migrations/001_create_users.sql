-- Account holders. One row per person using this instance.
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  currency      TEXT    NOT NULL DEFAULT 'LKR',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Emails are stored already lowercased, so a plain unique index is enough to
-- stop the same person registering twice with different casing.
CREATE UNIQUE INDEX idx_users_email ON users (email);
