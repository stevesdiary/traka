import { Router } from 'express';
import { WaitlistController } from './waitlist.controller.js';
import { authenticateToken, requirePermission } from '../middleware/rolePermission.middleware.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();
const controller = new WaitlistController();

// Public route
router.post('/', controller.addToWaitlist);

// Admin routes
router.get('/', authenticateToken, requirePermission(Resource.USER, Action.READ), controller.getWaitlist);
router.get('/by-city', authenticateToken, requirePermission(Resource.USER, Action.READ), controller.getWaitlistByCity);
router.post('/notify', authenticateToken, requirePermission(Resource.USER, Action.UPDATE), controller.notifyWaitlist);

export default router;
