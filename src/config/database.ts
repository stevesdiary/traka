import { config } from './environment.js';
import { Sequelize } from 'sequelize-typescript';
import logger from '../utils/logger.js';
import { redis } from './upstash.js';
import { UserModel } from '../user/user.model.js';
import { PackageModel } from '../package/package.model.js';
import { RiderModel } from '../rider/rider.model.js';
import { CommissionModel } from '../commission/commission.model.js';
import { TenantModel } from '../tenant/tenant.model.js';
import { WalletModel, WalletTransactionModel } from '../wallet/wallet.model.js';
import { InvoiceModel } from '../invoice/invoice.model.js';
import { LegalContentModel } from '../legal/legal.model.js';
import { UserAddressModel } from '../address/address.model.js';
import { RatingModel } from '../rating/rating.model.js';
import { NotificationModel, NotificationPreferenceModel } from '../notification/notification.model.js';
import { ReferralModel } from '../referral/referral.model.js';
import { ServiceAreaModel } from '../service-area/service-area.model.js';
import { WaitlistModel } from '../waitlist/waitlist.model.js';
import { QuoteModel } from '../quote/quote.model.js';
import { PromotionModel, PromotionUsageModel } from '../promotion/promotion.model.js';
import { RefreshTokenModel } from '../auth/refresh-token.model.js';
import { BusinessMemberModel } from '../business/business-member.model.js';
import { MessageModel } from '../message/message.model.js';
import { FeatureOptInModel } from '../scheduling/feature-opt-in.model.js';
import { ScheduledDeliveryRecord } from '../scheduling/scheduling.model.js';
import { ApiKeyModel } from '../api-key/api-key.model.js';
import { WebhookSubscriptionModel } from '../webhook/webhook-subscription.model.js';
import { WebhookDeliveryModel } from '../webhook/webhook-delivery.model.js';
import { SystemConfigModel } from '../pricing/system-config.model.js';

// Initialize Sequelize with connection string
const dbUrl = config.database.postgres;
const isProduction = dbUrl.includes('neon.tech') || config.isProduction;

export const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: isProduction ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

// Register Models
sequelize.addModels([
  UserModel,
  PackageModel,
  RiderModel,
  CommissionModel,
  TenantModel,
  BusinessMemberModel,
  WalletModel,
  WalletTransactionModel,
  InvoiceModel,
  LegalContentModel,
  UserAddressModel,
  RatingModel,
  NotificationModel,
  NotificationPreferenceModel,
  ReferralModel,
  ServiceAreaModel,
  WaitlistModel,
  QuoteModel,
  PromotionModel,
  PromotionUsageModel,
  RefreshTokenModel,
  MessageModel,
  FeatureOptInModel,
  ScheduledDeliveryRecord,
  ApiKeyModel,
  WebhookSubscriptionModel,
  WebhookDeliveryModel,
  SystemConfigModel,
]);

// Export Upstash Redis
export { redis };

// Database Connection Function
export const connectDatabases = async () => {
  try {
    // Test PostgreSQL connection
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');

    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: false });
    logger.info('Database models synchronized');

    // Initialize Upstash Redis (serverless, no connection needed)
    await redis.connect();
    logger.info('Upstash Redis initialized');

    logger.info('All databases connected and ready');
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

// Graceful shutdown
export const disconnectDatabases = async () => {
  try {
    await sequelize.close();
    await redis.disconnect();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
