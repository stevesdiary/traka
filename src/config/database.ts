import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize-typescript';
import { createClient, RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';
import logger from '../utils/logger.js';
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

// Initialize Sequelize with connection string
const dbUrl = process.env.POSTGRES_URL || 'postgresql://localhost:5432/traka';
// console.log('Using database URL:', dbUrl.replace(/:[^:@]*@/, ':***@')); // Hide password
const isProduction = dbUrl.includes('neon.tech') || process.env.NODE_ENV === 'production';

export const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  // logging: process.env.NODE_ENV === 'development' ? console.log : false,
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
]);

// Redis Configuration
export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// MongoDB Configuration (optional)
let mongoClient: MongoClient | null = null;
try {
  mongoClient = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017/traka');
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

    // Connect to Redis
    await redis.connect();
    logger.info('Redis connected successfully');

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