#!/usr/bin/env node
/**
 * Fills the database with six months of plausible activity so the dashboard and
 * reports have something to draw. Safe to re-run: it replaces the demo user.
 *
 *   npm run db:seed --workspace=server
 */
import { migrate } from '../src/db/migrate.js';
import { getDb, closeDb, transaction } from '../src/db/connection.js';
import { hashPassword } from '../src/lib/password.js';
import { createUser, findUserByEmail } from '../src/modules/users/users.repository.js';
import { insertCategories, listCategories } from '../src/modules/categories/categories.repository.js';
import { DEFAULT_CATEGORIES } from '../src/modules/categories/categories.defaults.js';
import { createAccount } from '../src/modules/accounts/accounts.repository.js';
import { insertTransaction } from '../src/modules/transactions/transactions.repository.js';
import { upsertBudget } from '../src/modules/budgets/budgets.repository.js';
import { addMonths, currentMonth, monthBounds, daysInMonth } from '../src/lib/dates.js';

const EMAIL = 'demo@rs.local';
const PASSWORD = 'demo password 123';
const MONTHS = 6;

// A deterministic generator, so re-seeding produces the same ledger and any
// screenshot or test built on it stays valid.
let seed = 20260601;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (items) => items[Math.floor(random() * items.length)];
const between = (min, max) => Math.round(min + random() * (max - min));

const SPEND = [
  { category: 'Groceries', payees: ['Keells', 'Cargills', 'Arpico'], min: 1_200, max: 9_500, perMonth: 7 },
  { category: 'Eating out', payees: ['Barista', 'Burger Hut', 'The Curry House'], min: 700, max: 4_500, perMonth: 5 },
  { category: 'Transport', payees: ['PickMe', 'Fuel station', 'Bus pass'], min: 300, max: 6_000, perMonth: 6 },
  { category: 'Utilities', payees: ['CEB', 'Water board', 'Dialog'], min: 2_500, max: 9_000, perMonth: 3 },
  { category: 'Subscriptions', payees: ['Netflix', 'Spotify', 'iCloud'], min: 500, max: 2_500, perMonth: 2 },
  { category: 'Health', payees: ['Pharmacy', 'Dental clinic'], min: 1_500, max: 12_000, perMonth: 1 },
  { category: 'Shopping', payees: ['Odel', 'Fashion Bug', 'Online order'], min: 2_000, max: 18_000, perMonth: 2 },
  { category: 'Household', payees: ['Hardware store', 'Cleaning service'], min: 1_000, max: 7_000, perMonth: 2 },
];

const rupees = (amount) => Math.round(amount * 100);

migrate({ silent: true });

const db = getDb();
const existing = findUserByEmail(EMAIL);
if (existing) {
  // Cascades clear the accounts, categories, transactions and budgets with it.
  db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
  console.log('[seed] removed the previous demo account');
}

const user = await (async () => {
  const passwordHash = await hashPassword(PASSWORD);
  return transaction(() => {
    const created = createUser({ email: EMAIL, name: 'Demo User', passwordHash, currency: 'LKR' });
    insertCategories(created.id, DEFAULT_CATEGORIES);
    return created;
  });
})();

const categories = new Map(listCategories(user.id).map((c) => [c.name, c]));

const accounts = transaction(() => ({
  bank: createAccount(user.id, { name: 'Everyday account', type: 'bank', openingBalance: rupees(42_000) }),
  wallet: createAccount(user.id, { name: 'Wallet', type: 'cash', openingBalance: rupees(3_500) }),
  savings: createAccount(user.id, { name: 'Savings', type: 'savings', openingBalance: rupees(180_000) }),
  card: createAccount(user.id, { name: 'Credit card', type: 'card', openingBalance: rupees(-12_000) }),
}));

const thisMonth = currentMonth();
let count = 0;

transaction(() => {
  for (let offset = MONTHS - 1; offset >= 0; offset -= 1) {
    const month = addMonths(thisMonth, -offset);
    const { start } = monthBounds(month);
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = daysInMonth(year, monthNumber);
    const day = (n) => `${month}-${String(Math.min(n, lastDay)).padStart(2, '0')}`;

    // Salary lands on the 25th, rent goes out on the 1st.
    insertTransaction(user.id, {
      accountId: accounts.bank.id,
      categoryId: categories.get('Salary').id,
      direction: 'in',
      amount: rupees(between(180_000, 195_000)),
      occurredOn: day(25),
      payee: 'Monthly salary',
    });

    insertTransaction(user.id, {
      accountId: accounts.bank.id,
      categoryId: categories.get('Rent').id,
      direction: 'out',
      amount: rupees(65_000),
      occurredOn: start,
      payee: 'Landlord',
    });
    count += 2;

    for (const group of SPEND) {
      for (let i = 0; i < group.perMonth; i += 1) {
        insertTransaction(user.id, {
          accountId: pick([accounts.bank, accounts.wallet, accounts.card]).id,
          categoryId: categories.get(group.category).id,
          direction: 'out',
          amount: rupees(between(group.min, group.max)),
          occurredOn: day(between(1, 28)),
          payee: pick(group.payees),
        });
        count += 1;
      }
    }

    // A standing transfer into savings right after payday.
    const transferId = `demo-transfer-${month}`;
    for (const leg of [
      { accountId: accounts.bank.id, direction: 'out', payee: 'Transfer to Savings' },
      { accountId: accounts.savings.id, direction: 'in', payee: 'Transfer from Everyday account' },
    ]) {
      insertTransaction(user.id, {
        ...leg,
        categoryId: null,
        amount: rupees(25_000),
        occurredOn: day(26),
        transferId,
      });
      count += 1;
    }
  }

  for (const [name, cap] of [
    ['Groceries', 40_000],
    ['Eating out', 15_000],
    ['Transport', 20_000],
    ['Shopping', 25_000],
    ['Utilities', 18_000],
  ]) {
    upsertBudget(user.id, { categoryId: categories.get(name).id, month: thisMonth, amount: rupees(cap) });
  }
});

console.log(`[seed] ${count} transactions across ${MONTHS} months`);
console.log(`[seed] sign in with ${EMAIL} / ${PASSWORD}`);
closeDb();
