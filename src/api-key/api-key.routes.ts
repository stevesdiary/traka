import { Router } from 'express';
import { authenticateToken } from '../middleware/rolePermission.middleware.js';
import { createApiKey, listApiKeys, revokeApiKey } from './api-key.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.get('/', listApiKeys);
router.post('/', createApiKey);
router.delete('/:key_id', revokeApiKey);

export default router;
