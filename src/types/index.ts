export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'BUSINESS_OWNER' | 'RIDER' | 'RECIPIENT | SUPER_ADMIN';
  tenant_id: string;
  created_at: Date;
}

export interface Package {
  id: string;
  tracking_number: string;
  sender_id: string;
  recipient_id: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  tenant_id: string;
  created_at: Date;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: Date;
  package_id?: string;
  rider_id?: string;
}

export interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  vehicle_type: string;
  vehicle_plate: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  current_latitude?: number;
  current_longitude?: number;
  tenant_id: string;
  created_at: Date;
}

export interface JWTPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
  tenant_id: string;
}