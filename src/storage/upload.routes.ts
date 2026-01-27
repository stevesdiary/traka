import { Router } from 'express';
import { UploadController } from './upload.controller.js';
import { upload } from './upload.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: Router = Router();
const uploadController = new UploadController();

router.post('/profile', authenticateToken, upload.single('file'), uploadController.uploadProfilePicture);
router.post('/vehicle', authenticateToken, upload.single('file'), uploadController.uploadVehiclePicture);
router.post('/package', authenticateToken, upload.single('file'), uploadController.uploadPackagePicture);
router.post('/document', authenticateToken, upload.single('file'), uploadController.uploadDocument);
router.get('/signed-url/:key', authenticateToken, uploadController.getSignedUrl);
router.delete('/:key', authenticateToken, uploadController.deleteFile);

export default router;
