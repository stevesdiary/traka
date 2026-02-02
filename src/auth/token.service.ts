import { Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/environment.js';
import { RefreshTokenModel } from './refresh-token.model.js';
import { JWTPayload } from '../types/index.js';

const AUTH_COOKIE_NAME = 'traka_token';
const REFRESH_COOKIE_NAME = 'traka_refresh';
const ACCESS_TOKEN_EXPIRES: any = (process.env.JWT_EXPIRES_IN as any) ?? '24h';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || '30');
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET;
if (!process.env.JWT_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 24 * 60 * 60 * 1000
  });
};

export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction
  });
};

export const issueRefreshToken = async (userId: string) => {
  const payload: JWTPayload = {
    id: userId,
    userId,
    email: '',
    role: '',
    tenant_id: null
  };
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60
  });
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await RefreshTokenModel.create({
    user_id: userId,
    token_hash: hashToken(refreshToken),
    expires_at: expiresAt
  });
  return refreshToken;
};

export const revokeRefreshToken = async (refreshToken: string) => {
  await RefreshTokenModel.update(
    { revoked_at: new Date() },
    { where: { token_hash: hashToken(refreshToken), revoked_at: null } }
  );
};

export const verifyRefreshToken = async (refreshToken: string) => {
  const payload = jwt.verify(refreshToken, REFRESH_SECRET) as JWTPayload;
  const tokenHash = hashToken(refreshToken);
  const existing = await RefreshTokenModel.findOne({
    where: {
      token_hash: tokenHash,
      revoked_at: null
    }
  });

  if (!existing || existing.expires_at < new Date()) {
    throw new Error('Invalid refresh token');
  }

  return { payload, record: existing };
};

export const revokeRefreshTokenRecord = async (id: string) => {
  await RefreshTokenModel.update(
    { revoked_at: new Date() },
    { where: { id } }
  );
};

export const issueAccessToken = (payload: JWTPayload) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRES });
};
