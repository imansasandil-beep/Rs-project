-- Where money sits: a wallet, a bank account, a credit card.
-- `opening_balance` is the balance before the first logged transaction, so a
-- live balance is opening_balance + inflows - outflows.
CREATE TABLE accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  type            TEXT    NOT NULL CHECK (type IN ('cash', 'bank', 'card', 'wallet', 'savings')),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  archived_at     TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Two accounts with the same name are indistinguishable in a dropdown.
CREATE UNIQUE INDEX idx_accounts_user_name ON accounts (user_id, name);
CREATE INDEX idx_accounts_user_active ON accounts (user_id) WHERE archived_at IS NULL;
