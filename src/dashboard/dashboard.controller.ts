import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service.js';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  // Tenant Manager Dashboard
  getManagerDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenant_id = req.user!.tenant_id;
      const stats = await this.dashboardService.getTenantStats(tenant_id);
      const recentActivity = await this.dashboardService.getTenantActivity(tenant_id);

      res.json({
        message: 'Manager dashboard retrieved successfully',
        data: {
          ...stats,
          ...recentActivity
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load manager dashboard' });
    }
  };

  // Platform Admin Dashboard
  getAdminDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const platformStats = await this.dashboardService.getPlatformStats();
      const tenantOverview = await this.dashboardService.getAllTenantsOverview();

      res.json({
        message: 'Admin dashboard retrieved successfully',
        data: {
          platform_stats: platformStats,
          tenants_overview: tenantOverview
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load admin dashboard' });
    }
  };

  // Tenant-specific management endpoints
  getTenantRiders = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenant_id = req.user!.tenant_id;
      const riders = await this.dashboardService.getTenantRiders(tenant_id);

      res.json({
        message: 'Tenant riders retrieved successfully',
        riders
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load riders data' });
    }
  };

  getTenantPackages = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenant_id = req.user!.tenant_id;
      const { status } = req.query;
      const packages = await this.dashboardService.getTenantPackages(tenant_id, status as string);

      res.json({
        message: 'Tenant packages retrieved successfully',
        packages
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load packages data' });
    }
  };

  // Admin-only endpoints
  getAllTenants = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenants = await this.dashboardService.getAllTenants();

      res.json({
        message: 'All tenants retrieved successfully',
        tenants
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load tenants data' });
    }
  };

  getPlatformAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const analytics = await this.dashboardService.getPlatformAnalytics();

      res.json({
        message: 'Platform analytics retrieved successfully',
        analytics
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load platform analytics' });
    }
  };
}