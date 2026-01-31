import { Router } from 'express';
import { promotionController } from './promotion.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { canCreate, canRead, canUpdate } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreatePromotionSchema, UpdatePromotionSchema, RedeemPromotionSchema } from '../utils/validators.js';
import { Resource } from '../utils/rolePermissions.js';

const router: Router = Router();

// Admin routes
router.post(
  '/',
  authenticateToken,
  canCreate(Resource.PROMOTION),
  validateInput(CreatePromotionSchema),
  promotionController.createPromotion
);

router.get(
  '/',
  authenticateToken,
  canRead(Resource.PROMOTION),
  promotionController.listPromotions
);

router.get(
  '/:id',
  authenticateToken,
  canRead(Resource.PROMOTION),
  promotionController.getPromotionById
);

router.get(
  '/:id/usages',
  authenticateToken,
  canRead(Resource.PROMOTION),
  promotionController.getPromotionUsages
);

router.put(
  '/:id',
  authenticateToken,
  canUpdate(Resource.PROMOTION),
  validateInput(UpdatePromotionSchema),
  promotionController.updatePromotion
);

// User route to redeem promotion
router.post(
  '/redeem',
  authenticateToken,
  validateInput(RedeemPromotionSchema),
  promotionController.redeemPromotion
);

export default router;
