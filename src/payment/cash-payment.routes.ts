import { Router } from 'express';
import { CashPaymentController } from './cash-payment.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: Router = Router();
const cashPaymentController = new CashPaymentController();

// Rider confirms cash payment collected
router.post('/packages/:package_id/confirm-cash', authenticateToken, cashPaymentController.confirmCashPayment);

// Get rider's cash payment summary
router.get('/summary', authenticateToken, cashPaymentController.getCashPaymentSummary);

export default router;
