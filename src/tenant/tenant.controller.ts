import { Request, Response } from 'express';
import { TenantService } from './tenant.service';

export class TenantController {
  private tenantService: TenantService;

  constructor() {
    this.tenantService = new TenantService();
  }

  getAllTenants = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenants = await this.tenantService.getAllTenants();
      res.json({
        message: 'Tenants retrieved successfully',
        tenants
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve tenants' });
    }
  };

  getTenantById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = await this.tenantService.getTenantById(id);
      
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }
      
      res.json({
        message: 'Tenant retrieved successfully',
        tenant
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve tenant' });
    }
  };

  approveTenant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = await this.tenantService.approveTenant(id);
      res.json({
        message: 'Tenant approved successfully',
        tenant
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve tenant' });
    }
  };

  suspendTenant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = await this.tenantService.suspendTenant(id);
      res.json({
        message: 'Tenant suspended successfully',
        tenant
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to suspend tenant' });
    }
  };

  getPendingTenants = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenants = await this.tenantService.getPendingTenants();
      res.json({
        message: 'Pending tenants retrieved successfully',
        tenants
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve pending tenants' });
    }
  };

  getActiveTenants = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenants = await this.tenantService.getActiveTenants();
      res.json({
        message: 'Active tenants retrieved successfully',
        tenants
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve active tenants' });
    }
  };
}