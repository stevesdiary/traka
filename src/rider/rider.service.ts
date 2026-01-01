import { RiderRepository } from './rider.repository';
import { RiderModel, RiderProfile, RiderRegistration } from './rider.model';

export class RiderService {
  private riderRepository: RiderRepository;

  constructor() {
    this.riderRepository = new RiderRepository();
  }

  async registerRider(registration: RiderRegistration, userId: string): Promise<RiderModel> {
    const riderType: 'BUSINESS_MANAGED' | 'INDEPENDENT' = registration.business_id ? 'BUSINESS_MANAGED' : 'INDEPENDENT';
    
    const profile: Omit<RiderProfile, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      business_id: registration.business_id,
      full_name: registration.full_name,
      phone: registration.phone,
      license_number: registration.license_number,
      vehicle_type: registration.vehicle_type,
      vehicle_plate: registration.vehicle_plate,
      verification_status: 'PENDING',
      is_available: false,
      rider_type: riderType,
      status: 'OFFLINE'
    };

    return await this.riderRepository.createRiderProfile(profile);
  }

  async getRiderProfile(userId: string): Promise<RiderModel | null> {
    return await this.riderRepository.getRiderByUserId(userId);
  }

  async updateProfile(userId: string, updates: Partial<RiderProfile>): Promise<RiderModel> {
    const { verification_status, ...allowedUpdates } = updates;
    return await this.riderRepository.updateRiderProfile(userId, allowedUpdates);
  }

  async verifyRider(userId: string, approved: boolean): Promise<RiderModel> {
    const status = approved ? 'VERIFIED' : 'REJECTED';
    const profile = await this.riderRepository.updateVerificationStatus(userId, status);
    
    if (approved) {
      await this.riderRepository.updateRiderProfile(userId, { 
        is_available: true,
        status: 'AVAILABLE'
      });
    }
    
    return profile;
  }

  async getPendingVerifications(businessId?: string): Promise<RiderModel[]> {
    return await this.riderRepository.getPendingVerifications(businessId);
  }

  async getBusinessRiders(businessId: string): Promise<RiderModel[]> {
    return await this.riderRepository.getBusinessRiders(businessId);
  }

  async getAvailableRiders(businessId?: string): Promise<RiderModel[]> {
    return await this.riderRepository.getAvailableRiders(businessId);
  }

  async updateLocation(userId: string, latitude: number, longitude: number): Promise<RiderModel> {
    return await this.riderRepository.updateLocation(userId, latitude, longitude);
  }

  async updateStatus(userId: string, status: RiderProfile['status']): Promise<RiderModel> {
    return await this.riderRepository.updateStatus(userId, status);
  }

  async canReceiveOrders(userId: string): Promise<boolean> {
    const profile = await this.getRiderProfile(userId);
    return profile?.verification_status === 'VERIFIED' && 
           profile.is_available && 
           profile.status === 'AVAILABLE';
  }
}