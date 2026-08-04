import cron from 'node-cron';
import { PackageModel } from '../package/package.model.js';
import { DispatchTimeoutService } from '../matching/services/DispatchTimeoutService.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

const timeoutService = new DispatchTimeoutService();

// Run every minute to check for packages that have been pending for 30+ minutes
export const startDispatchTimeoutCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find packages that are still PENDING and created more than 30 minutes ago
      const timedOutPackages = await PackageModel.findAll({
        where: {
          status: 'PENDING',
          createdAt: {
            [Op.lte]: thirtyMinutesAgo
          }
        },
        limit: 50 // Process in batches
      });

      if (timedOutPackages.length > 0) {
        logger.info(`Found ${timedOutPackages.length} timed-out packages`);

        for (const pkg of timedOutPackages) {
          await timeoutService.checkAndHandleTimeout(pkg.id);
        }
      }
    } catch (error) {
      logger.error('Error in dispatch timeout cron:', error);
    }
  });

  logger.info('✅ Dispatch timeout cron job started (runs every minute)');
};
