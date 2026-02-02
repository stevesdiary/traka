import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository.js';
import { RiderRepository } from '../rider/rider.repository.js';
import { TenantRepository } from '../tenant/tenant.repository.js';
import { VerificationService } from '../verification/verification.service.js';
import { JWTPayload } from '../types/index.js';

export class AuthService {
  private userRepository: UserRepository;
  private riderRepository: RiderRepository;
  private tenantRepository: TenantRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.riderRepository = new RiderRepository();
    this.tenantRepository = new TenantRepository();
  }

  async requestPasswordReset(email: string): Promise<void> {
    const verificationService = new VerificationService();
    await verificationService.sendPasswordResetCode(email);
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const verificationService = new VerificationService();
    const isValid = await verificationService.verifyPasswordResetCode(email, code);
    
    if (!isValid) {
      throw new Error('Invalid or expired reset code');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updateByEmail(email, { password_hash });
    await verificationService.clearResetToken(email);
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updateById(userId, { password_hash });
  }

  async login(email: string, password: string): Promise<{ token: string; user: any } | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return null;

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) return null;

    const payload: JWTPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
      tenant_id: user.tenant_id ?? null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        type: user.type,
        tenant_id: user.tenant_id
      }
    };
  }

  // Customer Registration (for package tracking)
  async registerCustomer(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
  }): Promise<{ token: string; user: any }> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const password_hash = await bcrypt.hash(userData.password, 10);
    const user = await this.userRepository.createUser({
      email: userData.email,
      password_hash,
      role: 'USER',
      type: 'USER',
      tenant_id: null, // Recipients are not tied to any tenant
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone
    });

    const payload: JWTPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
      tenant_id: null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        type: user.type,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone
      }
    };
  }

  // Business Registration (creates tenant + business owner)
  async registerBusiness(businessData: {
    email: string;
    password: string;
    business_name: string;
    business_address: string;
    contact_person: string;
    phone: string;
  }): Promise<{ token: string; user: any; business: any }> {
    const existingUser = await this.userRepository.findByEmail(businessData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create tenant (business)
    const tenant = await this.tenantRepository.createTenant({
      business_name: businessData.business_name,
      business_address: businessData.business_address,
      contact_person: businessData.contact_person,
      phone: businessData.phone,
      status: 'PENDING'
    });

    // Create business owner user
    const password_hash = await bcrypt.hash(businessData.password, 10);
    const user = await this.userRepository.createUser({
      email: businessData.email,
      password_hash,
      role: 'BUSINESS_OWNER',
      type: 'BUSINESS_OWNER',
      tenant_id: tenant.id
    });

    const payload: JWTPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
      tenant_id: user.tenant_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        type: user.type,
        tenant_id: user.tenant_id
      },
      business: {
        id: tenant.id,
        business_name: tenant.business_name,
        status: tenant.status
      }
    };
  }

  // Rider Registration (creates user + rider profile)
  async registerRider(riderData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
    license_number: string;
    vehicle_type: 'BICYCLE' | 'MOTORCYCLE';
    vehicle_plate: string;
    business_id?: string;
  }): Promise<{ token: string; user: any; rider_profile: any }> {
    const existingUser = await this.userRepository.findByEmail(riderData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const tenant_id = riderData.business_id || null; // Solo riders have no tenant
    const rider_type = riderData.business_id ? 'BUSINESS_MANAGED' : 'INDEPENDENT';

    // Create user account
    const password_hash = await bcrypt.hash(riderData.password, 10);
    const user = await this.userRepository.createUser({
      email: riderData.email,
      password_hash,
      role: 'RIDER',
      type: 'RIDER',
      tenant_id,
      first_name: riderData.first_name,
      last_name: riderData.last_name,
      phone: riderData.phone
    });

    // Create rider profile
    const riderProfile = await this.riderRepository.createRiderProfile({
      user_id: user.id,
      business_id: riderData.business_id,
      license_number: riderData.license_number,
      vehicle_type: riderData.vehicle_type,
      vehicle_plate: riderData.vehicle_plate,
      verification_status: 'PENDING',
      is_available: false,
      rider_type,
      status: 'OFFLINE'
    });

    const payload: JWTPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
      tenant_id: user.tenant_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        type: user.type,
        tenant_id: user.tenant_id
      },
      rider_profile: {
        id: riderProfile.id,
        rider_id: riderProfile.rider_id,
        rider_type: riderProfile.rider_type,
        verification_status: riderProfile.verification_status
      }
    };
  }

  // Legacy register method (kept for backward compatibility)
  async register(userData: {
    email: string;
    password: string;
    role: string;
    tenant_id: string;
  }): Promise<any> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const password_hash = await bcrypt.hash(userData.password, 10);
    const user = await this.userRepository.createUser({
      ...userData,
      password_hash,
      type: userData.role
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id
    };
  }

  // Admin Registration (Super Admin only)
  async registerAdmin(adminData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: 'ADMIN' | 'SUPER_ADMIN' | 'MANAGER';
  }): Promise<{ token: string; user: any }> {
    const existingUser = await this.userRepository.findByEmail(adminData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const password_hash = await bcrypt.hash(adminData.password, 10);
    const user = await this.userRepository.createUser({
      email: adminData.email,
      password_hash,
      role: adminData.role,
      type: adminData.role,
      tenant_id: null,
      first_name: adminData.first_name,
      last_name: adminData.last_name,
      phone: adminData.phone
    });

    await this.userRepository.updateByEmail(adminData.email, {
      email_verified: true,
      phone_verified: true
    });

    const payload: JWTPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
      tenant_id: null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        type: user.type,
        first_name: adminData.first_name,
        last_name: adminData.last_name,
        phone: adminData.phone,
        email_verified: true,
        phone_verified: true
      }
    };
  }
}
