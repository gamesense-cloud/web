import { asyncHandler } from '../middleware/error.js';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';

const isAdmin = (user) => user.role === 'admin';

export const list = asyncHandler(async (req, res) => {
  res.json({
    tickets: Ticket.list({
      userId: isAdmin(req.user) ? null : req.user.id,
      status: req.query.status || null,
    }),
    openCount: Ticket.openCount(),
  });
});

export const show = asyncHandler(async (req, res) => {
  const ticket = Ticket.find(Number(req.params.id), {
    userId: isAdmin(req.user) ? null : req.user.id,
  });
  if (!ticket) return res.status(404).json({ error: 'no such ticket' });
  res.json({ ticket });
});

export const create = asyncHandler(async (req, res) => {
  const subject = String(req.body?.subject ?? '').trim().slice(0, 140);
  const body = String(req.body?.body ?? '').trim().slice(0, 8000);
  const priority = ['low', 'normal', 'high'].includes(req.body?.priority)
    ? req.body.priority : 'normal';

  if (subject.length < 6) return res.status(422).json({ error: 'give it a subject' });
  if (body.length < 10) return res.status(422).json({ error: 'say a bit more than that' });

  const ticket = Ticket.create({ userId: req.user.id, subject, body, priority });

  Event.record({
    userId: req.user.id,
    actorId: req.user.id,
    kind: 'ticket',
    message: `ticket opened — ${subject}`,
  });

  res.status(201).json({ ticket });
});

export const reply = asyncHandler(async (req, res) => {
  const body = String(req.body?.body ?? '').trim().slice(0, 8000);
  if (body.length < 2) return res.status(422).json({ error: 'write something first' });

  const result = Ticket.reply({
    ticketId: Number(req.params.id),
    userId: req.user.id,
    body,
    byAdmin: isAdmin(req.user),
  });

  if (!result) return res.status(404).json({ error: 'no such ticket' });
  if (result.closed) return res.status(423).json({ error: 'that ticket is closed' });

  if (isAdmin(req.user)) {
    Event.record({
      userId: result.userId,
      actorId: req.user.id,
      kind: 'ticket',
      message: `staff replied to your ticket — ${result.subject}`,
    });
  }

  res.status(201).json({ ticket: result });
});

export const setStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  if (!['open', 'answered', 'closed'].includes(status)) {
    return res.status(422).json({ error: 'a ticket is open, answered or closed' });
  }

  const existing = Ticket.find(Number(req.params.id), {
    userId: isAdmin(req.user) ? null : req.user.id,
  });
  if (!existing) return res.status(404).json({ error: 'no such ticket' });

  // A member may close their own ticket; only an admin can reopen one.
  if (!isAdmin(req.user) && status !== 'closed') {
    return res.status(403).json({ error: 'only staff can reopen a ticket' });
  }

  res.json({ ticket: Ticket.setStatus(existing.id, status) });
});

export default { list, show, create, reply, setStatus };
