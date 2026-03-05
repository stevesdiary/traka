import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize-typescript';
import { MongoClient } from 'mongodb';
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

// Initialize Sequelize with connection string
const dbUrl = process.env.POSTGRES_URL || 'postgresql://localhost:5432/traka';
const isProduction = dbUrl.includes('neon.tech') || process.env.NODE_ENV === 'production';

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
]);

// Export Upstash Redis
export { redis };

// MongoDB Configuration (optional)
let mongoClient: MongoClient | null = null;
try {
  mongoClient = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017/traka', {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000
  });
} catch (error) {
  logger.warn('MongoDB client creation failed, running without MongoDB', {
    error: error instanceof Error ? error.message : String(error)
  });
}

export { mongoClient };

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

    // Connect to MongoDB (optional)
    if (mongoClient) {
      try {
        await mongoClient.connect();
        logger.info('MongoDB connected successfully');
      } catch (mongoError: any) {
        logger.warn('MongoDB connection failed (optional)', {
          error: mongoError.message
        });
      }
    } else {
      logger.warn('MongoDB client not available, skipping connection');
    }

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
    try {
      if (mongoClient) {
        await mongoClient.close();
      }
    } catch (mongoError: any) {
      logger.warn('MongoDB disconnect warning', {
        error: mongoError.message
      });
    }
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
