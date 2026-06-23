import { getDb } from '../../db/connection.js';

/**
 * Every query here excludes transfers (`transfer_id IS NULL`). Moving money
 * between your own accounts is not income and not spending — counting it would
 * inflate both sides of every report by the same amount.
 */
const REAL_MONEY = 't.transfer_id IS NULL';

/** Income, spending and net for one calendar month. */
export function monthSummary(userId, month) {
  return getDb()
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN t.direction = 'in'  THEN t.amount END), 0) AS income,
         COALESCE(SUM(CASE WHEN t.direction = 'out' THEN t.amount END), 0) AS expenses,
         COUNT(*) AS transaction_count
       FROM transactions t
      WHERE t.user_id = ? AND ${REAL_MONEY} AND substr(t.occurred_on, 1, 7) = ?`
    )
    .get(userId, month);
}

/**
 * Spending (or income) split by category over a date range, largest first.
 * Uncategorized rows are folded into a single synthetic bucket rather than
 * dropped, so the parts always add up to the whole.
 */
export function categoryBreakdown(userId, { from, to, direction = 'out' }) {
  return getDb()
    .prepare(
      `SELECT
         t.category_id                       AS category_id,
         COALESCE(c.name, 'Uncategorized')   AS name,
         COALESCE(c.color, '#94a3b8')        AS color,
         SUM(t.amount)                       AS total,
         COUNT(*)                            AS transaction_count
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ?
        AND ${REAL_MONEY}
        AND t.direction = ?
        AND t.occurred_on BETWEEN ? AND ?
      GROUP BY t.category_id
      ORDER BY total DESC`
    )
    .all(userId, direction, from, to);
}

/** One row per month in the range, including months with no activity at all. */
export function monthlyTrend(userId, months) {
  if (months.length === 0) return [];

  const placeholders = months.map(() => '?').join(', ');
  const rows = getDb()
    .prepare(
      `SELECT
         substr(t.occurred_on, 1, 7) AS month,
         COALESCE(SUM(CASE WHEN t.direction = 'in'  THEN t.amount END), 0) AS income,
         COALESCE(SUM(CASE WHEN t.direction = 'out' THEN t.amount END), 0) AS expenses
       FROM transactions t
      WHERE t.user_id = ? AND ${REAL_MONEY} AND substr(t.occurred_on, 1, 7) IN (${placeholders})
      GROUP BY month`
    )
    .all(userId, ...months);

  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map((month) => {
    const row = byMonth.get(month) ?? { income: 0, expenses: 0 };
    return { month, income: row.income, expenses: row.expenses, net: row.income - row.expenses };
  });
}

/** Daily spend within a range, for a sparkline. Days with no spend are omitted. */
export function dailyTotals(userId, { from, to, direction = 'out' }) {
  return getDb()
    .prepare(
      `SELECT t.occurred_on AS day, SUM(t.amount) AS total
         FROM transactions t
        WHERE t.user_id = ?
          AND ${REAL_MONEY}
          AND t.direction = ?
          AND t.occurred_on BETWEEN ? AND ?
        GROUP BY t.occurred_on
        ORDER BY t.occurred_on`
    )
    .all(userId, direction, from, to);
}

/** Who you paid most over a range. */
export function topPayees(userId, { from, to, limit = 10 }) {
  return getDb()
    .prepare(
      `SELECT t.payee AS payee, SUM(t.amount) AS total, COUNT(*) AS transaction_count
         FROM transactions t
        WHERE t.user_id = ?
          AND ${REAL_MONEY}
          AND t.direction = 'out'
          AND t.payee IS NOT NULL AND trim(t.payee) <> ''
          AND t.occurred_on BETWEEN ? AND ?
        GROUP BY t.payee COLLATE NOCASE
        ORDER BY total DESC
        LIMIT ?`
    )
    .all(userId, from, to, limit);
}

/** Earliest and latest days that have any activity, for date-picker bounds. */
export function ledgerRange(userId) {
  const row = getDb()
    .prepare(
      'SELECT MIN(occurred_on) AS first, MAX(occurred_on) AS last FROM transactions WHERE user_id = ?'
    )
    .get(userId);
  return { first: row.first ?? null, last: row.last ?? null };
}
