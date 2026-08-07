# Upstash Setup Guide

## Overview

TRAKA uses Upstash for serverless Redis caching and QStash for background job queues. This eliminates the need to manage Redis infrastructure.

## 1. Create Upstash Account

Visit [upstash.com](https://upstash.com) and sign up for a free account.

## 2. Setup Upstash Redis

### Create Redis Database

1. Go to [Upstash Console](https://console.upstash.com)
2. Click "Create Database"
3. Choose:
   - **Name**: traka-redis
   - **Region**: Choose closest to your VPS (e.g., us-east-1)
   - **Type**: Regional (free tier)
4. Click "Create"

### Get Credentials

After creation, copy:
- **UPSTASH_REDIS_REST_URL**: `https://your-redis.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN**: Your token

Add to `.env`:
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

## 3. Setup QStash (Background Jobs)

### Enable QStash

1. In Upstash Console, go to "QStash" tab
2. Click "Enable QStash"
3. Copy your **QSTASH_TOKEN**

Add to `.env`:
```env
QSTASH_TOKEN=your-qstash-token
APP_URL=https://api.traka.app
```

### Configure Webhook Endpoints

QStash will send messages to your API endpoints:
- Email queue: `https://api.traka.app/api/queue/email`
- SMS queue: `https://api.traka.app/api/queue/sms`
- Notification queue: `https://api.traka.app/api/queue/notification`

## 4. Usage Examples

### Caching with Upstash Redis

```typescript
import { redis } from './config/upstash.js';

// Set value with expiration
await redis.setEx('key', 3600, 'value');

// Get value
const value = await redis.get('key');

// Delete key
await redis.del('key');

// Hash operations
await redis.hSet('user:123', 'name', 'John');
const name = await redis.hGet('user:123', 'name');

// Set operations
await redis.sAdd('online:users', 'user123');
const isOnline = await redis.sIsMember('online:users', 'user123');
```

### Background Jobs with QStash

```typescript
import { queueService } from './config/qstash.js';

// Send email asynchronously
await queueService.publishMessage('email', {
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<h1>Welcome to TRAKA</h1>'
});

// Send SMS with delay (5 minutes)
await queueService.publishMessage('sms', {
  phone: '+1234567890',
  message: 'Your OTP is 123456'
}, 300);

// Schedule recurring job (daily at 2 AM)
await queueService.scheduleJob(
  'daily-cleanup',
  '0 2 * * *',
  'https://api.traka.app/api/cron/cleanup'
);
```

## 5. Benefits

### Upstash Redis
- **Serverless**: No infrastructure to manage
- **Pay-per-request**: Only pay for what you use
- **Global**: Low latency worldwide
- **Free tier**: 10,000 commands/day
- **REST API**: Works anywhere, no connection pooling needed

### QStash
- **Reliable**: Automatic retries with exponential backoff
- **Scheduled jobs**: Cron-like scheduling
- **Delayed messages**: Send messages in the future
- **Webhooks**: Secure signature verification
- **Free tier**: 500 messages/day

## 6. Migration from Redis

All Redis operations are compatible. The wrapper in `config/upstash.ts` provides the same interface:

```typescript
// Old Redis code still works
await redis.get('key');
await redis.setEx('key', 3600, 'value');
await redis.hSet('hash', 'field', 'value');
```

## 7. Monitoring

### Upstash Console
- View real-time metrics
- Monitor command usage
- Check latency
- View QStash message status

### Logs
All operations are logged:
```bash
pm2 logs traka-api | grep -i upstash
```

## 8. Cost Estimation

### Free Tier (Sufficient for MVP)
- **Redis**: 10,000 commands/day
- **QStash**: 500 messages/day

### Paid Tier (If needed)
- **Redis**: $0.20 per 100K commands
- **QStash**: $1 per 1000 messages

For typical usage:
- 100K daily active users
- ~$10-20/month total

## 9. VPS Setup

No Redis installation needed on VPS! Just add environment variables:

```bash
# On VPS
cd /opt/traka-api
nano .env

# Add Upstash credentials
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
QSTASH_TOKEN=your-qstash-token
APP_URL=https://api.traka.app
```

## 10. Testing

### Test Redis Connection
```bash
curl -X POST https://your-redis.upstash.io/set/test/hello \
  -H "Authorization: Bearer YOUR_TOKEN"

curl https://your-redis.upstash.io/get/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test QStash
```bash
curl -X POST https://qstash.upstash.io/v2/publish/https://api.traka.app/api/queue/email \
  -H "Authorization: Bearer YOUR_QSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

## 11. Security

- Tokens are secret - never commit to git
- Use environment variables
- QStash verifies webhook signatures automatically
- HTTPS required for production

## 12. Troubleshooting

**Connection errors:**
- Verify UPSTASH_REDIS_REST_URL and token
- Check Upstash Console for database status

**QStash not delivering:**
- Verify APP_URL is publicly accessible
- Check webhook endpoint returns 200 OK
- View delivery logs in Upstash Console

**Rate limits:**
- Upgrade to paid tier
- Implement caching to reduce requests
- Use batch operations where possible
