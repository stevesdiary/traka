import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize-typescript';
import { createClient, RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';
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
  console.warn('MongoDB client creation failed, running without MongoDB');
}

export { mongoClient };

// Database Connection Function
export const connectDatabases = async () => {
  try {
    // Test PostgreSQL connection
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('Database models synchronized');
    
    // Connect to Redis
    await redis.connect();
    console.log('Redis connected successfully');
    
    // Connect to MongoDB (optional)
    if (mongoClient) {
      try {
        await mongoClient.connect();
        console.log('MongoDB connected successfully');
      } catch (mongoError: any) {
        console.warn('MongoDB connection failed (optional):', mongoError.message);
      }
    } else {
      console.warn('MongoDB client not available, skipping connection');
    }
    
    console.log('Databases connected and ready');
  } catch (error) {
    console.error('Database connection failed:', error);
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
      console.warn('MongoDB disconnect warning:', mongoError.message);
    }
    console.log('Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};