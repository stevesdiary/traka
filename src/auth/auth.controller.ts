import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { UserRepository } from '../user/user.repository.js';
import { JWTPayload } from '../types/index.js';
import logger from '../utils/logger.js';
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
        surname: user.surname,
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

    // Admin: 2FA not yet set up — client must call POST /auth/2fa/setup
    if ('requires_2fa_setup' in result) {
      res.json({
        requires_2fa_setup: true,
        setup_token: result.setup_token,
        message: 'Two-factor authentication setup required. Scan the QR code with Google Authenticator.'
      });
      return;
    }

    // Admin: 2FA enabled — client must call POST /auth/2fa/verify
    if ('requires_2fa' in result) {
      res.json({
        requires_2fa: true,
        challenge_token: result.challenge_token,
        message: 'Enter the 6-digit code from your authenticator app.'
      });
      return;
    }

    // Normal login (non-admin roles)
    setAuthCookie(res, result.token);
    const refreshToken = await issueRefreshToken(result.user.id);
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Login successful',
      token: result.token
    });
  } catch (error) {
    logger.error('Login error', { error: (error as Error).message });
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

const sendVerificationAsync = (email: string, name: string): void => {
  import('../verification/verification.service.js').then(({ VerificationService }) => {
    new VerificationService().sendEmailVerification(email, name).catch((err) => {
      logger.error('Background email verification failed', { email, error: err.message });
    });
  });
};

export const registerCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.registerCustomer(req.body);

    logger.info('Customer registered', { userId: result.user.id });
    res.status(201).json({
      message: 'Customer registered successfully. Please check your email for verification code.',
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        tenant_id: result.user.tenant_id,
        first_name: result.user.first_name,
        surname: result.user.surname
      },
      verification_required: true
    });

    sendVerificationAsync(req.body.email, req.body.first_name);
  } catch (error: any) {
    logger.error('Customer registration failed', { error: error.message, stack: error.stack });
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerBusiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.registerBusiness(req.body);

    logger.info('Business registered', { userId: result.user.id });
    res.status(201).json({
      message: 'Business registered successfully. Please check your email for verification code.',
      token: result.token,
      user: result.user,
      business: result.business,
      verification_required: true
    });

    sendVerificationAsync(req.body.email, req.body.contact_person);
  } catch (error: any) {
    logger.error('Business registration failed', { error: error.message, stack: error.stack });
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerRider = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.registerRider(req.body);

    logger.info('Rider registered', { userId: result.user.id });
    res.status(201).json({
      message: 'Rider registered successfully. Please check your email for verification code.',
      token: result.token,
      user: result.user,
      rider_profile: result.rider_profile,
      verification_required: true
    });

    sendVerificationAsync(req.body.email, req.body.first_name);
  } catch (error: any) {
    logger.error('Rider registration failed', { error: error.message, stack: error.stack });
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData = req.body;
    const user = await authService.register(userData);
    logger.info('User registered', { userId: user.id });
    
    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error: any) {
    logger.error('Legacy registration failed', { error: error.message, stack: error.stack });
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, first_name, surname, phone, role } = req.body;
    
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be ADMIN, SUPER_ADMIN, or MANAGER' });
      return;
    }

    const result = await authService.registerAdmin({
      email,
      password,
      first_name,
      surname,
      phone,
      role
    });

    res.status(201).json({
      message: `${role} registered successfully`,
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    logger.error('Admin registration failed', { error: error.message, stack: error.stack });
    if (error.message === 'User already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
