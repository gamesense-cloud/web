import { getDb } from '../../../config/database.js';
import { asyncHandler } from '../middleware/error.js';
import User from '../models/User.js';
import Build from '../models/Build.js';
import Subscription from '../models/Subscription.js';
import Hwid from '../models/Hwid.js';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';

const announcements = (limit = 3) =>
  getDb()
    .prepare(`SELECT a.id, a.title, a.body, a.level, a.created_at AS at, u.username AS author
              FROM announcements a LEFT JOIN users u ON u.id = a.created_by
              ORDER BY a.created_at DESC LIMIT ?`)
    .all(limit);

/**
 * The member overview — one call, because every panel on that screen is above
 * the fold and a waterfall of six requests would show six loading states.
 */
export const overview = asyncHandler(async (req, res) => {
  const me = req.user;

  res.json({
    subscription: Subscription.forUser(me.id),
    product: Build.product(),
    currentBuild: Build.current(),
    uptime: Build.uptime(),
    hwid: {
      active: Hwid.activeFor(me.id),
      pendingReset: Hwid.pendingFor(me.id),
      cooldownUntil: Hwid.cooldownUntil(me.id),
    },
    activity: Event.forUser(me.id, 8),
    announcements: announcements(3),
    tickets: {
      open: Ticket.list({ userId: me.id, status: 'open' }).length,
      recent: Ticket.list({ userId: me.id, limit: 3 }),
    },
    sessions: User.sessions(me.id, 4),
  });
});

/**
 * The admin overview. Same shape of screen, different subject: the service
 * rather than one account.
 */
export const adminOverview = asyncHandler(async (_req, res) => {
  const db = getDb();

  const memberCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role != 'banned'").get().n;
  const downloads7d = db
    .prepare("SELECT COUNT(*) AS n FROM downloads WHERE at >= datetime('now','-7 days')").get().n;

  res.json({
    stats: {
      accounts: memberCount,
      activeSubscriptions: Subscription.activeCount(),
      onlineNow: User.online().length,
      openTickets: Ticket.openCount(),
      pendingResets: Hwid.pendingCount(),
      downloads7d,
      uptime: Build.uptime(),
    },
    currentBuild: Build.current(),
    builds: Build.all().slice(0, 5),
    resetQueue: Hwid.queue('pending'),
    tickets: Ticket.list({ status: 'open', limit: 5 }),
    expiring: Subscription.expiringSoon(14),
    byPlan: Subscription.byPlan(),
    activity: Event.all(12),
    daily: Event.dailyCounts(14),
  });
});

export const activity = asyncHandler(async (req, res) => {
  const admin = req.user.role === 'admin';
  const scope = req.query.scope ?? (admin ? 'all' : 'me');

  res.json({
    events: scope === 'all' && admin ? Event.all(60) : Event.forUser(req.user.id, 60),
    scope: scope === 'all' && admin ? 'all' : 'me',
  });
});

export const listAnnouncements = asyncHandler(async (_req, res) => {
  res.json({ announcements: announcements(20) });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const title = String(req.body?.title ?? '').trim().slice(0, 140);
  const body = String(req.body?.body ?? '').trim().slice(0, 4000);
  const level = ['info', 'warn', 'bad'].includes(req.body?.level) ? req.body.level : 'info';

  if (title.length < 4) return res.status(422).json({ error: 'give it a title' });
  if (body.length < 4) return res.status(422).json({ error: 'give it something to say' });

  getDb()
    .prepare('INSERT INTO announcements (title, body, level, created_by) VALUES (?,?,?,?)')
    .run(title, body, level, req.user.id);

  Event.record({
    actorId: req.user.id,
    kind: 'announcement',
    message: `announcement posted — ${title}`,
    scope: 'service',
  });

  res.status(201).json({ announcements: announcements(20) });
});

export default { overview, adminOverview, activity, listAnnouncements, createAnnouncement };
