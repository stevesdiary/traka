import { Router } from 'express';
import { ServiceAreaController } from './service-area.controller.js';
import { authenticateToken, requirePermission } from '../middleware/rolePermission.middleware.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();
const controller = new ServiceAreaController();

// Public routes
router.get('/cities', controller.getActiveCities);
router.get('/check', controller.checkCoverage);

// Admin routes
router.post('/', authenticateToken, requirePermission(Resource.TENANT, Action.CREATE), controller.addServiceArea);

export default router;
