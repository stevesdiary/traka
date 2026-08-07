# Environment Configuration Guide

## Overview

TRAKA supports three environments:
- **Development**: Local development with debug logging and test credentials
- **Staging**: Production-like environment for pilot testing with real credentials
- **Production**: Live production environment

## Environment Files

Each environment has its own configuration file:

```
.env.development  → Development environment
.env.staging      → Staging environment (pilot users)
.env.production   → Production environment
```

## Quick Start

### 1. Copy Environment Template

```bash
# For development
cp .env.development .env

# For staging
cp .env.staging .env

# For production
cp .env.production .env
```

### 2. Update Credentials

Edit the `.env` file with your actual credentials:
- Database URLs
- JWT secret
- Payment gateway keys
- Email/SMS API keys
- Slack webhook URL

### 3. Run Application

```bash
# Development
npm run start:dev

# Staging
npm run start:staging

# Production
npm run start:prod
```

## Environment Differences

| Feature | Development | Staging | Production |
|---------|------------|---------|------------|
| **Log Level** | `debug` | `info` | `info` |
| **Query Logging** | ✅ Enabled | ❌ Disabled | ❌ Disabled |
| **Database** | Local/Dev DB | Staging DB | Production DB |
| **Payment Gateway** | Sandbox | Production | Production |
| **Error Notifications** | Console only | Slack alerts | Slack alerts |
| **CORS** | Localhost | Staging domains | Production domains |
| **Rate Limiting** | Relaxed | Standard | Standard |

## Configuration Structure

The environment loader (`src/config/environment.ts`) provides typed configuration:

```typescript
import config from './config/environment.js';

// Environment checks
config.isDevelopment  // true in development
config.isStaging      // true in staging
config.isProduction   // true in production

// Server config
config.server.port
config.server.apiBaseUrl
config.server.corsOrigin

// Database config
config.database.postgres
config.database.redis
config.database.mongo

// JWT config
config.jwt.secret
config.jwt.expiresIn

// Financial config
config.financial.riderCommissionRate
config.financial.riderCreditLimit
config.financial.platformFeeRateBusiness

// Payment config
config.payment.monnify.secretKey
config.payment.monnify.apiKey
config.payment.monnify.contractCode
config.payment.monnify.baseUrl

// Email config
config.email.brevoApiKey
config.email.smtpFrom

// SMS config
config.sms.kudiSmsToken
config.sms.senderId
config.sms.gateway

// Slack config
config.slack.webhookUrl

// Logging config
config.logging.level
config.logging.enableQueryLogging

// Rate limiting config
config.rateLimit.windowMs
config.rateLimit.maxRequests
```

## Usage in Code

### Import Configuration

```typescript
import config from './config/environment.js';

// Use environment-specific settings
if (config.isDevelopment) {
  console.log('Running in development mode');
}

// Access configuration
const dbUrl = config.database.postgres;
const jwtSecret = config.jwt.secret;
```

### Environment-Specific Logic

```typescript
import config from './config/environment.js';

// Different behavior per environment
if (config.isProduction) {
  // Enable strict security
  app.use(helmet({ contentSecurityPolicy: true }));
} else {
  // Relaxed for development
  app.use(helmet({ contentSecurityPolicy: false }));
}

// Conditional logging
if (config.logging.enableQueryLogging) {
  sequelize.options.logging = console.log;
}
```

## Staging Environment

Staging is designed for **pilot testing with real users**:

### Key Characteristics:
- ✅ Uses **production credentials** (payment, SMS, email)
- ✅ Separate database from production
- ✅ Limited user base (pilot testers)
- ✅ Production-like monitoring and logging
- ✅ Safe environment to test before full launch

### Use Cases:
- Beta testing with select users
- Testing payment flows with real transactions
- Validating SMS/email delivery
- Performance testing under real load
- Training staff before production launch

### Deployment:
```bash
# Build application
npm run build

# Set environment
export NODE_ENV=staging

# Run migrations
npm run migrate:up

# Start server
npm run start:staging
```

## Production Environment

### Security Checklist:
- [ ] Strong JWT secret (min 32 characters)
- [ ] Production database credentials
- [ ] Production payment gateway keys
- [ ] Verified email/SMS API keys
- [ ] Slack webhook for error alerts
- [ ] CORS restricted to production domains
- [ ] Rate limiting enabled
- [ ] Query logging disabled
- [ ] Log level set to `info` or `warn`

### Deployment:
```bash
# Build application
npm run build

# Set environment
export NODE_ENV=production

# Run migrations
npm run migrate:up

# Start server
npm run start:prod
```

## Environment Variables Reference

### Required Variables

```env
# Core
NODE_ENV=development|staging|production
PORT=4000
API_BASE_URL=https://api.traka.com

# Database
POSTGRES_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
MONGO_URL=mongodb://host:27017/db

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Financial
RIDER_COMMISSION_RATE=0.20
RIDER_CREDIT_LIMIT=-2000.00
PLATFORM_FEE_RATE_BUSINESS=0.15

# Payment
MONNIFY_SECRET_KEY=key
MONNIFY_API_KEY=key
MONNIFY_CONTRACT_CODE=code
MONNIFY_BASE_URL=https://api.monnify.com

# Email
BREVO_API_KEY=key
SMTP_FROM=noreply@traka.com

# SMS
KUDISMS_API_TOKEN=token
KUDISMS_SENDER_ID=TRAKA
KUDISMS_GATEWAY=2

# Monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Logging
LOG_LEVEL=debug|info|warn|error
ENABLE_QUERY_LOGGING=true|false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://traka.com,https://admin.traka.com
```

## Troubleshooting

### Missing Environment Variables

If you see this error:
```
❌ Missing required environment variables:
   - POSTGRES_URL
   - JWT_SECRET
```

**Solution**: Ensure all required variables are set in your `.env` file.

### Wrong Environment Loaded

If the wrong environment is loaded:
```bash
# Check current environment
echo $NODE_ENV

# Set explicitly
export NODE_ENV=staging
npm run start:staging
```

### Configuration Not Loading

If configuration doesn't load:
1. Verify `.env.{environment}` file exists
2. Check file permissions
3. Ensure `dotenv` package is installed
4. Import environment config at app startup

## Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use strong secrets in production** - Generate with `openssl rand -base64 32`
3. **Rotate credentials regularly** - Update JWT secrets, API keys
4. **Monitor staging closely** - Treat it like production
5. **Test migrations in staging first** - Before running in production
6. **Use environment-specific databases** - Never share databases across environments
7. **Enable Slack alerts** - Get notified of errors immediately
8. **Review logs regularly** - Check for suspicious activity

## Migration Between Environments

### Development → Staging
```bash
# 1. Backup staging database
pg_dump staging_db > backup.sql

# 2. Run migrations
NODE_ENV=staging npm run migrate:up

# 3. Test thoroughly
# 4. Monitor logs and Slack alerts
```

### Staging → Production
```bash
# 1. Backup production database
pg_dump production_db > backup.sql

# 2. Run migrations
NODE_ENV=production npm run migrate:up

# 3. Deploy application
NODE_ENV=production npm run start:prod

# 4. Monitor closely for 24-48 hours
```

## Support

For environment configuration issues:
1. Check this documentation
2. Review error logs
3. Verify all credentials are correct
4. Contact DevOps team
