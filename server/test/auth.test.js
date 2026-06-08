import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, resetDatabase } from './helpers/test-app.js';

let client;
let stop;

before(async () => {
  ({ client, stop } = await startTestServer());
  resetDatabase();
});

after(async () => {
  await stop();
});

describe('POST /api/auth/register', () => {
  test('creates an account and returns a session', async () => {
    const res = await client.post('/api/auth/register', {
      email: 'Ravi@Example.com',
      name: 'Ravi Perera',
      password: 'a long enough password',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'ravi@example.com', 'email is normalized to lowercase');
    assert.equal(res.body.user.name, 'Ravi Perera');
    assert.equal(res.body.user.currency, 'LKR');
    assert.ok(res.body.token);
    assert.equal(res.body.user.passwordHash, undefined, 'never leaks the hash');
  });

  test('rejects a duplicate email regardless of casing', async () => {
    const res = await client.post('/api/auth/register', {
      email: 'RAVI@example.com',
      name: 'Someone Else',
      password: 'another long password',
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'conflict');
  });

  test('rejects a short password with a field-keyed 422', async () => {
    const res = await client.post('/api/auth/register', {
      email: 'short@example.com',
      name: 'Short',
      password: 'tiny',
    });

    assert.equal(res.status, 422);
    assert.deepEqual(res.body.error.details.password, ['Must be at least 10 characters']);
  });

  test('rejects a malformed email', async () => {
    const res = await client.post('/api/auth/register', {
      email: 'not-an-email',
      name: 'Nope',
      password: 'a long enough password',
    });

    assert.equal(res.status, 422);
    assert.ok(res.body.error.details.email);
  });
});

describe('POST /api/auth/login', () => {
  test('returns a token for correct credentials', async () => {
    const res = await client.post('/api/auth/login', {
      email: 'ravi@example.com',
      password: 'a long enough password',
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'ravi@example.com');
  });

  test('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await client.post('/api/auth/login', {
      email: 'ravi@example.com',
      password: 'definitely not it',
    });
    const unknownEmail = await client.post('/api/auth/login', {
      email: 'nobody@example.com',
      password: 'definitely not it',
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body, 'responses are indistinguishable');
  });
});

describe('GET /api/auth/me', () => {
  test('returns the signed-in user', async () => {
    const { token } = (
      await client.post('/api/auth/login', {
        email: 'ravi@example.com',
        password: 'a long enough password',
      })
    ).body;

    const res = await client.get('/api/auth/me', { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'ravi@example.com');
  });

  test('rejects a missing token', async () => {
    const res = await client.get('/api/auth/me', { token: null });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'unauthorized');
  });

  test('rejects a tampered token', async () => {
    const { token } = (
      await client.post('/api/auth/login', {
        email: 'ravi@example.com',
        password: 'a long enough password',
      })
    ).body;

    const [header, payload, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: '1', exp: 9e9 })).toString('base64url');

    for (const bad of [`${header}.${forged}.${signature}`, `${header}.${payload}.abc`, 'garbage']) {
      const res = await client.get('/api/auth/me', { token: bad });
      assert.equal(res.status, 401, `expected 401 for ${bad.slice(0, 24)}…`);
    }
  });
});

describe('POST /api/auth/me/password', () => {
  test('changes the password and invalidates the old one', async () => {
    const session = await client.signUp({ password: 'the original password' });

    const changed = await client.post(
      '/api/auth/me/password',
      { currentPassword: 'the original password', newPassword: 'a brand new password' },
      { token: session.token }
    );
    assert.equal(changed.status, 204);

    const oldLogin = await client.post('/api/auth/login', {
      email: session.user.email,
      password: 'the original password',
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await client.post('/api/auth/login', {
      email: session.user.email,
      password: 'a brand new password',
    });
    assert.equal(newLogin.status, 200);
  });

  test('refuses when the current password is wrong', async () => {
    const session = await client.signUp();
    const res = await client.post(
      '/api/auth/me/password',
      { currentPassword: 'not the password', newPassword: 'a brand new password' },
      { token: session.token }
    );
    assert.equal(res.status, 401);
  });
});
