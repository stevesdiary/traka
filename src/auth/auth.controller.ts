import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { UserRepository } from '../user/user.repository.js';
import { JWTPayload } from '../types/index.js';
import {
  setAuthCookie,
  setRefreshCookie,
  clearAuthCookies,
  issueRefreshToken,
  revokeRefreshToken,
  verifyRefreshToken,
  revokeRefreshTokenRecord,
  issueAccessToken
} from './token.service.js';

const authService = new AuthService();
const userRepository = new UserRepository();

export const logout = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = (req as any).cookies?.traka_refresh;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully' });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        type: user.type,
        tenant_id: user.tenant_id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        profile_photo: user.profile_photo
      }
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    if (!result) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    setAuthCookie(res, result.token);
    const refreshToken = await issueRefreshToken(result.user.id);
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Login successful',
      token: result.token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = (req as any).cookies?.traka_refresh;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const { payload, record } = await verifyRefreshToken(refreshToken);
    await revokeRefreshTokenRecord(record.id);

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const accessPayload: JWTPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
      tenant_id: user.tenant_id ?? null
    };

    const accessToken = issueAccessToken(accessPayload);
    const newRefreshToken = await issueRefreshToken(user.id);

    setAuthCookie(res, accessToken);
    setRefreshCookie(res, newRefreshToken);

    res.json({ message: 'Token refreshed', token: accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const registerCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Customer registration attempt:', { email: req.body.email, first_name: req.body.first_name, last_name: req.body.last_name });
    const result = await authService.registerCustomer(req.body);
    
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

export const registerBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Business registration attempt:', { email: req.body.email, business_name: req.body.business_name });
    const result = await authService.registerBusiness(req.body);
    
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

export const registerRider = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Rider registration attempt:', { email: req.body.email, first_name: req.body.first_name, last_name: req.body.last_name, vehicle_type: req.body.vehicle_type });
    const result = await authService.registerRider(req.body);
    
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

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, first_name, last_name, phone, role } = req.body;
    
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
