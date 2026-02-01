// Load environment configuration first
import './config/environment.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js';
import { connectDatabases, disconnectDatabases } from './config/database.js';
import { RiderCleanupCron } from './rider/rider-cleanup.cron.js';
import { QuoteExpirationCron } from './quote/quote-expiration.cron.js';
import logger from './utils/logger.js';
import { requestLogger, errorLogger } from './middleware/logging.middleware.js';
import config from './config/environment.js';
// import { startDispatchTimeoutCron } from './matching/dispatch-timeout.cron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = config.server.port;

// Middleware
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Old console-based logging removed - now using Winston logger middleware

// Swagger Documentation
const swaggerPath = config.isProduction 
  ? path.join(__dirname, '../swagger.yaml')
  : path.join(__dirname, '../../swagger.yaml');
const swaggerDocument = YAML.load(swaggerPath);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  res.status(404).json({ error: 'Route not found' });
});

// Error logging middleware
app.use(errorLogger);

// Error handler
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TRAKA API is running' });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabases();

    // Start cron jobs
    RiderCleanupCron.startCronJob();
    QuoteExpirationCron.startCronJob();
    // startDispatchTimeoutCron();

    const server = app.listen(port, () => {
      logger.info(`TRAKA API started successfully`, {
        port,
        environment: config.env,
        nodeVersion: process.version,
        apiBaseUrl: config.server.apiBaseUrl
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        await disconnectDatabases();
        logger.info('Server shut down gracefully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
};

startServer();
