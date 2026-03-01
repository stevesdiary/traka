# TRAKA API Documentation - Complete Guide

## Overview
Complete API documentation for TRAKA Logistics Platform including all recent updates: unique rider IDs, soft delete, email verification, encryption, admin registration, user type field, and more.

---

## Base URL
- **Development**: `http://localhost:4000/api`
- **Production**: `https://api.traka.com/api`

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## User Management

### User Schema
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "RIDER",
  "type": "RIDER",
  "tenant_id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345678",
  "email_verified": false,
  "phone_verified": false,
  "created_at": "2024-01-20T10:00:00Z",
  "updated_at": "2024-01-20T10:00:00Z"
}
```

### Field Definitions
- **role**: Current permission level (can be changed by admins)
- **type**: Permanent user classification (set at registration, never changes)
- **Values**: SUPER_ADMIN, ADMIN, MANAGER, RIDER, USER, BUSINESS_OWNER

### GET /users
Get all users with optional filters.

**Query Parameters:**
- `role` (optional): Filter by role
- `type` (optional): Filter by user type
- `tenant_id` (optional): Filter by business tenant

**Examples:**
```bash
# Get all riders
GET /api/users?type=RIDER

# Get all customers
GET /api/users?type=USER

# Get all business owners
GET /api/users?type=BUSINESS_OWNER

# Get riders in a specific business
GET /api/users?type=RIDER&tenant_id=uuid

# Combine filters
GET /api/users?type=RIDER&role=MANAGER
```

**Response:**
```json
{
  "message": "Users retrieved successfully",
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "RIDER",
      "type": "RIDER",
      "tenant_id": "uuid",
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-01-20T10:00:00Z"
    }
  ]
}
```

---

## Registration & Authentication

### POST /auth/register/customer
Register a new customer account.

**Request:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345678"
}
```

**Response:**
```json
{
  "message": "Customer registered successfully. Please check your email for verification code.",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "tenant_id": null
  },
  "verification_required": true
}
```

**Sets:** `type=USER`, `role=USER`

---

### POST /auth/register/business
Register a new business account.

**Request:**
```json
{
  "email": "business@example.com",
  "password": "SecurePass123!",
  "business_name": "ABC Logistics",
  "business_address": "123 Business St, City",
  "contact_person": "Jane Smith",
  "phone": "+2348012345678"
}
```

**Response:**
```json
{
  "message": "Business registered successfully. Please check your email for verification code.",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "business@example.com",
    "tenant_id": "tenant-uuid"
  },
  "business": {
    "id": "tenant-uuid",
    "business_name": "ABC Logistics",
    "status": "PENDING"
  },
  "verification_required": true
}
```

**Sets:** `type=BUSINESS_OWNER`, `role=BUSINESS_OWNER`

---

### POST /auth/register/rider
Register a new rider account with unique rider ID.

**Request:**
```json
{
  "email": "rider@example.com",
  "password": "SecurePass123!",
  "first_name": "Mike",
  "last_name": "Wilson",
  "phone": "+2348012345678",
  "license_number": "LIC-12345",
  "vehicle_type": "MOTORCYCLE",
  "vehicle_plate": "ABC-123-XY",
  "business_id": "uuid"
}
```

**Response:**
```json
{
  "message": "Rider registered successfully. Please check your email for verification code.",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "rider@example.com",
    "tenant_id": "uuid"
  },
  "rider_profile": {
    "id": "uuid",
    "rider_id": "TRK-1000",
    "rider_type": "BUSINESS_MANAGED",
    "verification_status": "PENDING"
  },
  "verification_required": true
}
```

**Features:**
- Auto-generates unique rider ID (TRK-XXXX format)
- Sends email verification code
- Sets `type=RIDER`, `role=RIDER`
- `business_id` optional (null for independent riders)

---

### POST /auth/register/admin
Register admin accounts (Super Admin only).

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "first_name": "Admin",
  "last_name": "User",
  "phone": "+2348012345678",
  "role": "ADMIN"
}
```

**Response:**
```json
{
  "message": "ADMIN registered successfully",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "ADMIN",
    "email_verified": true,
    "phone_verified": true
  }
}
```

**Features:**
- Super Admin only
- Auto-verifies email and phone
- Sets both `type` and `role` to specified value
- Allowed roles: ADMIN, SUPER_ADMIN, MANAGER

---

### POST /auth/login
User login with encrypted response.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token",
  "data": "encrypted-hex-string"
}
```

**Breaking Change:** Response now returns encrypted `data` instead of plain `user` object. Client must decrypt using AES-256-GCM with shared ENCRYPTION_KEY.

---

## Email Verification

### POST /verification/verify-email
Verify email with 6-digit code.

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

---

### POST /verification/resend-email
Resend email verification code.

**Request:**
```json
{
  "email": "user@example.com"
}
```

---

### POST /verification/verify-phone
Verify phone with 6-digit code.

**Request:**
```json
{
  "phone": "+2348012345678",
  "code": "123456"
}
```

---

### POST /verification/resend-phone
Resend phone verification code.

**Request:**
```json
{
  "phone": "+2348012345678"
}
```

**Features:**
- 6-digit codes
- 15-minute expiry
- One-time use
- Sent via Brevo API (email) and KudiSMS (phone)

---

## Rider Management

### Unique Rider IDs
- Format: `TRK-XXXX` (e.g., TRK-1000, TRK-1001)
- Auto-generated on registration
- Sequential numbering
- Displayed in all rider responses

---

### Soft Delete System

#### DELETE /riders/:id
Soft delete a rider (Business Admin/Manager only).

**Validations:**
- No active deliveries
- Zero or positive wallet balance
- Must belong to requester's business

**Response:**
```json
{
  "message": "Rider deleted successfully"
}
```

**Features:**
- Sets `deleted_at` timestamp
- 30-day restore window
- Email notification sent
- Auto-hard-delete after 360 days

---

#### POST /riders/:id/restore
Restore a soft-deleted rider (within 30 days).

**Response:**
```json
{
  "message": "Rider restored successfully",
  "rider": {
    "id": "uuid",
    "rider_id": "TRK-1000",
    "status": "OFFLINE"
  }
}
```

---

#### GET /riders/deleted
Get all deleted riders (Admin only).

**Query Parameters:**
- `business_id` (optional): Filter by business

---

#### DELETE /riders/:id/permanent
Permanently delete a rider (Super Admin only).

**Warning:** This action is irreversible.

---

## Rider Referrals

### GET /referrals/my-code
Get rider's referral code.

**Response:**
```json
{
  "referral_code": "MIKE42",
  "can_update": true,
  "last_updated": "2024-01-20T10:00:00Z"
}
```

---

### POST /referrals/apply
Apply referral code during registration.

**Request:**
```json
{
  "referral_code": "MIKE42"
}
```

---

### GET /referrals/stats
Get referral statistics.

**Response:**
```json
{
  "total_referrals": 5,
  "pending": 2,
  "completed": 3,
  "rewarded": 3,
  "total_earned": 3000,
  "referral_code": "MIKE42",
  "referrals": [...]
}
```

**Rewards:**
- ₦1,000 for referrer
- ₦1,000 for referred rider
- Paid after first delivery completion

---

## Wallet Management

### GET /wallet/balance
Get wallet balance.

**Response:**
```json
{
  "balance": 5000.00,
  "is_active": true,
  "credit_limit": -2000.00
}
```

---

### GET /wallet/transactions
Get transaction history.

**Query Parameters:**
- `limit` (default: 50)

---

### POST /wallet/cash-delivery
Process cash delivery commission.

**Request:**
```json
{
  "riderId": "uuid",
  "totalFare": 1000,
  "packageId": "uuid"
}
```

**Commission:** 20% platform fee deducted from rider wallet.

---

## Business Billing

### GET /invoices
Get tenant invoices.

---

### POST /invoices/generate
Generate monthly invoice (Admin only).

---

### PUT /invoices/:id/paid
Mark invoice as paid.

---

## Package Management

### POST /packages
Create a new package.

**Request:**
```json
{
  "recipient_name": "Jane Smith",
  "recipient_email": "jane@example.com",
  "recipient_phone": "+2348012345678",
  "pickup_address": "456 Pickup St",
  "delivery_address": "123 Main St",
  "description": "Electronics",
  "package_size": "MEDIUM",
  "package_weight": 2.5,
  "delivery_speed": "STANDARD"
}
```

---

### GET /packages/:tracking_number
Track package (public endpoint).

**Query Parameters:**
- `token` (optional): Guest tracking token

---

### POST /packages/:id/cancel
Cancel package with reason.

**Request:**
```json
{
  "cancellation_reason": "RIDER_ASKING_DIFFERENT_MONEY",
  "cancellation_note": "Rider requested cash payment"
}
```

**Cancellation Reasons:**
- PILOT_ASKED_TO_CANCEL
- LONG_PICKUP_TIME
- WRONG_ORDER_DETAILS
- RIDER_ASKING_DIFFERENT_MONEY
- RIDER_UNTIDY_NO_UNIFORM
- FOUND_ALTERNATIVE
- OTHER

---

## Scheduling

### POST /scheduling/schedule
Schedule delivery.

**Request:**
```json
{
  "packageId": "uuid",
  "scheduleType": "SAME_DAY",
  "scheduledFor": "2024-01-20T14:30:00Z"
}
```

**Schedule Types:**
- IMMEDIATE: Dispatch now
- SCHEDULED: Custom date/time
- SAME_DAY: Today before 6 PM
- NEXT_DAY: Tomorrow 9 AM - 6 PM

---

## Delivery Matching

### POST /matching/dispatch
Dispatch delivery to available riders.

**Request:**
```json
{
  "packageId": "uuid",
  "pickupLocation": {
    "latitude": 6.5244,
    "longitude": 3.3792
  },
  "deliveryLocation": {
    "latitude": 6.4474,
    "longitude": 3.3903
  }
}
```

**Features:**
- Sequential dispatch (6-second timeout per rider)
- Vehicle constraints (BICYCLE: 3km, MOTORCYCLE: 15km, VAN: 50km)
- ETA calculation with traffic
- Redis locks prevent double-dispatch

---

### GET /matching/available-couriers
Get available couriers in area.

**Query Parameters:**
- `latitude`: Pickup latitude
- `longitude`: Pickup longitude
- `radius`: Search radius in km (default: 10)

---

### PUT /matching/courier-presence
Update courier location and availability.

**Request:**
```json
{
  "latitude": 6.5244,
  "longitude": 3.3792,
  "isAvailable": true
}
```

**Features:**
- 15-second TTL in Redis
- Real-time location tracking

---

## Legal Content

### GET /legal/faq
Get FAQs (public).

---

### GET /legal/terms
Get Terms of Service (public).

---

### GET /legal/commission-policy
Get Commission Policy (public).

---

### POST /legal/seed
Seed legal content (Admin only).

---

## Ratings

### POST /ratings
Create rider rating.

**Request:**
```json
{
  "package_id": "uuid",
  "rider_id": "uuid",
  "rating": 5,
  "review": "Excellent service!"
}
```

---

### GET /ratings/rider/:rider_id
Get rider ratings.

**Query Parameters:**
- `limit` (default: 50)

---

### GET /ratings/rider/:rider_id/stats
Get rider rating statistics.

**Response:**
```json
{
  "avgRating": 4.8,
  "totalRatings": 150
}
```

---

## Addresses

### POST /addresses
Create address.

**Request:**
```json
{
  "label": "Home",
  "address": "123 Main Street",
  "city": "Lagos",
  "state": "Lagos",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "is_default": true
}
```

---

### GET /addresses
Get user addresses.

---

### PUT /addresses/:id
Update address.

---

### DELETE /addresses/:id
Delete address.

---

### PUT /addresses/:id/default
Set default address.

---

## Notifications

### GET /notifications
Get user notifications.

**Query Parameters:**
- `limit` (default: 50)

---

### GET /notifications/unread-count
Get unread notification count.

---

### PUT /notifications/:id/read
Mark notification as read.

---

### PUT /notifications/read-all
Mark all notifications as read.

---

### GET /notifications/preferences
Get notification preferences.

---

### PUT /notifications/preferences
Update notification preferences.

**Request:**
```json
{
  "push_enabled": true,
  "sms_enabled": true,
  "email_enabled": true,
  "fcm_token": "firebase-token"
}
```

---

## Environment Variables

```env
# Database
POSTGRES_URL=postgresql://user:pass@host:5432/traka
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017/traka

# Authentication
JWT_SECRET=your-secret-key

# Encryption (32 bytes hex for AES-256)
ENCRYPTION_KEY=0d0f59dd8cabda06d3582d15103bc72ccca2a0cf65d49b1598d56a30b947b2c0

# Financial
RIDER_COMMISSION_RATE=0.20
RIDER_CREDIT_LIMIT=-2000.00
PLATFORM_FEE_RATE_BUSINESS=0.15

# Email (Brevo)
BREVO_API_KEY=your-brevo-api-key
SMTP_FROM=noreply@traka.com

# SMS (KudiSMS)
KUDISMS_API_TOKEN=your-kudisms-token
KUDISMS_SENDER_ID=TRAKA
KUDISMS_GATEWAY=2

# Payment
PAYMENT_PROVIDER=MONNIFY
MONNIFY_SECRET_KEY=your-monnify-secret
MONNIFY_API_KEY=your-monnify-api-key
MONNIFY_CONTRACT_CODE=your-monnify-contract-code
MONNIFY_BASE_URL=https://sandbox.monnify.com
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
PAYSTACK_BASE_URL=https://api.paystack.co
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_WEBHOOK_HASH=your-flutterwave-webhook-hash
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
PAYMENT_CALLBACK_URL=https://your-frontend-or-api/callback

# Server
PORT=4000
NODE_ENV=development
```

---

## Postman Collection

Import `TRAKA_API.postman_collection.json` for complete API testing.

**Collection Variables:**
- `baseUrl`: http://localhost:4000/api
- `token`: Auto-set on login
- `user_role`: RIDER, USER, BUSINESS_OWNER, ADMIN, MANAGER, SUPER_ADMIN
- `user_type`: Same as role values
- `tenant_id`: Business UUID

---

## Swagger Documentation

Interactive API docs available at: `http://localhost:4000/api-docs`

---

## Breaking Changes

### Login Response (v3.0.0)
**Before:**
```json
{
  "token": "jwt",
  "user": { "id": "uuid", "email": "user@example.com", "role": "RIDER" }
}
```

**After:**
```json
{
  "message": "Login successful",
  "token": "jwt",
  "data": "encrypted-hex-string"
}
```

**Migration:** Decrypt `data` field using AES-256-GCM with ENCRYPTION_KEY.

---

## Support

- **Email**: support@traka.com
- **Documentation**: https://docs.traka.com
- **API Status**: https://status.traka.com
