# Rs

A self-hosted personal finance tracker for rupee budgets. Track accounts, log every
transaction, set monthly category budgets, and see where the money actually went.

## Why

Most finance apps want a bank login and a subscription. Rs wants a folder on your
machine. It stores everything in a single SQLite file you own, runs on plain Node,
and has no cloud dependency.

## Stack

| Layer    | Choice                                                        |
| -------- | ------------------------------------------------------------- |
| Runtime  | Node.js 22.5+ (uses the built-in `node:sqlite` driver)         |
| API      | Express                                                       |
| Database | SQLite, one file, migrated on boot                             |
| Client   | React + Vite                                                   |
| Tests    | `node:test`                                                    |

There is no ORM and no native build step — `node:sqlite` ships with Node itself.

## Layout

```
server/   Express API, migrations, domain services
web/      React single-page client
```

## Getting started

```bash
npm install
cp server/.env.example server/.env
npm run dev
```

The API listens on `http://localhost:4000` and the client on `http://localhost:5173`.

## Scripts

| Command            | Does                                     |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Runs the API and the client together     |
| `npm run dev:server` | API only                               |
| `npm run dev:web`  | Client only                              |
| `npm run build`    | Builds the client into `web/dist`        |
| `npm test`         | Runs every workspace's test suite        |

## License

MIT
