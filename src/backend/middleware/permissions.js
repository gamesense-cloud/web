import { can, atLeast, isAdmin } from '../../../config/permissions.js';

/** Route guard: the signed-in account must hold this capability. */
export function requireCapability(capability) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'sign in to do that' });
    if (!can(req.user.role, capability)) {
      return res.status(403).json({ error: 'your account cannot do that' });
    }
    next();
  };
}

/** Route guard: role rank must be at or above `minimum`. */
export function requireRole(minimum) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'sign in to do that' });
    if (!atLeast(req.user.role, minimum)) {
      return res.status(403).json({ error: `that needs ${minimum} or above` });
    }
    next();
  };
}

/** Everything under /api/admin sits behind this. */
export const requireAdmin = requireRole('admin');

/**
 * "Your own, or an admin" — the shape most account-scoped routes need.
 * Returns the id to read, or null when the request is not allowed.
 */
export function scopeToUser(req, targetId) {
  if (!req.user) return null;
  if (isAdmin(req.user)) return targetId ?? req.user.id;
  if (targetId && targetId !== req.user.id) return null;
  return req.user.id;
}

export { isAdmin };

export default { requireCapability, requireRole, requireAdmin, scopeToUser, isAdmin };
