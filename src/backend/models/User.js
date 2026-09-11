import { getDb } from '../../../config/database.js';

// Columns safe to send to any client. password_hash never appears here; email
// only goes to the account that owns it, or to an admin.
const PUBLIC = `
  id, username, role, display_name AS displayName, region,
  last_seen_at AS lastSeenAt, banned_at AS bannedAt, created_at AS createdAt
`;

const User = {
  publicColumns: PUBLIC,

  find(id) {
    return getDb().prepare(`SELECT ${PUBLIC} FROM users WHERE id = ?`).get(id);
  },

  findByUsername(username) {
    return getDb().prepare(`SELECT ${PUBLIC} FROM users WHERE username = ?`).get(username);
  },

  /** Includes the password hash — only for the auth service. */
  findForAuth(identifier) {
    return getDb()
      .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(identifier, identifier);
  },

  /** With the email — for the account's own settings page and for admins. */
  findWithEmail(id) {
    return getDb().prepare(`SELECT ${PUBLIC}, email FROM users WHERE id = ?`).get(id);
  },

  create({ username, email, passwordHash, role = 'member' }) {
    const info = getDb()
      .prepare(`INSERT INTO users (username, email, password_hash, role, display_name)
                VALUES (?,?,?,?,?)`)
      .run(username, email, passwordHash, role, username);
    return User.find(Number(info.lastInsertRowid));
  },

  /** Admin member list, with each account's subscription and active hwid. */
  list({ query = '', role = '', limit = 50, offset = 0 } = {}) {
    const where = ['username LIKE @like'];
    if (role) where.push('role = @role');

    return getDb()
      .prepare(`
        SELECT u.id, u.username, u.role, u.email, u.region,
               u.last_seen_at AS lastSeenAt, u.banned_at AS bannedAt,
               u.created_at AS createdAt,
               s.plan, s.status AS subscriptionStatus, s.expires_at AS expiresAt,
               (SELECT hwid FROM hwids h
                 WHERE h.user_id = u.id AND h.released_at IS NULL LIMIT 1) AS hwid
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        WHERE ${where.join(' AND ')}
        ORDER BY u.role = 'admin' DESC, u.created_at ASC
        LIMIT @limit OFFSET @offset`)
      .all({ like: `%${query}%`, role, limit, offset });
  },

  count(query = '') {
    return getDb()
      .prepare('SELECT COUNT(*) AS n FROM users WHERE username LIKE ?')
      .get(`%${query}%`).n;
  },

  online(minutes = 15) {
    return getDb()
      .prepare(`SELECT ${PUBLIC} FROM users
                WHERE last_seen_at >= datetime('now', ?) ORDER BY last_seen_at DESC`)
      .all(`-${minutes} minutes`);
  },

  update(id, fields) {
    const allowed = ['display_name', 'region', 'role'];
    const map = { displayName: 'display_name', region: 'region', role: 'role' };
    const entries = Object.entries(fields)
      .map(([k, v]) => [map[k] ?? k, v])
      .filter(([k, v]) => allowed.includes(k) && v !== undefined);
    if (!entries.length) return User.find(id);

    const set = entries.map(([k], i) => `${k} = @v${i}`).join(', ');
    const params = Object.fromEntries(entries.map(([, v], i) => [`v${i}`, v]));
    getDb().prepare(`UPDATE users SET ${set} WHERE id = @id`).run({ ...params, id });
    return User.find(id);
  },

  touchLastSeen(id) {
    getDb().prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").run(id);
  },

  ban(id, reason) {
    getDb()
      .prepare("UPDATE users SET role='banned', banned_at=datetime('now'), banned_reason=? WHERE id=?")
      .run(reason ?? null, id);
    return User.find(id);
  },

  unban(id) {
    getDb()
      .prepare("UPDATE users SET role='member', banned_at=NULL, banned_reason=NULL WHERE id=?")
      .run(id);
    return User.find(id);
  },

  sessions(id, limit = 8) {
    return getDb()
      .prepare(`SELECT id, user_agent AS userAgent, ip, created_at AS at, expires_at AS expiresAt
                FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(id, limit);
  },
};

export default User;
