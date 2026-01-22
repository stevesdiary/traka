import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth/auth.service.js';
import { JWTPayload } from '../types/index.js';
// import { EncryptionService } from '../utils/encryption.service.js';

import { EncryptionService } from '../utils/encryption.service.js';

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

    const { EncryptionService } = await import('../utils/encryption.service.js');
    const encryptionService = await new EncryptionService();
    
    const userData = {
      id: result.user.id,
      email: result.user.email,
      tenant_id: result.user.tenant_id
    };
    
    const encryptedUser = encryptionService.encrypt(userData);

    res.json({
      message: 'Login successful',
      token: result.token,
      data: encryptedUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Customer Registration
export const registerCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Customer registration attempt:', { email: req.body.email, first_name: req.body.first_name, last_name: req.body.last_name });
    const result = await authService.registerCustomer(req.body);
    
    // Send verification email
    const { VerificationService } = await import('../verification/verification.service.js');
    const verificationService = new VerificationService();
    await verificationService.sendEmailVerification(req.body.email, req.body.first_name);
    
    console.log('Customer registration successful:', result.user.id);
    res.status(201).json({
      message: 'Customer registered successfully. Please check your email for verification code.',
      token: result.token,
      user: {
        id: result.user.id,  
        email: result.user.email,
        tenant_id: result.user.tenant_id,
        first_name: result.user.first_name,
        last_name: result.user.last_name
      },
      verification_required: true
    });
  } catch (error: any) {
    console.error('Customer registration error:', error);
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Business Registration
export const registerBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Business registration attempt:', { email: req.body.email, business_name: req.body.business_name });
    const result = await authService.registerBusiness(req.body);
    
    // Send verification email
    const { VerificationService } = await import('../verification/verification.service.js');
    const verificationService = new VerificationService();
    await verificationService.sendEmailVerification(req.body.email, req.body.contact_person);
    
    console.log('Business registration successful:', result.user.id);
    res.status(201).json({
      message: 'Business registered successfully. Please check your email for verification code.',
      token: result.token,
      user: result.user,
      business: result.business,
      verification_required: true
    });
  } catch (error: any) {
    console.error('Business registration error:', error);
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Rider Registration
export const registerRider = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Rider registration attempt:', { email: req.body.email, first_name: req.body.first_name, last_name: req.body.last_name, vehicle_type: req.body.vehicle_type });
    const result = await authService.registerRider(req.body);
    
    // Send verification email
    const { VerificationService } = await import('../verification/verification.service.js');
    const verificationService = new VerificationService();
    await verificationService.sendEmailVerification(req.body.email, req.body.first_name);
    
    console.log('Rider registration successful:', result.user.id);
    res.status(201).json({
      message: 'Rider registered successfully. Please check your email for verification code.',
      token: result.token,
      user: result.user,
      rider_profile: result.rider_profile,
      verification_required: true
    });
  } catch (error: any) {
    console.error('Rider registration error:', error);
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Legacy register (kept for backward compatibility)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Legacy registration attempt:', { email: req.body.email });
    const userData = req.body;
    const user = await authService.register(userData);
    console.log('Legacy registration successful:', user.id);
    
    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error: any) {
    console.error('Legacy registration error:', error);
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Admin Registration (Super Admin only)
export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, first_name, last_name, phone, role } = req.body;
    
    // Validate role
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be ADMIN, SUPER_ADMIN, or MANAGER' });
      return;
    }

    const result = await authService.registerAdmin({
      email,
      password,
      first_name,
      last_name,
      phone,
      role
    });

    res.status(201).json({
      message: `${role} registered successfully`,
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    console.error('Admin registration error:', error);
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};