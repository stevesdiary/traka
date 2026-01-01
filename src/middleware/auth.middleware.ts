import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth/auth.service';
import { JWTPayload } from '../types/index';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const authService = new AuthService();

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

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Auth route handlers
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    if (!result) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Customer Registration
export const registerCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.registerCustomer(req.body);
    res.status(201).json({
      message: 'Customer registered successfully',
      user: result
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Business Registration
export const registerBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.registerBusiness(req.body);
    res.status(201).json({
      message: 'Business registered successfully. Awaiting approval.',
      data: result
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Rider Registration
export const registerRider = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.registerRider(req.body);
    res.status(201).json({
      message: 'Rider registered successfully. Awaiting verification.',
      data: result
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Legacy register (kept for backward compatibility)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData = req.body;
    const user = await authService.register(userData);
    
    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};