import { Router } from 'express';
import * as controller from '../controllers/buildController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCapability } from '../middleware/permissions.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(requireAuth);

router.get('/', controller.list);
router.get('/downloads', controller.downloadsForMe);
router.get('/:id', controller.show);
router.post('/:id/download', writeLimiter, requireCapability('build.download'), controller.download);

export default router;
