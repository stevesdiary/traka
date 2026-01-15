import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: Router = Router();
const notificationController = new NotificationController();

router.use(authenticateToken);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

export default router;
