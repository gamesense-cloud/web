import { verifyToken } from '../services/auth.js';
import User from '../models/User.js';

/**
 * Reads the bearer token if there is one and hangs the user off the request.
 * Never rejects — routes that need a user say so with requireAuth.
 */
export function attachUser(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  req.user = null;
  if (token) {
    const claims = verifyToken(token);
    if (claims?.sub) {
      const user = User.find(claims.sub);
      if (user && user.role !== 'banned') {
        req.user = user;
        User.touchLastSeen(user.id);
      }
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'sign in to do that' });
  }
  next();
}

/** For routes that are fine for guests but behave differently when signed in. */
export function optionalAuth(_req, _res, next) {
  next();
}

export default { attachUser, requireAuth, optionalAuth };
