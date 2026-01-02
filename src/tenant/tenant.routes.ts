import { Router } from 'express';
import { TenantController } from './tenant.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router: Router = Router();
const tenantController = new TenantController();

// All tenant routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// Tenant management routes
router.get('/', tenantController.getAllTenants);
router.get('/pending', tenantController.getPendingTenants);
router.get('/active', tenantController.getActiveTenants);
router.get('/:id', tenantController.getTenantById);
router.put('/:id/approve', tenantController.approveTenant);
router.put('/:id/suspend', tenantController.suspendTenant);

export default router;