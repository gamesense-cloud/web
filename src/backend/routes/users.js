import { Router } from 'express';
import * as controller from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCapability } from '../middleware/permissions.js';

const router = Router();

// The account's own page. Anything about another account lives under
// /api/admin, so there is no path here that reads someone else's row.
router.use(requireAuth);

router.get('/me', controller.me);
router.patch('/me', requireCapability('account.update'), controller.updateMe);

export default router;
