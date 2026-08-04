import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { slackNotificationService } from '../notification/slack.notification.js';

// Deduplication for Slack alerts
const recentSlackAlerts = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000;

/**
 * Request logging middleware
 * Logs all HTTP requests with timing information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Skip logging for health checks to reduce noise
  if (req.originalUrl === '/health') return next();

  const startTime = Date.now();

  // Log request start
  logger.debug('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture original end function
  const originalEnd = res.end.bind(res);

  // Override end function to log response
  res.end = function (...args: any[]): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine log level based on status code
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, 'HTTP Response', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });

    // Send 5xx errors to Slack
    if (statusCode >= 500) {
      const key = `${req.method}:${req.originalUrl}:${statusCode}`;
      const now = Date.now();
      const lastSent = recentSlackAlerts.get(key);

      if (!lastSent || now - lastSent > DEDUP_WINDOW_MS) {
        recentSlackAlerts.set(key, now);

        // Extract error message from response body if possible
        const body = args[0];
        let errorMsg = `${statusCode} on ${req.method} ${req.originalUrl}`;
        if (body && typeof body === 'string') {
          try {
            const parsed = JSON.parse(body);
            const detail = parsed.message || parsed.error || '';
            const summary = parsed.error && parsed.message
              ? `${parsed.error}: ${parsed.message}`
              : detail;
            if (summary) errorMsg = summary;
          } catch {}
        }

        slackNotificationService.sendErrorNotification({
          error: new Error(errorMsg),
          context: {
            endpoint: req.originalUrl,
            method: req.method,
            userId: (req as any).user?.id,
            requestId: req.headers['x-request-id'] as string,
            additionalInfo: { app: 'traka-server', statusCode, duration: `${duration}ms` },
          }
        }).catch(() => {});
      }

      // Prune stale entries
      if (recentSlackAlerts.size > 100) {
        for (const [k, ts] of recentSlackAlerts) {
          if (now - ts > DEDUP_WINDOW_MS) recentSlackAlerts.delete(k);
        }
      }
    }

    // Call original end function
    return originalEnd(...args) as Response;
  } as any;

  next();
};

/**
 * Error logging middleware
 * Should be placed after all routes to catch errors
 */
const SENSITIVE_BODY_KEYS = new Set([
  'password', 'password_hash', 'current_password', 'new_password',
  'token', 'access_token', 'refresh_token', 'id_token',
  'secret', 'api_key', 'apikey', 'authorization',
  'card_number', 'cvv', 'pin',
  'totp_secret', 'otp', 'reset_code',
]);

const SENSITIVE_HEADERS = new Set([
  'authorization', 'cookie', 'x-api-key', 'x-auth-token',
]);

function redactBody(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([k, v]) =>
      [k, SENSITIVE_BODY_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v]
    )
  );
}

function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) =>
      [k, SENSITIVE_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v]
    )
  );
}

export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: redactBody(req.body),
    headers: redactHeaders(req.headers as Record<string, unknown>),
    ip: req.ip,
  });

  next(err);
};
