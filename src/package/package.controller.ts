import { Request, Response } from 'express';
import { PackageService } from './package.service.js';
import config from '../config/environment.js';

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
      res.status(500).json({ error: 'Failed to create package', ...(config.isDevelopment && { message: error.message }) });
    }
  };

  // Public tracking endpoint (no auth required)
  trackPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tracking_number } = req.params as Record<string, string>;
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
      res.status(500).json({ error: 'Failed to retrieve package information', ...(config.isDevelopment && { message: error.message }) });
    }
  };

  initializeTransferPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const user_id = req.user!.userId;
      const result = await this.packageService.initializeTransferPayment(id, user_id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  scheduleBackgroundSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { package_id } = req.body;
      const user_id = req.user!.userId;
      if (!package_id) {
        res.status(400).json({ error: 'package_id is required' });
        return;
      }
      await this.packageService.scheduleBackgroundSearch(package_id, user_id);
      res.json({ message: "We'll alert you when we get a rider for you" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getPackageById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({ error: 'Invalid package ID' });
        return;
      }
      const requester = { id: req.user!.userId, role: req.user!.role };
      const packageData = await this.packageService.getPackageByUuid(id, requester);
      res.json({ message: 'Package retrieved successfully', package: packageData });
    } catch (error: any) {
      if (error.message === 'Package not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      res.status(500).json({ error: 'Failed to retrieve package', ...(config.isDevelopment && { message: error.message }) });
    }
  };

  // Authenticated tracking endpoint
  getPackageByTrackingNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tracking_number } = req.params as Record<string, string>;
      const requester = { id: req.user!.userId, role: req.user!.role };
      const packageData = await this.packageService.getPackageByTrackingNumber(
        tracking_number,
        undefined,
        requester
      );

      res.json({
        message: 'Package retrieved successfully',
        package: packageData
      });
    } catch (error: any) {
      if (error.message === 'Package not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Unauthorized') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      res.status(500).json({ error: 'Failed to retrieve package', ...(config.isDevelopment && { message: error.message }) });
    }
  };

  // Claim guest package to user account
  claimPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tracking_number } = req.params as Record<string, string>;
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
      res.status(500).json({ error: 'Failed to claim package', ...(config.isDevelopment && { message: error.message }) });
    }
  };

  cancelPackage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
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
      res.status(500).json({ error: 'Failed to cancel package', ...(config.isDevelopment && { message: error.message }) });
    }
  };

  assignSelf = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const userId = req.user!.userId;
      await this.packageService.assignRiderSelf(id, userId);
      res.json({ message: 'Job accepted' });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('already assigned') ? 409 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  unassignSelf = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const userId = req.user!.userId;
      await this.packageService.unassignRiderSelf(id, userId);
      res.json({ message: 'Job cancelled' });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  };

  confirmPickup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const { pin } = req.body;
      const tenant_id = req.user!.tenant_id;
      const result = await this.packageService.confirmPickup(id, pin ?? '', tenant_id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  confirmDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;
      const { pin } = req.body;
      const tenant_id = req.user!.tenant_id;
      const result = await this.packageService.confirmDelivery(id, pin ?? '', tenant_id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getMyPackages = async (req: Request, res: Response): Promise<void> => {
    try {
      const user_id = req.user!.userId;
      const packages = await this.packageService.getPackagesForUser(user_id);

      res.json({
        message: 'My packages retrieved successfully',
        packages
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve your packages', ...(config.isDevelopment && { message: error.message }) });
    }
  };
}