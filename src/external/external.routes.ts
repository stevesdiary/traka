import { Router } from 'express';
import { requireApiKey } from '../middleware/api-key.middleware.js';
import { createOrder, createBulkOrders, trackOrder, confirmDelivery, updateRecipient } from './orders.controller.js';
import { bookRide } from './rides.controller.js';

const router = Router();

router.use(requireApiKey);

// Order management
router.post('/orders/bulk', createBulkOrders);
router.post('/orders', createOrder);
router.get('/orders/:tracking_number', trackOrder);
router.post('/orders/:tracking_number/confirm', confirmDelivery);
router.patch('/orders/:tracking_number/recipient', updateRecipient);

// Ride / on-demand courier booking
router.post('/rides', bookRide);

export default router;
