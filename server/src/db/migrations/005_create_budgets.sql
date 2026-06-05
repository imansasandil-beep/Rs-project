-- A spending cap for one category in one calendar month, e.g. Groceries in
-- 2026-06. Stored per month rather than as a recurring rule so that raising
-- next month's cap never rewrites what you had budgeted in the past.
CREATE TABLE budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  month       TEXT    NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_budgets_user_category_month ON budgets (user_id, category_id, month);
CREATE INDEX idx_budgets_user_month ON budgets (user_id, month);
