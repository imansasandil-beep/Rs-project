import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config/env.js';

let db = null;

/**
 * Opens (and memoizes) the single process-wide connection.
 *
 * `node:sqlite` is synchronous, which suits SQLite: reads are memory-speed and
 * a connection pool would only add contention on a single file.
 */
export function getDb() {
  if (db) return db;

  mkdirSync(dirname(config.databaseFile), { recursive: true });
  db = new DatabaseSync(config.databaseFile);

  // WAL lets readers run while a write is in flight — the API reads far more
  // than it writes, and it survives an unclean shutdown without corruption.
  db.exec('PRAGMA journal_mode = WAL');
  // SQLite ignores foreign keys unless asked, per connection.
  db.exec('PRAGMA foreign_keys = ON');
  // Wait rather than throw SQLITE_BUSY when another writer holds the lock.
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA synchronous = NORMAL');

  return db;
}

export function closeDb() {
  if (!db) return;
  db.close();
  db = null;
}

/**
 * Runs `fn` inside a transaction, rolling back if it throws. Nested calls join
 * the outer transaction instead of opening a second one, which SQLite forbids.
 */
export function transaction(fn) {
  const conn = getDb();
  if (conn.isTransaction) return fn(conn);

  conn.exec('BEGIN');
  try {
    const result = fn(conn);
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}
