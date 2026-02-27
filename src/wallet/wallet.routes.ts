import { Router } from 'express';
import { WalletController } from './wallet.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { Resource, Action } from '../utils/rolePermissions.js';
import { InitializeWalletFundingSchema, VerifyWalletFundingSchema } from '../utils/validators.js';
import { PaymentGatewayController } from './payment-gateway.controller.js';

const router: Router = Router();
const walletController = new WalletController();
const paymentGatewayController = new PaymentGatewayController();

// Webhook endpoint (no auth required)
router.post('/webhook/monnify', paymentGatewayController.handleWebhook('monnify'));
router.post('/webhook/paystack', paymentGatewayController.handleWebhook('paystack'));
router.post('/webhook/flutterwave', paymentGatewayController.handleWebhook('flutterwave'));

// Authenticated routes
router.use(authenticateToken);

// Wallet funding via payment gateways
router.post(
  '/fund/initialize',
  validateInput(InitializeWalletFundingSchema),
  paymentGatewayController.initializeWalletFunding
);
router.get(
  '/fund/verify',
  validateInput(VerifyWalletFundingSchema, 'query'),
  paymentGatewayController.verifyWalletFunding
);

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
