import { Request, Response } from 'express';
import { PackageService } from './package.service.js';

export class PackageController {
  private packageService: PackageService;

  constructor() {
    this.packageService = new PackageService();
  }

  createPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const packageData = req.body;
      const sender_id = req.user!.userId;
      const tenant_id = req.user!.tenant_id;

      const newPackage = await this.packageService.createPackage(
        packageData,
        sender_id,
        tenant_id
      );

      res.status(201).json({
        message: 'Package created successfully. Tracking information sent to recipient.',
        package: newPackage
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create package' });
    }
  };

  // Public tracking endpoint (no auth required)
  trackPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tracking_number } = req.params;
      const { token } = req.query;
      
      const packageData = await this.packageService.getPackageByTrackingNumber(
        tracking_number, 
        token as string
      );

      res.json({
        message: 'Package tracking information',
        package: packageData
      });
    } catch (error: any) {
      if (error.message === 'Package not found' || error.message === 'Invalid tracking access') {
        res.status(404).json({ error: 'Package not found or invalid tracking information' });
        return;
      }
      res.status(500).json({ error: 'Failed to retrieve package information' });
    }
  };

  // Authenticated tracking endpoint
  getPackageByTrackingNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tracking_number } = req.params;
      const packageData = await this.packageService.getPackageByTrackingNumber(tracking_number);

      res.json({
        message: 'Package retrieved successfully',
        package: packageData
      });
    } catch (error: any) {
      if (error.message === 'Package not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to retrieve package' });
    }
  };

  // Claim guest package to user account
  claimPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tracking_number } = req.params;
      const { guest_token } = req.body;
      const user_id = req.user!.userId;

      const result = await this.packageService.claimPackageToAccount(
        tracking_number,
        guest_token,
        user_id
      );

      res.json(result);
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('claimed')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to claim package' });
    }
  };

  cancelPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { cancellation_reason, cancellation_note, rider_has_package } = req.body;
      const user_id = req.user!.userId;

      const result = await this.packageService.cancelPackage(
        id,
        user_id,
        cancellation_reason,
        rider_has_package,
        cancellation_note
      );

      res.json(result);
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Unauthorized') || error.message.includes('Cannot cancel') || error.message.includes('already cancelled')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to cancel package' });
    }
  };
}