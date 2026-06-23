import { getDb } from '../../db/connection.js';

const SELECT_COLUMNS = `
  t.*,
  a.name  AS account_name,
  a.type  AS account_type,
  c.name  AS category_name,
  c.color AS category_color,
  c.kind  AS category_kind
`;

const JOINS = `
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  LEFT JOIN categories c ON c.id = t.category_id
`;

function toTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    account: { id: row.account_id, name: row.account_name, type: row.account_type },
    categoryId: row.category_id,
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name,
          color: row.category_color,
          kind: row.category_kind,
        }
      : null,
    direction: row.direction,
    amount: row.amount,
    occurredOn: row.occurred_on,
    payee: row.payee,
    note: row.note,
    transferId: row.transfer_id,
    isTransfer: row.transfer_id !== null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Turns a validated filter object into a WHERE fragment plus its parameters.
 * Every branch pushes a placeholder — no filter value is ever interpolated.
 */
function buildFilters(userId, filters = {}) {
  const where = ['t.user_id = ?'];
  const params = [userId];

  const push = (clause, ...values) => {
    where.push(clause);
    params.push(...values);
  };

  if (filters.accountId) push('t.account_id = ?', filters.accountId);
  if (filters.categoryId) push('t.category_id = ?', filters.categoryId);
  if (filters.direction) push('t.direction = ?', filters.direction);
  if (filters.from) push('t.occurred_on >= ?', filters.from);
  if (filters.to) push('t.occurred_on <= ?', filters.to);
  if (filters.minAmount !== undefined) push('t.amount >= ?', filters.minAmount);
  if (filters.maxAmount !== undefined) push('t.amount <= ?', filters.maxAmount);
  if (filters.uncategorized) where.push('t.category_id IS NULL AND t.transfer_id IS NULL');
  if (filters.includeTransfers === false) where.push('t.transfer_id IS NULL');

  if (filters.search) {
    // LIKE with an escaped pattern keeps `%` and `_` in a payee name literal.
    const term = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`;
    push("(t.payee LIKE ? ESCAPE '\\' OR t.note LIKE ? ESCAPE '\\')", term, term);
  }

  return { clause: where.join(' AND '), params };
}

export function listTransactions(userId, filters = {}, { limit = 50, offset = 0 } = {}) {
  const { clause, params } = buildFilters(userId, filters);
  const db = getDb();

  const items = db
    .prepare(
      `SELECT ${SELECT_COLUMNS} ${JOINS}
        WHERE ${clause}
        ORDER BY t.occurred_on DESC, t.id DESC
        LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(toTransaction);

  const { total } = db.prepare(`SELECT COUNT(*) AS total ${JOINS} WHERE ${clause}`).get(...params);

  // The same filters the page was built from, so the UI can show a running
  // total that matches what the user is actually looking at.
  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN t.direction = 'in'  THEN t.amount END), 0) AS inflow,
         COALESCE(SUM(CASE WHEN t.direction = 'out' THEN t.amount END), 0) AS outflow
       ${JOINS} WHERE ${clause}`
    )
    .get(...params);

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
    totals: { inflow: totals.inflow, outflow: totals.outflow, net: totals.inflow - totals.outflow },
  };
}

export function findTransaction(userId, id) {
  return toTransaction(
    getDb()
      .prepare(`SELECT ${SELECT_COLUMNS} ${JOINS} WHERE t.id = ? AND t.user_id = ?`)
      .get(id, userId)
  );
}

export function findTransferLegs(userId, transferId) {
  return getDb()
    .prepare(
      `SELECT ${SELECT_COLUMNS} ${JOINS}
        WHERE t.transfer_id = ? AND t.user_id = ?
        ORDER BY t.direction DESC`
    )
    .all(transferId, userId)
    .map(toTransaction);
}

export function insertTransaction(userId, input) {
  const id = getDb()
    .prepare(
      `INSERT INTO transactions
         (user_id, account_id, category_id, direction, amount, occurred_on, payee, note, transfer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`
    )
    .get(
      userId,
      input.accountId,
      input.categoryId ?? null,
      input.direction,
      input.amount,
      input.occurredOn,
      input.payee ?? null,
      input.note ?? null,
      input.transferId ?? null
    ).id;

  return findTransaction(userId, id);
}

export function updateTransaction(userId, id, input) {
  const has = (key) => Object.hasOwn(input, key);

  getDb()
    .prepare(
      `UPDATE transactions
          SET account_id  = COALESCE(?, account_id),
              category_id = CASE WHEN ? THEN ? ELSE category_id END,
              direction   = COALESCE(?, direction),
              amount      = COALESCE(?, amount),
              occurred_on = COALESCE(?, occurred_on),
              payee       = CASE WHEN ? THEN ? ELSE payee END,
              note        = CASE WHEN ? THEN ? ELSE note END,
              updated_at  = datetime('now')
        WHERE id = ? AND user_id = ?`
    )
    .run(
      input.accountId ?? null,
      has('categoryId') ? 1 : 0,
      input.categoryId ?? null,
      input.direction ?? null,
      input.amount ?? null,
      input.occurredOn ?? null,
      has('payee') ? 1 : 0,
      input.payee ?? null,
      has('note') ? 1 : 0,
      input.note ?? null,
      id,
      userId
    );

  return findTransaction(userId, id);
}

export function deleteTransaction(userId, id) {
  return (
    getDb().prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId)
      .changes > 0
  );
}

export function deleteTransferLegs(userId, transferId) {
  return getDb()
    .prepare('DELETE FROM transactions WHERE transfer_id = ? AND user_id = ?')
    .run(transferId, userId).changes;
}
