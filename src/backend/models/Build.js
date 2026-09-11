import { getDb } from '../../../config/database.js';

const BASE = `
  b.id, b.version, b.status, b.notes, b.byte_size AS byteSize,
  b.is_current AS isCurrent, b.released_at AS releasedAt,
  p.slug AS productSlug, p.name AS productName, p.mode AS productMode,
  u.username AS releasedBy
`;
const JOINS = `
  FROM builds b
  JOIN products p ON p.id = b.product_id
  LEFT JOIN users u ON u.id = b.released_by
`;

/** A build is downloadable only while it is undetected. */
export const isDownloadable = (build) => build?.status === 'undetected';

const Build = {
  find(id) {
    return getDb().prepare(`SELECT ${BASE} ${JOINS} WHERE b.id = ?`).get(id);
  },

  all() {
    return getDb().prepare(`SELECT ${BASE} ${JOINS} ORDER BY b.released_at DESC`).all();
  },

  /** The build the loader would pull right now. */
  current() {
    return getDb()
      .prepare(`SELECT ${BASE} ${JOINS} WHERE b.is_current = 1 LIMIT 1`)
      .get();
  },

  product() {
    return getDb()
      .prepare('SELECT id, slug, name, mode FROM products ORDER BY id LIMIT 1')
      .get();
  },

  publish({ productId, version, notes = '', status = 'undetected', byteSize = 0, releasedBy }) {
    const db = getDb();
    return db.transaction(() => {
      const info = db
        .prepare(`INSERT INTO builds (product_id, version, status, notes, byte_size, released_by)
                  VALUES (?,?,?,?,?,?)`)
        .run(productId, version, status, notes, byteSize, releasedBy);
      const id = Number(info.lastInsertRowid);
      if (status === 'undetected') Build.makeCurrent(id);
      return Build.find(id);
    })();
  },

  /** Exactly one build is current at a time. */
  makeCurrent(id) {
    const db = getDb();
    db.prepare('UPDATE builds SET is_current = 0').run();
    db.prepare('UPDATE builds SET is_current = 1 WHERE id = ?').run(id);
  },

  /**
   * Changing a status can move which build is current: pulling the current one
   * promotes the newest undetected build behind it, so the loader never points
   * at something that has been marked detected.
   */
  setStatus(id, status) {
    const db = getDb();
    return db.transaction(() => {
      const before = Build.find(id);
      db.prepare('UPDATE builds SET status = ? WHERE id = ?').run(status, id);

      if (status !== 'undetected' && before?.isCurrent) {
        db.prepare('UPDATE builds SET is_current = 0 WHERE id = ?').run(id);
        const next = db
          .prepare(`SELECT id FROM builds WHERE status = 'undetected' AND id != ?
                    ORDER BY released_at DESC LIMIT 1`)
          .get(id);
        if (next) Build.makeCurrent(next.id);
      }
      if (status === 'undetected' && !db.prepare('SELECT 1 FROM builds WHERE is_current = 1').get()) {
        Build.makeCurrent(id);
      }
      return Build.find(id);
    })();
  },

  /** 30-day uptime: the share of days with no detected build. */
  uptime() {
    const detected = getDb()
      .prepare(`SELECT COUNT(*) AS n FROM builds
                WHERE status = 'detected' AND released_at >= datetime('now','-30 days')`)
      .get().n;
    return Math.max(0, 100 - detected * 0.8).toFixed(1);
  },

  downloadsOf(buildId) {
    return getDb()
      .prepare('SELECT COUNT(*) AS n FROM downloads WHERE build_id = ?')
      .get(buildId).n;
  },
};

export default Build;
