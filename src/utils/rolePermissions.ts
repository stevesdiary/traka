export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  RIDER = 'RIDER',
  USER = 'USER'
}

export enum Action {
  APPROVE = 'APPROVE',
  READ = 'READ',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  HARD_DELETE = 'HARD_DELETE'
}

export enum Resource {
  USER = 'USER',
  TENANT = 'TENANT',
  PACKAGE = 'PACKAGE',
  RIDER = 'RIDER',
  DASHBOARD = 'DASHBOARD',
  SYSTEM = 'SYSTEM',
  PROMOTION = 'PROMOTION'
}

type RolePermissions = {
  [key in Resource]: Action[];
};

export const ROLE_PERMISSIONS: Record<Role, Partial<RolePermissions>> = {
  [Role.SUPER_ADMIN]: {
    [Resource.USER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.TENANT]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE],
    [Resource.PACKAGE]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.RIDER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE, Action.HARD_DELETE],
    [Resource.DASHBOARD]: [Action.READ],
    [Resource.SYSTEM]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.PROMOTION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]
  },
  
  [Role.ADMIN]: {
    [Resource.USER]: [Action.CREATE, Action.READ, Action.UPDATE],
    [Resource.TENANT]: [Action.READ, Action.APPROVE],
    [Resource.PACKAGE]: [Action.READ, Action.UPDATE],
    [Resource.RIDER]: [Action.READ, Action.APPROVE],
    [Resource.DASHBOARD]: [Action.READ],
    [Resource.SYSTEM]: [Action.READ, Action.UPDATE],
    [Resource.PROMOTION]: [Action.CREATE, Action.READ, Action.UPDATE]
  },
  
  [Role.MANAGER]: {
    [Resource.USER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.TENANT]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE],
    [Resource.PACKAGE]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.RIDER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE],
    [Resource.DASHBOARD]: [Action.READ],
    [Resource.SYSTEM]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.PROMOTION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]
  },

  [Role.BUSINESS_OWNER]: {
    [Resource.USER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.TENANT]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE],
    [Resource.PACKAGE]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.RIDER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE],
    [Resource.DASHBOARD]: [Action.READ],
    [Resource.SYSTEM]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.PROMOTION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]
  },
  
  [Role.RIDER]: {
    [Resource.PACKAGE]: [Action.READ, Action.UPDATE],
    [Resource.RIDER]: [Action.READ, Action.UPDATE]
  },
  
  [Role.USER]: {
    [Resource.PACKAGE]: [Action.READ]
  }
};

export class PermissionService {
  static hasPermission(role: Role, resource: Resource, action: Action): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role];
    const resourcePermissions = rolePermissions?.[resource];
    return resourcePermissions?.includes(action) || false;
  }
  
  static canApprove(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, Action.APPROVE);
  }
  
  static canRead(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, Action.READ);
  }
  
  static canCreate(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, Action.CREATE);
  }
  
  static canUpdate(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, Action.UPDATE);
  }
  
  static canDelete(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, Action.DELETE);
  }

  static canHardDelete(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, Action.HARD_DELETE);
  }
}
