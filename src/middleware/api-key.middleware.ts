import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../api-key/api-key.service.js';
import { redis } from '../config/upstash.js';

const API_KEY_HEADER = 'x-api-key';
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_SECONDS = 60;

declare global {
  namespace Express {
    interface Request {
      apiContext?: {
        tenantId: string;
        apiKeyId: string;
      };
    }
  }
}

const apiKeyService = new ApiKeyService();

export const requireApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const rawKey = req.headers[API_KEY_HEADER] as string | undefined;

  if (!rawKey) {
    res.status(401).json({ error: 'API key required. Provide it via the X-API-Key header.' });
    return;
  }

  const apiKey = await apiKeyService.validateKey(rawKey);
  if (!apiKey) {
    res.status(401).json({ error: 'Invalid or revoked API key.' });
    return;
  }

  const rateLimitKey = `ratelimit:apikey:${apiKey.id}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) {
    await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
  }

  if (count > RATE_LIMIT_REQUESTS) {
    const ttl = await redis.ttl(rateLimitKey);
    res.status(429).json({
      error: 'Rate limit exceeded. Maximum 100 requests per 60 seconds per API key.',
      retry_after_seconds: ttl,
    });
    return;
  }

  req.apiContext = { tenantId: apiKey.tenant_id, apiKeyId: apiKey.id };

  // Update last_used_at without blocking the request
  apiKeyService.updateLastUsed(apiKey.id).catch(() => undefined);

  next();
};
