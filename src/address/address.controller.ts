import { Request, Response } from 'express';
import { AddressService } from './address.service.js';
import logger from '../utils/logger.js';

export class AddressController {
  private addressService = new AddressService();

  createAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { label, address, city, state, latitude, longitude, is_default } = req.body;

      const newAddress = await this.addressService.createAddress(userId, {
        label,
        address,
        city,
        state,
        latitude,
        longitude,
        is_default
      });

      res.status(201).json({ 
        message: 'Address created successfully',
        address: newAddress 
      });
    } catch (error: any) {
      logger.error('Create address failed', { error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Failed to create address', message: error.message });
    }
  };

  getUserAddresses = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const addresses = await this.addressService.getUserAddresses(userId);
      res.json({ addresses });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getAddressById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { addressId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const address = await this.addressService.getAddressById(addressId, userId);
      if (!address) {
        res.status(404).json({ error: 'Address not found' });
        return;
      }

      res.json({ address });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { addressId } = req.params;
      const { label, address, city, state, latitude, longitude } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.addressService.updateAddress(addressId, userId, {
        label,
        address,
        city,
        state,
        latitude,
        longitude
      });

      res.json({ message: 'Address updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  setDefaultAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { addressId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.addressService.setDefaultAddress(addressId, userId);
      res.json({ message: 'Default address updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  deleteAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { addressId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.addressService.deleteAddress(addressId, userId);
      res.json({ message: 'Address deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getDefaultAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const address = await this.addressService.getDefaultAddress(userId);
      res.json({ address });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}