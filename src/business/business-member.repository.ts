import { BusinessMemberModel } from './business-member.model.js';
import { BaseRepository } from '../repositories/base.repository.js';

export class BusinessMemberRepository extends BaseRepository<BusinessMemberModel> {
  constructor() {
    super(BusinessMemberModel);
  }

  async addMember(payload: {
    tenant_id: string;
    user_id: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    status?: 'ACTIVE' | 'INVITED';
  }): Promise<BusinessMemberModel> {
    return this.model.create({ status: 'ACTIVE', ...payload });
  }

  async findByUser(user_id: string): Promise<BusinessMemberModel[]> {
    return this.model.findAll({ where: { user_id } });
  }

  async findByUserAndTenant(user_id: string, tenant_id: string): Promise<BusinessMemberModel | null> {
    return this.model.findOne({ where: { user_id, tenant_id } });
  }
}
