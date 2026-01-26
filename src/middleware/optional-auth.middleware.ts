import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';

// Middleware that optionally authenticates - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided - continue as anonymous
    next();
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (!err && user) {
      // Valid token - attach user
      req.user = user as JWTPayload;
    }
    // Continue regardless of token validity
    next();
  });
};

// Re-export existing middleware
export { authenticateToken as authenticate, requireRole } from './auth.middleware.js';
