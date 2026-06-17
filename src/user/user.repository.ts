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
    type: string;
    tenant_id: string | null;
    first_name?: string;
    surname?: string;
    phone?: string;
    terms_accepted_at?: Date | null;
  }): Promise<UserModel> {
    return this.model.create(userData as any);
  }

  async updateByEmail(email: string, updates: Partial<UserModel>): Promise<void> {
    await this.model.update(updates, { where: { email } });
  }

  async updateByPhone(phone: string, updates: Partial<UserModel>): Promise<void> {
    await this.model.update(updates, { where: { phone } });
  }
}