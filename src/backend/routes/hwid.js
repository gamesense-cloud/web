import { Router } from 'express';
import * as controller from '../controllers/hwidController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCapability } from '../middleware/permissions.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/', controller.mine);
router.post('/reset', writeLimiter, requireCapability('hwid.reset.request'), controller.requestReset);

export default router;
