-- What money is for. Kept separate per direction so "Salary" (income) and
-- "Groceries" (expense) never show up in the same picker.
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  kind        TEXT    NOT NULL CHECK (kind IN ('income', 'expense')),
  color       TEXT    NOT NULL DEFAULT '#94a3b8',
  archived_at TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_categories_user_kind_name ON categories (user_id, kind, name);
CREATE INDEX idx_categories_user_active ON categories (user_id) WHERE archived_at IS NULL;
