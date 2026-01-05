import { Router } from 'express';
import { SchedulingController } from './scheduling.controller.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { Action, Resource } from '../utils/rolePermissions.js';

const router: Router = Router();
const schedulingController = new SchedulingController();

// Schedule a delivery
router.post('/schedule', 
  requirePermission(Resource.PACKAGE, Action.CREATE),
  schedulingController.scheduleDelivery
);

// Process pending deliveries (admin/system endpoint)
router.post('/process-pending',
  requirePermission(Resource.PACKAGE, Action.UPDATE),
  schedulingController.processPending
);

export { router as schedulingRoutes };