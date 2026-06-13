import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, resetDatabase } from './helpers/test-app.js';

let client;
let stop;
let bank;
let categories;

const find = (name) => categories.find((c) => c.name === name);

before(async () => {
  ({ client, stop } = await startTestServer());
  resetDatabase();
  await client.signUp();

  bank = (await client.post('/api/accounts', { name: 'Bank', type: 'bank' })).body.account;
  const savings = (await client.post('/api/accounts', { name: 'Savings', type: 'savings' })).body
    .account;
  categories = (await client.get('/api/categories')).body.categories;

  const rows = [
    // May, so month-on-month comparison has something to compare against.
    { categoryId: find('Salary').id, direction: 'in', amount: '80000', occurredOn: '2026-05-25' },
    { categoryId: find('Groceries').id, direction: 'out', amount: '10000', occurredOn: '2026-05-08' },

    // June.
    { categoryId: find('Salary').id, direction: 'in', amount: '100000', occurredOn: '2026-06-25' },
    { categoryId: find('Groceries').id, direction: 'out', amount: '12000', occurredOn: '2026-06-03', payee: 'Keells' },
    { categoryId: find('Groceries').id, direction: 'out', amount: '8000', occurredOn: '2026-06-17', payee: 'Keells' },
    { categoryId: find('Rent').id, direction: 'out', amount: '45000', occurredOn: '2026-06-01', payee: 'Landlord' },
    { categoryId: find('Transport').id, direction: 'out', amount: '5000', occurredOn: '2026-06-12' },
  ];
  for (const row of rows) await client.post('/api/transactions', { accountId: bank.id, ...row });

  // A transfer that must not register as either income or spending.
  await client.post('/api/transactions/transfers', {
    fromAccountId: bank.id,
    toAccountId: savings.id,
    amount: '20000',
    occurredOn: '2026-06-26',
  });
});

after(async () => {
  await stop();
});

describe('GET /api/reports/overview', () => {
  test('totals June income and spending, ignoring the transfer', async () => {
    const res = await client.get('/api/reports/overview?month=2026-06');

    assert.equal(res.status, 200);
    assert.equal(res.body.income, 10_000_000);
    assert.equal(res.body.expenses, 7_000_000, '12000 + 8000 + 45000 + 5000');
    assert.equal(res.body.net, 3_000_000);
  });

  test('computes the savings rate from real income only', async () => {
    const res = await client.get('/api/reports/overview?month=2026-06');
    assert.equal(res.body.savingsRate, 30, '30% of income kept');
  });

  test('compares against the previous month', async () => {
    const res = await client.get('/api/reports/overview?month=2026-06');
    assert.equal(res.body.previousMonth.month, '2026-05');
    assert.equal(res.body.previousMonth.expenses, 1_000_000);
    assert.equal(res.body.expensesChange, 600, 'spending is 7x May, i.e. +600%');
  });

  test('returns a null savings rate for a month with no income', async () => {
    const res = await client.get('/api/reports/overview?month=2026-04');
    assert.equal(res.body.savingsRate, null, 'undefined, not zero');
  });

  test('ranks the top categories with their share of spending', async () => {
    const res = await client.get('/api/reports/overview?month=2026-06');
    const [first, second] = res.body.topCategories;

    assert.equal(first.name, 'Rent');
    assert.equal(first.total, 4_500_000);
    assert.equal(first.share, 64.3, '45000 of 70000');
    assert.equal(second.name, 'Groceries');
    assert.equal(second.total, 2_000_000, 'both grocery trips combined');
  });

  test('rejects a malformed month', async () => {
    const res = await client.get('/api/reports/overview?month=2026-13');
    assert.equal(res.status, 422);
  });
});

describe('GET /api/reports/by-category', () => {
  test('shares always add up to 100', async () => {
    const res = await client.get('/api/reports/by-category?from=2026-06-01&to=2026-06-30');
    const sum = res.body.categories.reduce((total, row) => total + row.share, 0);

    assert.ok(Math.abs(sum - 100) < 0.5, `expected ~100, got ${sum}`);
    assert.equal(res.body.total, 7_000_000);
  });

  test('splits income when asked for the other direction', async () => {
    const res = await client.get('/api/reports/by-category?from=2026-06-01&to=2026-06-30&direction=in');
    assert.equal(res.body.categories.length, 1);
    assert.equal(res.body.categories[0].name, 'Salary');
  });
});

describe('GET /api/reports/trend', () => {
  test('includes months with no activity as zeros', async () => {
    const res = await client.get('/api/reports/trend?month=2026-06&months=6');

    assert.equal(res.body.months.length, 6);
    assert.deepEqual(
      res.body.months.map((m) => m.month),
      ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
    );
    assert.equal(res.body.months[0].income, 0, 'January is empty but present');
    assert.equal(res.body.months[5].net, 3_000_000);
  });
});

describe('GET /api/reports/top-payees', () => {
  test('groups repeat payees and ranks them by total', async () => {
    const res = await client.get('/api/reports/top-payees?from=2026-06-01&to=2026-06-30');

    assert.equal(res.body.payees[0].payee, 'Landlord');
    const keells = res.body.payees.find((p) => p.payee === 'Keells');
    assert.equal(keells.total, 2_000_000);
    assert.equal(keells.transaction_count, 2);
  });
});

describe('budgets', () => {
  test('report spend against the cap', async () => {
    await client.put('/api/budgets', {
      categoryId: find('Groceries').id,
      month: '2026-06',
      amount: '25000',
    });

    const res = await client.get('/api/budgets?month=2026-06');
    const groceries = res.body.budgets.find((b) => b.category.name === 'Groceries');

    assert.equal(groceries.amount, 2_500_000);
    assert.equal(groceries.spent, 2_000_000);
    assert.equal(groceries.remaining, 500_000);
    assert.equal(groceries.usedPercent, 80);
  });

  test('setting the same category twice updates rather than duplicates', async () => {
    await client.put('/api/budgets', {
      categoryId: find('Groceries').id,
      month: '2026-06',
      amount: '30000',
    });

    const res = await client.get('/api/budgets?month=2026-06');
    const matches = res.body.budgets.filter((b) => b.category.name === 'Groceries');

    assert.equal(matches.length, 1);
    assert.equal(matches[0].amount, 3_000_000);
  });

  test('refuse an income category', async () => {
    const res = await client.put('/api/budgets', {
      categoryId: find('Salary').id,
      month: '2026-06',
      amount: '1000',
    });
    assert.equal(res.status, 400);
  });

  test('roll forward into an empty month without overwriting existing caps', async () => {
    await client.put('/api/budgets', {
      categoryId: find('Rent').id,
      month: '2026-07',
      amount: '50000',
    });

    const res = await client.post('/api/budgets/rollover', { month: '2026-07' });

    assert.equal(res.status, 200);
    assert.equal(res.body.copied, 1, 'only Groceries was missing');

    const rent = res.body.budgets.find((b) => b.category.name === 'Rent');
    assert.equal(rent.amount, 5_000_000, 'the July figure already set is left alone');
  });

  test('refuse to copy backwards', async () => {
    const res = await client.post('/api/budgets/rollover', {
      month: '2026-05',
      fromMonth: '2026-07',
    });
    assert.equal(res.status, 400);
  });
});

describe('GET /api/reports/budget-progress', () => {
  test('projects the full-month spend and flags overspending', async () => {
    await client.put('/api/budgets', {
      categoryId: find('Transport').id,
      month: '2026-06',
      amount: '1000',
    });

    const res = await client.get('/api/reports/budget-progress?month=2026-06');
    const transport = res.body.budgets.find((b) => b.category.name === 'Transport');

    assert.equal(transport.overspent, true, 'Rs 5,000 spent against a Rs 1,000 cap');
    assert.ok(res.body.monthElapsedPercent >= 0 && res.body.monthElapsedPercent <= 100);
  });
});
