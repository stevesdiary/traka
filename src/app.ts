import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';
import routes from './routes.js';
import { requestLogger, errorLogger } from './middleware/logging.middleware.js';
import logger from './utils/logger.js';
import config from './config/environment.js';
import { createMetricsRegistry, metricsMiddleware, attachSequelizeObservability } from './shared/observability/index.js';
import { sequelize } from './config/database.js';

export const createApp = () => {
  const metrics = createMetricsRegistry(config.observability.serviceName);
  attachSequelizeObservability(
    sequelize,
    logger,
    metrics.dbQueryDuration,
    metrics.dbQueryErrors,
  );

  const app = express();

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
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.server.corsOrigin.includes('*') || config.server.corsOrigin.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));

  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    }
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(metricsMiddleware(metrics));

  const swaggerCandidates = [
    path.resolve(process.cwd(), 'swagger.yaml'),
    path.resolve(process.cwd(), '../swagger.yaml')
  ];
  const swaggerPath = swaggerCandidates.find((candidate) => fs.existsSync(candidate)) || swaggerCandidates[0];
  const swaggerDocument = YAML.load(swaggerPath);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'TRAKA API is running' });
  });

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metrics.registry.contentType);
    res.send(await metrics.registry.metrics());
  });

  app.use('/api', routes);

  app.use((req, res) => {
    logger.warn('Route not found', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    });
    res.status(404).json({ error: 'Route not found' });
  });

  app.use(errorLogger);

  app.use((err: any, req: any, res: any, next: any) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      ...(config.isDevelopment && { stack: err.stack })
    });
  });

  return app;
};
