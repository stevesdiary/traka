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

// Webhook endpoints (no auth required)
router.post('/webhook/kuda', paymentGatewayController.handleWebhook('kuda'));
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
router.post(
  '/business/fund/initialize',
  validateInput(InitializeWalletFundingSchema),
  paymentGatewayController.initializeBusinessWalletFunding
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

// Bank account (payout details)
router.get('/bank-account', walletController.getBankAccount);
router.put('/bank-account', walletController.updateBankAccount);

// Process cash delivery (admin/system only)
router.post('/cash-delivery',
  requirePermission(Resource.PACKAGE, Action.UPDATE),
  walletController.processCashDelivery
);

// Pay for a delivery from wallet balance
router.post('/pay-for-delivery', walletController.payForDelivery);

export { router as walletRoutes };
