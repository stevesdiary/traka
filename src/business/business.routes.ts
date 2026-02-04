import { Router } from 'express';
import { authenticateToken } from '../middleware/rolePermission.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { BusinessCreateSchema, BusinessUpdateSchema } from '../utils/validators.js';
import { BusinessController } from './business.controller.js';

const router: Router = Router();
const controller = new BusinessController();

router.use(authenticateToken);

router.post('/', validateInput(BusinessCreateSchema), controller.createBusiness);
router.get('/', controller.listBusinesses);
router.patch('/:business_id', validateInput(BusinessUpdateSchema), controller.updateBusiness);

export default router;
