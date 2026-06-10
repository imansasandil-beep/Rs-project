import { conflict, notFound } from '../../lib/errors.js';
import {
  listAccounts,
  findAccount,
  createAccount,
  updateAccount,
  setAccountArchived,
  deleteAccount,
  countAccountTransactions,
} from './accounts.repository.js';

const DUPLICATE = 'UNIQUE constraint failed: accounts.user_id, accounts.name';

function asDuplicate(err, name) {
  if (String(err.message).includes(DUPLICATE)) {
    return conflict(`You already have an account called "${name}"`, { name: ['Already in use'] });
  }
  return err;
}

export function getAccounts(userId, options) {
  return listAccounts(userId, options);
}

export function getAccount(userId, id) {
  const account = findAccount(userId, id);
  if (!account) throw notFound('Account');
  return account;
}

export function addAccount(userId, input) {
  try {
    return createAccount(userId, input);
  } catch (err) {
    throw asDuplicate(err, input.name);
  }
}

export function editAccount(userId, id, input) {
  getAccount(userId, id);
  try {
    return updateAccount(userId, id, input);
  } catch (err) {
    throw asDuplicate(err, input.name);
  }
}

export function archiveAccount(userId, id, archived) {
  getAccount(userId, id);
  return setAccountArchived(userId, id, archived);
}

/**
 * Accounts cascade-delete their transactions, so a delete here can quietly wipe
 * years of history. Refuse once anything is filed against it and let the caller
 * archive instead, which hides the account without touching the ledger.
 */
export function removeAccount(userId, id) {
  getAccount(userId, id);

  const used = countAccountTransactions(userId, id);
  if (used > 0) {
    throw conflict(
      `This account has ${used} transaction${used === 1 ? '' : 's'}. Archive it instead.`,
      { transactionCount: used }
    );
  }

  deleteAccount(userId, id);
}
