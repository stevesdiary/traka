import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine environment
const environment = process.env.NODE_ENV || 'development';

// Load environment-specific .env file
const envFile = `.env.${environment}`;
const rootDir = path.resolve(process.cwd());
const envPath = path.join(rootDir, envFile);

console.log(`🌍 Loading environment: ${environment}`);
console.log(`📁 Config file: ${envFile}`);

// Load the environment file
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Warning: Could not load ${envFile}, falling back to .env`);
  dotenv.config(); // Fallback to default .env
} else {
  console.log(`✅ Environment loaded successfully`);
}

// Validate required environment variables
const requiredVars = [
  'POSTGRES_URL',
  'REDIS_URL',
  'MONGO_URL',
  'JWT_SECRET',
  'PORT'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

// Export environment configuration
export const config = {
  env: environment,
  isDevelopment: environment === 'development',
  isStaging: environment === 'staging',
  isProduction: environment === 'production',
  
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['*']
  },
  
  database: {
    postgres: process.env.POSTGRES_URL!,
    redis: process.env.REDIS_URL!,
    mongo: process.env.MONGO_URL!
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  financial: {
    riderCommissionRate: parseFloat(process.env.RIDER_COMMISSION_RATE || '0.20'),
    riderCreditLimit: parseFloat(process.env.RIDER_CREDIT_LIMIT || '-2000.00'),
    platformFeeRateBusiness: parseFloat(process.env.PLATFORM_FEE_RATE_BUSINESS || '0.15')
  },
  
  payment: {
    monnify: {
      secretKey: process.env.MONNIFY_SECRET_KEY!,
      apiKey: process.env.MONNIFY_API_KEY!,
      contractCode: process.env.MONNIFY_CONTRACT_CODE!,
      baseUrl: process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'
    }
  },
  
  email: {
    brevoApiKey: process.env.BREVO_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@traka.com',
    fromName: process.env.EMAIL_FROM_NAME || 'TRAKA'
  },
  
  sms: {
    kudiSmsToken: process.env.KUDISMS_API_TOKEN!,
    senderId: process.env.KUDISMS_SENDER_ID || 'TRAKA',
    gateway: process.env.KUDISMS_GATEWAY || '2'
  },
  
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  },
  
  logging: {
    level: process.env.LOG_LEVEL || (environment === 'development' ? 'debug' : 'info'),
    enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true'
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  }
};

export default config;
