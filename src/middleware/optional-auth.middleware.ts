import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { VerifyErrors, JwtPayload } from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';

// Middleware that optionally authenticates - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = (req as any).cookies?.traka_token;
  const token = headerToken || cookieToken;

  if (!token) {
    // No token provided - continue as anonymous
    next();
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }, (err: VerifyErrors | null, user: string | JwtPayload | undefined) => {
    if (!err && user) {
      req.user = user as JWTPayload;
    }
    // Invalid/expired tokens are treated as anonymous, not rejected — this is intentional for optional-auth routes
    next();
  });
};

// Re-export existing middleware
export { authenticateToken as authenticate, requireRole } from './auth.middleware.js';
