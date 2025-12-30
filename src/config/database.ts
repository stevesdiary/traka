import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize-typescript';
import { createClient, RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';
import { UserModel } from '../user/user.model';
import { PackageModel } from '../package/package.model';
import { RiderModel } from '../rider/rider.model';
import { CommissionModel } from '../commission/commission.model';
import { TenantModel } from '../tenant/tenant.model';

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
sequelize.addModels([UserModel, PackageModel, RiderModel, CommissionModel, TenantModel]);

// Redis Configuration
export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// MongoDB Configuration
export const mongoClient = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017/traka');

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
    
    // Connect to MongoDB
    await mongoClient.connect();
    console.log('MongoDB connected successfully');
    
    console.log('All databases connected and ready');
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
    await mongoClient.close();
    console.log('✅ All database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};