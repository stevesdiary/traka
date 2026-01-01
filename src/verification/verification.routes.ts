import { Router } from 'express';
import { VerificationController } from './verification.controller';
import { validateInput } from '../middleware/validation.middleware';
import { SendOTPSchema, VerifyOTPSchema } from '../utils/validators';

const router: Router = Router();
const verificationController = new VerificationController();

router.post('/send-otp', validateInput(SendOTPSchema), verificationController.sendOTP);
router.post('/verify-otp', validateInput(VerifyOTPSchema), verificationController.verifyOTP);

export default router;