import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, resetDatabase } from './helpers/test-app.js';

let client;
let stop;
let wallet;
let bank;
let groceries;
let salary;

before(async () => {
  ({ client, stop } = await startTestServer());
  resetDatabase();
  await client.signUp();

  wallet = (
    await client.post('/api/accounts', { name: 'Wallet', type: 'cash', openingBalance: '1000' })
  ).body.account;
  bank = (
    await client.post('/api/accounts', { name: 'Bank', type: 'bank', openingBalance: '50000' })
  ).body.account;

  const categories = (await client.get('/api/categories')).body.categories;
  groceries = categories.find((c) => c.name === 'Groceries');
  salary = categories.find((c) => c.name === 'Salary');
});

after(async () => {
  await stop();
});

describe('account balances', () => {
  test('start at the opening balance', () => {
    assert.equal(wallet.balance, 100000, 'Rs 1,000 as cents');
    assert.equal(bank.balance, 5000000);
  });

  test('move with each posted transaction', async () => {
    await client.post('/api/transactions', {
      accountId: wallet.id,
      categoryId: groceries.id,
      direction: 'out',
      amount: '250.75',
      occurredOn: '2026-06-11',
      payee: 'Corner shop',
    });

    const refreshed = (await client.get(`/api/accounts/${wallet.id}`)).body.account;
    assert.equal(refreshed.balance, 100000 - 25075);
  });
});

describe('POST /api/transactions', () => {
  test('rejects a category whose kind contradicts the direction', async () => {
    const res = await client.post('/api/transactions', {
      accountId: wallet.id,
      categoryId: salary.id,
      direction: 'out',
      amount: '100',
      occurredOn: '2026-06-11',
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error.details.categoryId[0], /expense category/);
  });

  test('rejects a zero amount', async () => {
    const res = await client.post('/api/transactions', {
      accountId: wallet.id,
      direction: 'out',
      amount: '0',
      occurredOn: '2026-06-11',
    });
    assert.equal(res.status, 422);
  });

  test('rejects a date that is not a real day', async () => {
    const res = await client.post('/api/transactions', {
      accountId: wallet.id,
      direction: 'out',
      amount: '10',
      occurredOn: '2026-06-31',
    });
    assert.equal(res.status, 422);
  });

  test("rejects another user's account", async () => {
    const mine = wallet.id;
    const intruder = await client.signUp();

    const res = await client.post(
      '/api/transactions',
      { accountId: mine, direction: 'out', amount: '10', occurredOn: '2026-06-11' },
      { token: intruder.token }
    );

    assert.equal(res.status, 404, 'an account you cannot see does not exist');
  });
});

describe('GET /api/transactions', () => {
  before(async () => {
    // Re-authenticate as the original owner after the intruder test above.
    const owner = await client.signUp();
    client.token = owner.token;

    wallet = (await client.post('/api/accounts', { name: 'Wallet', type: 'cash' })).body.account;
    bank = (await client.post('/api/accounts', { name: 'Bank', type: 'bank' })).body.account;
    const categories = (await client.get('/api/categories')).body.categories;
    groceries = categories.find((c) => c.name === 'Groceries');
    salary = categories.find((c) => c.name === 'Salary');

    const rows = [
      {
        accountId: wallet.id,
        categoryId: groceries.id,
        direction: 'out',
        amount: '500',
        occurredOn: '2026-06-01',
        payee: 'Keells',
      },
      {
        accountId: wallet.id,
        categoryId: groceries.id,
        direction: 'out',
        amount: '1200',
        occurredOn: '2026-06-10',
        payee: 'Cargills',
      },
      {
        accountId: bank.id,
        categoryId: salary.id,
        direction: 'in',
        amount: '95000',
        occurredOn: '2026-06-25',
        payee: 'Employer',
      },
    ];
    for (const row of rows) await client.post('/api/transactions', row);
  });

  test('returns newest first with matching totals', async () => {
    const res = await client.get('/api/transactions');

    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    assert.deepEqual(
      res.body.items.map((t) => t.occurredOn),
      ['2026-06-25', '2026-06-10', '2026-06-01']
    );
    assert.equal(res.body.totals.inflow, 9500000);
    assert.equal(res.body.totals.outflow, 170000);
    assert.equal(res.body.totals.net, 9500000 - 170000);
  });

  test('filters by date range', async () => {
    const res = await client.get('/api/transactions?from=2026-06-05&to=2026-06-20');
    assert.equal(res.body.total, 1);
    assert.equal(res.body.items[0].payee, 'Cargills');
  });

  test('filters by account and direction', async () => {
    const res = await client.get(`/api/transactions?accountId=${bank.id}&direction=in`);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.items[0].category.name, 'Salary');
  });

  test('searches payee text case-insensitively', async () => {
    const res = await client.get('/api/transactions?search=keells');
    assert.equal(res.body.total, 1);
  });

  test('treats a wildcard in the search term as a literal', async () => {
    const res = await client.get('/api/transactions?search=%25');
    assert.equal(res.body.total, 0, 'a bare % must not match everything');
  });

  test('pages with limit and offset', async () => {
    const first = await client.get('/api/transactions?limit=2');
    assert.equal(first.body.items.length, 2);
    assert.equal(first.body.hasMore, true);

    const second = await client.get('/api/transactions?limit=2&offset=2');
    assert.equal(second.body.items.length, 1);
    assert.equal(second.body.hasMore, false);
  });

  test('rejects an inverted date range', async () => {
    const res = await client.get('/api/transactions?from=2026-06-20&to=2026-06-01');
    assert.equal(res.status, 422);
    assert.ok(res.body.error.details.to);
  });
});

describe('transfers', () => {
  test('post two linked legs and leave combined worth unchanged', async () => {
    const before = (await client.get('/api/accounts')).body.totalBalance;

    const res = await client.post('/api/transactions/transfers', {
      fromAccountId: bank.id,
      toAccountId: wallet.id,
      amount: '2500',
      occurredOn: '2026-06-26',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.legs.length, 2);
    assert.deepEqual(
      res.body.legs.map((l) => l.direction),
      ['out', 'in']
    );
    assert.ok(
      res.body.legs.every((l) => l.categoryId === null),
      'transfers are never categorized'
    );

    const after = (await client.get('/api/accounts')).body.totalBalance;
    assert.equal(after, before, 'moving your own money does not change what you have');
  });

  test('are excluded when includeTransfers is false', async () => {
    const withThem = await client.get('/api/transactions');
    const without = await client.get('/api/transactions?includeTransfers=false');
    assert.equal(withThem.body.total - without.body.total, 2);
  });

  test('refuse a transfer to the same account', async () => {
    const res = await client.post('/api/transactions/transfers', {
      fromAccountId: wallet.id,
      toAccountId: wallet.id,
      amount: '100',
      occurredOn: '2026-06-26',
    });
    assert.equal(res.status, 422);
  });

  test('delete both legs when either one is deleted', async () => {
    const created = await client.post('/api/transactions/transfers', {
      fromAccountId: wallet.id,
      toAccountId: bank.id,
      amount: '300',
      occurredOn: '2026-06-27',
    });

    const oneLeg = created.body.legs[0];
    const res = await client.del(`/api/transactions/${oneLeg.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.deletedTransfer, created.body.transferId);

    const lookup = await client.get(`/api/transactions/transfers/${created.body.transferId}`);
    assert.equal(lookup.status, 404, 'neither leg survives');
  });

  test('refuse an in-place edit of a single leg', async () => {
    const created = await client.post('/api/transactions/transfers', {
      fromAccountId: wallet.id,
      toAccountId: bank.id,
      amount: '400',
      occurredOn: '2026-06-27',
    });

    const res = await client.patch(`/api/transactions/${created.body.legs[0].id}`, {
      amount: '999',
    });
    assert.equal(res.status, 409);
  });
});
