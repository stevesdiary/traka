import { Router } from 'express';
import { RiderController } from './rider.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { RiderRegistrationSchema, UpdateLocationSchema, UpdateRiderProfileSchema, UpdateStatusSchema } from '../utils/validators.js';
import { Resource, Action } from '../utils/rolePermissions.js';

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
router.get('/available', authenticateToken, requirePermission(Resource.USER, Action.READ), riderController.getAvailableRiders);

// Business routes
router.get('/business/:business_id', authenticateToken, requirePermission(Resource.TENANT, Action.READ), riderController.getBusinessRiders);

// Admin routes
router.get('/pending', authenticateToken, requirePermission(Resource.USER, Action.READ), riderController.getPendingVerifications);
router.put('/verify/:user_id', authenticateToken, requirePermission(Resource.USER, Action.APPROVE), riderController.verifyRider);

// Get deleted riders (must come before /:id routes)
router.get('/deleted', authenticateToken, requirePermission(Resource.USER, Action.READ), riderController.getDeletedRiders);

// Soft delete routes (Business Admin/Manager)
router.delete('/:id', authenticateToken, requirePermission(Resource.USER, Action.DELETE), riderController.softDeleteRider);
router.post('/:id/restore', authenticateToken, requirePermission(Resource.USER, Action.UPDATE), riderController.restoreRider);

// Hard delete route (Super Admin only)
router.delete('/:id/permanent', authenticateToken, requirePermission(Resource.USER, Action.DELETE), riderController.hardDeleteRider);

export default router;