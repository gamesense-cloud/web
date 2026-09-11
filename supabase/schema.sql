-- gamesense.cloud — dashboard schema for Supabase (Postgres).
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- It is idempotent, so running it again is harmless.
--
-- Every table lives behind the service-role key: the dashboard talks to
-- Supabase only from Next.js route handlers, never from the browser, so RLS is
-- enabled with no public policies. Nothing is reachable with the anon key.

-- ---------------------------------------------------------------- roles --
create table if not exists roles (
  name  text primary key,
  rank  integer not null,
  label text not null,
  color text not null default 'text'
);

insert into roles (name, rank, label, color) values
  ('banned', 0,   'banned', 'bad'),
  ('member', 20,  'member', 'text'),
  ('admin',  100, 'admin',  'accent')
on conflict (name) do nothing;

-- ---------------------------------------------------------------- users --
create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  username       text not null unique,
  email          text not null unique,
  password_hash  text not null,
  role           text not null default 'member' references roles(name),
  display_name   text,
  region         text not null default 'eu-central',
  last_seen_at   timestamptz,
  banned_at      timestamptz,
  banned_reason  text,
  created_at     timestamptz not null default now()
);

-- usernames and emails are matched case-insensitively
create unique index if not exists users_username_lower on users (lower(username));
create unique index if not exists users_email_lower    on users (lower(email));
create index if not exists users_role_idx      on users (role);
create index if not exists users_last_seen_idx on users (last_seen_at desc);

-- ------------------------------------------------------------- products --
create table if not exists products (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  mode       text not null default 'internal · d3d11',
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- builds --
create table if not exists builds (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  version     text not null,
  status      text not null default 'undetected'
                check (status in ('undetected','updating','detected')),
  notes       text not null default '',
  is_current  boolean not null default false,
  byte_size   bigint not null default 0,
  released_at timestamptz not null default now(),
  released_by uuid references users(id),
  unique (product_id, version)
);

create index if not exists builds_product_idx on builds (product_id, released_at desc);
-- at most one current build, enforced by the database rather than by hand
create unique index if not exists builds_one_current on builds (is_current) where is_current;

-- -------------------------------------------------------- subscriptions --
create table if not exists subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id)    on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  plan       text not null default 'month'
               check (plan in ('trial','week','month','lifetime')),
  status     text not null default 'active'
               check (status in ('active','expired','paused')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, product_id)
);

create index if not exists subscriptions_user_idx on subscriptions (user_id);

-- ----------------------------------------------------------------- hwid --
create table if not exists hwids (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  hwid        text not null,
  label       text,
  bound_at    timestamptz not null default now(),
  released_at timestamptz
);

create index if not exists hwids_user_idx on hwids (user_id, released_at);
-- one live binding per account
create unique index if not exists hwids_one_active on hwids (user_id) where released_at is null;

create table if not exists hwid_resets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  reason       text not null default '',
  status       text not null default 'pending'
                 check (status in ('pending','approved','denied')),
  requested_at timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references users(id),
  note         text
);

create index if not exists hwid_resets_status_idx on hwid_resets (status, requested_at desc);
-- one request in flight per account
create unique index if not exists hwid_resets_one_pending
  on hwid_resets (user_id) where status = 'pending';

-- ------------------------------------------------------------ downloads --
create table if not exists downloads (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references users(id)  on delete cascade,
  build_id uuid not null references builds(id) on delete cascade,
  ip       text,
  at       timestamptz not null default now()
);

create index if not exists downloads_user_idx  on downloads (user_id, at desc);
create index if not exists downloads_at_idx    on downloads (at desc);

-- --------------------------------------------------------------- events --
-- The activity log. `scope` is the privacy boundary: 'user' rows belong to one
-- account, 'service' rows are about the service and everyone sees them.
create table if not exists events (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references users(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  kind     text not null,
  message  text not null,
  scope    text not null default 'user' check (scope in ('user','service')),
  at       timestamptz not null default now()
);

create index if not exists events_user_idx  on events (user_id, at desc);
create index if not exists events_scope_idx on events (scope, at desc);

-- -------------------------------------------------------------- tickets --
create table if not exists tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  subject    text not null,
  status     text not null default 'open' check (status in ('open','answered','closed')),
  priority   text not null default 'normal' check (priority in ('low','normal','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_user_idx   on tickets (user_id, updated_at desc);
create index if not exists tickets_status_idx on tickets (status, updated_at desc);

create table if not exists ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references tickets(id) on delete cascade,
  user_id    uuid not null references users(id)   on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_messages_idx on ticket_messages (ticket_id, created_at);

-- -------------------------------------------------------- announcements --
create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  level      text not null default 'info' check (level in ('info','warn','bad')),
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------- loader sessions --
-- Already used by /api/ping and /api/stats. Created here so a fresh project
-- has it too; the user_id column is new and is null for anonymous pings.
create table if not exists sessions (
  session_id text primary key,
  user_id    uuid references users(id) on delete set null,
  last_ping  timestamptz not null default now()
);

alter table sessions add column if not exists user_id uuid references users(id) on delete set null;
create index if not exists sessions_last_ping_idx on sessions (last_ping desc);

-- ------------------------------------------------------------------ rls --
-- Everything is service-role only. The dashboard never queries Supabase from
-- the browser, so there are deliberately no policies: with RLS on and no
-- policy, the anon key can read nothing.
alter table roles           enable row level security;
alter table users           enable row level security;
alter table products        enable row level security;
alter table builds          enable row level security;
alter table subscriptions   enable row level security;
alter table hwids           enable row level security;
alter table hwid_resets     enable row level security;
alter table downloads       enable row level security;
alter table events          enable row level security;
alter table tickets         enable row level security;
alter table ticket_messages enable row level security;
alter table announcements   enable row level security;
alter table sessions        enable row level security;

-- --------------------------------------------------------------- counts --
-- Daily event counts for the admin chart, so the whole 14-day series is one
-- round trip rather than fourteen.
create or replace function events_per_day(days integer default 14)
returns table (day date, n bigint)
language sql
stable
as $$
  select d::date as day,
         (select count(*) from events e where e.at >= d and e.at < d + interval '1 day') as n
  from generate_series(
         (current_date - (days - 1)),
         current_date,
         interval '1 day'
       ) as d
$$;
