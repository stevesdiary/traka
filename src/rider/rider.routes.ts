import { Router } from 'express';
import { RiderController } from './rider.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateInput } from '../middleware/validation.middleware';
import { RiderRegistrationSchema, UpdateLocationSchema, UpdateRiderProfileSchema, UpdateStatusSchema } from '../utils/validators';

const router: Router = Router();
const riderController = new RiderController();

// Rider routes (authenticated users)
router.post('/register', authenticateToken, validateInput(RiderRegistrationSchema), riderController.registerRider);
router.get('/profile', authenticateToken, riderController.getProfile);
router.put('/profile', authenticateToken, validateInput(UpdateRiderProfileSchema), riderController.updateProfile);
router.get('/eligibility', authenticateToken, riderController.checkOrderEligibility);

// Rider operational routes
router.put('/location', authenticateToken, validateInput(UpdateLocationSchema), riderController.updateLocation);
router.put('/status', authenticateToken, validateInput(UpdateStatusSchema), riderController.updateStatus);
router.get('/available', authenticateToken, requireRole(['ADMIN', 'BUSINESS_OWNER']), riderController.getAvailableRiders);

// Business routes
router.get('/business/:business_id', authenticateToken, requireRole(['ADMIN', 'BUSINESS_OWNER']), riderController.getBusinessRiders);

// Admin routes
router.get('/pending', authenticateToken, requireRole(['ADMIN', 'BUSINESS_OWNER']), riderController.getPendingVerifications);
router.put('/verify/:user_id', authenticateToken, requireRole(['ADMIN', 'BUSINESS_OWNER']), riderController.verifyRider);

export default router;