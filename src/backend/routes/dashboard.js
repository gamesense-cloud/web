import { Router } from 'express';
import * as controller from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCapability, requireAdmin } from '../middleware/permissions.js';

const router = Router();

router.use(requireAuth);

router.get('/overview', requireCapability('dashboard.view'), controller.overview);
router.get('/activity', requireCapability('dashboard.view'), controller.activity);
router.get('/announcements', controller.listAnnouncements);
router.post('/announcements', requireAdmin, controller.createAnnouncement);

export default router;
