import { Router } from 'express';
import { MatchingController } from '../controllers/MatchingController.js';
import { authenticateToken, canUpdate, canRead } from '../../middleware/rolePermission.middleware.js';
import { validateInput } from '../../middleware/validation.middleware.js';
import { UpdateCourierLocationSchema, UpdateCourierStatusSchema, FindCouriersSchema } from '../../utils/validators.js';
import { Resource } from '../../utils/rolePermissions.js';

const router: Router = Router();
const matchingController = new MatchingController();

// Courier presence routes (require rider authentication)
router.put('/couriers/:courierId/location', 
  authenticateToken, 
  canUpdate(Resource.RIDER),
  validateInput(UpdateCourierLocationSchema), 
  matchingController.updateLocation
);

router.put('/couriers/:courierId/status', 
  authenticateToken, 
  canUpdate(Resource.RIDER),
  validateInput(UpdateCourierStatusSchema), 
  matchingController.updateStatus
);

router.get('/couriers/:courierId/state', 
  authenticateToken, 
  canRead(Resource.RIDER), 
  matchingController.getCourierState
);

// Matching routes (require package permissions)
router.post('/find-couriers', 
  authenticateToken, 
  canRead(Resource.PACKAGE),
  validateInput(FindCouriersSchema), 
  matchingController.findCouriers
);

router.post('/request-delivery', 
  authenticateToken, 
  canUpdate(Resource.PACKAGE),
  validateInput(FindCouriersSchema), 
  matchingController.requestDelivery
);

// Courier response routes
router.post('/offers/:courierId/:requestId/accept', 
  authenticateToken, 
  canUpdate(Resource.RIDER), 
  matchingController.acceptOffer
);

router.post('/offers/:courierId/:requestId/reject', 
  authenticateToken, 
  canUpdate(Resource.RIDER), 
  matchingController.rejectOffer
);

// Debug routes (admin only)
router.get('/debug/available-couriers', 
  authenticateToken, 
  canRead(Resource.DASHBOARD), 
  matchingController.getAvailableCouriers
);

export default router;