import { getDb } from '../../db/connection.js';

function toCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    color: row.color,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.transaction_count !== undefined ? { transactionCount: row.transaction_count } : {}),
  };
}

export function listCategories(userId, { kind, includeArchived = false } = {}) {
  const where = ['c.user_id = ?'];
  const params = [userId];

  if (kind) {
    where.push('c.kind = ?');
    params.push(kind);
  }
  if (!includeArchived) where.push('c.archived_at IS NULL');

  return getDb()
    .prepare(
      `SELECT c.*, COUNT(t.id) AS transaction_count
         FROM categories c
         LEFT JOIN transactions t ON t.category_id = c.id
        WHERE ${where.join(' AND ')}
        GROUP BY c.id
        ORDER BY c.kind, c.name COLLATE NOCASE`
    )
    .all(...params)
    .map(toCategory);
}

export function findCategory(userId, id) {
  return toCategory(
    getDb().prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId)
  );
}

export function createCategory(userId, { name, kind, color }) {
  return toCategory(
    getDb()
      .prepare(
        `INSERT INTO categories (user_id, name, kind, color)
         VALUES (?, ?, ?, COALESCE(?, '#94a3b8'))
         RETURNING *`
      )
      .get(userId, name, kind, color ?? null)
  );
}

/**
 * `kind` is intentionally not updatable: flipping an expense category to income
 * would silently reinterpret every transaction already filed under it.
 */
export function updateCategory(userId, id, { name, color }) {
  return toCategory(
    getDb()
      .prepare(
        `UPDATE categories
            SET name       = COALESCE(?, name),
                color      = COALESCE(?, color),
                updated_at = datetime('now')
          WHERE id = ? AND user_id = ?
          RETURNING *`
      )
      .get(name ?? null, color ?? null, id, userId)
  );
}

export function setCategoryArchived(userId, id, archived) {
  return toCategory(
    getDb()
      .prepare(
        `UPDATE categories
            SET archived_at = ${archived ? "datetime('now')" : 'NULL'},
                updated_at  = datetime('now')
          WHERE id = ? AND user_id = ?
          RETURNING *`
      )
      .get(id, userId)
  );
}

export function deleteCategory(userId, id) {
  return getDb().prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId)
    .changes > 0;
}

export function countCategoryTransactions(userId, id) {
  return getDb()
    .prepare('SELECT COUNT(*) AS total FROM transactions WHERE user_id = ? AND category_id = ?')
    .get(userId, id).total;
}

/** Bulk insert used when seeding a brand-new account. */
export function insertCategories(userId, categories) {
  const insert = getDb().prepare(
    'INSERT INTO categories (user_id, name, kind, color) VALUES (?, ?, ?, ?)'
  );
  for (const { name, kind, color } of categories) insert.run(userId, name, kind, color);
  return categories.length;
}
