import { Request, Response } from 'express';
import { RiderService } from './rider.service';

export class RiderController {
  private riderService: RiderService;

  constructor() {
    this.riderService = new RiderService();
  }

  registerRider = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const profile = await this.riderService.registerRider(req.body, userId);
      const message = profile.rider_type === 'BUSINESS_MANAGED' 
        ? 'Business rider registration submitted for verification'
        : 'Independent rider registration submitted for verification';
        
      res.status(201).json({ message, profile });
    } catch (error) {
      res.status(500).json({ error: 'Failed to register rider' });
    }
  };

  getProfile = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const profile = await this.riderService.getRiderProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Rider profile not found' });
      }
      
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get rider profile' });
    }
  };

  updateProfile = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const profile = await this.riderService.updateProfile(userId, req.body);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  };

  verifyRider = async (req: Request, res: Response) => {
    try {
      const { user_id } = req.params;
      const { approved } = req.body;
      const profile = await this.riderService.verifyRider(user_id, approved);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify rider' });
    }
  };

  getPendingVerifications = async (req: Request, res: Response) => {
    try {
      const businessId = req.query.business_id as string;
      const profiles = await this.riderService.getPendingVerifications(businessId);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get pending verifications' });
    }
  };

  getBusinessRiders = async (req: Request, res: Response) => {
    try {
      const { business_id } = req.params;
      const riders = await this.riderService.getBusinessRiders(business_id);
      res.json(riders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get business riders' });
    }
  };

  getAvailableRiders = async (req: Request, res: Response) => {
    try {
      const businessId = req.query.business_id as string;
      const riders = await this.riderService.getAvailableRiders(businessId);
      res.json(riders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get available riders' });
    }
  };

  updateLocation = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { latitude, longitude } = req.body;
      const rider = await this.riderService.updateLocation(userId, latitude, longitude);
      res.json(rider);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update location' });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { status } = req.body;
      const rider = await this.riderService.updateStatus(userId, status);
      res.json(rider);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update status' });
    }
  };

  checkOrderEligibility = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const canReceive = await this.riderService.canReceiveOrders(userId);
      res.json({ eligible: canReceive });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check eligibility' });
    }
  };
}