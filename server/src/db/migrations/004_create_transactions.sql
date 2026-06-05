-- The ledger. Every row moves money into or out of exactly one account.
--
-- Amounts are stored as positive integers in the currency's minor unit (cents),
-- with `direction` carrying the sign. Floating point never touches money.
--
-- A transfer is two rows sharing a `transfer_id`: an 'out' leg on the source
-- account and an 'in' leg on the destination. Reports that would otherwise
-- double-count them just filter on `transfer_id IS NULL`.
CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  account_id  INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  direction   TEXT    NOT NULL CHECK (direction IN ('in', 'out')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  occurred_on TEXT    NOT NULL CHECK (occurred_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  payee       TEXT,
  note        TEXT,
  transfer_id TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),

  -- Moving money between your own accounts is not spending, so it never
  -- belongs to a category.
  CHECK (transfer_id IS NULL OR category_id IS NULL)
);

-- The transaction list is always "this user, newest first, optionally filtered".
CREATE INDEX idx_transactions_user_date ON transactions (user_id, occurred_on DESC, id DESC);
CREATE INDEX idx_transactions_account_date ON transactions (account_id, occurred_on DESC);
CREATE INDEX idx_transactions_category ON transactions (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_transactions_transfer ON transactions (transfer_id) WHERE transfer_id IS NOT NULL;
