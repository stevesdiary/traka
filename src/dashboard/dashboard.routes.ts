import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router: Router = Router();
const dashboardController = new DashboardController();

// Tenant Manager Dashboard Routes
router.get('/manager', authenticateToken, requireRole(['BUSINESS_OWNER', 'MANAGER']), dashboardController.getManagerDashboard);
router.get('/manager/riders', authenticateToken, requireRole(['BUSINESS_OWNER', 'MANAGER']), dashboardController.getTenantRiders);
router.get('/manager/packages', authenticateToken, requireRole(['BUSINESS_OWNER', 'MANAGER']), dashboardController.getTenantPackages);

// Platform Admin Dashboard Routes
router.get('/admin', authenticateToken, requireRole(['ADMIN']), dashboardController.getAdminDashboard);
router.get('/admin/tenants', authenticateToken, requireRole(['ADMIN']), dashboardController.getAllTenants);
router.get('/admin/analytics', authenticateToken, requireRole(['ADMIN']), dashboardController.getPlatformAnalytics);

export default router;