// Load environment configuration first
import './config/environment.js';

import { connectDatabases, disconnectDatabases } from './config/database.js';
// import { RiderCleanupCron } from './rider/rider-cleanup.cron.js';
import { QuoteExpirationCron } from './quote/quote-expiration.cron.js';
import logger from './utils/logger.js';
import config from './config/environment.js';
import { createApp } from './app.js';
import { initializeWebSocket } from './websocket/websocket.service.js';
// import { startDispatchTimeoutCron } from './matching/dispatch-timeout.cron.js';

const app = createApp();
const port = config.server.port;

// Start server
const startServer = async () => {
  try {
    await connectDatabases();

    // Start cron jobs
    // RiderCleanupCron.startCronJob();
    QuoteExpirationCron.startCronJob();
    // startDispatchTimeoutCron();

    const server = app.listen(port, () => {
      logger.info(`TRAKA API started successfully`, {
        port,
        environment: config.env,
        apiBaseUrl: config.server.apiBaseUrl
      });
    });

    // Initialize WebSocket
    initializeWebSocket(server);

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
