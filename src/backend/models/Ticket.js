import { getDb } from '../../../config/database.js';

const BASE = `
  t.id, t.subject, t.status, t.priority,
  t.created_at AS createdAt, t.updated_at AS updatedAt,
  u.id AS userId, u.username,
  (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS messageCount,
  (SELECT body FROM ticket_messages m WHERE m.ticket_id = t.id
    ORDER BY m.created_at DESC LIMIT 1) AS lastBody
`;

const Ticket = {
  /**
   * Reads are always scoped: a member passes their own id and can only ever
   * get their own rows back. An admin passes null and sees everything.
   */
  list({ userId = null, status = null, limit = 50 } = {}) {
    const where = [];
    if (userId) where.push('t.user_id = @userId');
    if (status) where.push('t.status = @status');

    return getDb()
      .prepare(`SELECT ${BASE} FROM tickets t JOIN users u ON u.id = t.user_id
                ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                ORDER BY t.status = 'open' DESC, t.updated_at DESC LIMIT @limit`)
      .all({ userId, status, limit });
  },

  find(id, { userId = null } = {}) {
    const db = getDb();
    const ticket = db
      .prepare(`SELECT ${BASE} FROM tickets t JOIN users u ON u.id = t.user_id WHERE t.id = ?`)
      .get(id);
    if (!ticket) return null;
    if (userId && ticket.userId !== userId) return null;

    ticket.messages = db
      .prepare(`SELECT m.id, m.body, m.created_at AS createdAt,
                       u.username AS author, u.role AS authorRole
                FROM ticket_messages m JOIN users u ON u.id = m.user_id
                WHERE m.ticket_id = ? ORDER BY m.created_at ASC`)
      .all(id);
    return ticket;
  },

  create({ userId, subject, body, priority = 'normal' }) {
    const db = getDb();
    return db.transaction(() => {
      const info = db
        .prepare('INSERT INTO tickets (user_id, subject, priority) VALUES (?,?,?)')
        .run(userId, subject, priority);
      const id = Number(info.lastInsertRowid);
      db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, body) VALUES (?,?,?)')
        .run(id, userId, body);
      return Ticket.find(id);
    })();
  },

  /**
   * A member replying reopens the ticket; an admin replying marks it answered.
   * Either way the ticket moves back to the top of the queue.
   */
  reply({ ticketId, userId, body, byAdmin }) {
    const db = getDb();
    return db.transaction(() => {
      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      if (!ticket) return null;
      if (!byAdmin && ticket.user_id !== userId) return null;
      if (ticket.status === 'closed') return { closed: true };

      db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, body) VALUES (?,?,?)')
        .run(ticketId, userId, body);
      db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?")
        .run(byAdmin ? 'answered' : 'open', ticketId);

      return Ticket.find(ticketId);
    })();
  },

  setStatus(id, status) {
    getDb()
      .prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, id);
    return Ticket.find(id);
  },

  openCount() {
    return getDb()
      .prepare("SELECT COUNT(*) AS n FROM tickets WHERE status = 'open'").get().n;
  },
};

export default Ticket;
