export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  RIDER = 'RIDER',
  USER = 'USER'
}

export enum Permission {
  // User Management
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  
  // Tenant Management
  CREATE_TENANT = 'CREATE_TENANT',
  READ_TENANT = 'READ_TENANT',
  UPDATE_TENANT = 'UPDATE_TENANT',
  DELETE_TENANT = 'DELETE_TENANT',
  APPROVE_TENANT = 'APPROVE_TENANT',
  SUSPEND_TENANT = 'SUSPEND_TENANT',
  
  // Package Management
  CREATE_PACKAGE = 'CREATE_PACKAGE',
  READ_PACKAGE = 'READ_PACKAGE',
  UPDATE_PACKAGE = 'UPDATE_PACKAGE',
  DELETE_PACKAGE = 'DELETE_PACKAGE',
  TRACK_PACKAGE = 'TRACK_PACKAGE',
  
  // Rider Management
  CREATE_RIDER = 'CREATE_RIDER',
  READ_RIDER = 'READ_RIDER',
  UPDATE_RIDER = 'UPDATE_RIDER',
  DELETE_RIDER = 'DELETE_RIDER',
  VERIFY_RIDER = 'VERIFY_RIDER',
  
  // System Management
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  MANAGE_SYSTEM = 'MANAGE_SYSTEM'
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // Full system access
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.CREATE_TENANT,
    Permission.READ_TENANT,
    Permission.UPDATE_TENANT,
    Permission.DELETE_TENANT,
    Permission.APPROVE_TENANT,
    Permission.SUSPEND_TENANT,
    Permission.CREATE_PACKAGE,
    Permission.READ_PACKAGE,
    Permission.UPDATE_PACKAGE,
    Permission.DELETE_PACKAGE,
    Permission.TRACK_PACKAGE,
    Permission.CREATE_RIDER,
    Permission.READ_RIDER,
    Permission.UPDATE_RIDER,
    Permission.DELETE_RIDER,
    Permission.VERIFY_RIDER,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_SYSTEM
  ],
  
  [Role.ADMIN]: [
    // Admin access (no system management)
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.READ_TENANT,
    Permission.APPROVE_TENANT,
    Permission.SUSPEND_TENANT,
    Permission.READ_PACKAGE,
    Permission.UPDATE_PACKAGE,
    Permission.TRACK_PACKAGE,
    Permission.READ_RIDER,
    Permission.VERIFY_RIDER,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS
  ],
  
  [Role.MANAGER]: [
    // Business owner permissions
    Permission.CREATE_PACKAGE,
    Permission.READ_PACKAGE,
    Permission.UPDATE_PACKAGE,
    Permission.TRACK_PACKAGE,
    Permission.READ_RIDER,
    Permission.VIEW_DASHBOARD
  ],
  
  [Role.RIDER]: [
    // Rider permissions
    Permission.READ_PACKAGE,
    Permission.UPDATE_PACKAGE,
    Permission.TRACK_PACKAGE,
    Permission.READ_RIDER,
    Permission.UPDATE_RIDER
  ],
  
  [Role.USER]: [
    // Basic user permissions
    Permission.TRACK_PACKAGE
  ]
};

export class PermissionService {
  static hasPermission(userRole: Role, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    return rolePermissions.includes(permission);
  }
  
  static hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }
  
  static hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }
  
  static getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}