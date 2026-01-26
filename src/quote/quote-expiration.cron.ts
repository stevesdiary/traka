import cron from 'node-cron';
import { quoteService } from './quote.service.js';
import logger from '../utils/logger.js';

export class QuoteExpirationCron {
  static startCronJob() {
    // Run every hour to expire old quotes
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running quote expiration cron job');
        const expiredCount = await quoteService.expireOldQuotes();
        
        if (expiredCount > 0) {
          logger.info(`Expired ${expiredCount} old quotes`);
        }
      } catch (error) {
        logger.error('Quote expiration cron job failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    logger.info('Quote expiration cron job scheduled (runs hourly)');
  }
}
