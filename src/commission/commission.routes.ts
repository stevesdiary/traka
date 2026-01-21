import { Router } from 'express';
import { CommissionController } from './commission.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreateCommissionSchema, PayCommissionSchema } from '../utils/validators.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();
const commissionController = new CommissionController();

// Admin routes
router.post('/', 
  authenticateToken, 
  requirePermission(Resource.PACKAGE, Action.CREATE),
  validateInput(CreateCommissionSchema), 
  commissionController.createCommission
);

router.put('/:commission_id/pay', 
  authenticateToken, 
  requirePermission(Resource.PACKAGE, Action.UPDATE),
  validateInput(PayCommissionSchema),
  commissionController.payCommission
);

// Rider routes
router.get('/driver/:driver_id', 
  authenticateToken, 
  requirePermission(Resource.PACKAGE, Action.READ),
  commissionController.getDriverEarnings
);

router.get('/driver/:driver_id/summary', 
  authenticateToken, 
  requirePermission(Resource.PACKAGE, Action.READ),
  commissionController.getEarningsSummary
);

export default router;