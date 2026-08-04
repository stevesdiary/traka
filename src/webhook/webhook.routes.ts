import { Router } from 'express';
import { authenticateToken } from '../middleware/rolePermission.middleware.js';
import { createWebhook, listWebhooks, deleteWebhook, listDeliveries } from './webhook.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/', listWebhooks);
router.post('/', createWebhook);
router.delete('/:webhook_id', deleteWebhook);
router.get('/:webhook_id/deliveries', listDeliveries);

export default router;
