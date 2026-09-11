import rateLimit from 'express-rate-limit';
import config from '../../../config/index.js';

const shared = {
  standardHeaders: true,
  legacyHeaders: false,
  // Tests would otherwise trip the auth limiter on their third request.
  skip: () => config.isTest,
};

const message = (text) => (_req, res) => res.status(429).json({ error: text });

/** Everything. Generous — this is a backstop, not a policy. */
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: config.rate.windowMs,
  max: config.rate.max,
  handler: message('too many requests — slow down for a minute'),
});

/** Login and register. Tight, and keyed on the identifier as well as the ip. */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: config.rate.windowMs,
  max: config.rate.maxAuth,
  keyGenerator: (req) => `${req.ip}:${req.body?.identifier ?? req.body?.username ?? ''}`,
  handler: message('too many attempts — wait a minute and try again'),
});

/** Anything that writes content, so a script cannot flood a board. */
export const writeLimiter = rateLimit({
  ...shared,
  windowMs: config.rate.windowMs,
  max: config.rate.maxPosts,
  handler: message('you are posting too quickly — wait a moment'),
});

export default { apiLimiter, authLimiter, writeLimiter };
