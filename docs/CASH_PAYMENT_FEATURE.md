# Cash Payment Feature

## Overview

TRAKA now supports **cash payments** for deliveries, allowing senders or recipients to pay the rider in cash instead of digital payment. This feature handles cash collection, rider wallet debt management, and payment tracking.

## Payment Options

### Payment Method
- **DIGITAL** (default) - Online payment via Monnify/card
- **CASH** - Pay rider in cash on pickup or delivery

### Payment By
- **SENDER** (default) - Sender pays for delivery
- **RECIPIENT** - Recipient pays on delivery (Cash on Delivery)

## How It Works

### 1. Package Creation with Cash Payment

```typescript
POST /api/packages
{
  "recipient_name": "John Doe",
  "recipient_phone": "08012345678",
  "pickup_address": "123 Main St, Lagos",
  "delivery_address": "456 Elm St, Lagos",
  "package_size": "MEDIUM",
  "delivery_speed": "STANDARD",
  "category": "ELECTRONICS",
  "payment_method": "CASH",      // CASH or DIGITAL
  "payment_by": "RECIPIENT"      // SENDER or RECIPIENT
}
```

**Response:**
```json
{
  "tracking_number": "TRK-A8K2",
  "total_amount": 2850,
  "payment_method": "CASH",
  "payment_by": "RECIPIENT",
  "payment_status": "PENDING",
  "message": "Package created. Rider will collect ₦2,850 from recipient on delivery."
}
```

### 2. Rider Collects Cash

When rider delivers package and collects cash:

```typescript
POST /api/cash-payments/packages/:package_id/confirm-cash
Authorization: Bearer <rider_token>
{
  "amount_collected": 2850
}
```

**Response:**
```json
{
  "message": "Cash payment confirmed",
  "amount_collected": 2850,
  "payment_by": "RECIPIENT",
  "rider_debt_created": true
}
```

### 3. Wallet Debt Management

**What Happens:**
1. Package payment status → `PAID`
2. Rider's wallet balance **decreases** by collected amount
3. Creates **debt** that rider owes to TRAKA
4. Debt is automatically settled from future digital earnings

**Example:**
```
Rider wallet before: ₦5,000
Cash collected: ₦2,850
Rider wallet after: ₦2,150

(Rider owes ₦2,850 to TRAKA, deducted from wallet)
```

## Database Schema

### Package Model Updates

```typescript
payment_method: ENUM('DIGITAL', 'CASH')
  - Default: 'DIGITAL'
  - CASH = rider collects payment

payment_by: ENUM('SENDER', 'RECIPIENT')
  - Default: 'SENDER'
  - SENDER = sender pays upfront
  - RECIPIENT = recipient pays on delivery (COD)

payment_status: ENUM('PENDING', 'PAID', 'FAILED')
  - Default: 'PENDING'
  - DIGITAL payments: 'PAID' immediately
  - CASH payments: 'PENDING' until rider confirms

paid_at: DATETIME
  - Timestamp when payment confirmed
```

## API Endpoints

### 1. Create Package with Cash Payment

**Endpoint:** `POST /api/packages`  
**Auth:** Required  
**Body:**
```json
{
  "payment_method": "CASH",
  "payment_by": "SENDER",
  // ... other package fields
}
```

### 2. Confirm Cash Payment (Rider)

**Endpoint:** `POST /api/cash-payments/packages/:package_id/confirm-cash`  
**Auth:** Required (Rider only)  
**Body:**
```json
{
  "amount_collected": 2850
}
```

### 3. Get Cash Payment Summary (Rider)

**Endpoint:** `GET /api/cash-payments/summary`  
**Auth:** Required (Rider only)  
**Response:**
```json
{
  "rider_id": "uuid",
  "current_balance": -1500,
  "cash_debt": 1500
}
```

## Payment Scenarios

### Scenario 1: Sender Pays Cash on Pickup

```json
{
  "payment_method": "CASH",
  "payment_by": "SENDER"
}
```

**Flow:**
1. Sender creates package
2. Rider picks up package
3. **Rider collects ₦2,850 from sender**
4. Rider confirms cash payment
5. Rider's wallet: -₦2,850 (debt)

### Scenario 2: Recipient Pays Cash on Delivery (COD)

```json
{
  "payment_method": "CASH",
  "payment_by": "RECIPIENT"
}
```

**Flow:**
1. Sender creates package (no payment)
2. Rider picks up package
3. Rider delivers to recipient
4. **Rider collects ₦2,850 from recipient**
5. Rider confirms cash payment
6. Rider's wallet: -₦2,850 (debt)

### Scenario 3: Sender Pays Digitally (Default)

```json
{
  "payment_method": "DIGITAL",
  "payment_by": "SENDER"
}
```

**Flow:**
1. Sender pays online via Monnify
2. Payment status: `PAID` immediately
3. Rider picks up and delivers
4. No cash collection needed
5. Rider earns commission (80% of delivery fee)

## Wallet Debt Management

### How Debt Works

**Cash Collection Creates Debt:**
```
Rider collects ₦2,850 cash
→ Wallet balance: -₦2,850
→ Rider owes TRAKA ₦2,850
```

**Debt Settlement:**
```
Rider completes digital delivery (earns ₦2,000)
→ Wallet balance: -₦2,850 + ₦2,000 = -₦850
→ Debt reduced to ₦850

Rider completes another delivery (earns ₦1,000)
→ Wallet balance: -₦850 + ₦1,000 = ₦150
→ Debt cleared, positive balance
```

### Credit Limit

**Maximum Debt:** ₦2,000 (configurable)

If rider's debt exceeds ₦2,000:
- ❌ Cannot accept new deliveries
- ⚠️ Account suspended until debt paid
- 📧 Email notification sent

## Security & Validation

### Amount Verification

```typescript
// System verifies collected amount matches package total
if (amount_collected !== package.total_amount) {
  logger.warn('Amount mismatch', {
    expected: package.total_amount,
    collected: amount_collected
  });
}
```

### Payment Status Checks

```typescript
// Cannot confirm payment twice
if (package.payment_status === 'PAID') {
  throw new Error('Payment already confirmed');
}

// Only cash payments can be confirmed
if (package.payment_method !== 'CASH') {
  throw new Error('Package is not a cash payment');
}
```

## Migration

```bash
# Run migration to add payment fields
npm run migrate:up
```

**Migration adds:**
- `payment_method` column (DIGITAL/CASH)
- `payment_by` column (SENDER/RECIPIENT)
- `payment_status` column (PENDING/PAID/FAILED)
- `paid_at` column (timestamp)
- Indexes for performance

## Testing

### Test Cash Payment Flow

```bash
# 1. Create package with cash payment
curl -X POST http://localhost:4000/api/packages \
  -H "Authorization: Bearer <sender_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_name": "John Doe",
    "recipient_phone": "08012345678",
    "pickup_address": "Lagos",
    "delivery_address": "Abuja",
    "package_size": "SMALL",
    "delivery_speed": "STANDARD",
    "category": "DOCUMENTS",
    "payment_method": "CASH",
    "payment_by": "RECIPIENT"
  }'

# 2. Rider confirms cash collection
curl -X POST http://localhost:4000/api/cash-payments/packages/<package_id>/confirm-cash \
  -H "Authorization: Bearer <rider_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_collected": 1500
  }'

# 3. Check rider's cash summary
curl http://localhost:4000/api/cash-payments/summary \
  -H "Authorization: Bearer <rider_token>"
```

## Business Logic

### Commission Calculation

**Digital Payment:**
```
Delivery fee: ₦2,850
Platform fee (15%): ₦427.50
Rider commission (80%): ₦2,280
```

**Cash Payment:**
```
Rider collects: ₦2,850
Rider owes TRAKA: ₦2,850
Rider earns commission: ₦2,280 (from future deliveries)
Net debt: ₦570
```

### Debt Settlement Priority

1. **Automatic Settlement** - Debt deducted from digital earnings
2. **Manual Top-up** - Rider can deposit cash to clear debt
3. **Account Suspension** - If debt exceeds ₦2,000

## Monitoring & Reporting

### Key Metrics

```sql
-- Total cash payments pending
SELECT COUNT(*) FROM packages 
WHERE payment_method = 'CASH' 
AND payment_status = 'PENDING';

-- Rider cash debt
SELECT rider_id, SUM(balance) as total_debt
FROM wallets
WHERE balance < 0
GROUP BY rider_id;

-- Cash vs Digital split
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(total_amount) as total_value
FROM packages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY payment_method;
```

## Best Practices

1. ✅ **Verify Amount** - Always check collected amount matches package total
2. ✅ **Confirm Immediately** - Rider should confirm cash payment right after collection
3. ✅ **Monitor Debt** - Track rider wallet balance to prevent excessive debt
4. ✅ **Email Notifications** - Notify riders when debt approaches limit
5. ✅ **Audit Trail** - Log all cash payment confirmations

## Troubleshooting

### Rider Cannot Confirm Cash Payment

**Check:**
- Is package payment_method = 'CASH'?
- Is payment_status still 'PENDING'?
- Does rider have permission?

### Wallet Balance Incorrect

**Check:**
- Was cash payment confirmed?
- Check wallet_transactions for deduction
- Verify processCashDelivery was called

### Payment Status Stuck on PENDING

**Check:**
- Has rider confirmed cash collection?
- Check logs for errors
- Manually update if needed

## Summary

**Cash Payment Feature:**
✅ Supports CASH and DIGITAL payment methods  
✅ Sender or Recipient can pay  
✅ Rider collects cash and confirms  
✅ Automatic wallet debt management  
✅ Debt settled from future earnings  
✅ Credit limit protection (₦2,000)  
✅ Complete audit trail  

**Next Steps:**
1. Run migration: `npm run migrate:up`
2. Test cash payment flow
3. Monitor rider wallet balances
4. Set up debt alerts
