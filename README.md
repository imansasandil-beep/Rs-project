# Rs

A self-hosted personal finance tracker for rupee budgets. Track accounts, log every
transaction, set monthly category budgets, and see where the money actually went.

## Why

Most finance apps want a bank login and a subscription. Rs wants a folder on your
machine. It stores everything in a single SQLite file you own, runs on plain Node,
and has no cloud dependency.

## What it does

- **Accounts** — cash, bank, card, wallet, savings. Balances are derived from the
  ledger on every read, so they cannot drift from the transactions behind them.
- **Transactions** — filter by account, category, direction, date range, amount
  range or free text; the running total always matches the filter you applied.
- **Transfers** — recorded as two linked legs and excluded from every report,
  because moving your own money is neither income nor spending.
- **Budgets** — a monthly cap per category, with pacing: being at 60% of the cap
  is fine on the 20th and a problem on the 5th, and Rs says which one you are.
- **Reports** — category splits, twelve-month trends, daily spend, top payees.
- **CSV** — import and export. An import is rejected whole if any row is bad.
- **Dark mode**, keyboard-navigable dialogs, and a client that works on a phone.

## Stack

| Layer    | Choice                                                 |
| -------- | ------------------------------------------------------ |
| Runtime  | Node.js 22.5+ (uses the built-in `node:sqlite` driver) |
| API      | Express                                                |
| Database | SQLite, one file, migrated on boot                     |
| Client   | React + Vite                                           |
| Tests    | `node:test`                                            |

There is no ORM and no native build step — `node:sqlite` ships with Node itself.
Password hashing (scrypt) and session tokens (HS256) are built on `node:crypto`
rather than a dependency, since the API is its own token issuer and needs no
algorithm negotiation.

## Layout

```
server/
  src/
    config/      environment loading and validation
    db/          connection, migration runner, SQL migrations
    lib/         money, dates, csv, errors, password, tokens, validation
    middleware/  auth, cors, logging, rate limiting, errors, static client
    modules/     accounts, auth, budgets, categories, reports, transactions, users
  scripts/       migrate and demo-seed CLIs
  test/          node:test suites
web/
  src/
    components/  ui primitives, charts, app shell
    context/     auth and theme providers
    hooks/       data fetching and debouncing
    lib/         api client, formatting
    pages/       one file per route
docs/api.md      full API reference
```

Each module is a `repository` (SQL), a `service` (rules), `schemas` (validation)
and `routes` (HTTP). Nothing in a route touches SQL directly.

## Getting started

```bash
npm install
cp server/.env.example server/.env    # optional — dev works with no config
npm run dev
```

The API listens on `http://localhost:4000` and the client on
`http://localhost:5173`, which proxies `/api` through so there is no CORS
preflight in development.

To look at a populated app rather than an empty one:

```bash
npm run db:seed --workspace=server
```

That writes six months of plausible activity and prints the sign-in details.
It is deterministic, so re-running it produces exactly the same ledger.

## Scripts

| Command                                 | Does                                      |
| --------------------------------------- | ----------------------------------------- |
| `npm run dev`                           | API and client together                   |
| `npm run dev:server` / `dev:web`        | one or the other                          |
| `npm run build`                         | builds the client into `web/dist`         |
| `npm test`                              | every workspace's test suite              |
| `npm run db:migrate --workspace=server` | applies pending migrations                |
| `npm run db:seed --workspace=server`    | replaces the demo account with fresh data |

## Deployment

Build the client and start the API — it serves `web/dist` itself, so it is one
process on one port:

```bash
npm run build
NODE_ENV=production JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  npm start --workspace=server
```

`JWT_SECRET` is required in production and must be at least 32 characters; the
server refuses to boot without it. In development it generates an ephemeral one
per boot, which means sessions do not survive a restart — the right trade-off for
a machine nobody is deploying from.

## Design notes

**Money never touches a float.** Amounts are integer cents from the moment they
pass validation. `0.1 + 0.2 !== 0.3` is a rounding curiosity in most code and a
missing rupee in a ledger.

**Dates are calendar strings, not timestamps.** A transaction happened on a day.
Storing an instant would mean every read had to pick a timezone to interpret it in,
and a payment logged at 11pm would land in the wrong month for half the world.

**Balances are derived, not stored.** A stored balance is a second source of truth
that drifts the first time an update fails halfway through.

**Deletes that would lose history are refused.** Removing an account or a category
that has transactions returns `409` and points at archiving instead, which hides it
everywhere without touching what it explains.

**Nothing is owned across users.** Every query is scoped by `user_id`, and a
resource belonging to someone else returns `404` rather than `403` — whether it
exists is itself information the caller is not entitled to.

## Tests

```bash
npm test
```

93 tests over `node:test`, covering money conversion, calendar edge cases, CSV
quoting, auth (including that a wrong password and an unknown email are
indistinguishable), cross-user isolation, transfer atomicity, and report
aggregation. Each suite boots the real API on an ephemeral port against a
throwaway SQLite file.

## API

See [docs/api.md](docs/api.md).

## License

MIT
