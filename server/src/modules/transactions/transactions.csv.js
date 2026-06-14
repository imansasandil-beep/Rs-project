import { toCsv, parseCsv } from '../../lib/csv.js';
import { toMajorUnits, toMinorUnits } from '../../lib/money.js';
import { isDay } from '../../lib/dates.js';
import { badRequest } from '../../lib/errors.js';
import { transaction } from '../../db/connection.js';
import { listAccounts, createAccount } from '../accounts/accounts.repository.js';
import { listCategories, createCategory } from '../categories/categories.repository.js';
import { listTransactions, insertTransaction } from './transactions.repository.js';

export const CSV_COLUMNS = ['date', 'account', 'category', 'direction', 'amount', 'payee', 'note'];

/** Serializes every transaction matching the filters, newest first. */
export function exportTransactionsCsv(userId, filters = {}) {
  // 10k rows is roughly 20 years of daily spending — enough to be a complete
  // export in practice without letting one request page the whole table.
  const { items } = listTransactions(userId, filters, { limit: 10_000, offset: 0 });

  return toCsv(
    CSV_COLUMNS,
    items.map((t) => ({
      date: t.occurredOn,
      account: t.account.name,
      category: t.category?.name ?? '',
      direction: t.direction,
      amount: toMajorUnits(t.amount),
      payee: t.payee ?? '',
      note: t.note ?? '',
    }))
  );
}

function lookup(rows) {
  const byName = new Map();
  for (const row of rows) byName.set(row.name.trim().toLowerCase(), row);
  return byName;
}

/**
 * Imports rows produced by `exportTransactionsCsv` (or any file with the same
 * headers). Accounts and categories are matched by name, case-insensitively.
 *
 * Nothing is written unless every row parses. A half-imported statement is far
 * worse than a rejected one, because you cannot tell which half is missing.
 *
 * @param {object} options
 * @param {boolean} options.createMissing  create unknown accounts/categories
 * @param {boolean} options.dryRun         validate and report without writing
 */
export function importTransactionsCsv(userId, text, { createMissing = false, dryRun = false } = {}) {
  const rows = parseCsv(text);
  if (rows.length === 0) throw badRequest('The file has no rows');

  const missingColumns = CSV_COLUMNS.filter((column) => !Object.hasOwn(rows[0], column));
  if (missingColumns.length > 0) {
    throw badRequest(`The file is missing required columns: ${missingColumns.join(', ')}`, {
      columns: missingColumns,
    });
  }

  const accounts = lookup(listAccounts(userId, { includeArchived: true }));
  const categories = lookup(listCategories(userId, { includeArchived: true }));

  const errors = [];
  const parsed = [];
  const newAccounts = new Set();
  const newCategories = new Map();

  rows.forEach((row, index) => {
    // +2: one for the header, one because humans count from 1.
    const line = index + 2;
    const problem = (message) => errors.push({ line, message });

    const date = row.date?.trim();
    if (!isDay(date)) return problem(`"${row.date}" is not a date in YYYY-MM-DD form`);

    const direction = row.direction?.trim().toLowerCase();
    if (direction !== 'in' && direction !== 'out') {
      return problem(`Direction must be "in" or "out", got "${row.direction}"`);
    }

    let amount;
    try {
      amount = toMinorUnits(row.amount?.trim());
    } catch {
      return problem(`"${row.amount}" is not a valid amount`);
    }
    if (amount <= 0) return problem('Amount must be greater than zero');

    const accountName = row.account?.trim();
    if (!accountName) return problem('Account name is required');
    const account = accounts.get(accountName.toLowerCase());
    if (!account && !createMissing) return problem(`No account called "${accountName}"`);
    if (!account) newAccounts.add(accountName);

    const categoryName = row.category?.trim();
    const wantedKind = direction === 'in' ? 'income' : 'expense';
    let category = null;

    if (categoryName) {
      category = categories.get(categoryName.toLowerCase());
      if (!category && !createMissing) return problem(`No category called "${categoryName}"`);
      if (category && category.kind !== wantedKind) {
        return problem(`"${categoryName}" is an ${category.kind} category but the row is ${direction}`);
      }
      if (!category) {
        newCategories.set(categoryName.toLowerCase(), { name: categoryName, kind: wantedKind });
      }
    }

    parsed.push({
      accountName,
      categoryName: categoryName || null,
      categoryKind: wantedKind,
      direction,
      amount,
      occurredOn: date,
      payee: row.payee?.trim() || null,
      note: row.note?.trim() || null,
    });
  });

  const summary = {
    total: rows.length,
    valid: parsed.length,
    errors,
    accountsToCreate: [...newAccounts],
    categoriesToCreate: [...newCategories.values()].map((category) => category.name),
  };

  if (errors.length > 0) {
    throw badRequest(`${errors.length} of ${rows.length} rows could not be imported`, summary);
  }
  if (dryRun) return { ...summary, imported: 0, dryRun: true };

  const imported = transaction(() => {
    for (const name of newAccounts) {
      accounts.set(name.toLowerCase(), createAccount(userId, { name, type: 'bank' }));
    }
    for (const [key, { name, kind }] of newCategories) {
      categories.set(key, createCategory(userId, { name, kind }));
    }

    let count = 0;
    for (const row of parsed) {
      insertTransaction(userId, {
        accountId: accounts.get(row.accountName.toLowerCase()).id,
        categoryId: row.categoryName ? categories.get(row.categoryName.toLowerCase()).id : null,
        direction: row.direction,
        amount: row.amount,
        occurredOn: row.occurredOn,
        payee: row.payee,
        note: row.note,
      });
      count += 1;
    }
    return count;
  });

  return { ...summary, imported, dryRun: false };
}
