# API reference

Base URL `http://localhost:4000/api`. Everything is JSON except the CSV routes.

## Conventions

**Money** is an integer number of cents in every response. `125050` is Rs 1,250.50.
Requests accept either a string or a number in major units — `"1250.50"`, `1250.5`
and `"1250.5"` all mean the same thing. More than two decimal places is rejected.

**Dates** are calendar strings, never timestamps: a day is `YYYY-MM-DD`, a month is
`YYYY-MM`. There is no timezone handling because a transaction happened on a day.

**Authentication** is a bearer token from `/auth/login` or `/auth/register`:

```
Authorization: Bearer <token>
```

Every route except `/health`, `/auth/register` and `/auth/login` requires one.

**Errors** always have the same shape:

```json
{
  "error": {
    "code": "unprocessable_entity",
    "message": "Request body is not valid",
    "details": { "amount": ["Amount must be greater than zero"] }
  }
}
```

`details` is keyed by field path when validation failed, so a form can put each
message next to the input that caused it.

| Status | Code                   | Means                                            |
| ------ | ---------------------- | ------------------------------------------------ |
| 400    | `bad_request`          | Semantically wrong, e.g. a category kind clash   |
| 401    | `unauthorized`         | Missing, invalid or expired token                |
| 404    | `not_found`            | No such resource — or it belongs to someone else |
| 409    | `conflict`             | Duplicate name, or a delete that would lose data |
| 422    | `unprocessable_entity` | Failed schema validation                         |
| 429    | `too_many_requests`    | Rate limited; see the `Retry-After` header       |

A resource owned by another user returns 404, not 403 — whether it exists is
itself information the caller is not entitled to.

## Auth

| Method  | Path                | Body                               | Returns            |
| ------- | ------------------- | ---------------------------------- | ------------------ |
| `POST`  | `/auth/register`    | `email, name, password, currency?` | `201` user + token |
| `POST`  | `/auth/login`       | `email, password`                  | user + token       |
| `GET`   | `/auth/me`          | —                                  | user               |
| `PATCH` | `/auth/me`          | `name?, currency?`                 | user               |
| `POST`  | `/auth/me/password` | `currentPassword, newPassword`     | `204`              |

Passwords must be at least 10 characters. There are no composition rules, per
NIST SP 800-63B. Registration seeds 15 starter categories in the same transaction.

Login takes the same amount of time for an unknown email as for a wrong password,
so the endpoint cannot be used to discover who has an account.

## Accounts

| Method   | Path                     | Notes                                                |
| -------- | ------------------------ | ---------------------------------------------------- |
| `GET`    | `/accounts`              | `?includeArchived=true`; also returns `totalBalance` |
| `POST`   | `/accounts`              | `name, type, openingBalance?`                        |
| `GET`    | `/accounts/:id`          |                                                      |
| `PATCH`  | `/accounts/:id`          | any of `name, type, openingBalance`                  |
| `PUT`    | `/accounts/:id/archived` | `{ "archived": true }`                               |
| `DELETE` | `/accounts/:id`          | `409` if it has any transactions                     |

`type` is one of `cash`, `bank`, `card`, `wallet`, `savings`.

`balance` is derived on read as `openingBalance + inflows - outflows`, never stored,
so it cannot drift from the ledger. `openingBalance` may be negative — a credit
card usually starts life owing money.

## Categories

| Method   | Path                       | Notes                                            |
| -------- | -------------------------- | ------------------------------------------------ |
| `GET`    | `/categories`              | `?kind=income\|expense`, `?includeArchived=true` |
| `POST`   | `/categories`              | `name, kind, color?`                             |
| `PATCH`  | `/categories/:id`          | `name?, color?` — **`kind` is immutable**        |
| `PUT`    | `/categories/:id/archived` | `{ "archived": true }`                           |
| `DELETE` | `/categories/:id`          | `409` if anything is filed under it              |

`kind` cannot change after creation: flipping an expense category to income would
silently reinterpret every transaction already filed under it. Archive instead —
it disappears from every picker while reports stay intact.

## Transactions

| Method   | Path                | Notes                                                                  |
| -------- | ------------------- | ---------------------------------------------------------------------- |
| `GET`    | `/transactions`     | filters below                                                          |
| `POST`   | `/transactions`     | `accountId, direction, amount, occurredOn, categoryId?, payee?, note?` |
| `GET`    | `/transactions/:id` |                                                                        |
| `PATCH`  | `/transactions/:id` | `409` on a transfer leg                                                |
| `DELETE` | `/transactions/:id` | deletes both legs of a transfer                                        |

`direction` is `in` or `out`. `amount` is always positive — the direction carries
the sign. A category's `kind` must match the direction, so an expense cannot be
filed under "Salary".

### Filters on `GET /transactions`

| Parameter                 | Example      | Effect                                     |
| ------------------------- | ------------ | ------------------------------------------ |
| `search`                  | `keells`     | matches payee or note, `%` and `_` literal |
| `accountId`, `categoryId` | `3`          | exact match                                |
| `direction`               | `out`        | one side only                              |
| `from`, `to`              | `2026-06-01` | inclusive date range                       |
| `minAmount`, `maxAmount`  | `250.00`     | inclusive amount range                     |
| `uncategorized`           | `true`       | only rows with no category                 |
| `includeTransfers`        | `false`      | hide both legs of every transfer           |
| `limit`, `offset`         | `50`, `0`    | paging, max 200                            |

The response carries `total`, `hasMore` and a `totals` object (`inflow`,
`outflow`, `net`) computed over the **whole filtered set**, not just the page —
so a running total matches what the user is looking at.

### Transfers

| Method   | Path                            | Notes                                                   |
| -------- | ------------------------------- | ------------------------------------------------------- |
| `POST`   | `/transactions/transfers`       | `fromAccountId, toAccountId, amount, occurredOn, note?` |
| `GET`    | `/transactions/transfers/:uuid` | both legs                                               |
| `DELETE` | `/transactions/transfers/:uuid` | both legs                                               |

A transfer is two rows sharing a `transferId`: an `out` leg on the source and an
`in` leg on the destination, written in one database transaction. Neither carries
a category, and every report excludes them — moving your own money is not income
and not spending. Deleting either leg removes both, so an account can never end
up inventing money.

## Budgets

| Method   | Path                | Notes                                    |
| -------- | ------------------- | ---------------------------------------- |
| `GET`    | `/budgets`          | `?month=2026-06`, defaults to this month |
| `PUT`    | `/budgets`          | `categoryId, month, amount` — idempotent |
| `POST`   | `/budgets/rollover` | `month, fromMonth?`                      |
| `DELETE` | `/budgets/:id`      |                                          |

`PUT` upserts on `(category, month)`, so setting the same budget twice updates it
rather than creating a duplicate. Only expense categories can be budgeted.

`rollover` copies the previous month's caps forward. Existing budgets win, so it
is safe to run twice and will never overwrite a figure already adjusted by hand.

## Reports

| Path                       | Query                    | Returns                           |
| -------------------------- | ------------------------ | --------------------------------- |
| `/reports/overview`        | `month?`                 | dashboard payload in one request  |
| `/reports/by-category`     | `from?, to?, direction?` | split with each row's `share`     |
| `/reports/trend`           | `month?, months?`        | one row per month, zeros included |
| `/reports/daily`           | `from?, to?`             | daily totals plus `dailyAverage`  |
| `/reports/top-payees`      | `from?, to?, limit?`     | ranked by total                   |
| `/reports/budget-progress` | `month?`                 | per-budget pacing and projection  |
| `/reports/range`           | —                        | first and last day with activity  |

Ranges default to the current month. Every report excludes transfers.

`/reports/overview` returns `savingsRate: null` rather than `0` for a month with
no income — the ratio is undefined, not zero, and the distinction matters on a
dashboard. `/reports/trend` includes months with no activity as explicit zeros so
a chart shows a gap instead of silently compressing the axis.

`/reports/budget-progress` adds `projected` (where the spend lands if the rest of
the month matches so far) and `monthElapsedPercent`, because being at 60% of a cap
is fine on the 20th and a problem on the 5th.

## CSV

| Method | Path                       | Notes                                    |
| ------ | -------------------------- | ---------------------------------------- |
| `GET`  | `/transactions/csv/export` | accepts every `GET /transactions` filter |
| `POST` | `/transactions/csv/import` | `?createMissing=true`, `?dryRun=true`    |

Columns are `date, account, category, direction, amount, payee, note`. Export is
UTF-8 with a BOM, which is what stops Excel mangling non-ASCII payee names.

Import sends the file as the raw request body with `Content-Type: text/csv`.
Accounts and categories are matched by name, case-insensitively. **Nothing is
written unless every row parses** — a half-imported statement is worse than a
rejected one, because you cannot tell which half is missing. A rejection returns
`400` with `details.errors`, each carrying the offending line number.

Use `?dryRun=true` to validate a file and see what would be created without
writing anything.

## Rate limits

240 requests per minute per caller. `/auth/login` and `/auth/register` allow 10
attempts per 15 minutes, counted per address **and** email, so one attacker behind
a shared address cannot lock out everyone else on it.

Responses carry `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`;
a `429` also carries `Retry-After`.
