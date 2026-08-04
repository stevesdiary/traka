import { RiderModel } from './rider.model.js';
import { Op } from 'sequelize';
import cron from 'node-cron';
import logger from '../utils/logger.js';

export class RiderCleanupCron {
  private static readonly RETENTION_DAYS = 360;

  static async cleanupOldDeletedRiders(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      const deletedRiders = await RiderModel.findAll({
        where: {
          deletedAt: {
            [Op.lte]: cutoffDate,
            [Op.ne]: null
          }
        },
        paranoid: false
      });

      logger.info(`Found ${deletedRiders.length} riders to permanently delete (deleted > ${this.RETENTION_DAYS} days ago)`);

      for (const rider of deletedRiders) {
        await RiderModel.destroy({
          where: { id: rider.id },
          force: true
        });
        logger.info(`Permanently deleted rider ${rider.rider_id} (${rider.id})`);
      }

      logger.info(`Cleanup completed: ${deletedRiders.length} riders permanently deleted`);
    } catch (error) {
      logger.error('Error during rider cleanup:', error);
    }
  }

  static startCronJob(): void {
    // Run every 3 days at 2 AM
    cron.schedule('0 2 */3 * *', () => {
      this.cleanupOldDeletedRiders();
    });

    logger.info('Rider cleanup cron job started (runs every 3 days at 2 AM)');
  }
}
