# Rider Referral System - Implementation Summary

## Referral Code Format

Codes use the format `FIRSTNAME##` (e.g. `SAMUEL34`, `JOHN12`) — generated from the rider's first name + 2 random digits. Codes are stored in `riders.referral_code` (VARCHAR 20, UNIQUE) and generated lazily on first access.

Riders can update their code via `PUT /api/referrals/update-code` with a 3–20 character alphanumeric string. The code is auto-uppercased and must be unique.

---

## ✅ What Was Built

A complete rider referral system where both the referrer and referred rider earn ₦1,000 when the referred rider completes their first delivery.

## 📁 Files Created

### Core System Files
1. **src/referral/referral.model.ts** - Database model for tracking referrals
2. **src/referral/referral.repository.ts** - Database operations
3. **src/referral/referral.service.ts** - Business logic for referral rewards
4. **src/referral/referral.controller.ts** - API endpoint handlers
5. **src/referral/referral.routes.ts** - Route definitions
6. **src/referral/README.md** - Complete documentation

### Database
7. **migrations/add_referrals_table.sql** - SQL migration script


## 🎯 Key Features

### 1. Automatic Referral Codes
- Every rider gets a unique code: `REF{first-8-chars-of-user-id}`
- No manual generation needed

### 2. Simple Application Flow
- New rider applies referral code during/after registration
- System validates and tracks the referral

### 3. Automatic Reward Processing
- Triggers on first delivery completion
- Credits ₦1,000 to both riders simultaneously
- Uses existing wallet transaction system

### 4. Status Tracking
- **PENDING**: Code applied, waiting for first delivery
- **COMPLETED**: First delivery done
- **REWARDED**: Bonus credited to both wallets

## 🔌 API Endpoints

```
GET  /api/referrals/my-code    - Get your referral code
POST /api/referrals/apply      - Apply a referral code
GET  /api/referrals/stats      - View referral statistics
```

All endpoints require RIDER role authentication.

## 💾 Database Schema

```sql
referrals
├── id (UUID, primary key)
├── referrer_rider_id (UUID, references users)
├── referred_rider_id (UUID, references users)
├── referral_code (VARCHAR, unique)
├── status (ENUM: PENDING, COMPLETED, REWARDED)
├── first_delivery_at (TIMESTAMP)
├── rewarded_at (TIMESTAMP)
├── reward_amount (DECIMAL, default 1000.00)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## 🔄 Integration Points

### Commission Service
When a delivery is completed:
```typescript
CommissionService.calculateCommission()
  └─> ReferralService.processReferralReward()
      └─> Credits ₦1,000 to both riders if first delivery
```

### Wallet Service
- Uses existing `WalletRepository.updateBalance()`
- Creates transactions with type `REFERRAL_BONUS`
- Appears in rider's transaction history

## 🚀 How to Deploy

### 1. Run Migration
```bash
psql -d traka -f migrations/add_referrals_table.sql
```

### 2. Build and Deploy
```bash
npm run build
npm start
```

### 3. Test the Flow
```bash
# Get referral code
curl -X GET http://localhost:3000/api/referrals/my-code \
  -H "Authorization: Bearer {rider_token}"

# Apply code (as new rider)
curl -X POST http://localhost:3000/api/referrals/apply \
  -H "Authorization: Bearer {new_rider_token}" \
  -H "Content-Type: application/json" \
  -d '{"referral_code": "REF12345678"}'

# Complete first delivery (triggers reward)
# ... deliver package ...

# Check stats
curl -X GET http://localhost:3000/api/referrals/stats \
  -H "Authorization: Bearer {rider_token}"
```

## 🛡️ Business Rules

1. ✅ Each rider can only be referred once
2. ✅ Cannot refer yourself
3. ✅ Reward only triggers on first delivery
4. ✅ Both riders get ₦1,000 simultaneously
5. ✅ Idempotent - won't double-credit
6. ✅ Non-blocking - referral errors don't fail deliveries

## 📊 Monitoring Queries

```sql
-- Total referrals by status
SELECT status, COUNT(*) FROM referrals GROUP BY status;

-- Top referrers
SELECT referrer_rider_id, COUNT(*) as total
FROM referrals WHERE status = 'REWARDED'
GROUP BY referrer_rider_id
ORDER BY total DESC LIMIT 10;

-- Recent rewards
SELECT * FROM wallet_transactions
WHERE type = 'REFERRAL_BONUS'
ORDER BY created_at DESC LIMIT 20;
```

## 🎁 Benefits

### For Riders
- Extra income through referrals
- Welcome bonus for new riders
- Transparent tracking of referrals

### For Platform
- Organic rider acquisition
- Lower customer acquisition cost
- Increased rider engagement

## 📈 Future Enhancements

- Tiered rewards (5 referrals = extra bonus)
- Referral campaigns with time limits
- Admin dashboard for analytics
- Push notifications on reward credit
- Referral leaderboard

## ✨ Ready to Use!

The system is production-ready and fully integrated with existing wallet and commission systems. No additional configuration needed beyond running the migration.
