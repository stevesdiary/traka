import jwt from 'jsonwebtoken';
import { JWT_SIGN_OPTIONS, JWT_VERIFY_OPTIONS } from '../config/environment.js';

const TRACKING_SECRET = process.env.TRACKING_TOKEN_SECRET || process.env.JWT_SECRET!;
const TRACKING_TTL = '4h';

export interface TrackingTokenPayload {
  packageId: string;
  trackingNumber: string;
}

export const TrackingTokenService = {
  generate(payload: TrackingTokenPayload): string {
    return jwt.sign(payload, TRACKING_SECRET, {
      ...JWT_SIGN_OPTIONS,
      expiresIn: TRACKING_TTL,
    });
  },

  verify(token: string): TrackingTokenPayload | null {
    try {
      return jwt.verify(token, TRACKING_SECRET, { algorithms: ['HS256'] }) as unknown as TrackingTokenPayload;
    } catch {
      return null;
    }
  },
};
