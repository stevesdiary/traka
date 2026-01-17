import { Router } from 'express';
import { ReferralController } from './referral.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rolePermission.middleware.js';

const router = Router();
const referralController = new ReferralController();

// Rider-only endpoints
router.get('/my-code', authenticateToken, requireRole(['RIDER']), referralController.getMyReferralCode);
router.post('/apply', authenticateToken, requireRole(['RIDER']), referralController.applyReferralCode);
router.get('/stats', authenticateToken, requireRole(['RIDER']), referralController.getReferralStats);

export default router;
