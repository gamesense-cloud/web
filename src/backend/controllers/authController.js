import * as auth from '../services/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { revokeSessions } from '../services/auth.js';
import Subscription from '../models/Subscription.js';
import Hwid from '../models/Hwid.js';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';

export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body ?? {};
  const { user, token } = await auth.register({ username, email, password });

  Event.record({
    userId: user.id,
    actorId: user.id,
    kind: 'account',
    message: 'account created',
  });

  res.status(201).json({ user, token });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, username, password } = req.body ?? {};
  const { user, token } = await auth.login({
    identifier: identifier ?? username,
    password,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  Event.record({
    userId: user.id,
    actorId: user.id,
    kind: 'session',
    message: 'signed in from the web dashboard',
  });

  res.json({ user, token });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) revokeSessions(req.user.id);
  res.json({ ok: true });
});

/**
 * Whoever the bearer token belongs to, plus the few counts the masthead shows
 * so it does not need a second round trip.
 */
export const me = asyncHandler(async (req, res) => {
  if (!req.user) return res.json({ user: null });

  const isAdmin = req.user.role === 'admin';
  res.json({
    user: req.user,
    badges: {
      tickets: isAdmin
        ? Ticket.openCount()
        : Ticket.list({ userId: req.user.id, status: 'open' }).length,
      resets: isAdmin ? Hwid.pendingCount() : (Hwid.pendingFor(req.user.id) ? 1 : 0),
    },
    subscription: Subscription.forUser(req.user.id),
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  await auth.changePassword({ userId: req.user.id, currentPassword, newPassword });

  Event.record({
    userId: req.user.id,
    actorId: req.user.id,
    kind: 'account',
    message: 'password changed — other sessions signed out',
  });

  res.json({ ok: true, note: 'other sessions were signed out' });
});

export default { register, login, logout, me, changePassword };
