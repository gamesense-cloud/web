import { Router } from 'express';
import * as controller from '../controllers/ticketController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCapability } from '../middleware/permissions.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Every route here reads or writes one account's support history.
router.use(requireAuth);

router.get('/', controller.list);
router.get('/:id', controller.show);
router.post('/', writeLimiter, requireCapability('ticket.create'), controller.create);
router.post('/:id/reply', writeLimiter, requireCapability('ticket.reply'), controller.reply);
router.post('/:id/status', controller.setStatus);

export default router;
