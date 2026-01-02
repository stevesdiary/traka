import { Router } from 'express';
import { UserManagementController } from './user.controller.js';
import { authenticateToken, canRead, canCreate, canUpdate, canDelete } from '../middleware/rolePermission.middleware.js';
import { Resource } from '../utils/rolePermissions.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreateUserSchema, UpdateUserSchema } from '../utils/validators.js';

const router: Router = Router();
const userController = new UserManagementController();

router.use(authenticateToken);

router.get('/', canRead(Resource.USER), userController.getAllUsers);
router.post('/', canCreate(Resource.USER), validateInput(CreateUserSchema), userController.createUser);
router.get('/:user_id', canRead(Resource.USER), userController.getUserById);
router.put('/:user_id', canUpdate(Resource.USER), validateInput(UpdateUserSchema), userController.updateUser);
router.delete('/:user_id', canDelete(Resource.USER), userController.deleteUser);

export default router;