import { Request, Response } from 'express';
import { BusinessService } from './business.service.js';

export class BusinessController {
  private businessService: BusinessService;

  constructor() {
    this.businessService = new BusinessService();
  }

  createBusiness = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { business_name, business_address, contact_person, phone } = req.body;
      const { business, membership_role } = await this.businessService.createBusiness(userId, {
        business_name,
        business_address,
        contact_person,
        phone
      });

      res.status(201).json({
        message: 'Business created successfully',
        business,
        membership_role
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create business', details: error.message });
    }
  };

  listBusinesses = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const businesses = await this.businessService.listBusinessesForUser(userId);
      res.json({
        message: 'Businesses retrieved successfully',
        businesses
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve businesses', details: error.message });
    }
  };

  updateBusiness = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { business_id } = req.params;
      const updated = await this.businessService.updateBusiness(business_id, userId, req.body);

      res.json({
        message: 'Business updated successfully',
        business: updated
      });
    } catch (error: any) {
      if (error.message === 'Forbidden') {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      res.status(500).json({ error: 'Failed to update business', details: error.message });
    }
  };
}
