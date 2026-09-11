-- 001_init — the whole dashboard schema.
-- Kept identical to database/schema.sql; later migrations diverge from it.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- roles --
-- Two that matter: member and admin. banned exists so an account can be shut
-- off without deleting the rows that point at it.
CREATE TABLE IF NOT EXISTS roles (
  name  TEXT PRIMARY KEY,
  rank  INTEGER NOT NULL,
  label TEXT    NOT NULL,
  color TEXT    NOT NULL DEFAULT 'text'
);

-- ---------------------------------------------------------------- users --
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'member' REFERENCES roles(name),
  display_name  TEXT,
  region        TEXT    NOT NULL DEFAULT 'eu-central',
  last_seen_at  TEXT,
  banned_at     TEXT,
  banned_reason TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC);

-- ------------------------------------------------------------- products --
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  mode       TEXT NOT NULL DEFAULT 'internal · d3d11',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------------- builds --
-- status drives the dot colour, the status line, and whether the download
-- button is live — exactly as it does in the loader.
CREATE TABLE IF NOT EXISTS builds (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version     TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'undetected'
                CHECK (status IN ('undetected','updating','detected')),
  notes       TEXT    NOT NULL DEFAULT '',
  is_current  INTEGER NOT NULL DEFAULT 0,
  byte_size   INTEGER NOT NULL DEFAULT 0,
  released_at TEXT    NOT NULL DEFAULT (datetime('now')),
  released_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_builds_product ON builds(product_id, released_at DESC);

-- -------------------------------------------------------- subscriptions --
CREATE TABLE IF NOT EXISTS subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan       TEXT    NOT NULL DEFAULT 'month'
               CHECK (plan IN ('trial','week','month','lifetime')),
  status     TEXT    NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','expired','paused')),
  started_at TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);

-- ----------------------------------------------------------------- hwid --
-- One active binding per machine per account. Old bindings are kept with
-- released_at set, so the history stays readable after a reset.
CREATE TABLE IF NOT EXISTS hwids (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hwid        TEXT    NOT NULL,
  label       TEXT,
  bound_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  released_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_hwids_user ON hwids(user_id, released_at);

CREATE TABLE IF NOT EXISTS hwid_resets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       TEXT    NOT NULL DEFAULT '',
  status       TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','denied')),
  requested_at TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at  TEXT,
  resolved_by  INTEGER REFERENCES users(id),
  note         TEXT
);
CREATE INDEX IF NOT EXISTS idx_resets_status ON hwid_resets(status, requested_at DESC);

-- ------------------------------------------------------------ downloads --
CREATE TABLE IF NOT EXISTS downloads (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  build_id INTEGER NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  ip       TEXT,
  at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id, at DESC);

-- --------------------------------------------------------------- events --
-- The activity log. Member panels read their own rows; the admin feed reads
-- all of them. `scope` is what separates a private event from a service-wide
-- one, so a member never sees another account's activity.
CREATE TABLE IF NOT EXISTS events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind    TEXT NOT NULL,
  message TEXT NOT NULL,
  scope   TEXT NOT NULL DEFAULT 'user' CHECK (scope IN ('user','service')),
  at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_user  ON events(user_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_events_scope ON events(scope, at DESC);

-- -------------------------------------------------------------- tickets --
CREATE TABLE IF NOT EXISTS tickets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','answered','closed')),
  priority   TEXT    NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('low','normal','high')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tickets_user   ON tickets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  body       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages ON ticket_messages(ticket_id, created_at);

-- -------------------------------------------------------- announcements --
CREATE TABLE IF NOT EXISTS announcements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  level      TEXT    NOT NULL DEFAULT 'info' CHECK (level IN ('info','warn','bad')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------- sessions --
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, created_at DESC);

-- ------------------------------------------------------- schema version --
CREATE TABLE IF NOT EXISTS migrations (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
