import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProduction = NODE_ENV === 'production';

const problems = [];

function readString(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    if (fallback === undefined) {
      problems.push(`${name} is required`);
      return '';
    }
    return fallback;
  }
  return raw;
}

function readInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    problems.push(`${name} must be a positive integer, got "${raw}"`);
    return fallback;
  }
  return parsed;
}

function readJwtSecret() {
  const raw = process.env.JWT_SECRET;
  if (raw && raw.length >= 32) return raw;

  if (isProduction) {
    problems.push('JWT_SECRET is required in production and must be at least 32 characters');
    return '';
  }
  if (raw) {
    problems.push('JWT_SECRET must be at least 32 characters');
    return '';
  }

  // A throwaway secret keeps `npm run dev` zero-config. Sessions die on restart,
  // which is the correct trade-off for a machine nobody is deploying from.
  console.warn('[config] JWT_SECRET not set — generating an ephemeral development secret');
  return randomBytes(48).toString('hex');
}

export const config = Object.freeze({
  env: NODE_ENV,
  isProduction,
  port: readInt('PORT', 4000),
  databaseFile: resolve(process.cwd(), readString('DATABASE_FILE', 'data/rs.db')),
  jwt: Object.freeze({
    secret: readJwtSecret(),
    ttlSeconds: readInt('JWT_TTL_SECONDS', 60 * 60 * 24 * 7),
  }),
  corsOrigin: readString('CORS_ORIGIN', 'http://localhost:5173'),
});

if (problems.length > 0) {
  console.error('Invalid configuration:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
