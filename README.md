# gamesense.cloud

The dashboard behind a counter-strike 2 cheat subscription. Express + SQLite on
the back, React + Vite on the front, drawn in the house style of the loader it
belongs to — 1px group boxes with the label knocked into the top border, one
accent hue, a 2px rainbow hairline along the top edge, Tahoma at 12px,
lowercase throughout.

Two dashboards, one codebase. Which one you get depends on the role of the
account you sign in as:

| | |
|---|---|
| **member** | your subscription and what is left of it, the current build and its status, the machine your hwid is bound to, your download and session history, your support tickets, your activity log |
| **admin** | the service: accounts, active subscriptions, the hwid reset queue, the support queue, publishing builds and marking them detected, a 14-day activity chart, the whole activity log |

It is real — accounts, sessions, permissions, subscriptions, tickets — but
nothing talks to a cheat and there is no cheat to talk to. Downloads record the
event and say so rather than serving a binary.

## Running it

```bash
npm install
npm run db:reset     # migrate, then seed
npm run dev          # api on :4000, web on :5173
```

Open <http://localhost:5173>. There are **two accounts and nobody else**:

| username | password | what you see |
|---|---|---|
| `admin` | `demo-password` | the admin dashboard |
| `member` | `demo-password` | the member dashboard |

The sign-in page has a button for each, so you can flip between them without
typing. Change either account in `database/seeds/users.js` and re-run
`npm run db:reset`.

For a single-process production run:

```bash
npm run build
NODE_ENV=production JWT_SECRET=$(node -e "console.log(crypto.randomUUID())") npm start
```

The API serves `dist/` and falls through to `index.html`, so the whole thing
runs on `:4000` with no second process.

If the API will not start, it is almost always a stale process still holding
port 4000 — it says so, with the command to clear it.

## Scripts

| | |
|---|---|
| `npm run dev` | api and web together, both watching |
| `npm run dev:api` / `dev:web` | one of them on its own |
| `npm run build` | production frontend into `dist/` |
| `npm start` | serve the api, plus `dist/` if it exists |
| `npm run db:migrate` | apply pending migrations (`-- --fresh` drops first) |
| `npm run db:seed` | wipe content and re-seed; leaves the schema alone |
| `npm run db:reset` | fresh migrate, then seed |
| `npm test` | vitest, 53 tests against a throwaway database |

## Layout

```
config/           database handle, env, and the permission matrix
database/         schema.sql, migrations/, seeds/, and the two runners
src/backend/      server, routes, controllers, models, middleware, services
src/frontend/     app, pages, components, styles
public/           favicon, robots, assets, uploads
tests/            auth, dashboard
```

**Backend** is a plain layered Express app. Routes wire URLs to controllers,
controllers hold the request logic and the permission decisions, models are the
only thing that speak SQL, services carry what is not about one request.

**Frontend** is a React SPA. `api.js` is the only thing that calls `fetch`;
`auth.jsx` holds the session; everything else is a page or a component.

## Permissions

`config/permissions.js` is the authority. Two roles do anything — `member` and
`admin` — and `banned` exists so an account can be shut off without deleting the
rows that point at it. Nothing is inherited by rank: every capability lists the
roles that hold it explicitly, because "an admin can do everything a member can,
plus…" is how permission bugs get written.

The whole admin surface sits behind one gate in `routes/admin.js`, so there is
no path under `/api/admin` a member can reach. Everything else is scoped by
construction: a member's tickets, activity and hwid are read with their own id
in the query, never filtered afterwards.

`tests/dashboard/admin.test.js` walks every admin route with a member token and
asserts each one refuses.

## The database

SQLite via `better-sqlite3`, one file at `database/dashboard.db`, WAL mode.
`database/schema.sql` is the canonical shape and `migrations/001_init.sql`
matches it. Notable bits:

- **builds.is_current** — exactly one build is current, and `Build.setStatus`
  keeps it that way. Marking the current build detected promotes the newest
  undetected one behind it, so the service never points at a pulled build.
- **events.scope** — `user` rows belong to one account, `service` rows are about
  the service. That column is the privacy boundary between the two activity
  feeds.
- **hwids** keeps released bindings rather than deleting them, so the history
  stays readable after a reset.

## Auth

Bearer JWTs, bcrypt hashes, and a `sessions` table so a password change can
revoke everything else. A login against a username that does not exist still
runs a bcrypt compare against a dummy hash, so a wrong username and a wrong
password take the same time and return the same message.

`JWT_SECRET` has a development fallback and is mandatory when
`NODE_ENV=production` — the server refuses to start without it.

## The design

Everything comes out of the loader's `col` namespace, and the tokens are in
`src/frontend/styles/theme.css`:

| | |
|---|---|
| `--shell` `#0d0d0d` | page ground, and the ground a group-box label sits on |
| `--panel` `#131313` | every framed panel |
| `--accent` `#8e6ff7` | the only decorative hue on the site |
| `--ok` `--warn` `--bad` | semantic — build status, plan status, roles |

Three rules worth keeping:

- **The group box** is a 1px frame with the label absolutely positioned over the
  top border, its background set to `--shell`. The label ground has to match
  whatever is behind the frame — change the page background and the label stops
  being knocked out. `components/Panel.jsx` is the only place it is built.
- **Status is never colour alone.** `<Status>` always draws the dot *and* the
  word, so "detected" reads as detected in greyscale and to a colourblind
  reader.
- **Type is Tahoma at 12px** and there is no webfont. The near-misses on the
  font hosts all read as nearly-Tahoma, which is worse than falling back — see
  `public/assets/fonts/README.md`.

### The one chart

`components/ActivityChart.jsx` — 14 days of events on the admin overview. One
series, so no legend: the panel label names it. Axes are recessive, the ceiling
is rounded so the top tick names a value the line actually reaches, the endpoint
is emphasised because "where it is now" is what is being read, and there is a
crosshair and tooltip on hover. The same numbers are in a `figures` table under
it, for anyone who cannot read the shape. The backend fills quiet days with
zeroes so the series has a point per day rather than only the days something
happened.

## Tests

```bash
npm test
```

53 tests over three suites. Each gets its own database in the temp directory,
migrated and seeded, so they do not depend on order and never touch
`database/dashboard.db`.

- `tests/auth` — the two-account install, registration validation, the
  timing-equal login failure, bans, password changes revoking sessions
- `tests/dashboard/member.test.js` — the overview payload, downloads gated on
  build status and subscription, the hwid reset flow end to end including the
  thirty-day cooldown, ticket privacy between accounts, activity scoping
- `tests/dashboard/admin.test.js` — every admin route refused to a member,
  publishing and pulling builds, the current-build promotion rule, granting
  plans, the guards against an admin demoting or banning themselves

## Things worth knowing before changing something

**Pulling the current build has a consequence.** `Build.setStatus` promotes the
next undetected build when the current one is marked detected. If you write a
new path that changes a status, go through that method rather than `UPDATE`,
or the loader ends up pointing at a pulled build.

**`events.scope` is load-bearing.** A row written with the default scope is
private to its `user_id`. Writing a service-wide event means passing
`scope: 'service'` explicitly — getting it wrong leaks one account's activity
into everyone's feed.

**Models return camelCase, always.** SQL columns are snake_case and every
`SELECT` aliases them. A model that returns a raw row is a bug waiting to
happen in a component.

**The seed is deliberately two accounts.** If you add more, add them to
`database/seeds/users.js` rather than to the runner — the runner reads that
file and builds everything else around whatever accounts it finds.
