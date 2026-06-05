#!/usr/bin/env node
import { migrate } from '../src/db/migrate.js';
import { closeDb } from '../src/db/connection.js';
import { config } from '../src/config/env.js';

console.log(`[migrate] database: ${config.databaseFile}`);

try {
  const applied = migrate();
  console.log(`[migrate] ${applied.length} migration(s) applied`);
} catch (err) {
  console.error(`[migrate] ${err.message}`);
  process.exitCode = 1;
} finally {
  closeDb();
}
