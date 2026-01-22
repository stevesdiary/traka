import { Router } from 'express';
import { TenantController } from './tenant.controller.js';
import { authenticateToken, canRead, canApprove } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { TenantApprovalSchema } from '../utils/validators.js';
import { Resource } from '../utils/rolePermissions.js';

const router: Router = Router();
const tenantController = new TenantController();

router.use(authenticateToken);

router.get('/', canRead(Resource.TENANT), tenantController.getAllTenants);
router.get('/pending', canRead(Resource.TENANT), tenantController.getPendingTenants);
router.get('/active', canRead(Resource.TENANT), tenantController.getActiveTenants);
router.get('/:id', canRead(Resource.TENANT), tenantController.getTenantById);
router.put('/:id/approve', canApprove(Resource.TENANT), validateInput(TenantApprovalSchema), tenantController.approveTenant);
router.put('/:id/suspend', canApprove(Resource.TENANT), validateInput(TenantApprovalSchema), tenantController.suspendTenant);

export default router;