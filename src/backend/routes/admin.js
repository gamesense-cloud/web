import { Router } from 'express';
import * as dashboard from '../controllers/dashboardController.js';
import * as users from '../controllers/userController.js';
import * as builds from '../controllers/buildController.js';
import * as hwid from '../controllers/hwidController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireCapability } from '../middleware/permissions.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = Router();

// One gate for the whole surface, rather than per route — there is nothing
// under /api/admin that a member is ever allowed to reach.
router.use(requireAuth, requireAdmin);

router.get('/overview', dashboard.adminOverview);

// accounts
router.get('/members', requireCapability('member.list'), users.list);
router.get('/members/:username', requireCapability('member.list'), users.show);
router.post('/members/:username/role', requireCapability('member.update'), users.setRole);
router.post('/members/:username/ban', requireCapability('member.ban'), users.ban);
router.post('/members/:username/subscription',
  requireCapability('subscription.grant'), users.grantSubscription);
router.post('/members/:username/revoke-sessions',
  requireCapability('member.update'), users.revokeSessions);

// builds
router.post('/builds', writeLimiter, requireCapability('build.publish'), builds.publish);
router.post('/builds/:id/status', requireCapability('build.status.set'), builds.setStatus);

// hwid reset queue
router.get('/resets', requireCapability('hwid.reset.resolve'), hwid.queue);
router.post('/resets/:id', requireCapability('hwid.reset.resolve'), hwid.resolve);

export default router;
