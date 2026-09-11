# gamesense.cloud — web

The site and the account dashboard, in one Next.js app on Vercel.

- **`/`, `/changelog`, `/contact`, `/policy`** — the public site, statically
  rendered, pulling the latest release from the `launcher` repo.
- **`/dashboard`** — the account area, server-rendered per request. Which
  dashboard you get depends on the role of the account you sign in as.

| | |
|---|---|
| **member** | subscription and days left, the current build and its status, the machine the hwid is bound to, downloads, support tickets, activity log |
| **admin** | accounts, active subscriptions, the hwid reset queue, the support queue, publishing builds and marking them detected, a 14-day activity chart, the whole activity log |

## Setting it up

```bash
npm install
cp .env.local.example .env.local     # then fill it in
```

`.env.local` needs your Supabase project and a session secret:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GITHUB_TOKEN=github_pat_...
AUTH_SECRET=<a long random string>
```

`AUTH_SECRET` signs the session cookie. Generate one with:

```bash
node -e "console.log(crypto.randomUUID() + crypto.randomUUID())"
```

Then create the tables and seed them:

1. Supabase project → **SQL editor** → paste **`supabase/schema.sql`** → run
2. `npm run db:seed`

That leaves two accounts and nothing else:

| username | password | what you see |
|---|---|---|
| `admin` | `demo-password` | the admin dashboard |
| `member` | `demo-password` | the member dashboard |

```bash
npm run dev      # http://localhost:3000
```

## Deploying

Vercel builds it with no extra configuration. Set the same five environment
variables in **Project → Settings → Environment Variables**, then redeploy.

The build itself does not need them — every dashboard route is
`force-dynamic`, and the Supabase clients are built on first use rather than at
import — so a missing variable shows up as a runtime error on `/dashboard`
rather than a failed build that takes the marketing site down with it.

## Layout

```
src/app/
  page.tsx               the landing page
  api/                   download, ping, stats — what the loader calls
  dashboard/             the account area, one folder per screen
  actions.ts             every mutation, as server actions
src/components/          DashNav, ActivityChart, forms, ui primitives
src/lib/
  supabase.ts            lazy service-role and anon clients
  auth.ts                cookie session, bcrypt, registration and login
  dashboard.ts           every query — the only place that speaks to Supabase
  permissions.ts         roles and the capability matrix
supabase/
  schema.sql             the tables, run once in the SQL editor
  seed.mjs               two accounts and the service's own data
```

There is no `/api/dashboard/*`. The dashboard is server components reading
`lib/dashboard.ts` directly, and mutations are server actions in
`app/actions.ts` — a form posts straight to the server and the page re-renders.
The only route handlers left are the three the loader itself calls.

## Permissions

`src/lib/permissions.ts` is the authority. Two roles do anything — `member` and
`admin` — and `banned` exists so an account can be shut off without deleting
the rows that point at it. Nothing is inherited by rank: every capability lists
the roles that hold it explicitly, because "an admin can do everything a member
can, plus…" is how permission bugs get written.

Every account-scoped read carries the account id in the query rather than
filtering afterwards, and admin-only pages redirect a member away before
rendering anything.

## Security notes

- **Every table has RLS on with no policies.** Nothing is reachable with the
  anon key; the dashboard only ever reads through the service-role client from
  the server. Never import `supabaseAdmin` into a client component.
- **The session is an httpOnly cookie**, not a bearer token in localStorage —
  server components can read it and page script cannot.
- **A login against a username that does not exist still runs a bcrypt
  compare** against a dummy hash, so a wrong username and a wrong password take
  the same time and return the same message.
- `AUTH_SECRET` has a development fallback and is mandatory in production.

## Things worth knowing before changing something

**Pulling the current build has a consequence.** `setBuildStatus` promotes the
next undetected build when the current one is marked detected, so the service
never points at a pulled build. A unique partial index (`builds_one_current`)
enforces that only one build is current, so any new code path must clear the
old one before setting the new.

**`events.scope` is load-bearing.** A row written with the default scope is
private to its `user_id`. Writing a service-wide event means passing
`scope: "service"` explicitly — getting it wrong leaks one account's activity
into everyone's feed.

**The database returns snake_case, the app uses camelCase.** `lib/dashboard.ts`
maps at the boundary. A function that returns a raw Supabase row is a bug
waiting to happen in a component.
