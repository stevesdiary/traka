import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { VerifyErrors, JwtPayload } from 'jsonwebtoken';
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
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = (req as any).cookies?.traka_token;
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }, (err: VerifyErrors | null, user: string | JwtPayload | undefined) => {
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
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const canApprove = (resource: Resource) => requirePermission(resource, Action.APPROVE);
export const canRead = (resource: Resource) => requirePermission(resource, Action.READ);
export const canCreate = (resource: Resource) => requirePermission(resource, Action.CREATE);
export const canUpdate = (resource: Resource) => requirePermission(resource, Action.UPDATE);
export const canDelete = (resource: Resource) => requirePermission(resource, Action.DELETE);
export const canHardDelete = (resource: Resource) => requirePermission(resource, Action.HARD_DELETE);
