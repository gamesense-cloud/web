import { Router } from 'express';
import * as controller from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.login);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', controller.me);
router.post('/password', requireAuth, authLimiter, controller.changePassword);

export default router;
