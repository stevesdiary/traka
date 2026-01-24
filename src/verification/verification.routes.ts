import { Router } from 'express';
import { VerificationController } from './verification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { PackageVerificationService } from './package-verification.service.js';
import { Request, Response } from 'express';

const router: Router = Router();
const verificationController = new VerificationController();
const packageVerificationService = new PackageVerificationService();

// Verification routes (public)
router.post('/verify-email', verificationController.verifyEmail);
router.post('/verify-phone', verificationController.verifyPhone);
router.post('/resend-email', verificationController.resendEmailVerification);
router.post('/resend-phone', verificationController.resendPhoneVerification);

// Trigger delivery code email (rider endpoint)
router.post(
  '/trigger-delivery-code/:package_id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { package_id } = req.params;
      await packageVerificationService.triggerDeliveryCodeEmail(package_id);
      res.json({ 
        success: true,
        message: 'Delivery code sent to recipient' 
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

export default router;