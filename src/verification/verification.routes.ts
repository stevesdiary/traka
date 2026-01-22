import { Router } from 'express';
import { VerificationController } from './verification.controller.js';

const router: Router = Router();
const verificationController = new VerificationController();

// Verification routes (public)
router.post('/verify-email', verificationController.verifyEmail);
router.post('/verify-phone', verificationController.verifyPhone);
router.post('/resend-email', verificationController.resendEmailVerification);
router.post('/resend-phone', verificationController.resendPhoneVerification);

export default router;