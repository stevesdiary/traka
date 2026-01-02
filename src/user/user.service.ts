import { UserRepository } from './user.repository.js';
import bcrypt from 'bcrypt';

export class UserManagementService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAllUsers(tenant_id: string, role?: string): Promise<any[]> {
    const whereClause = role ? { role } : {};
    const users = await this.userRepository.findByTenant(tenant_id, {
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    return users.map((user: any) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }));
  }

  async createUser(userData: {
    email: string;
    password: string;
    role: string;
  }, tenant_id: string): Promise<any> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const password_hash = await bcrypt.hash(userData.password, 10);
    const user = await this.userRepository.createUser({
      ...userData,
      password_hash,
      tenant_id
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      created_at: user.createdAt
    };
  }

  async updateUser(user_id: string, updateData: {
    email?: string;
    role?: string;
  }, tenant_id: string): Promise<any> {
    const [affectedRows, updatedUsers] = await this.userRepository.updateByTenant(
      user_id,
      tenant_id,
      updateData
    );

    if (affectedRows === 0) {
      throw new Error('User not found or unauthorized');
    }

    return {
      id: updatedUsers[0].id,
      email: updatedUsers[0].email,
      role: updatedUsers[0].role,
      updated_at: updatedUsers[0].updatedAt
    };
  }

  async deleteUser(user_id: string, tenant_id: string): Promise<void> {
    const deletedRows = await this.userRepository.deleteByTenant(user_id, tenant_id);
    if (deletedRows === 0) {
      throw new Error('User not found or unauthorized');
    }
  }

  async getUserById(user_id: string, tenant_id: string): Promise<any> {
    const user = await this.userRepository.findOneByTenant(tenant_id, {
      where: { id: user_id }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };
  }
}