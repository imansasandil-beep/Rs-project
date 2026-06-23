import { currentMonth, monthBounds, lastMonths, addMonths, today } from '../../lib/dates.js';
import { totalBalance } from '../accounts/accounts.repository.js';
import { budgetTotals, listBudgets } from '../budgets/budgets.repository.js';
import {
  monthSummary,
  categoryBreakdown,
  monthlyTrend,
  dailyTotals,
  topPayees,
  ledgerRange,
} from './reports.repository.js';

/** Adds each row's share of the total as a percentage rounded to one decimal. */
function withShare(rows) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? Math.round((row.total / total) * 1000) / 10 : 0,
  }));
}

/** Everything the dashboard needs, assembled in one round trip. */
export function getOverview(userId, month = currentMonth()) {
  const { start, end } = monthBounds(month);
  const summary = monthSummary(userId, month);
  const previous = monthSummary(userId, addMonths(month, -1));

  const income = summary.income;
  const expenses = summary.expenses;

  return {
    month,
    totalBalance: totalBalance(userId),
    income,
    expenses,
    net: income - expenses,
    transactionCount: summary.transaction_count,
    // A negative saving rate is meaningful (you spent more than you earned), so
    // it is not clamped — but with no income at all the ratio is undefined.
    savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 1000) / 10 : null,
    previousMonth: {
      month: addMonths(month, -1),
      income: previous.income,
      expenses: previous.expenses,
      net: previous.income - previous.expenses,
    },
    expensesChange:
      previous.expenses > 0
        ? Math.round(((expenses - previous.expenses) / previous.expenses) * 1000) / 10
        : null,
    topCategories: withShare(categoryBreakdown(userId, { from: start, to: end }).slice(0, 5)),
    budgets: budgetTotals(userId, month),
    trend: monthlyTrend(userId, lastMonths(month, 6)),
  };
}

export function getSpendingByCategory(userId, { from, to, direction }) {
  const rows = withShare(categoryBreakdown(userId, { from, to, direction }));
  return {
    from,
    to,
    direction,
    total: rows.reduce((sum, row) => sum + row.total, 0),
    categories: rows,
  };
}

export function getTrend(userId, { month = currentMonth(), months = 12 }) {
  return { months: monthlyTrend(userId, lastMonths(month, months)) };
}

export function getDailySpend(userId, { from, to }) {
  const rows = dailyTotals(userId, { from, to });
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return {
    from,
    to,
    total,
    // Averaged over elapsed days, not days with activity — a quiet week should
    // pull the average down rather than vanish from it.
    dailyAverage: rows.length > 0 ? Math.round(total / countDays(from, to)) : 0,
    days: rows,
  };
}

function countDays(from, to) {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function getTopPayees(userId, options) {
  return { payees: topPayees(userId, options) };
}

/** Per-budget progress plus how far through the month we are, for pacing. */
export function getBudgetProgress(userId, month = currentMonth()) {
  const { start, end } = monthBounds(month);
  const day = today();
  const elapsed = day < start ? 0 : day > end ? countDays(start, end) : countDays(start, day);
  const monthLength = countDays(start, end);

  return {
    month,
    monthElapsedPercent: Math.round((elapsed / monthLength) * 1000) / 10,
    totals: budgetTotals(userId, month),
    budgets: listBudgets(userId, month).map((budget) => ({
      ...budget,
      // Where the spend would land if the rest of the month matches so far.
      projected: elapsed > 0 ? Math.round((budget.spent / elapsed) * monthLength) : 0,
      overspent: budget.spent > budget.amount,
    })),
  };
}

export function getLedgerRange(userId) {
  return ledgerRange(userId);
}
