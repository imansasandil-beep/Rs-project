/**
 * A new ledger with no categories cannot record anything useful, so every
 * account starts with a set covering the ordinary month. They are plain rows —
 * rename, recolour or archive any of them.
 */
export const DEFAULT_CATEGORIES = [
  { name: 'Salary', kind: 'income', color: '#22c55e' },
  { name: 'Freelance', kind: 'income', color: '#14b8a6' },
  { name: 'Interest', kind: 'income', color: '#0ea5e9' },
  { name: 'Gifts', kind: 'income', color: '#a855f7' },

  { name: 'Groceries', kind: 'expense', color: '#f97316' },
  { name: 'Rent', kind: 'expense', color: '#ef4444' },
  { name: 'Utilities', kind: 'expense', color: '#eab308' },
  { name: 'Transport', kind: 'expense', color: '#3b82f6' },
  { name: 'Eating out', kind: 'expense', color: '#ec4899' },
  { name: 'Health', kind: 'expense', color: '#06b6d4' },
  { name: 'Education', kind: 'expense', color: '#8b5cf6' },
  { name: 'Subscriptions', kind: 'expense', color: '#64748b' },
  { name: 'Shopping', kind: 'expense', color: '#d946ef' },
  { name: 'Household', kind: 'expense', color: '#84cc16' },
  { name: 'Other', kind: 'expense', color: '#94a3b8' },
];
