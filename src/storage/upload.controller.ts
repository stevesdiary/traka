import { Request, Response } from 'express';
import storageService from './storage.service.js';
import imageProcessing from './image-processing.service.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

export class UploadController {
  uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Optimize image for web
      const optimizedBuffer = await imageProcessing.optimizeForWeb(req.file.buffer);
      req.file.buffer = optimizedBuffer;

      const key = await storageService.uploadFile(req.file, 'profiles');
      const url = storageService.getPublicUrl(key);

      res.json({ key, url });
    } catch (error: any) {
      logger.error('Profile upload failed', { error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Upload failed. Please try again later.', ...(config.isDevelopment && { details: error.message }) });
    }
  };

  uploadVehiclePicture = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Optimize image for web
      const optimizedBuffer = await imageProcessing.optimizeForWeb(req.file.buffer);
      req.file.buffer = optimizedBuffer;

      const key = await storageService.uploadFile(req.file, 'vehicles');
      const url = storageService.getPublicUrl(key);

      res.json({ key, url });
    } catch (error: any) {
      res.status(500).json({ error: 'Upload failed. Please try again later.' });
    }
  };

  uploadPackagePicture = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Optimize image for web
      const optimizedBuffer = await imageProcessing.optimizeForWeb(req.file.buffer);
      req.file.buffer = optimizedBuffer;

      const key = await storageService.uploadFile(req.file, 'packages');
      const url = storageService.getPublicUrl(key);

      res.json({ key, url });
    } catch (error: any) {
      res.status(500).json({ error: 'Upload failed. Please try again later.' });
    }
  };

  uploadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const key = await storageService.uploadFile(req.file, 'documents');
      const url = storageService.getPublicUrl(key);

      res.json({ key, url });
    } catch (error: any) {
      res.status(500).json({ error: 'Upload failed. Please try again later.' });
    }
  };

  getSignedUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params as Record<string, string>;
      const url = await storageService.getSignedUrl(key);

      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate URL. Please try again later.' });
    }
  };

  deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params as Record<string, string>;
      await storageService.deleteFile(key);

      res.json({ message: 'File deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Delete failed. Please try again later.' });
    }
  };
}
