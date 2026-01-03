import { Router } from 'express';
import { MatchingController } from '../controllers/MatchingController.js';
import { authenticateToken, canUpdate, canRead } from '../../middleware/rolePermission.middleware.js';
import { Resource } from '../../utils/rolePermissions.js';

const router: Router = Router();
const matchingController = new MatchingController();

// Courier presence routes (require rider authentication)
router.put('/couriers/:courierId/location', 
  authenticateToken, 
  canUpdate(Resource.RIDER), 
  matchingController.updateLocation
);

router.put('/couriers/:courierId/status', 
  authenticateToken, 
  canUpdate(Resource.RIDER), 
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
  matchingController.findCouriers
);

router.post('/request-delivery', 
  authenticateToken, 
  canUpdate(Resource.PACKAGE), 
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