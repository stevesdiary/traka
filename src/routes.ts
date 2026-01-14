import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import userRoutes from './user/user.routes.js';
import packageRoutes from './package/package.routes.js';
import dashboardRoutes from './dashboard/dashboard.routes.js';
import verificationRoutes from './verification/verification.routes.js';
import commissionRoutes from './commission/commission.routes.js';
import riderRoutes from './rider/rider.routes.js';
import tenantRoutes from './tenant/tenant.routes.js';
import matchingRoutes from './matching/routes/matching.routes.js';
import { schedulingRoutes } from './scheduling/scheduling.routes.js';
import { walletRoutes } from './wallet/wallet.routes.js';
import { invoiceRoutes } from './invoice/invoice.routes.js';
import { legalRoutes } from './legal/legal.routes.js';
import { addressRoutes } from './address/address.routes.js';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/packages', packageRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/verification', verificationRoutes);
router.use('/commissions', commissionRoutes);
router.use('/riders', riderRoutes);
router.use('/tenants', tenantRoutes);
router.use('/matching', matchingRoutes);
router.use('/scheduling', schedulingRoutes);
router.use('/wallet', walletRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/legal', legalRoutes);
router.use('/addresses', addressRoutes);

export default router;