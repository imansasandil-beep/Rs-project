import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { config } from '../config/env.js';

/**
 * A deliberately small HS256 JWT implementation. The API issues tokens to its
 * own client and verifies them itself — there is no third-party issuer, no key
 * rotation endpoint and no algorithm negotiation, so a dependency would buy us
 * nothing but a larger attack surface.
 */

const HEADER = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(data) {
  return createHmac('sha256', config.jwt.secret).update(data).digest('base64url');
}

/**
 * @param {object} claims  merged into the payload alongside iat/exp/jti
 * @param {number} [ttlSeconds]
 */
export function issueToken(claims, ttlSeconds = config.jwt.ttlSeconds) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({ ...claims, iat: issuedAt, exp: issuedAt + ttlSeconds, jti: randomUUID() })
  );
  const body = `${HEADER}.${payload}`;
  return { token: `${body}.${sign(body)}`, expiresAt: (issuedAt + ttlSeconds) * 1000 };
}

/**
 * Verifies signature and expiry.
 * @returns {object|null} the claims, or null for any token we do not fully trust
 */
export function verifyToken(token) {
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;

  // Compare the signature we would have produced, not the algorithm the token
  // claims — this is what makes the `alg: none` family of attacks a non-event.
  const expected = Buffer.from(sign(`${header}.${payload}`));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof claims !== 'object' || claims === null) return null;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return null;

  return claims;
}

/** Pulls the credential out of an `Authorization: Bearer <token>` header. */
export function readBearerToken(header) {
  if (typeof header !== 'string') return null;
  const match = /^Bearer (.+)$/.exec(header.trim());
  return match ? match[1] : null;
}
