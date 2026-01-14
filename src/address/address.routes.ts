import { Router } from 'express';
import { AddressController } from './address.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: Router = Router();
const addressController = new AddressController();

router.use(authenticateToken);

// Address management routes
router.post('/', addressController.createAddress);
router.get('/', addressController.getUserAddresses);
router.get('/default', addressController.getDefaultAddress);
router.get('/:addressId', addressController.getAddressById);
router.put('/:addressId', addressController.updateAddress);
router.put('/:addressId/default', addressController.setDefaultAddress);
router.delete('/:addressId', addressController.deleteAddress);

export { router as addressRoutes };