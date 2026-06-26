import { Request, Response } from 'express';
import { RiderService } from './rider.service.js';
import { BusinessMemberRepository } from '../business/business-member.repository.js';

export class RiderController {
  private riderService: RiderService;
  private memberRepository: BusinessMemberRepository;

  constructor() {
    this.riderService = new RiderService();
    this.memberRepository = new BusinessMemberRepository();
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
      const userId = (req as any).user?.id;

      const membership = await this.memberRepository.findByUserAndTenant(userId, business_id);
      if (!membership) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

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

  updateAvailability = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { is_available } = req.body;
      const rider = await this.riderService.updateAvailability(userId, is_available);
      res.json(rider);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update availability' });
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

  softDeleteRider = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const businessId = (req as any).user?.tenant_id;
      
      await this.riderService.softDeleteRider(id, businessId);
      res.json({ message: 'Rider deactivated successfully' });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized') ? 403 : 
                     error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  hardDeleteRider = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.riderService.hardDeleteRider(id);
      res.json({ message: 'Rider permanently deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete rider permanently' });
    }
  };

  restoreRider = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const businessId = (req as any).user?.tenant_id;
      
      const rider = await this.riderService.restoreRider(id, businessId);
      res.json({ message: 'Rider restored successfully', rider });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized') ? 403 : 
                     error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  getDeletedRiders = async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).user?.tenant_id;
      const riders = await this.riderService.getDeletedRiders(businessId);
      res.json({ riders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get deleted riders' });
    }
  };

  getAvailableJobs = async (req: Request, res: Response) => {
    try {
      const jobs = await this.riderService.getAvailableJobs();
      res.json({ jobs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get jobs' });
    }
  };

  getActiveJobs = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const jobs = await this.riderService.getActiveJobsForRider(userId);
      res.json({ jobs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get active jobs' });
    }
  };
}
