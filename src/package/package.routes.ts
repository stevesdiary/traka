import { Router } from 'express';
import { PackageController } from './package.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreatePackageSchema, GuestTrackingSchema, CancelPackageSchema } from '../utils/validators.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();
const packageController = new PackageController();

// Public tracking endpoint (no auth required)
router.get('/track/:tracking_number', packageController.trackPackage);

// Authenticated package management
router.post('/', authenticateToken, requirePermission(Resource.PACKAGE, Action.CREATE), validateInput(CreatePackageSchema), packageController.createPackage);
router.get('/', authenticateToken, requirePermission(Resource.PACKAGE, Action.READ), packageController.getMyPackages);
router.get('/by-id/:id', authenticateToken, requirePermission(Resource.PACKAGE, Action.READ), packageController.getPackageById);
router.post('/schedule-search', authenticateToken, requirePermission(Resource.PACKAGE, Action.UPDATE), packageController.scheduleBackgroundSearch);
router.get('/:tracking_number', authenticateToken, requirePermission(Resource.PACKAGE, Action.READ), packageController.getPackageByTrackingNumber);

// Package claiming for registered users
router.post('/:tracking_number/claim', authenticateToken, requirePermission(Resource.PACKAGE, Action.UPDATE), packageController.claimPackage);

// Package cancellation
router.post('/:id/cancel', authenticateToken, requirePermission(Resource.PACKAGE, Action.UPDATE), validateInput(CancelPackageSchema), packageController.cancelPackage);

// Pickup & delivery confirmation (rider)
router.post('/:id/confirm-pickup', authenticateToken, requirePermission(Resource.PACKAGE, Action.UPDATE), packageController.confirmPickup);
router.post('/:id/confirm-delivery', authenticateToken, requirePermission(Resource.PACKAGE, Action.UPDATE), packageController.confirmDelivery);

// Bank transfer payment initialization
router.post('/:id/initialize-transfer', authenticateToken, requirePermission(Resource.PACKAGE, Action.UPDATE), packageController.initializeTransferPayment);

// Rider self-assignment
router.post('/:id/assign-self', authenticateToken, packageController.assignSelf);
router.post('/:id/unassign-self', authenticateToken, packageController.unassignSelf);

export default router;