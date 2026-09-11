import { asyncHandler } from '../middleware/error.js';
import { getDb } from '../../../config/database.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Subscription from '../models/Subscription.js';
import Hwid from '../models/Hwid.js';
import Event from '../models/Event.js';
import Build from '../models/Build.js';

/** The signed-in account's own page. */
export const me = asyncHandler(async (req, res) => {
  res.json({
    user: User.findWithEmail(req.user.id),
    subscription: Subscription.forUser(req.user.id),
    hwid: Hwid.activeFor(req.user.id),
    sessions: User.sessions(req.user.id, 8),
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { displayName, region } = req.body ?? {};
  const clamp = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : undefined);

  const user = User.update(req.user.id, {
    displayName: clamp(displayName, 40),
    region: clamp(region, 30),
  });
  res.json({ user });
});

// ------------------------------------------------------------------ admin --
export const list = asyncHandler(async (req, res) => {
  const { q = '', role = '' } = req.query;
  res.json({
    users: User.list({ query: q, role }),
    total: User.count(q),
  });
});

export const show = asyncHandler(async (req, res) => {
  const user = User.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'no such account' });

  res.json({
    user: { ...user, ...User.findWithEmail(user.id) },
    subscription: Subscription.forUser(user.id),
    hwid: Hwid.activeFor(user.id),
    hwidHistory: Hwid.historyFor(user.id),
    resets: Hwid.resetsFor(user.id),
    sessions: User.sessions(user.id, 8),
    activity: Event.forUser(user.id, 20),
  });
});

export const setRole = asyncHandler(async (req, res) => {
  const { role } = req.body ?? {};
  if (!Role.exists(role)) return res.status(422).json({ error: 'no such role' });

  const target = User.findByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'no such account' });
  if (target.id === req.user.id) {
    return res.status(422).json({ error: 'you cannot change your own role' });
  }

  const user = User.update(target.id, { role });
  Event.record({
    userId: target.id,
    actorId: req.user.id,
    kind: 'account',
    message: `role changed to ${role}`,
  });
  res.json({ user });
});

export const ban = asyncHandler(async (req, res) => {
  const target = User.findByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'no such account' });
  if (target.id === req.user.id) {
    return res.status(422).json({ error: 'you cannot ban yourself' });
  }

  const reason = String(req.body?.reason ?? '').trim().slice(0, 200) || null;
  const user = target.bannedAt ? User.unban(target.id) : User.ban(target.id, reason);

  Event.record({
    userId: target.id,
    actorId: req.user.id,
    kind: 'account',
    message: target.bannedAt ? 'account unbanned' : `account banned${reason ? ` — ${reason}` : ''}`,
  });
  res.json({ user });
});

export const grantSubscription = asyncHandler(async (req, res) => {
  const plan = req.body?.plan;
  if (!['trial', 'week', 'month', 'lifetime'].includes(plan)) {
    return res.status(422).json({ error: 'a plan is trial, week, month or lifetime' });
  }

  const target = User.findByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'no such account' });

  const days = { trial: 3, week: 7, month: 30, lifetime: null }[plan];
  const expiresAt = days
    ? new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const subscription = Subscription.grant({
    userId: target.id,
    productId: Build.product().id,
    plan,
    expiresAt,
  });

  Event.record({
    userId: target.id,
    actorId: req.user.id,
    kind: 'subscription',
    message: `subscription set to the ${plan} plan`,
  });

  res.json({ subscription });
});

/** Signs an account out everywhere. */
export const revokeSessions = asyncHandler(async (req, res) => {
  const target = User.findByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'no such account' });

  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id);
  Event.record({
    userId: target.id,
    actorId: req.user.id,
    kind: 'account',
    message: 'all sessions revoked by staff',
  });
  res.json({ ok: true });
});

export default {
  me, updateMe, list, show, setRole, ban, grantSubscription, revokeSessions,
};
