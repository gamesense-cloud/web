import { asyncHandler } from '../middleware/error.js';
import Hwid, { RESET_COOLDOWN_DAYS } from '../models/Hwid.js';
import Event from '../models/Event.js';

export const mine = asyncHandler(async (req, res) => {
  res.json({
    active: Hwid.activeFor(req.user.id),
    history: Hwid.historyFor(req.user.id),
    resets: Hwid.resetsFor(req.user.id),
    pending: Hwid.pendingFor(req.user.id),
    cooldownUntil: Hwid.cooldownUntil(req.user.id),
    cooldownDays: RESET_COOLDOWN_DAYS,
  });
});

export const requestReset = asyncHandler(async (req, res) => {
  if (Hwid.pendingFor(req.user.id)) {
    return res.status(409).json({ error: 'you already have a reset waiting on review' });
  }

  const until = Hwid.cooldownUntil(req.user.id);
  if (until) {
    return res.status(429).json({
      error: `resets are one every ${RESET_COOLDOWN_DAYS} days — your next one opens ${until.slice(0, 10)}`,
    });
  }

  const reason = String(req.body?.reason ?? '').trim().slice(0, 400);
  if (reason.length < 8) {
    return res.status(422).json({ error: 'say what changed — a new machine, a board swap, a reinstall' });
  }

  const reset = Hwid.request({ userId: req.user.id, reason });

  Event.record({
    userId: req.user.id,
    actorId: req.user.id,
    kind: 'hwid',
    message: 'hwid reset requested — waiting on review',
  });

  res.status(201).json({ reset, pending: Hwid.pendingFor(req.user.id) });
});

// ------------------------------------------------------------------ admin --
export const queue = asyncHandler(async (req, res) => {
  res.json({
    pending: Hwid.queue('pending'),
    approved: Hwid.queue('approved'),
    denied: Hwid.queue('denied'),
  });
});

export const resolve = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  if (!['approved', 'denied'].includes(status)) {
    return res.status(422).json({ error: 'a reset is approved or denied' });
  }

  const note = String(req.body?.note ?? '').trim().slice(0, 400) || null;
  const resolved = Hwid.resolve({
    id: Number(req.params.id),
    status,
    adminId: req.user.id,
    note,
  });

  if (!resolved) return res.status(404).json({ error: 'no such pending reset' });

  Event.record({
    userId: resolved.userId,
    actorId: req.user.id,
    kind: 'hwid',
    message: status === 'approved'
      ? 'hwid reset approved — the next login binds a new machine'
      : `hwid reset denied${note ? ` — ${note}` : ''}`,
  });

  res.json({ ok: true, pending: Hwid.queue('pending') });
});

export default { mine, requestReset, queue, resolve };
