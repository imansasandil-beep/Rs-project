import { badRequest, notFound } from '../../lib/errors.js';
import { currentMonth, addMonths } from '../../lib/dates.js';
import { findCategory } from '../categories/categories.repository.js';
import {
  listBudgets,
  findBudget,
  upsertBudget,
  deleteBudget,
  copyBudgets,
  budgetTotals,
} from './budgets.repository.js';

export function getBudgets(userId, month = currentMonth()) {
  return { month, budgets: listBudgets(userId, month), totals: budgetTotals(userId, month) };
}

export function setBudget(userId, input) {
  const category = findCategory(userId, input.categoryId);
  if (!category) throw notFound('Category');

  // Income has no ceiling to stay under; budgeting it would be meaningless.
  if (category.kind !== 'expense') {
    throw badRequest('Only expense categories can be budgeted', {
      categoryId: ['Must be an expense category'],
    });
  }

  return upsertBudget(userId, input);
}

export function removeBudget(userId, id) {
  if (!findBudget(userId, id)) throw notFound('Budget');
  deleteBudget(userId, id);
}

/**
 * Rolls last month's caps into `month`. Existing budgets win, so this is safe to
 * run twice and will not overwrite a figure the user has already adjusted.
 */
export function rolloverBudgets(userId, month, fromMonth = addMonths(month, -1)) {
  if (fromMonth >= month) {
    throw badRequest('Can only copy budgets forward from an earlier month', {
      fromMonth: ['Must be before the target month'],
    });
  }

  const copied = copyBudgets(userId, fromMonth, month);
  return { month, fromMonth, copied, ...getBudgets(userId, month) };
}
