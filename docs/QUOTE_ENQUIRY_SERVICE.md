# Quote Enquiry Service

## Overview

The Quote Enquiry Service allows both registered and anonymous users to get instant delivery price estimates without creating an account or placing an order. This feature captures user interest and provides transparency in pricing.

## Key Features

✅ **Anonymous Access** - No registration required  
✅ **Rate Limited** - 20 requests per 15 minutes to prevent abuse  
✅ **Reuses Existing Pricing** - No duplicate pricing logic  
✅ **Session Tracking** - Anonymous users tracked via session ID  
✅ **Auto-Expiration** - Quotes expire after 24 hours  
✅ **Conversion Tracking** - Track when quotes become orders  
✅ **Email Capture** - Optional email for quote delivery  

## Architecture

```
Anonymous/Registered User
         |
         v
Quote API (public, rate-limited)
         |
         v
Quote Service
         |
         +---> Pricing Service (existing)
         |
         v
Quotes Table (PostgreSQL)
         |
         +---> Convert to Order (requires auth)
                      |
                      v
                Existing Orders Flow
```

## Data Model

### Quote Table

```typescript
{
  id: UUID                      // Primary key
  quote_code: string            // TRK-XXXXX (human-friendly)
  pickup_address: string        // Full pickup address
  delivery_address: string      // Full delivery address
  package_size: ENUM            // SMALL | MEDIUM | LARGE
  package_weight: number        // Optional weight in kg
  delivery_speed: ENUM          // STANDARD | EXPRESS | SAME_DAY
  estimated_price: number       // Total price in NGN
  currency: string              // NGN
  estimated_distance_km: number // Distance in kilometers
  expires_at: datetime          // 24 hours from creation
  created_by_user_id: UUID      // NULL for anonymous
  anonymous_session_id: string  // For anonymous tracking
  contact_email: string         // Optional email
  status: ENUM                  // ACTIVE | EXPIRED | CONVERTED
  converted_to_package_id: UUID // Package ID if converted
  created_at: datetime
  updated_at: datetime
}
```

## API Endpoints

### 1. Create Quote (Public)

**Endpoint:** `POST /api/quotes`  
**Auth:** Optional (works for both anonymous and authenticated users)  
**Rate Limit:** 20 requests per 15 minutes

**Request Body:**
```json
{
  "pickup_address": "123 Main St, Ikeja, Lagos",
  "delivery_address": "456 Elm St, Lekki, Lagos",
  "package_size": "MEDIUM",
  "package_weight": 5.0,
  "delivery_speed": "STANDARD",
  "contact_email": "user@example.com",
  "anonymous_session_id": "sess_abc123xyz"
}
```

**Response (201):**
```json
{
  "quote_code": "TRK-A8K2M",
  "estimated_price": 2850,
  "currency": "NGN",
  "delivery_eta": "1-2 days",
  "expires_at": "2026-01-27T18:00:00Z",
  "estimated_distance_km": 12.5,
  "breakdown": {
    "base_fee": 500,
    "distance_fee": 1250,
    "size_fee": 200,
    "speed_fee": 0,
    "fuel_adjustment": 150,
    "platform_fee": 750
  }
}
```

### 2. Get Quote by Code (Public)

**Endpoint:** `GET /api/quotes/:quote_code`  
**Auth:** None

**Response (200):**
```json
{
  "quote_code": "TRK-A8K2M",
  "pickup_address": "123 Main St, Ikeja, Lagos",
  "delivery_address": "456 Elm St, Lekki, Lagos",
  "package_size": "MEDIUM",
  "package_weight": 5.0,
  "delivery_speed": "STANDARD",
  "estimated_price": 2850,
  "currency": "NGN",
  "estimated_distance_km": 12.5,
  "expires_at": "2026-01-27T18:00:00Z",
  "status": "ACTIVE",
  "created_at": "2026-01-26T18:00:00Z"
}
```

### 3. Get My Quotes (Authenticated)

**Endpoint:** `GET /api/quotes/user/my-quotes?limit=10`  
**Auth:** Required  
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "quotes": [
    {
      "quote_code": "TRK-A8K2M",
      "pickup_address": "123 Main St, Ikeja, Lagos",
      "delivery_address": "456 Elm St, Lekki, Lagos",
      "estimated_price": 2850,
      "currency": "NGN",
      "delivery_speed": "STANDARD",
      "status": "ACTIVE",
      "expires_at": "2026-01-27T18:00:00Z",
      "created_at": "2026-01-26T18:00:00Z"
    }
  ],
  "count": 1
}
```

### 4. Get Anonymous Quotes (Public)

**Endpoint:** `GET /api/quotes/session/:session_id?limit=10`  
**Auth:** None

**Response (200):**
```json
{
  "quotes": [
    {
      "quote_code": "TRK-B9L3N",
      "pickup_address": "789 Oak St, Victoria Island, Lagos",
      "delivery_address": "321 Pine St, Surulere, Lagos",
      "estimated_price": 1950,
      "currency": "NGN",
      "delivery_speed": "EXPRESS",
      "status": "ACTIVE",
      "expires_at": "2026-01-27T20:00:00Z",
      "created_at": "2026-01-26T20:00:00Z"
    }
  ],
  "count": 1
}
```

## Integration with Existing Systems

### Pricing Service Integration

The quote service **reuses the existing pricing logic** without duplication:

```typescript
// Quote service calls existing pricing service
const pricing = await pricingService.calculateDeliveryPrice({
  pickup_address: request.pickup_address,
  delivery_address: request.delivery_address,
  package_size: request.package_size,
  package_weight: request.package_weight,
  delivery_speed: request.delivery_speed,
  tenant_id: null
});
```

**Benefits:**
- ✅ Single source of truth for pricing
- ✅ Automatic fuel price adjustments
- ✅ Consistent pricing across quotes and orders
- ✅ No maintenance overhead

### Converting Quote to Order

When a user decides to place an order from a quote:

```typescript
// In package creation service
if (quote_code) {
  const quote = await quoteService.getQuoteByCode(quote_code);
  
  if (quote && quote.status === 'ACTIVE') {
    // Pre-fill order details from quote
    pickup_address = quote.pickup_address;
    delivery_address = quote.delivery_address;
    package_size = quote.package_size;
    // ... other fields
    
    // Mark quote as converted
    await quoteService.markAsConverted(quote_code, package.id);
  }
}
```

## User Flows

### Anonymous User Flow

1. User visits website/app
2. Enters delivery details (no login required)
3. Clicks "Get Quote"
4. Receives instant price estimate
5. Optional: Provides email to receive quote
6. Optional: Saves session ID to view quote history
7. To place order: Must register/login

### Registered User Flow

1. User logs in
2. Enters delivery details
3. Clicks "Get Quote"
4. Receives instant price estimate
5. Quote saved to user's account
6. Can view quote history
7. Can convert quote to order with one click

## Rate Limiting

**Configuration:**
- Window: 15 minutes
- Max Requests: 20 per window
- Applies to: Quote creation endpoint only

**Purpose:**
- Prevent API abuse
- Protect geocoding service
- Ensure fair usage

**Error Response (429):**
```json
{
  "error": "Too many quote requests, please try again later"
}
```

## Quote Expiration

**Automatic Expiration:**
- Quotes expire 24 hours after creation
- Cron job runs hourly to mark expired quotes
- Expired quotes cannot be converted to orders

**Expiration Logic:**
```typescript
// Runs every hour
cron.schedule('0 * * * *', async () => {
  const expiredCount = await quoteService.expireOldQuotes();
  logger.info(`Expired ${expiredCount} old quotes`);
});
```

## Session Tracking

### Anonymous Session ID

**Purpose:** Track quotes for non-registered users

**Implementation:**
```javascript
// Frontend generates session ID
const sessionId = `sess_${Date.now()}_${Math.random().toString(36)}`;
localStorage.setItem('traka_session_id', sessionId);

// Include in quote request
fetch('/api/quotes', {
  method: 'POST',
  body: JSON.stringify({
    ...quoteData,
    anonymous_session_id: sessionId
  })
});
```

**Benefits:**
- Users can view their quote history
- No account required
- Privacy-friendly (no personal data)

## Email Capture

**Optional Field:** `contact_email`

**Use Cases:**
- Send quote details via email
- Marketing follow-up
- Conversion tracking
- Abandoned quote reminders

**Privacy:**
- Email is optional
- Not required for quote creation
- Stored securely
- Can be used for future marketing (with consent)

## Analytics & Metrics

### Key Metrics to Track

1. **Quote Volume**
   - Total quotes created
   - Anonymous vs registered
   - By delivery speed
   - By package size

2. **Conversion Rate**
   - Quotes → Orders
   - Time to conversion
   - Conversion by user type

3. **Quote Abandonment**
   - Expired quotes
   - Quotes with email (potential leads)
   - Follow-up opportunities

4. **Pricing Insights**
   - Average quote price
   - Price distribution
   - Popular routes

### Sample Queries

```sql
-- Conversion rate
SELECT 
  COUNT(*) as total_quotes,
  SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) as converted,
  ROUND(SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as conversion_rate
FROM quotes
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Average quote price by delivery speed
SELECT 
  delivery_speed,
  AVG(estimated_price) as avg_price,
  COUNT(*) as quote_count
FROM quotes
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY delivery_speed;

-- Anonymous vs registered quotes
SELECT 
  CASE 
    WHEN created_by_user_id IS NOT NULL THEN 'Registered'
    ELSE 'Anonymous'
  END as user_type,
  COUNT(*) as quote_count
FROM quotes
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_type;
```

## Testing

### Manual Testing

```bash
# 1. Create anonymous quote
curl -X POST http://localhost:4000/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_address": "123 Main St, Ikeja, Lagos",
    "delivery_address": "456 Elm St, Lekki, Lagos",
    "package_size": "MEDIUM",
    "delivery_speed": "STANDARD",
    "anonymous_session_id": "sess_test123"
  }'

# 2. Get quote by code
curl http://localhost:4000/api/quotes/TRK-A8K2M

# 3. Get anonymous quotes
curl http://localhost:4000/api/quotes/session/sess_test123

# 4. Create authenticated quote
curl -X POST http://localhost:4000/api/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "pickup_address": "789 Oak St, Victoria Island, Lagos",
    "delivery_address": "321 Pine St, Surulere, Lagos",
    "package_size": "LARGE",
    "delivery_speed": "EXPRESS"
  }'

# 5. Get my quotes
curl http://localhost:4000/api/quotes/user/my-quotes \
  -H "Authorization: Bearer <token>"
```

## Database Migration

```bash
# Run migration
npm run migrate:up

# Verify table created
psql $POSTGRES_URL -c "\d quotes"
```

## Deployment Checklist

- [ ] Run database migration
- [ ] Verify quote expiration cron job is running
- [ ] Test rate limiting configuration
- [ ] Monitor quote creation volume
- [ ] Set up analytics tracking
- [ ] Configure email notifications (if enabled)
- [ ] Test anonymous and authenticated flows
- [ ] Verify pricing consistency with orders

## Future Enhancements

1. **Email Notifications**
   - Send quote details via email
   - Reminder emails for expired quotes
   - Conversion follow-ups

2. **Quote Comparison**
   - Compare multiple delivery speeds
   - Show savings for standard vs express

3. **Quote Sharing**
   - Share quote via link
   - Social media integration

4. **Advanced Analytics**
   - Conversion funnel analysis
   - A/B testing for pricing display
   - User behavior tracking

5. **Quote Templates**
   - Save frequent routes
   - Quick quote for repeat customers

## Support

For issues or questions:
1. Check logs: `tail -f logs/combined-*.log`
2. Verify cron job: Check for "Quote expiration cron job scheduled"
3. Test pricing service: `POST /api/pricing/calculate`
4. Review rate limiting: Check 429 responses

## Summary

The Quote Enquiry Service provides a frictionless way for users to get delivery estimates without registration. It:

✅ Reuses existing pricing logic (no duplication)  
✅ Supports both anonymous and authenticated users  
✅ Includes rate limiting to prevent abuse  
✅ Auto-expires quotes after 24 hours  
✅ Tracks conversions to orders  
✅ Captures email for marketing  
✅ Provides detailed pricing breakdown  

This feature reduces friction in the user journey and increases conversion rates by providing transparency and building trust before account creation.
