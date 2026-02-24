import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();
const dashboardController = new DashboardController();

// Tenant Manager Dashboard Routes
router.get('/manager', authenticateToken, requirePermission(Resource.TENANT, Action.READ), dashboardController.getManagerDashboard);
router.get('/manager/riders', authenticateToken, requirePermission(Resource.USER, Action.READ), dashboardController.getTenantRiders);
router.get('/manager/packages', authenticateToken, requirePermission(Resource.PACKAGE, Action.READ), dashboardController.getTenantPackages);

// Platform Admin Dashboard Routes
router.get('/admin', authenticateToken, requirePermission(Resource.USER, Action.READ), dashboardController.getAdminDashboard);
router.get('/admin/tenants', authenticateToken, requirePermission(Resource.TENANT, Action.READ), dashboardController.getAllTenants);
router.get('/admin/analytics', authenticateToken, requirePermission(Resource.PACKAGE, Action.READ), dashboardController.getPlatformAnalytics);

// Rider Dashboard Route (Mobile)
router.get('/rider', authenticateToken, dashboardController.getRiderDashboard);

export default router;