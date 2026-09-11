import { getDb } from '../../../config/database.js';

const BASE = `
  s.id, s.plan, s.status, s.started_at AS startedAt, s.expires_at AS expiresAt,
  p.slug AS productSlug, p.name AS productName, p.mode AS productMode
`;

/** Days remaining, or null for a lifetime plan. */
export function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const end = new Date(String(expiresAt).replace(' ', 'T') + 'Z').getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

const Subscription = {
  forUser(userId) {
    const row = getDb()
      .prepare(`SELECT ${BASE} FROM subscriptions s
                JOIN products p ON p.id = s.product_id
                WHERE s.user_id = ? LIMIT 1`)
      .get(userId);
    if (!row) return null;

    // An expiry in the past is expired, whatever the column says — the status
    // column is only refreshed when something writes to the row.
    const left = daysLeft(row.expiresAt);
    const expired = left === 0 && row.expiresAt !== null;
    return { ...row, daysLeft: left, status: expired ? 'expired' : row.status };
  },

  grant({ userId, productId, plan, expiresAt }) {
    const db = getDb();
    db.prepare(`
      INSERT INTO subscriptions (user_id, product_id, plan, status, expires_at)
      VALUES (?,?,?, 'active', ?)
      ON CONFLICT(user_id, product_id) DO UPDATE SET
        plan = excluded.plan,
        status = 'active',
        expires_at = excluded.expires_at
    `).run(userId, productId, plan, expiresAt);
    return Subscription.forUser(userId);
  },

  /** How many accounts are on an active, unexpired plan. */
  activeCount() {
    return getDb()
      .prepare(`SELECT COUNT(*) AS n FROM subscriptions
                WHERE status = 'active'
                  AND (expires_at IS NULL OR expires_at > datetime('now'))`)
      .get().n;
  },

  expiringSoon(withinDays = 7) {
    return getDb()
      .prepare(`SELECT u.username, s.plan, s.expires_at AS expiresAt
                FROM subscriptions s JOIN users u ON u.id = s.user_id
                WHERE s.status = 'active' AND s.expires_at IS NOT NULL
                  AND s.expires_at BETWEEN datetime('now') AND datetime('now', ?)
                ORDER BY s.expires_at ASC`)
      .all(`+${withinDays} days`)
      .map((r) => ({ ...r, daysLeft: daysLeft(r.expiresAt) }));
  },

  byPlan() {
    return getDb()
      .prepare(`SELECT plan, COUNT(*) AS n FROM subscriptions
                WHERE status = 'active' GROUP BY plan ORDER BY n DESC`)
      .all();
  },
};

export default Subscription;
