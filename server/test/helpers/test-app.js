import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Each test file gets its own throwaway SQLite file in a temp directory. These
 * assignments must happen before anything imports the config module, which is
 * why the real imports below are dynamic — static ones are hoisted above this.
 */
const tempDir = mkdtempSync(join(tmpdir(), 'rs-test-'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_FILE = join(tempDir, 'test.db');
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-to-pass-validation';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const { createApp } = await import('../../src/app.js');
const { migrate } = await import('../../src/db/migrate.js');
const { closeDb, getDb } = await import('../../src/db/connection.js');

migrate({ silent: true });

/**
 * Boots the API on an ephemeral port and returns a small typed client.
 * Call `stop()` in an `after` hook.
 */
export async function startTestServer() {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  const client = {
    baseUrl: `http://127.0.0.1:${port}`,
    token: null,

    async request(method, path, { body, token = client.token, headers = {} } = {}) {
      const response = await fetch(`${client.baseUrl}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const text = await response.text();
      return {
        status: response.status,
        headers: response.headers,
        body: text ? JSON.parse(text) : null,
      };
    },

    get: (path, options) => client.request('GET', path, options),
    post: (path, body, options) => client.request('POST', path, { body, ...options }),
    patch: (path, body, options) => client.request('PATCH', path, { body, ...options }),
    put: (path, body, options) => client.request('PUT', path, { body, ...options }),
    del: (path, options) => client.request('DELETE', path, options),

    /** Registers a fresh account and keeps its token for later calls. */
    async signUp(overrides = {}) {
      const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const payload = {
        email: `user-${suffix}@example.com`,
        name: 'Test User',
        password: 'correct horse battery staple',
        ...overrides,
      };
      const response = await client.post('/api/auth/register', payload);
      if (response.status !== 201) {
        throw new Error(`sign up failed: ${response.status} ${JSON.stringify(response.body)}`);
      }
      client.token = response.body.token;
      return { ...response.body, password: payload.password };
    },
  };

  return {
    client,
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** Wipes every table so a test can start from an empty ledger. */
export function resetDatabase() {
  const db = getDb();
  for (const table of ['transactions', 'budgets', 'categories', 'accounts', 'users']) {
    db.exec(`DELETE FROM ${table}`);
  }
}

process.on('exit', () => {
  closeDb();
  rmSync(tempDir, { recursive: true, force: true });
});
