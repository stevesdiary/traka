import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config, { JWT_SIGN_OPTIONS } from '../config/environment.js';
import { UserRepository } from '../user/user.repository.js';
import {
  generateSecret,
  generateQRCodeDataURL,
  verifyCode,
  encryptSecret,
  decryptSecret
} from './totp.service.js';
import { issueRefreshToken, setAuthCookie, setRefreshCookie } from './token.service.js';
import { JWTPayload } from '../types/index.js';
import logger from '../utils/logger.js';

const userRepository = new UserRepository();

function issueFullJWT(user: { id: string; email: string; role: string; type: string; tenant_id: string | null }): string {
  const payload: JWTPayload = {
    id: user.id,
    userId: user.id,
    email: user.email,
    role: user.role,
    type: user.type,
    tenant_id: user.tenant_id
  };
  return jwt.sign(payload, config.jwt.secret, { ...JWT_SIGN_OPTIONS, expiresIn: '24h' });
}

// POST /auth/2fa/setup
// Called by an admin immediately after first login.
// Generates a TOTP secret, stores it encrypted, and returns the QR code.
export const setup2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await userRepository.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.totp_enabled) {
      res.status(400).json({ error: '2FA is already enabled. Disable it first to re-enroll.' });
      return;
    }

    const { secret, otpauthUrl } = generateSecret(user.email);
    const qr_code = await generateQRCodeDataURL(otpauthUrl);

    // Store encrypted secret (not yet active — totp_enabled stays false until verify)
    await userRepository.updateById(userId, { totp_secret_enc: encryptSecret(secret) });

    logger.info('2FA setup initiated', { userId, role: user.role });

    res.json({
      message: 'Scan the QR code with Google Authenticator, then submit a code to complete setup.',
      qr_code,
      issuer: config.totp.issuer,
      email: user.email
    });
  } catch (error: any) {
    logger.error('2FA setup failed', { error: error.message });
    res.status(500).json({ error: 'Failed to initiate 2FA setup' });
  }
};

// POST /auth/2fa/setup/verify
// Admin submits their first TOTP code to confirm enrollment and receive a full JWT.
export const verifySetup2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'TOTP code is required' });
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user || !user.totp_secret_enc) {
      res.status(400).json({ error: 'No pending 2FA setup found. Call /auth/2fa/setup first.' });
      return;
    }

    if (user.totp_enabled) {
      res.status(400).json({ error: '2FA is already enabled' });
      return;
    }

    const secret = decryptSecret(user.totp_secret_enc);

    if (!verifyCode(secret, code)) {
      logger.warn('2FA setup verification failed — wrong code', { userId });
      res.status(401).json({ error: 'Invalid TOTP code. Check your authenticator app and try again.' });
      return;
    }

    await userRepository.updateById(userId, { totp_enabled: true });

    const token = issueFullJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
      tenant_id: user.tenant_id
    });

    const refreshToken = await issueRefreshToken(user.id);
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    logger.info('2FA enrollment complete', { userId, role: user.role });

    res.json({
      message: '2FA enabled successfully. You are now logged in.',
      token
    });
  } catch (error: any) {
    logger.error('2FA setup verification failed', { error: error.message });
    res.status(500).json({ error: 'Failed to verify 2FA setup' });
  }
};

// POST /auth/2fa/verify
// Admin submits their TOTP code during login to receive a full JWT.
export const verify2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'TOTP code is required' });
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user || !user.totp_enabled || !user.totp_secret_enc) {
      res.status(400).json({ error: '2FA is not configured for this account' });
      return;
    }

    const secret = decryptSecret(user.totp_secret_enc);

    if (!verifyCode(secret, code)) {
      logger.warn('2FA login verification failed — wrong code', { userId });
      res.status(401).json({ error: 'Invalid TOTP code' });
      return;
    }

    const token = issueFullJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
      tenant_id: user.tenant_id
    });

    const refreshToken = await issueRefreshToken(user.id);
    setAuthCookie(res, token);
    setRefreshCookie(res, refreshToken);

    logger.info('Admin 2FA login successful', { userId, role: user.role });

    res.json({
      message: 'Login successful',
      token
    });
  } catch (error: any) {
    logger.error('2FA login verification failed', { error: error.message });
    res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
};

// DELETE /auth/2fa
// SUPER_ADMIN disables 2FA on their own account (or another admin's).
// Requires their own password + TOTP code as proof of intent.
export const disable2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterId = req.user!.userId;
    const { password, code, target_user_id } = req.body;

    if (!password || !code) {
      res.status(400).json({ error: 'Password and TOTP code are required' });
      return;
    }

    // Verify the requester's own credentials first
    const requester = await userRepository.findById(requesterId);
    if (!requester) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPassword = await bcrypt.compare(password, requester.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    if (!requester.totp_enabled || !requester.totp_secret_enc) {
      res.status(400).json({ error: 'Your account does not have 2FA enabled' });
      return;
    }

    const requesterSecret = decryptSecret(requester.totp_secret_enc);
    if (!verifyCode(requesterSecret, code)) {
      res.status(401).json({ error: 'Invalid TOTP code' });
      return;
    }

    // Disable 2FA on target (defaults to own account)
    const targetId = target_user_id ?? requesterId;

    await userRepository.updateById(targetId, {
      totp_secret_enc: null,
      totp_enabled: false
    });

    logger.info('2FA disabled', { requesterId, targetId, role: requester.role });

    res.json({ message: '2FA has been disabled. The user will be prompted to re-enroll on next login.' });
  } catch (error: any) {
    logger.error('Disable 2FA failed', { error: error.message });
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};
