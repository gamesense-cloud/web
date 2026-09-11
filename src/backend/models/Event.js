import { getDb } from '../../../config/database.js';

/**
 * The activity log behind both dashboards.
 *
 * `scope` is the privacy boundary: 'user' rows belong to one account and are
 * only ever read back with that account's id in the query; 'service' rows are
 * about the service itself and everyone sees them.
 */
const BASE = `
  e.id, e.kind, e.message, e.scope, e.at,
  a.username AS actor
`;

const Event = {
  record({ userId = null, actorId = null, kind, message, scope = 'user' }) {
    const info = getDb()
      .prepare('INSERT INTO events (user_id, actor_id, kind, message, scope) VALUES (?,?,?,?,?)')
      .run(userId, actorId, kind, message, scope);
    return Number(info.lastInsertRowid);
  },

  /** A member's own feed: their rows, plus anything service-wide. */
  forUser(userId, limit = 20) {
    return getDb()
      .prepare(`SELECT ${BASE} FROM events e
                LEFT JOIN users a ON a.id = e.actor_id
                WHERE e.user_id = ? OR e.scope = 'service'
                ORDER BY e.at DESC LIMIT ?`)
      .all(userId, limit);
  },

  /** The admin feed: everything, with the account each row belongs to. */
  all(limit = 40) {
    return getDb()
      .prepare(`SELECT ${BASE}, u.username AS subject FROM events e
                LEFT JOIN users a ON a.id = e.actor_id
                LEFT JOIN users u ON u.id = e.user_id
                ORDER BY e.at DESC LIMIT ?`)
      .all(limit);
  },

  serviceOnly(limit = 10) {
    return getDb()
      .prepare(`SELECT ${BASE} FROM events e
                LEFT JOIN users a ON a.id = e.actor_id
                WHERE e.scope = 'service' ORDER BY e.at DESC LIMIT ?`)
      .all(limit);
  },

  /** Per-day counts for the activity sparkline. */
  dailyCounts(days = 14) {
    const rows = getDb()
      .prepare(`SELECT date(at) AS day, COUNT(*) AS n FROM events
                WHERE at >= date('now', ?) GROUP BY day ORDER BY day`)
      .all(`-${days} days`);

    // Fill the gaps, so the chart has a point per day rather than only the
    // days something happened.
    const byDay = new Map(rows.map((r) => [r.day, r.n]));
    const out = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      out.push({ day: d, n: byDay.get(d) ?? 0 });
    }
    return out;
  },
};

export default Event;
