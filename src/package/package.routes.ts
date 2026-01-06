import { Router } from 'express';
import { PackageController } from './package.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreatePackageSchema, GuestTrackingSchema } from '../utils/validators.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();
const packageController = new PackageController();

// Public tracking endpoint (no auth required)
router.get('/track/:tracking_number', packageController.trackPackage);

// Authenticated package management
router.post('/', authenticateToken, requirePermission(Resource.PACKAGE, Action.CREATE), validateInput(CreatePackageSchema), packageController.createPackage);
router.get('/:tracking_number', authenticateToken, requirePermission(Resource.PACKAGE, Action.READ), packageController.getPackageByTrackingNumber);

// Package claiming for registered users
router.post('/:tracking_number/claim', authenticateToken, requirePermission(Resource.PACKAGE, Action.UPDATE), packageController.claimPackage);


export default router;