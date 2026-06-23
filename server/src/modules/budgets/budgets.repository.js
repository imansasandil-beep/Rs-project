import { getDb } from '../../db/connection.js';

function toBudget(row) {
  if (!row) return null;
  return {
    id: row.id,
    month: row.month,
    amount: row.amount,
    categoryId: row.category_id,
    category: { id: row.category_id, name: row.category_name, color: row.category_color },
    spent: row.spent ?? 0,
    remaining: row.amount - (row.spent ?? 0),
    // Guarded against a zero amount even though the CHECK constraint forbids it.
    usedPercent: row.amount > 0 ? Math.round(((row.spent ?? 0) / row.amount) * 1000) / 10 : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Budgets for a month, each with what has actually been spent against it.
 *
 * The spend is a correlated subquery rather than a join so a category with no
 * transactions still reports zero instead of dropping out of the result.
 */
export function listBudgets(userId, month) {
  return getDb()
    .prepare(
      `SELECT b.*,
              c.name  AS category_name,
              c.color AS category_color,
              (SELECT COALESCE(SUM(t.amount), 0)
                 FROM transactions t
                WHERE t.user_id     = b.user_id
                  AND t.category_id = b.category_id
                  AND t.direction   = 'out'
                  AND t.transfer_id IS NULL
                  AND substr(t.occurred_on, 1, 7) = b.month) AS spent
         FROM budgets b
         JOIN categories c ON c.id = b.category_id
        WHERE b.user_id = ? AND b.month = ?
        ORDER BY c.name COLLATE NOCASE`
    )
    .all(userId, month)
    .map(toBudget);
}

export function findBudget(userId, id) {
  return toBudget(
    getDb()
      .prepare(
        `SELECT b.*, c.name AS category_name, c.color AS category_color
           FROM budgets b JOIN categories c ON c.id = b.category_id
          WHERE b.id = ? AND b.user_id = ?`
      )
      .get(id, userId)
  );
}

/**
 * Setting a budget is idempotent per (category, month) — the unique index turns
 * a repeat call into an update rather than a duplicate row.
 */
export function upsertBudget(userId, { categoryId, month, amount }) {
  const { id } = getDb()
    .prepare(
      `INSERT INTO budgets (user_id, category_id, month, amount)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, category_id, month)
       DO UPDATE SET amount = excluded.amount, updated_at = datetime('now')
       RETURNING id`
    )
    .get(userId, categoryId, month, amount);

  return findBudget(userId, id);
}

export function deleteBudget(userId, id) {
  return (
    getDb().prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, userId).changes > 0
  );
}

/** Copies every budget from one month to another, skipping ones already set. */
export function copyBudgets(userId, fromMonth, toMonth) {
  return getDb()
    .prepare(
      `INSERT INTO budgets (user_id, category_id, month, amount)
       SELECT user_id, category_id, ?, amount
         FROM budgets
        WHERE user_id = ? AND month = ?
       ON CONFLICT (user_id, category_id, month) DO NOTHING`
    )
    .run(toMonth, userId, fromMonth).changes;
}

/** Month totals, used for the "budgeted vs spent" headline. */
export function budgetTotals(userId, month) {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(b.amount), 0) AS budgeted,
              COALESCE(SUM(
                (SELECT COALESCE(SUM(t.amount), 0)
                   FROM transactions t
                  WHERE t.user_id     = b.user_id
                    AND t.category_id = b.category_id
                    AND t.direction   = 'out'
                    AND t.transfer_id IS NULL
                    AND substr(t.occurred_on, 1, 7) = b.month)
              ), 0) AS spent
         FROM budgets b
        WHERE b.user_id = ? AND b.month = ?`
    )
    .get(userId, month);

  return { budgeted: row.budgeted, spent: row.spent, remaining: row.budgeted - row.spent };
}
