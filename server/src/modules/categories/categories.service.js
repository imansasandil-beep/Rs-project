import { conflict, notFound } from '../../lib/errors.js';
import {
  listCategories,
  findCategory,
  createCategory,
  updateCategory,
  setCategoryArchived,
  deleteCategory,
  countCategoryTransactions,
} from './categories.repository.js';

const DUPLICATE = 'UNIQUE constraint failed: categories.user_id, categories.kind, categories.name';

function asDuplicate(err, name) {
  if (String(err.message).includes(DUPLICATE)) {
    return conflict(`You already have a category called "${name}"`, { name: ['Already in use'] });
  }
  return err;
}

export function getCategories(userId, options) {
  return listCategories(userId, options);
}

export function getCategory(userId, id) {
  const category = findCategory(userId, id);
  if (!category) throw notFound('Category');
  return category;
}

export function addCategory(userId, input) {
  try {
    return createCategory(userId, input);
  } catch (err) {
    throw asDuplicate(err, input.name);
  }
}

export function editCategory(userId, id, input) {
  getCategory(userId, id);
  try {
    return updateCategory(userId, id, input);
  } catch (err) {
    throw asDuplicate(err, input.name);
  }
}

export function archiveCategory(userId, id, archived) {
  getCategory(userId, id);
  return setCategoryArchived(userId, id, archived);
}

/**
 * Deleting a category that has history would rewrite the past — the transactions
 * survive but silently lose their label. Archiving keeps reports intact and
 * hides it from every picker, so that is what we steer callers towards.
 */
export function removeCategory(userId, id) {
  getCategory(userId, id);

  const used = countCategoryTransactions(userId, id);
  if (used > 0) {
    throw conflict(
      `This category is used by ${used} transaction${used === 1 ? '' : 's'}. Archive it instead.`,
      { transactionCount: used }
    );
  }

  deleteCategory(userId, id);
}
