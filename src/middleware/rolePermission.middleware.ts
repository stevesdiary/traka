import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, Resource, Action, PermissionService } from '../utils/rolePermissions.js';
import { JWTPayload } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user as JWTPayload;
    next();
  });
};

export const requirePermission = (resource: Resource, action: Action) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role as Role;
    if (!PermissionService.hasPermission(userRole, resource, action)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: `${action} ${resource}`,
        user_role: userRole
      });
    }
    next();
  };
};

export const canApprove = (resource: Resource) => requirePermission(resource, Action.APPROVE);
export const canRead = (resource: Resource) => requirePermission(resource, Action.READ);
export const canCreate = (resource: Resource) => requirePermission(resource, Action.CREATE);
export const canUpdate = (resource: Resource) => requirePermission(resource, Action.UPDATE);
export const canDelete = (resource: Resource) => requirePermission(resource, Action.DELETE);