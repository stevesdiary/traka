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
import ratingRoutes from './rating/rating.routes.js';
import notificationRoutes from './notification/notification.routes.js';
import referralRoutes from './referral/referral.routes.js';
import serviceAreaRoutes from './service-area/service-area.routes.js';
import waitlistRoutes from './waitlist/waitlist.routes.js';
import pricingRoutes from './pricing/pricing.routes.js';
import fuelPriceRoutes from './pricing/fuel-price.routes.js';
import quoteRoutes from './quote/quote.routes.js';
import cashPaymentRoutes from './payment/cash-payment.routes.js';
import uploadRoutes from './storage/upload.routes.js';
import promotionRoutes from './promotion/promotion.routes.js';
import businessRoutes from './business/business.routes.js';
import messageRoutes from './message/message.routes.js';

const router: Router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'TRAKA API',
    docs: '/api-docs'
  });
});

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
router.use('/ratings', ratingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/referrals', referralRoutes);
router.use('/service-areas', serviceAreaRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/pricing', pricingRoutes);
router.use('/fuel-price', fuelPriceRoutes);
router.use('/quotes', quoteRoutes);
router.use('/cash-payments', cashPaymentRoutes);
router.use('/upload', uploadRoutes);
router.use('/promotions', promotionRoutes);
router.use('/businesses', businessRoutes);
router.use('/', messageRoutes);

export default router;
