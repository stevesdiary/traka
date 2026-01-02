import { Router } from 'express';
import { CommissionController } from './commission.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreateCommissionSchema } from '../utils/validators.js';

const router: Router = Router();
const commissionController = new CommissionController();

// Admin routes
router.post('/', authenticateToken, requireRole(['ADMIN']), validateInput(CreateCommissionSchema), commissionController.createCommission);
router.put('/:commission_id/pay', authenticateToken, requireRole(['ADMIN']), commissionController.payCommission);

// Driver routes
router.get('/driver/:driver_id', authenticateToken, requireRole(['RIDER', 'ADMIN']), commissionController.getDriverEarnings);
router.get('/driver/:driver_id/summary', authenticateToken, requireRole(['RIDER', 'ADMIN']), commissionController.getEarningsSummary);

export default router;