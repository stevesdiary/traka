import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userRoutes from './user/user.routes';
import packageRoutes from './package/package.routes';
import dashboardRoutes from './dashboard/dashboard.routes';
import verificationRoutes from './verification/verification.routes';
import commissionRoutes from './commission/commission.routes';
import riderRoutes from './rider/rider.routes';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/packages', packageRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/verification', verificationRoutes);
router.use('/commissions', commissionRoutes);
router.use('/riders', riderRoutes);

export default router;