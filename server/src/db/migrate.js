import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { getDb } from './connection.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url));
const FILE_PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/;

function listMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => FILE_PATTERN.test(name))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
      return {
        version: Number(name.match(FILE_PATTERN)[1]),
        name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex').slice(0, 16),
      };
    });
}

/**
 * Applies every migration file that has not run yet, newest last. Each file is
 * committed on its own so a failure halfway through leaves the earlier ones
 * applied and the database in a known state.
 *
 * @returns {string[]} names of the migrations applied by this call
 */
export function migrate({ silent = false } = {}) {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      checksum   TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Map(
    db.prepare('SELECT version, name, checksum FROM schema_migrations').all().map((r) => [r.version, r])
  );
  const record = db.prepare(
    'INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)'
  );

  const ran = [];
  for (const migration of listMigrations()) {
    const previous = applied.get(migration.version);

    if (previous) {
      // An edited migration means the file on disk no longer describes the live
      // schema. Fail loudly rather than silently drifting.
      if (previous.checksum !== migration.checksum) {
        throw new Error(
          `Migration ${migration.name} changed after it was applied ` +
            `(recorded ${previous.checksum}, found ${migration.checksum}). ` +
            'Add a new migration instead of editing an applied one.'
        );
      }
      continue;
    }

    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      record.run(migration.version, migration.name, migration.checksum);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${migration.name} failed: ${err.message}`, { cause: err });
    }

    ran.push(migration.name);
    if (!silent) console.log(`[migrate] applied ${migration.name}`);
  }

  if (!silent && ran.length === 0) console.log('[migrate] schema already up to date');
  return ran;
}
