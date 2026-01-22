export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  RIDER = 'RIDER',
  USER = 'USER'
}

export enum Action {
  APPROVE = 'APPROVE',
  READ = 'READ',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export enum Resource {
  USER = 'USER',
  TENANT = 'TENANT',
  PACKAGE = 'PACKAGE',
  RIDER = 'RIDER',
  DASHBOARD = 'DASHBOARD',
  SYSTEM = 'SYSTEM'
}

type RolePermissions = {
  [key in Resource]: Action[];
};

export const ROLE_PERMISSIONS: Record<Role, Partial<RolePermissions>> = {
  [Role.SUPER_ADMIN]: {
    [Resource.USER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.TENANT]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE],
    [Resource.PACKAGE]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    [Resource.RIDER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.APPROVE],
    [Resource.DASHBOARD]: [Action.READ],
    [Resource.SYSTEM]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE]
  },
  
  [Role.ADMIN]: {
    [Resource.USER]: [Action.CREATE, Action.READ, Action.UPDATE],
    [Resource.TENANT]: [Action.READ, Action.APPROVE],
    [Resource.PACKAGE]: [Action.READ, Action.UPDATE],
    [Resource.RIDER]: [Action.READ, Action.APPROVE],
    [Resource.DASHBOARD]: [Action.READ],
    [Resource.SYSTEM]: [Action.READ, Action.UPDATE]
  },
  
  [Role.MANAGER]: {
    [Resource.PACKAGE]: [Action.CREATE, Action.READ, Action.UPDATE],
    [Resource.RIDER]: [Action.READ],
    [Resource.DASHBOARD]: [Action.READ]
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
}