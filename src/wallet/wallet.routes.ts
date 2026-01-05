import { Router } from 'express';
import { WalletController } from './wallet.controller.js';
import { MonnifyWebhookController } from './monnify.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();
const walletController = new WalletController();
const monnifyController = new MonnifyWebhookController();

// Webhook endpoint (no auth required)
router.post('/webhook/monnify', monnifyController.handleWebhook);

// Authenticated routes
router.use(authenticateToken);

// Get wallet balance
router.get('/balance', walletController.getBalance);

// Get transaction history
router.get('/transactions', walletController.getTransactions);

// Process cash delivery (admin/system only)
router.post('/cash-delivery',
  requirePermission(Resource.PACKAGE, Action.UPDATE),
  walletController.processCashDelivery
);

export { router as walletRoutes };