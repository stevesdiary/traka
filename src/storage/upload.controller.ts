import { Request, Response } from 'express';
import storageService from './storage.service.js';

export class UploadController {
  uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const key = await storageService.uploadFile(req.file, 'profiles');
      const url = storageService.getPublicUrl(key);

      res.json({ key, url });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  };

  uploadVehiclePicture = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const key = await storageService.uploadFile(req.file, 'vehicles');
      const url = storageService.getPublicUrl(key);

      res.json({ key, url });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  };

  uploadPackagePicture = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const key = await storageService.uploadFile(req.file, 'packages');
      const url = storageService.getPublicUrl(key);

      res.json({ key, url });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Upload failed' });
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
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  };

  getSignedUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const url = await storageService.getSignedUrl(key);

      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to generate URL' });
    }
  };

  deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      await storageService.deleteFile(key);

      res.json({ message: 'File deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Delete failed' });
    }
  };
}
