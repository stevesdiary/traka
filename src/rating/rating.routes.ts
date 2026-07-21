import { Router } from 'express';
import { RatingController } from './rating.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreateRatingSchema } from '../utils/validators.js';

const router: Router = Router();
const ratingController = new RatingController();

router.post('/', authenticateToken, validateInput(CreateRatingSchema), ratingController.createRating);
router.get('/public', ratingController.getPublicRatings);
router.get('/rider/:rider_id', ratingController.getRiderRatings);
router.get('/rider/:rider_id/stats', ratingController.getRiderStats);

export default router;
