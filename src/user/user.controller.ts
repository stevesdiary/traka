import { Request, Response } from 'express';
import { UserManagementService } from './user.service.js';

export class UserManagementController {
  private userManagementService: UserManagementService;

  constructor() {
    this.userManagementService = new UserManagementService();
  }

  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { role, type, tenant_id } = req.query;
      const users = await this.userManagementService.getAllUsers(
        role as string,
        type as string,
        tenant_id as string
      );

      res.json({
        message: 'Users retrieved successfully',
        users
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData = req.body;
      const tenant_id = req.user!.tenant_id;
      if (!tenant_id) {
        res.status(403).json({ error: 'No tenant access' });
        return;
      }
      const user = await this.userManagementService.createUser(userData, tenant_id);

      res.status(201).json({
        message: 'User created successfully',
        user
      });
    } catch (error: any) {
      if (error.message === 'User already exists') {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to create user' });
    }
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = req.params;
      const tenant_id = req.user!.tenant_id;
      if (!tenant_id) {
        res.status(403).json({ error: 'No tenant access' });
        return;
      }
      const user = await this.userManagementService.getUserById(user_id, tenant_id);

      res.json({
        message: 'User retrieved successfully',
        user
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to retrieve user' });
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = req.params;
      const updateData = req.body;
      const tenant_id = req.user!.tenant_id;
      if (!tenant_id) {
        res.status(403).json({ error: 'No tenant access' });
        return;
      }
      const user = await this.userManagementService.updateUser(user_id, updateData, tenant_id);

      res.json({
        message: 'User updated successfully',
        user
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to update user' });
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = req.params;
      const tenant_id = req.user!.tenant_id;
      if (!tenant_id) {
        res.status(403).json({ error: 'No tenant access' });
        return;
      }
      await this.userManagementService.deleteUser(user_id, tenant_id);

      res.json({
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to delete user' });
    }
  };
}