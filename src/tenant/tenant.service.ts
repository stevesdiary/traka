import { TenantRepository } from './tenant.repository';
import { TenantModel, Tenant } from './tenant.model';

export class TenantService {
  private tenantRepository: TenantRepository;

  constructor() {
    this.tenantRepository = new TenantRepository();
  }

  async getAllTenants(): Promise<TenantModel[]> {
    return await this.tenantRepository.getAllTenants();
  }

  async getTenantById(id: string): Promise<TenantModel | null> {
    return await this.tenantRepository.findById(id);
  }

  async approveTenant(id: string): Promise<TenantModel> {
    return await this.tenantRepository.updateStatus(id, 'ACTIVE');
  }

  async suspendTenant(id: string): Promise<TenantModel> {
    return await this.tenantRepository.updateStatus(id, 'SUSPENDED');
  }

  async getPendingTenants(): Promise<TenantModel[]> {
    const allTenants = await this.tenantRepository.getAllTenants();
    return allTenants.filter(tenant => tenant.status === 'PENDING');
  }

  async getActiveTenants(): Promise<TenantModel[]> {
    const allTenants = await this.tenantRepository.getAllTenants();
    return allTenants.filter(tenant => tenant.status === 'ACTIVE');
  }
}