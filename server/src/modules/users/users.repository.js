import { getDb } from '../../db/connection.js';

/** Maps a database row to the shape the rest of the app uses. */
function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    currency: row.currency,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Everything except the password hash — safe to put in an API response. */
export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

export function createUser({ email, name, passwordHash, currency = 'LKR' }) {
  const row = getDb()
    .prepare(
      `INSERT INTO users (email, name, password_hash, currency)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    )
    .get(email, name, passwordHash, currency);
  return toUser(row);
}

export function findUserByEmail(email) {
  return toUser(getDb().prepare('SELECT * FROM users WHERE email = ?').get(email));
}

export function findUserById(id) {
  return toUser(getDb().prepare('SELECT * FROM users WHERE id = ?').get(id));
}

export function updateUserProfile(id, { name, currency }) {
  const row = getDb()
    .prepare(
      `UPDATE users
          SET name       = COALESCE(?, name),
              currency   = COALESCE(?, currency),
              updated_at = datetime('now')
        WHERE id = ?
        RETURNING *`
    )
    .get(name ?? null, currency ?? null, id);
  return toUser(row);
}

export function updateUserPasswordHash(id, passwordHash) {
  const result = getDb()
    .prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(passwordHash, id);
  return result.changes > 0;
}

export function countUsers() {
  return getDb().prepare('SELECT COUNT(*) AS total FROM users').get().total;
}
