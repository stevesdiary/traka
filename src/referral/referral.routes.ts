import { Router } from 'express';
import { ReferralController } from './referral.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: Router = Router();
const referralController = new ReferralController();

// Rider-only endpoints - authenticateToken checks role in req.user
router.get('/my-code', authenticateToken, referralController.getMyReferralCode);
router.post('/apply', authenticateToken, referralController.applyReferralCode);
router.put('/update-code', authenticateToken, referralController.updateReferralCode);
router.get('/stats', authenticateToken, referralController.getReferralStats);

export default router;
