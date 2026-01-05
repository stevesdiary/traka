import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository.js';
import { RiderRepository } from '../rider/rider.repository.js';
import { TenantRepository } from '../tenant/tenant.repository.js';
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
      tenant_id: user.tenant_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      }
    };
  }

  // Customer Registration (for package tracking)
  async registerCustomer(userData: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
  }): Promise<any> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const password_hash = await bcrypt.hash(userData.password, 10);
    const user = await this.userRepository.createUser({
      email: userData.email,
      password_hash,
      role: 'RECIPIENT',
      tenant_id: 'public' // Public tenant for individual customers
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: userData.full_name,
      phone: userData.phone
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
  }): Promise<any> {
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
      tenant_id: tenant.id
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
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
    full_name: string;
    phone: string;
    license_number: string;
    vehicle_type: 'BICYCLE' | 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
    vehicle_plate: string;
    business_id?: string;
  }): Promise<any> {
    const existingUser = await this.userRepository.findByEmail(riderData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const tenant_id = riderData.business_id || 'public';
    const rider_type = riderData.business_id ? 'BUSINESS_MANAGED' : 'INDEPENDENT';

    // Create user account
    const password_hash = await bcrypt.hash(riderData.password, 10);
    const user = await this.userRepository.createUser({
      email: riderData.email,
      password_hash,
      role: 'RIDER',
      tenant_id
    });

    // Create rider profile
    const riderProfile = await this.riderRepository.createRiderProfile({
      user_id: user.id,
      business_id: riderData.business_id,
      full_name: riderData.full_name,
      phone: riderData.phone,
      license_number: riderData.license_number,
      vehicle_type: riderData.vehicle_type,
      vehicle_plate: riderData.vehicle_plate,
      verification_status: 'PENDING',
      is_available: false,
      rider_type,
      status: 'OFFLINE'
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      },
      rider_profile: {
        id: riderProfile.id,
        full_name: riderProfile.full_name,
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
      password_hash
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id
    };
  }
}