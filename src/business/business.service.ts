import { TenantRepository } from '../tenant/tenant.repository.js';
import { BusinessMemberRepository } from './business-member.repository.js';
import { TenantModel } from '../tenant/tenant.model.js';

export class BusinessService {
  private tenantRepository: TenantRepository;
  private memberRepository: BusinessMemberRepository;

  constructor() {
    this.tenantRepository = new TenantRepository();
    this.memberRepository = new BusinessMemberRepository();
  }

  async createBusiness(
    creatorUserId: string,
    payload: {
      business_name: string;
      business_address?: string;
      contact_person?: string;
      phone?: string;
    }
  ): Promise<{ business: TenantModel; membership_role: string }> {
    const business = await this.tenantRepository.createTenant({
      business_name: payload.business_name,
      business_address: payload.business_address || '',
      contact_person: payload.contact_person || '',
      phone: payload.phone || '',
      status: 'ACTIVE'
    } as any);

    await this.memberRepository.addMember({
      tenant_id: business.id,
      user_id: creatorUserId,
      role: 'OWNER',
      status: 'ACTIVE'
    });

    return { business, membership_role: 'OWNER' };
  }

  async listBusinessesForUser(user_id: string): Promise<Array<{ business: TenantModel; membership_role: string }>> {
    const memberships = await this.memberRepository.findByUser(user_id);
    if (memberships.length === 0) {
      return [];
    }

    const tenantIds = memberships.map(m => m.tenant_id);
    const tenants = await this.tenantRepository.findByIds(tenantIds);

    return tenants.map(tenant => {
      const membership = memberships.find(m => m.tenant_id === tenant.id)!;
      return { business: tenant, membership_role: membership.role };
    });
  }

  async updateBusiness(
    tenant_id: string,
    user_id: string,
    payload: Partial<{ business_name: string; business_address: string; contact_person: string; phone: string }>
  ): Promise<TenantModel> {
    const membership = await this.memberRepository.findByUserAndTenant(user_id, tenant_id);
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new Error('Forbidden');
    }

    await this.tenantRepository.updateFields(tenant_id, payload);
    const updated = await this.tenantRepository.findById(tenant_id);
    if (!updated) {
      throw new Error('Business not found');
    }
    return updated;
  }
}
