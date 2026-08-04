import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import routes from './routes.js';
import { mongoSanitize } from './middleware/sanitize.middleware.js';
import { requestLogger, errorLogger } from './middleware/logging.middleware.js';
import logger from './utils/logger.js';
import config from './config/environment.js';
import { createMetricsRegistry, metricsMiddleware, attachSequelizeObservability } from './shared/observability/index.js';
import { sequelize, redis } from './config/database.js';
import { slackNotificationService } from './notification/slack.notification.js';

// Allowlist matcher. Supports exact origins ("https://app.example.com") and
// wildcard subdomains ("https://*.example.com").
const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean =>
  allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    const wildcard = allowed.match(/^(https?):\/\/\*\.(.+)$/);
    if (!wildcard) return false;
    const [, scheme, domain] = wildcard;
    try {
      const url = new URL(origin);
      return url.protocol === `${scheme}:` && url.hostname.endsWith(`.${domain}`);
    } catch {
      return false;
    }
  });

export const createApp = () => {
  const metrics = createMetricsRegistry(config.observability.serviceName);
  attachSequelizeObservability(
    sequelize,
    logger,
    metrics.dbQueryDuration,
    metrics.dbQueryErrors,
  );

  const app = express();

  // Trust first proxy so req.ip reflects the real client IP behind reverse proxies
  app.set('trust proxy', 1);

  const limiterBase = {
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
  };

  // Payment mutations — tightest limit
  const paymentLimiter = rateLimit({
    ...limiterBase,
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many payment requests, please try again later' },
  });

  // General API — covers most authenticated write operations
  const standardLimiter = rateLimit({
    ...limiterBase,
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: 'Too many requests, please try again later' },
  });

  // Read-only polling endpoints — live tracking, package status, rider location
  const relaxedLimiter = rateLimit({
    ...limiterBase,
    windowMs: 15 * 60 * 1000,
    max: 600,
    message: { error: 'Too many requests, please try again later' },
  });

  app.use('/api/wallet/fund', paymentLimiter);
  app.use('/api/wallet/payout', paymentLimiter);
  app.use('/api/wallet/webhook', paymentLimiter);

  app.use('/api/packages/:tracking_number', relaxedLimiter);
  app.use('/api/matching/courier-presence', relaxedLimiter);
  app.use('/api/matching/available-couriers', relaxedLimiter);
  app.use('/api/riders/location', relaxedLimiter);

  app.use('/api', standardLimiter);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' }
  }));

  const defaultCsp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self' https: wss:",
    "form-action 'self'"
  ].join('; ');

  const swaggerCsp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https:",
    "form-action 'self'"
  ].join('; ');

  app.use((req, res, next) => {
    const isSwagger = req.path.startsWith('/api-docs');
    res.setHeader('Content-Security-Policy', isSwagger ? swaggerCsp : defaultCsp);
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    next();
  });

  app.use(cors({
    origin: (origin, callback) => {
      // No Origin header (curl, server-to-server, same-origin) — allow
      if (!origin) return callback(null, true);

      // Non-production: permissive, so local client dev servers work regardless of port
      if (!config.isProduction) return callback(null, true);

      if (isOriginAllowed(origin, config.server.corsOrigin)) return callback(null, true);

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));

  app.use(express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(mongoSanitize);
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(metricsMiddleware(metrics));

  const swaggerCandidates = [
    path.resolve(process.cwd(), 'swagger.yaml'),
    path.resolve(process.cwd(), '../swagger.yaml')
  ];
  const swaggerPath = swaggerCandidates.find((candidate) => fs.existsSync(candidate)) || swaggerCandidates[0];
  const swaggerDocument = YAML.load(swaggerPath);

  // Gate /api-docs: local access always allowed; in production, non-local requests
  // require basic auth via SWAGGER_PASSWORD (blocked entirely if unset).
  app.use('/api-docs', (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

    if (!config.isProduction || isLocal) return next();

    const password = process.env.SWAGGER_PASSWORD;
    if (!password) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const expected = `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`;
    if (req.headers.authorization === expected) return next();

    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Docs"');
    res.status(401).json({ error: 'Unauthorized' });
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.get('/health', async (_req, res) => {
    const [postgresOk, redisOk] = await Promise.all([
      sequelize.authenticate().then(() => true).catch(() => false),
      redis.get('__health__').then(() => true).catch(() => false),
    ]);

    const allOk = postgresOk && redisOk;
    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      databases: {
        postgres: postgresOk ? 'connected' : 'unreachable',
        redis: redisOk ? 'connected' : 'unreachable',
      },
    });
  });

  app.get('/metrics', (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (!isLocal && config.isProduction) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  }, async (_req, res) => {
    res.set('Content-Type', metrics.registry.contentType);
    res.send(await metrics.registry.metrics());
  });

  app.use('/api', routes);

  app.get('/', (_req, res) => {
    res.json({
      message: `${config.observability.serviceName} API is online`,
      docs: '/api-docs',
      service: config.observability.serviceName,
      status: 'online',
      environment: config.env,
      health: '/health',
      api: '/api',
      timestamp: new Date().toISOString(),
    });
  });

  app.use((req, res) => {
    logger.warn('Route not found', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    });
    res.status(404).json({ error: 'Route not found' });
  });

  app.use(errorLogger);

  // Deduplication: suppress repeat Slack alerts for same error within 60s
  const recentErrors = new Map<string, number>();
  const DEDUP_WINDOW_MS = 60_000;

  // Periodic pruning so the map can't grow unbounded between errors
  const pruneStaleErrors = () => {
    const now = Date.now();
    for (const [k, ts] of recentErrors) {
      if (now - ts > DEDUP_WINDOW_MS) recentErrors.delete(k);
    }
  };
  setInterval(pruneStaleErrors, DEDUP_WINDOW_MS).unref();

  app.use((err: any, req: any, res: any, next: any) => {
    logger.error('Unhandled error', {
      error: err.message,
      ...(config.isDevelopment && { stack: err.stack }),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    });

    const statusCode = err.status || err.statusCode || 500;

    // Send 5xx errors to Slack
    if (statusCode >= 500) {
      const key = `${req.method}:${req.originalUrl}:${err.message}`;
      const now = Date.now();
      const lastSent = recentErrors.get(key);

      if (!lastSent || now - lastSent > DEDUP_WINDOW_MS) {
        recentErrors.set(key, now);
        slackNotificationService.sendErrorNotification({
          error: err instanceof Error ? err : new Error(String(err.message || err)),
          context: {
            endpoint: req.originalUrl,
            method: req.method,
            userId: req.user?.id,
            requestId: req.headers['x-request-id'],
            additionalInfo: { app: 'traka-server' },
          }
        }).catch(() => {});
      }
    }

    res.status(statusCode).json({
      error: 'Internal server error',
      ...(config.isDevelopment && { message: err.message, stack: err.stack })
    });
  });

  return app;
};
