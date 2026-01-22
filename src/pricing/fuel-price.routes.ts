import { Router } from 'express';
import { fuelPriceController } from './fuel-price.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { updateFuelPriceSchema } from '../utils/pricing.validators.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();

router.put(
  '/fuel-price',
  authenticateToken,
  requirePermission(Resource.SYSTEM, Action.UPDATE),
  validateInput(updateFuelPriceSchema),
  fuelPriceController.updateFuelPrice.bind(fuelPriceController)
);

router.get(
  '/fuel-price',
  authenticateToken,
  fuelPriceController.getFuelPrice.bind(fuelPriceController)
);

export default router;
