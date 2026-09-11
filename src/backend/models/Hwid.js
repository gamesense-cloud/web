import { getDb } from '../../../config/database.js';

/** A reset is allowed once every thirty days. */
export const RESET_COOLDOWN_DAYS = 30;

const Hwid = {
  activeFor(userId) {
    return getDb()
      .prepare(`SELECT id, hwid, label, bound_at AS boundAt FROM hwids
                WHERE user_id = ? AND released_at IS NULL ORDER BY bound_at DESC LIMIT 1`)
      .get(userId) ?? null;
  },

  historyFor(userId) {
    return getDb()
      .prepare(`SELECT id, hwid, label, bound_at AS boundAt, released_at AS releasedAt
                FROM hwids WHERE user_id = ? ORDER BY bound_at DESC`)
      .all(userId);
  },

  bind({ userId, hwid, label = null }) {
    const db = getDb();
    return db.transaction(() => {
      db.prepare("UPDATE hwids SET released_at = datetime('now') WHERE user_id = ? AND released_at IS NULL")
        .run(userId);
      db.prepare('INSERT INTO hwids (user_id, hwid, label) VALUES (?,?,?)')
        .run(userId, hwid, label);
      return Hwid.activeFor(userId);
    })();
  },

  release(userId) {
    getDb()
      .prepare("UPDATE hwids SET released_at = datetime('now') WHERE user_id = ? AND released_at IS NULL")
      .run(userId);
  },

  // ------------------------------------------------------------ resets --
  resetsFor(userId) {
    return getDb()
      .prepare(`SELECT r.id, r.reason, r.status, r.note,
                       r.requested_at AS requestedAt, r.resolved_at AS resolvedAt,
                       u.username AS resolvedBy
                FROM hwid_resets r
                LEFT JOIN users u ON u.id = r.resolved_by
                WHERE r.user_id = ? ORDER BY r.requested_at DESC`)
      .all(userId);
  },

  /** camelCase like every other read here, so components never see two shapes. */
  pendingFor(userId) {
    return getDb()
      .prepare(`SELECT id, reason, status, requested_at AS requestedAt
                FROM hwid_resets WHERE user_id = ? AND status = 'pending'`)
      .get(userId) ?? null;
  },

  /**
   * When the next reset becomes available: thirty days after the last approved
   * one. Returns null when one is available now.
   */
  cooldownUntil(userId) {
    const last = getDb()
      .prepare(`SELECT resolved_at FROM hwid_resets
                WHERE user_id = ? AND status = 'approved'
                ORDER BY resolved_at DESC LIMIT 1`)
      .get(userId);
    if (!last?.resolved_at) return null;

    const until = new Date(String(last.resolved_at).replace(' ', 'T') + 'Z').getTime()
      + RESET_COOLDOWN_DAYS * 86_400_000;
    return until > Date.now() ? new Date(until).toISOString() : null;
  },

  request({ userId, reason }) {
    const info = getDb()
      .prepare('INSERT INTO hwid_resets (user_id, reason) VALUES (?,?)')
      .run(userId, reason ?? '');
    return getDb()
      .prepare('SELECT id, reason, status, requested_at AS requestedAt FROM hwid_resets WHERE id = ?')
      .get(Number(info.lastInsertRowid));
  },

  queue(status = 'pending') {
    return getDb()
      .prepare(`SELECT r.id, r.reason, r.status, r.requested_at AS requestedAt,
                       u.id AS userId, u.username,
                       (SELECT hwid FROM hwids h WHERE h.user_id = u.id AND h.released_at IS NULL LIMIT 1) AS hwid
                FROM hwid_resets r JOIN users u ON u.id = r.user_id
                WHERE r.status = ? ORDER BY r.requested_at ASC`)
      .all(status);
  },

  pendingCount() {
    return getDb()
      .prepare("SELECT COUNT(*) AS n FROM hwid_resets WHERE status = 'pending'")
      .get().n;
  },

  /** Approving releases the current binding so the next login rebinds. */
  resolve({ id, status, adminId, note = null }) {
    const db = getDb();
    return db.transaction(() => {
      const row = db.prepare('SELECT * FROM hwid_resets WHERE id = ?').get(id);
      if (!row || row.status !== 'pending') return null;

      db.prepare(`UPDATE hwid_resets
                  SET status = ?, resolved_at = datetime('now'), resolved_by = ?, note = ?
                  WHERE id = ?`)
        .run(status, adminId, note, id);

      if (status === 'approved') Hwid.release(row.user_id);
      return { ...row, status, userId: row.user_id };
    })();
  },
};

export default Hwid;
