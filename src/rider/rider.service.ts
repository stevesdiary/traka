import { RiderRepository } from './rider.repository.js';
import { RiderModel, RiderProfile, RiderRegistration } from './rider.model.js';

export class RiderService {
  private riderRepository: RiderRepository;

  constructor() {
    this.riderRepository = new RiderRepository();
  }

  async registerRider(registration: RiderRegistration, userId: string): Promise<RiderModel> {
    const { UserRepository } = await import('../user/user.repository.js');
    const userRepository = new UserRepository();
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.type !== 'USER') {
      throw new Error(`Cannot create rider profile. User type is already set to ${user.type}`);
    }

    const existingProfile = await this.riderRepository.getRiderByUserId(userId);
    if (existingProfile) {
      throw new Error('Rider profile already exists for this user');
    }

    const riderType: 'BUSINESS_MANAGED' | 'INDEPENDENT' = registration.business_id ? 'BUSINESS_MANAGED' : 'INDEPENDENT';
    
    const profile: Omit<RiderProfile, 'id' | 'rider_id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      business_id: registration.business_id,
      license_number: registration.license_number,
      vehicle_type: registration.vehicle_type,
      vehicle_plate: registration.vehicle_plate,
      verification_status: 'PENDING',
      is_available: false,
      rider_type: riderType,
      status: 'OFFLINE'
    };

    const riderProfile = await this.riderRepository.createRiderProfile(profile);

    await userRepository.updateById(userId, { 
      type: 'RIDER',
      role: 'RIDER'
    });

    return riderProfile;
  }

  async getRiderProfile(userId: string): Promise<RiderModel | null> {
    return await this.riderRepository.getRiderByUserId(userId);
  }

  async getRiderById(riderId: string): Promise<RiderModel | null> {
    return await this.riderRepository.findByRiderId(riderId);
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

  async softDeleteRider(riderId: string, businessId?: string): Promise<void> {
    const rider = await this.riderRepository.findByIdWithUser(riderId);
    if (!rider) throw new Error('Rider not found');
    
    if (businessId && rider.business_id !== businessId) {
      throw new Error('Unauthorized: Rider does not belong to this business');
    }

    const hasActive = await this.riderRepository.hasActiveDeliveries(riderId);
    if (hasActive) {
      throw new Error('Cannot delete rider with active deliveries');
    }

    const balance = await this.riderRepository.getRiderWalletBalance(rider.user_id);
    if (balance < 0) {
      throw new Error('Cannot delete rider with negative wallet balance');
    }

    await this.riderRepository.updateRiderProfile(rider.user_id, {
      status: 'OFFLINE',
      is_available: false
    });

    await this.riderRepository.softDeleteRider(riderId);

    // Send notification email
    try {
      const { EmailNotificationService } = await import('../notification/email.service.js');
      const emailService = new EmailNotificationService();
      const fullName = `${rider.user.first_name} ${rider.user.last_name}`;
      await emailService.sendNotification(
        rider.user.email,
        'Account Deactivated',
        `Dear ${fullName},\n\nYour rider account (${rider.rider_id}) has been deactivated. If you believe this is an error, please contact support.`
      );
    } catch (error) {
      console.error('Failed to send deletion notification:', error);
    }
  }

  async hardDeleteRider(riderId: string): Promise<void> {
    await this.riderRepository.hardDeleteRider(riderId);
  }

  async restoreRider(riderId: string, businessId?: string): Promise<RiderModel | null> {
    const rider = await this.riderRepository.findByIdIncludingDeleted(riderId);
    if (!rider) throw new Error('Rider not found');
    
    if (businessId && rider.business_id !== businessId) {
      throw new Error('Unauthorized: Rider does not belong to this business');
    }

    if (rider.deletedAt) {
      const daysSinceDeleted = Math.floor(
        (Date.now() - rider.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDeleted > 30) {
        throw new Error('Cannot restore rider deleted more than 30 days ago');
      }
    }

    return await this.riderRepository.restoreRider(riderId);
  }

  async getDeletedRiders(businessId?: string): Promise<RiderModel[]> {
    return await this.riderRepository.getDeletedRiders(businessId);
  }
}