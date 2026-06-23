import { randomUUID } from 'node:crypto';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { transaction } from '../../db/connection.js';
import { findAccount } from '../accounts/accounts.repository.js';
import { findCategory } from '../categories/categories.repository.js';
import {
  listTransactions,
  findTransaction,
  findTransferLegs,
  insertTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransferLegs,
} from './transactions.repository.js';

/** Confirms the account exists, belongs to the caller and can still be posted to. */
function assertUsableAccount(userId, accountId, field = 'accountId') {
  const account = findAccount(userId, accountId);
  if (!account) throw notFound('Account');
  if (account.archivedAt) {
    throw conflict(`"${account.name}" is archived and cannot take new transactions`, {
      [field]: ['Account is archived'],
    });
  }
  return account;
}

/**
 * A category only makes sense on a transaction going the same way it does:
 * filing a payment under "Salary" would quietly corrupt every income report.
 */
function assertMatchingCategory(userId, categoryId, direction) {
  if (categoryId === null || categoryId === undefined) return null;

  const category = findCategory(userId, categoryId);
  if (!category) throw notFound('Category');
  if (category.archivedAt) {
    throw conflict(`"${category.name}" is archived`, { categoryId: ['Category is archived'] });
  }

  const expected = direction === 'in' ? 'income' : 'expense';
  if (category.kind !== expected) {
    throw badRequest(`"${category.name}" is an ${category.kind} category`, {
      categoryId: [`Must be an ${expected} category for a money-${direction} transaction`],
    });
  }
  return category;
}

export function getTransactions(userId, query) {
  const { limit, offset, ...filters } = query;
  return listTransactions(userId, filters, { limit, offset });
}

export function getTransaction(userId, id) {
  const found = findTransaction(userId, id);
  if (!found) throw notFound('Transaction');
  return found;
}

export function addTransaction(userId, input) {
  assertUsableAccount(userId, input.accountId);
  assertMatchingCategory(userId, input.categoryId, input.direction);
  return insertTransaction(userId, input);
}

export function editTransaction(userId, id, input) {
  const existing = getTransaction(userId, id);

  if (existing.isTransfer) {
    throw conflict('Edit the transfer instead of one of its legs', {
      transferId: existing.transferId,
    });
  }

  if (input.accountId) assertUsableAccount(userId, input.accountId);

  // Direction and category are checked together — changing either can break the
  // pairing, and the update may only supply one of them.
  const nextDirection = input.direction ?? existing.direction;
  const nextCategoryId = Object.hasOwn(input, 'categoryId')
    ? input.categoryId
    : existing.categoryId;
  assertMatchingCategory(userId, nextCategoryId, nextDirection);

  return updateTransaction(userId, id, input);
}

export function removeTransaction(userId, id) {
  const existing = getTransaction(userId, id);

  // Deleting one leg of a transfer would leave the other side inventing money.
  if (existing.isTransfer) {
    deleteTransferLegs(userId, existing.transferId);
    return { deletedTransfer: existing.transferId };
  }

  deleteTransaction(userId, id);
  return { deleted: id };
}

/**
 * Records a move between two of the user's own accounts as a linked pair: an
 * 'out' leg on the source and an 'in' leg on the destination, sharing a
 * transfer id. Neither leg carries a category, so spending reports ignore both.
 */
export function addTransfer(userId, { fromAccountId, toAccountId, amount, occurredOn, note }) {
  const from = assertUsableAccount(userId, fromAccountId, 'fromAccountId');
  const to = assertUsableAccount(userId, toAccountId, 'toAccountId');

  const transferId = randomUUID();
  const shared = { amount, occurredOn, transferId, categoryId: null, note: note ?? null };

  const legs = transaction(() => [
    insertTransaction(userId, {
      ...shared,
      accountId: from.id,
      direction: 'out',
      payee: `Transfer to ${to.name}`,
    }),
    insertTransaction(userId, {
      ...shared,
      accountId: to.id,
      direction: 'in',
      payee: `Transfer from ${from.name}`,
    }),
  ]);

  return { transferId, legs };
}

export function getTransfer(userId, transferId) {
  const legs = findTransferLegs(userId, transferId);
  if (legs.length === 0) throw notFound('Transfer');
  return { transferId, legs };
}

export function removeTransfer(userId, transferId) {
  const removed = deleteTransferLegs(userId, transferId);
  if (removed === 0) throw notFound('Transfer');
  return { deletedTransfer: transferId, legs: removed };
}
