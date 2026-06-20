import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';

export type ChallengeTokenType = '2fa_challenge' | '2fa_setup';

// Validates a short-lived challenge JWT and rejects any other token type.
// Attaches the decoded payload to req.user so downstream handlers can read userId.
export function requireTOTPChallenge(expectedType: ChallengeTokenType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Challenge token required' });
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ['HS256']
      }) as JWTPayload & { challenge_type?: string };

      if (payload.challenge_type !== expectedType) {
        res.status(403).json({ error: 'Invalid challenge token type' });
        return;
      }

      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired challenge token' });
    }
  };
}
