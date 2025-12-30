import { Router } from 'express';
import { CommissionController } from './commission.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateInput } from '../middleware/validation.middleware';
import { CreateCommissionSchema } from '../utils/validators';

const router: Router = Router();
const commissionController = new CommissionController();

// Admin routes
router.post('/', authenticateToken, requireRole(['ADMIN']), validateInput(CreateCommissionSchema), commissionController.createCommission);
router.put('/:commission_id/pay', authenticateToken, requireRole(['ADMIN']), commissionController.payCommission);

// Driver routes
router.get('/driver/:driver_id', authenticateToken, requireRole(['RIDER', 'ADMIN']), commissionController.getDriverEarnings);
router.get('/driver/:driver_id/summary', authenticateToken, requireRole(['RIDER', 'ADMIN']), commissionController.getEarningsSummary);

export default router;