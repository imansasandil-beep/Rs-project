import { hashPassword, verifyPassword, needsRehash } from '../../lib/password.js';
import { issueToken } from '../../lib/tokens.js';
import { conflict, unauthorized } from '../../lib/errors.js';
import { transaction } from '../../db/connection.js';
import { insertCategories } from '../categories/categories.repository.js';
import { DEFAULT_CATEGORIES } from '../categories/categories.defaults.js';
import {
  createUser,
  findUserByEmail,
  toPublicUser,
  updateUserPasswordHash,
} from '../users/users.repository.js';

function session(user) {
  const { token, expiresAt } = issueToken({ sub: String(user.id), email: user.email });
  return { user: toPublicUser(user), token, expiresAt: new Date(expiresAt).toISOString() };
}

export async function register({ email, name, password, currency }) {
  if (findUserByEmail(email)) {
    throw conflict('An account with that email already exists', { email: ['Already registered'] });
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    // The account and its starter categories land together or not at all —
    // a user with no categories cannot record a single transaction.
    user = transaction(() => {
      const created = createUser({ email, name, passwordHash, currency });
      insertCategories(created.id, DEFAULT_CATEGORIES);
      return created;
    });
  } catch (err) {
    // Two simultaneous registrations can both pass the check above; the unique
    // index is the real arbiter, so translate its error rather than 500.
    if (String(err.message).includes('UNIQUE constraint failed: users.email')) {
      throw conflict('An account with that email already exists', {
        email: ['Already registered'],
      });
    }
    throw err;
  }

  return session(user);
}

export async function login({ email, password }) {
  const user = findUserByEmail(email);

  // Hash even when the email is unknown so a missing account and a wrong
  // password take the same time, and the endpoint cannot enumerate users.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, 'scrypt$131072$8$1$AAAA$AAAA');

  if (!user || !ok) throw unauthorized('Email or password is incorrect');

  // The user just proved the plaintext, so this is the only moment we can
  // transparently upgrade a hash made with older parameters.
  if (needsRehash(user.passwordHash)) {
    updateUserPasswordHash(user.id, await hashPassword(password));
  }

  return session(user);
}

export async function changePassword({ user, currentPassword, newPassword }) {
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw unauthorized('Current password is incorrect');
  }
  updateUserPasswordHash(user.id, await hashPassword(newPassword));
}
