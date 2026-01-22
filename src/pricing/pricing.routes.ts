import { Router } from 'express';
import { pricingController } from './pricing.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { calculatePriceSchema } from '../utils/pricing-calculation.validators.js';

const router: Router = Router();

router.post(
  '/calculate',
  authenticateToken,
  validateInput(calculatePriceSchema),
  pricingController.calculatePrice.bind(pricingController)
);

export default router;
