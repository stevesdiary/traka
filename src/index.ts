import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes.js';
import { connectDatabases, disconnectDatabases } from './config/database.js';
import { RiderCleanupCron } from './rider/rider-cleanup.cron.js';
import logger from './utils/logger.js';
import { requestLogger, errorLogger } from './middleware/logging.middleware.js';
// import { startDispatchTimeoutCron } from './matching/dispatch-timeout.cron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.LOCAL_PORT;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Old console-based logging removed - now using Winston logger middleware

// Swagger Documentation
const swaggerPath = process.env.NODE_ENV === 'production' 
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
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
    // startDispatchTimeoutCron();

    const server = app.listen(port, () => {
      logger.info(`TRAKA API started successfully`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
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