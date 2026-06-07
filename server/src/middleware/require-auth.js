import { readBearerToken, verifyToken } from '../lib/tokens.js';
import { findUserById } from '../modules/users/users.repository.js';
import { unauthorized } from '../lib/errors.js';

/**
 * Rejects the request unless it carries a valid bearer token whose subject is
 * still a real user, then hangs that user off `req.user`.
 *
 * The database lookup on every request is deliberate: it means deleting a user
 * revokes their outstanding tokens immediately, which a stateless check alone
 * could not do. On SQLite that lookup is a single indexed read.
 */
export function requireAuth(req, res, next) {
  const token = readBearerToken(req.get('authorization'));
  if (!token) return next(unauthorized('Missing bearer token'));

  const claims = verifyToken(token);
  if (!claims) return next(unauthorized('Session token is invalid or has expired'));

  const user = findUserById(Number(claims.sub));
  if (!user) return next(unauthorized('Session token refers to an account that no longer exists'));

  req.user = user;
  req.tokenClaims = claims;
  next();
}
