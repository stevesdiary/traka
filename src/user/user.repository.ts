import { BaseRepository } from '../repositories/base.repository.js';
import { UserModel } from './user.model.js';

export class UserRepository extends BaseRepository<UserModel> {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.model.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<UserModel | null> {
    return this.model.findOne({ where: { phone } });
  }

  async createUser(userData: {
    email: string;
    password_hash: string;
    role: string;
    tenant_id: string;
  }): Promise<UserModel> {
    return this.model.create(userData as any);
  }
}