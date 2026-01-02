import { Router } from 'express';
import { PackageController } from './package.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreatePackageSchema, GuestTrackingSchema } from '../utils/validators.js';

const router: Router = Router();
const packageController = new PackageController();

// Public tracking endpoint (no auth required)
router.get('/track/:tracking_number', packageController.trackPackage);

// Authenticated package management
router.post('/', authenticateToken, requireRole(['ADMIN', 'BUSINESS_OWNER']), validateInput(CreatePackageSchema), packageController.createPackage);
router.get('/:tracking_number', authenticateToken, packageController.getPackageByTrackingNumber);

// Package claiming for registered users
router.post('/:tracking_number/claim', authenticateToken, packageController.claimPackage);

export default router;