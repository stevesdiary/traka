import { Router } from 'express';
import { VerificationController } from './verification.controller.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { SendOTPSchema, VerifyOTPSchema } from '../utils/validators.js';

const router: Router = Router();
const verificationController = new VerificationController();

router.post('/send-otp', validateInput(SendOTPSchema), verificationController.sendOTP);
router.post('/verify-otp', validateInput(VerifyOTPSchema), verificationController.verifyOTP);

export default router;