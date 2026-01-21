# TRAKA - Logistics and Tracking Platform

A comprehensive logistics and package tracking system built with Node.js, TypeScript, and multi-database architecture.

## Features

- **Multi-User Registration**: Customer, Business, and Rider registration
- **Unique Rider IDs**: Auto-generated IDs (TRK-XXXX) for easy identification
- **Package Management**: Create, track, and manage deliveries with scheduling
- **Real-time Tracking**: GPS location updates and status tracking
- **Business Verification**: Admin approval system for business tenants
- **Role-based Access**: SUPER_ADMIN, ADMIN, MANAGER, RIDER, USER roles
- **Soft Delete System**: Business-managed rider deletion with 30-day restore window
- **Wallet System**: Negative balance support with commission management
- **Business Billing**: Prepaid wallet system with auto-recharge
- **Delivery Matching**: City-scale matching with vehicle constraints
- **Scheduled Deliveries**: IMMEDIATE, SCHEDULED, SAME_DAY, NEXT_DAY options
- **Rider Referral System**: ₦1,000 bonus for both referrer and referred rider
- **Service Area Jurisdiction**: Coverage validation with waitlist for unlaunched cities
- **Multi-database**: PostgreSQL, Redis, and MongoDB integration
- **JWT Authentication**: Secure token-based authentication
- **Legal Content**: FAQ, Terms of Service, Commission Policy
- **API Documentation**: Swagger and Postman collections

## Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Databases**: PostgreSQL (main), Redis (cache), MongoDB (logs)
- **ORM**: Sequelize with TypeScript
- **Authentication**: JWT tokens
- **Validation**: Joi schemas
- **Testing**: Jest

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- MongoDB
- pnpm

### Installation

```bash
# Clone repository
git clone <repository-url>
cd traka

# Install dependencies
pnpm install

# Setup environment
cp .env.examples .env
# Edit .env with your database credentials

# Build project
npm run build

# Start server
npm start
```

### Development

```bash
# Watch mode
npm run dev

# Run tests
npm test
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register/customer` - Customer registration
- `POST /api/auth/register/business` - Business registration
- `POST /api/auth/register/rider` - Rider registration

### Package Management
- `POST /api/packages` - Create package
- `GET /api/packages/{tracking_number}` - Track package
- `POST /api/packages/{id}/confirm-pickup` - Confirm pickup
- `POST /api/packages/{id}/confirm-delivery` - Confirm delivery

### Scheduling
- `POST /api/scheduling/schedule` - Schedule delivery (IMMEDIATE/SCHEDULED/SAME_DAY/NEXT_DAY)
- `POST /api/scheduling/process-pending` - Process pending deliveries (Admin)

### Delivery Matching
- `POST /api/matching/dispatch` - Dispatch delivery to available riders
- `GET /api/matching/available-couriers` - Get available couriers in area
- `PUT /api/matching/courier-presence` - Update courier presence/location

### Wallet Management
- `GET /api/wallet/balance` - Get wallet balance
- `GET /api/wallet/transactions` - Get transaction history
- `POST /api/wallet/cash-delivery` - Process cash delivery commission
- `POST /api/wallet/webhook/monnify` - Monnify payment webhook

### Business Billing
- `GET /api/invoices` - Get tenant invoices
- `POST /api/invoices/generate` - Generate monthly invoice
- `PUT /api/invoices/{id}/paid` - Mark invoice as paid
- `GET /api/invoices/overdue` - Get overdue invoices

### Business Verification
- `GET /api/tenants/pending` - Get pending businesses
- `PUT /api/tenants/{id}/approve` - Approve business (Admin)
- `PUT /api/tenants/{id}/suspend` - Suspend business (Admin)

### Rider Management
- `GET /api/riders/profile` - Get rider profile
- `PUT /api/riders/location` - Update GPS location
- `PUT /api/riders/status` - Update availability status
- `DELETE /api/riders/{id}` - Soft delete rider (Business Admin/Manager)
- `POST /api/riders/{id}/restore` - Restore deleted rider (within 30 days)
- `GET /api/riders/deleted` - Get deleted riders (Admin)
- `DELETE /api/riders/{id}/permanent` - Hard delete rider (Super Admin only)

### Rider Referrals
- `GET /api/referrals/my-code` - Get my referral code
- `POST /api/referrals/apply` - Apply referral code
- `GET /api/referrals/stats` - Get referral statistics

### Legal Content
- `GET /api/legal/faq` - Get FAQs (Public)
- `GET /api/legal/terms` - Get Terms of Service (Public)
- `GET /api/legal/commission-policy` - Get Commission Policy (Public)
- `POST /api/legal/seed` - Seed legal content (Admin)

### Service Area & Waitlist
- `GET /api/service-areas/cities` - Get active service cities (Public)
- `GET /api/service-areas/check` - Check location coverage (Public)
- `POST /api/service-areas` - Add service area (Admin)
- `POST /api/waitlist` - Join waitlist for unlaunched areas (Public)
- `GET /api/waitlist` - Get waitlist entries (Admin)
- `GET /api/waitlist/by-city` - Get waitlist grouped by city (Admin)
- `POST /api/waitlist/notify` - Notify waitlist when launching (Admin)

## Database Schema

### PostgreSQL Tables
- `users` - User accounts and authentication (with soft delete)
- `tenants` - Business information and verification status
- `riders` - Rider profiles, unique IDs (TRK-XXXX), and vehicle details (with soft delete)
- `packages` - Package information and tracking with scheduling
- `commissions` - Rider earnings and payments
- `wallets` - Rider wallet balances and credit limits
- `wallet_transactions` - Complete transaction history
- `business_wallets` - Business prepaid wallet system
- `business_wallet_transactions` - Business transaction history
- `invoices` - Business billing and invoice management
- `legal_content` - FAQ, Terms of Service, Policies
- `referrals` - Rider referral tracking and rewards
- `service_areas` - Cities where TRAKA operates with coverage radius
- `waitlist` - Users interested in unlaunched service areas

### Redis Cache
- `courier_presence` - Real-time courier locations (15s TTL)
- `dispatch_locks` - Atomic delivery dispatch operations
- `rate_limiting` - API rate limiting and spam prevention

### MongoDB Collections
- `delivery_logs` - Real-time delivery tracking
- `package_tracking` - Location and status updates
- `scheduled_deliveries` - Delivery scheduling and processing

## User Roles & Permissions

- **SUPER_ADMIN**: Full system access, user management, system configuration
- **ADMIN**: Business approval, user management, financial oversight
- **MANAGER**: Package management, rider coordination, operational tasks
- **RIDER**: Accept deliveries, update locations, wallet management
- **USER**: Track packages, manage deliveries, customer support

## Financial System

### Rider Wallet System
- **Commission Rate**: 20% platform fee per delivery
- **Negative Balance**: ₦2,000 credit limit with auto-suspension
- **Payment Methods**: Digital (instant credit) vs Cash (creates debt)
- **Auto-Settlement**: Debt cleared from future digital earnings
- **Referral Bonus**: ₦1,000 for both referrer and referred rider on first delivery

### Business Billing
- **Prepaid System**: Businesses maintain wallet balance
- **Platform Fee**: 15% deducted per delivery in real-time
- **Auto-Recharge**: Triggers at ₦1,000 threshold (₦5,000 top-up)
- **Zero Collection Risk**: No invoicing delays or bad debt

## Delivery Matching

### Vehicle Constraints
- **BICYCLE**: 3km range, 10kg capacity, traffic-sensitive
- **MOTORCYCLE**: 15km range, 50kg capacity, moderate traffic impact
- **VAN**: 50km range, 200kg capacity, low traffic sensitivity

### Matching Algorithm
- **Sequential Dispatch**: 6-second timeout per courier
- **ETA Calculation**: Distance + traffic + vehicle speed
- **Anti-Spam**: Bicycle deliveries blocked beyond 3km
- **Redis Locks**: Atomic operations prevent double-dispatch

## Testing

### Create Test Data

```bash
# Create test users
node scripts/test-data/create-final-test-users.js

# Create MongoDB test data
node scripts/test-data/create-mongo-test-data.js
```

### API Testing
- Import `TRAKA_API.postman_collection.json` into Postman
- View API documentation at `/swagger.yaml`

## Project Structure

```
src/
├── auth/           # Authentication logic
├── config/         # Database connections
├── middleware/     # Express middleware
├── package/        # Package management
├── rider/          # Rider operations
├── tenant/         # Business management
├── user/           # User management
├── wallet/         # Wallet & financial system
├── invoice/        # Business billing
├── scheduling/     # Delivery scheduling
├── matching/       # Delivery matching engine
├── referral/       # Rider referral system
├── legal/          # FAQ, Terms, Policies
├── service-area/   # Jurisdiction & coverage management
├── waitlist/       # Waitlist for unlaunched areas
├── verification/   # Email/OTP verification
└── utils/          # Validation schemas
```

## Environment Variables

```env
# Database
POSTGRES_URL=postgresql://user:pass@host:5432/traka
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017/traka

# Authentication
JWT_SECRET=your-secret-key

# Financial Configuration
RIDER_COMMISSION_RATE=0.20
RIDER_CREDIT_LIMIT=-2000.00
PLATFORM_FEE_RATE_BUSINESS=0.15

# Payment Gateway
MONNIFY_SECRET_KEY=your-monnify-secret

# Email Notifications
BREVO_API_KEY=your-brevo-api-key
SMTP_FROM=noreply@traka.com

# Server
PORT=3000
NODE_ENV=development
```

## Key Features Documentation

### Unique Rider IDs
Each rider receives a unique identifier (e.g., TRK-1000, TRK-3245) upon registration. See [RIDER_ID_FEATURE.md](RIDER_ID_FEATURE.md) for details.

### Soft Delete System
Business-managed riders can be soft deleted with a 30-day restore window. Auto-cleanup after 360 days. See [RIDER_SOFT_DELETE.md](RIDER_SOFT_DELETE.md) for complete documentation.

### Service Area Jurisdiction
Validate pickup and delivery locations against launched cities. Users outside coverage are added to waitlist. See [SERVICE_AREA_FEATURE.md](SERVICE_AREA_FEATURE.md) for complete documentation.

**Key Rules:**
- Business admins can soft delete their own riders
- Cannot delete riders with active deliveries
- Cannot delete riders with negative wallet balance
- Email notification sent on deletion
- 30-day restore window for business admins
- Auto-hard-delete after 360 days
- Only Super Admin can permanently delete

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Create Pull Request

## License

ISC License - see LICENSE file for details