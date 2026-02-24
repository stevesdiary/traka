import { RiderRepository } from '../rider/rider.repository.js';
import { PackageRepository } from '../package/package.repository.js';
import { UserRepository } from '../user/user.repository.js';

export class DashboardService {
  private riderRepository: RiderRepository;
  private packageRepository: PackageRepository;
  private userRepository: UserRepository;

  constructor() {
    this.riderRepository = new RiderRepository();
    this.packageRepository = new PackageRepository();
    this.userRepository = new UserRepository();
  }

  // Tenant Manager Dashboard Methods
  async getTenantStats(tenant_id: string): Promise<any> {
    const [totalRiders, availableRiders, totalPackages, activePackages] = await Promise.all([
      this.riderRepository.getBusinessRiders(tenant_id),
      this.riderRepository.getAvailableRiders(tenant_id),
      this.packageRepository.findByTenant(tenant_id),
      this.packageRepository.findByTenant(tenant_id, { where: { status: 'IN_TRANSIT' } })
    ]);

    return {
      riders: {
        total: totalRiders.length,
        available: availableRiders.length,
        busy: totalRiders.filter(r => r.status === 'BUSY').length,
        offline: totalRiders.filter(r => r.status === 'OFFLINE').length
      },
      packages: {
        total: totalPackages.length,
        pending: totalPackages.filter(p => p.status === 'PENDING').length,
        in_transit: activePackages.length,
        delivered: totalPackages.filter(p => p.status === 'DELIVERED').length
      }
    };
  }

  async getTenantActivity(tenant_id: string, limit: number = 10): Promise<any> {
    const recentPackages = await this.packageRepository.findByTenant(tenant_id, {
      limit,
      order: [['createdAt', 'DESC']]
    });

    return {
      recent_activity: recentPackages.map(pkg => ({
        id: pkg.id,
        tracking_number: pkg.tracking_number,
        status: pkg.status,
        created_at: pkg.createdAt
      }))
    };
  }

  async getTenantRiders(tenant_id: string): Promise<any[]> {
    const riders = await this.riderRepository.getBusinessRiders(tenant_id);
    return riders.map(rider => ({
      id: rider.id,
      full_name: `${rider.user.first_name} ${rider.user.last_name}`,
      phone: rider.user.phone,
      vehicle_type: rider.vehicle_type,
      vehicle_plate: rider.vehicle_plate,
      status: rider.status,
      verification_status: rider.verification_status,
      is_available: rider.is_available
    }));
  }

  async getTenantPackages(tenant_id: string, status?: string): Promise<any[]> {
    const whereClause = status ? { status } : {};
    const packages = await this.packageRepository.findByTenant(tenant_id, {
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    return packages.map(pkg => ({
      id: pkg.id,
      tracking_number: pkg.tracking_number,
      status: pkg.status,
      delivery_address: pkg.delivery_address,
      description: pkg.description,
      created_at: pkg.createdAt
    }));
  }

  // Platform Admin Dashboard Methods
  async getPlatformStats(): Promise<any> {
    const [allRiders, allPackages, allUsers] = await Promise.all([
      this.riderRepository.findAll(),
      this.packageRepository.findAll(),
      this.userRepository.findAll()
    ]);

    return {
      total_riders: allRiders.length,
      total_packages: allPackages.length,
      total_users: allUsers.length,
      active_riders: allRiders.filter(r => r.status === 'AVAILABLE').length,
      delivered_packages: allPackages.filter(p => p.status === 'DELIVERED').length
    };
  }

  async getAllTenantsOverview(): Promise<any[]> {
    const tenants = await this.riderRepository.getUniqueTenants();

    return Promise.all(tenants.map(async (tenant: any) => {
      const stats = await this.getTenantStats(tenant.business_id);
      return {
        tenant_id: tenant.business_id,
        ...stats
      };
    }));
  }

  async getAllTenants(): Promise<any[]> {
    const tenants = await this.riderRepository.getUniqueTenants();

    return tenants.map((tenant: any) => ({
      id: tenant.business_id,
      name: `Business ${tenant.business_id}`
    }));
  }

  async getPlatformAnalytics(): Promise<any> {
    const platformStats = await this.getPlatformStats();
    const tenantsOverview = await this.getAllTenantsOverview();

    return {
      platform_overview: platformStats,
      tenant_breakdown: tenantsOverview,
      growth_metrics: {
        total_tenants: tenantsOverview.length,
        avg_riders_per_tenant: platformStats.total_riders / tenantsOverview.length || 0,
        avg_packages_per_tenant: platformStats.total_packages / tenantsOverview.length || 0
      }
    };
  }

  async getRiderStats(userId: string): Promise<any> {
    const [rider, packages] = await Promise.all([
      this.riderRepository.getRiderByUserId(userId),
      this.packageRepository.findByRiderId(userId)
    ]);

    const { RatingRepository } = await import("../rating/rating.repository.js");
    const ratingRepo = new RatingRepository();
    const ratings = await ratingRepo.getRiderStats(userId);

    const completed = packages.filter(p => p.status === 'DELIVERED').length;
    // Mock earnings calculation for now
    const earnings = completed * 1500; 

    return {
      stats: {
        total_deliveries: completed,
        active_deliveries: packages.filter(p => p.status === 'IN_TRANSIT').length,
        rating: ratings.avgRating,
        total_earnings: earnings,
        balance: earnings * 0.8 // assuming 20% platform fee
      }
    };
  }
}