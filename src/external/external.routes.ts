import { Router } from 'express';
import { requireApiKey } from '../middleware/api-key.middleware.js';
import { createOrder, trackOrder, confirmDelivery } from './orders.controller.js';
import { bookRide } from './rides.controller.js';

const router = Router();

router.use(requireApiKey);

// Order management
router.post('/orders', createOrder);
router.get('/orders/:tracking_number', trackOrder);
router.post('/orders/:tracking_number/confirm', confirmDelivery);

// Ride / on-demand courier booking
router.post('/rides', bookRide);

export default router;
