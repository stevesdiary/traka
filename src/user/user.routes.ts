import { Router } from 'express';
import { UserManagementController } from './user.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateInput } from '../middleware/validation.middleware.js';
import { CreateUserSchema, UpdateUserSchema } from '../utils/validators.js';

const router: Router = Router();
const userController = new UserManagementController();

// All user management routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/', userController.getAllUsers);
router.post('/', validateInput(CreateUserSchema), userController.createUser);
router.get('/:user_id', userController.getUserById);
router.put('/:user_id', validateInput(UpdateUserSchema), userController.updateUser);
router.delete('/:user_id', userController.deleteUser);

export default router;