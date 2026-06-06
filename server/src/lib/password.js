import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// OWASP's scrypt floor: N=2^17, r=8, p=1. `maxmem` must be raised to match,
// since Node's 32MB default rejects these parameters outright.
const PARAMS = { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hashes a password into a self-describing string:
 *   scrypt$N$r$p$<salt-b64>$<key-b64>
 * Storing the parameters alongside the digest means we can raise the cost later
 * without invalidating everyone's existing password.
 */
export async function hashPassword(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new TypeError('password must be a non-empty string');
  }
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(plaintext.normalize('NFKC'), salt, KEY_LENGTH, PARAMS);
  const { N, r, p } = PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * Verifies a password against a stored hash in constant time.
 * Returns false — never throws — for malformed hashes, so a corrupt row cannot
 * turn a failed login into a 500.
 */
export async function verifyPassword(plaintext, stored) {
  if (typeof plaintext !== 'string' || typeof stored !== 'string') return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, N, r, p, saltB64, keyB64] = parts;
  try {
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(keyB64, 'base64');
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await scryptAsync(plaintext.normalize('NFKC'), salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: PARAMS.maxmem,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** True when a stored hash was produced with weaker parameters than we now use. */
export function needsRehash(stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  const [, N, r, p] = parts;
  return Number(N) < PARAMS.N || Number(r) < PARAMS.r || Number(p) < PARAMS.p;
}
