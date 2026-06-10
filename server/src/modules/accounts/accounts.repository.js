import { getDb } from '../../db/connection.js';

/**
 * Balances are derived, never stored. A stored balance is a second source of
 * truth that drifts the first time an update fails halfway; recomputing from
 * the ledger is one indexed aggregate and is always right.
 */
const BALANCE_EXPRESSION = `
  a.opening_balance
  + COALESCE(SUM(CASE WHEN t.direction = 'in' THEN t.amount ELSE -t.amount END), 0)
`;

function toAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    openingBalance: row.opening_balance,
    balance: row.balance ?? row.opening_balance,
    transactionCount: row.transaction_count ?? 0,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listAccounts(userId, { includeArchived = false } = {}) {
  const where = ['a.user_id = ?'];
  if (!includeArchived) where.push('a.archived_at IS NULL');

  return getDb()
    .prepare(
      `SELECT a.*, ${BALANCE_EXPRESSION} AS balance, COUNT(t.id) AS transaction_count
         FROM accounts a
         LEFT JOIN transactions t ON t.account_id = a.id
        WHERE ${where.join(' AND ')}
        GROUP BY a.id
        ORDER BY a.archived_at IS NOT NULL, a.name COLLATE NOCASE`
    )
    .all(userId)
    .map(toAccount);
}

export function findAccount(userId, id) {
  return toAccount(
    getDb()
      .prepare(
        `SELECT a.*, ${BALANCE_EXPRESSION} AS balance, COUNT(t.id) AS transaction_count
           FROM accounts a
           LEFT JOIN transactions t ON t.account_id = a.id
          WHERE a.id = ? AND a.user_id = ?
          GROUP BY a.id`
      )
      .get(id, userId)
  );
}

export function createAccount(userId, { name, type, openingBalance = 0 }) {
  return toAccount(
    getDb()
      .prepare(
        `INSERT INTO accounts (user_id, name, type, opening_balance)
         VALUES (?, ?, ?, ?)
         RETURNING *`
      )
      .get(userId, name, type, openingBalance)
  );
}

export function updateAccount(userId, id, { name, type, openingBalance }) {
  return toAccount(
    getDb()
      .prepare(
        `UPDATE accounts
            SET name            = COALESCE(?, name),
                type            = COALESCE(?, type),
                opening_balance = COALESCE(?, opening_balance),
                updated_at      = datetime('now')
          WHERE id = ? AND user_id = ?
          RETURNING *`
      )
      .get(name ?? null, type ?? null, openingBalance ?? null, id, userId)
  );
}

export function setAccountArchived(userId, id, archived) {
  return toAccount(
    getDb()
      .prepare(
        `UPDATE accounts
            SET archived_at = ${archived ? "datetime('now')" : 'NULL'},
                updated_at  = datetime('now')
          WHERE id = ? AND user_id = ?
          RETURNING *`
      )
      .get(id, userId)
  );
}

export function deleteAccount(userId, id) {
  return getDb().prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(id, userId)
    .changes > 0;
}

export function countAccountTransactions(userId, id) {
  return getDb()
    .prepare('SELECT COUNT(*) AS total FROM transactions WHERE user_id = ? AND account_id = ?')
    .get(userId, id).total;
}

/** Combined worth across every non-archived account, in cents. */
export function totalBalance(userId) {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(balance), 0) AS total FROM (
         SELECT ${BALANCE_EXPRESSION} AS balance
           FROM accounts a
           LEFT JOIN transactions t ON t.account_id = a.id
          WHERE a.user_id = ? AND a.archived_at IS NULL
          GROUP BY a.id
       )`
    )
    .get(userId);
  return row.total;
}
