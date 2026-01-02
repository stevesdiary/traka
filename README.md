# TRAKA - Logistics and Tracking Platform

A comprehensive logistics and package tracking system built with Node.js, TypeScript, and multi-database architecture.

## Features

- **Multi-User Registration**: Customer, Business, and Rider registration
- **Package Management**: Create, track, and manage deliveries
- **Real-time Tracking**: GPS location updates and status tracking
- **Business Verification**: Admin approval system for business tenants
- **Role-based Access**: Admin, Business Owner, Rider, and Recipient roles
- **Multi-database**: PostgreSQL, Redis, and MongoDB integration
- **JWT Authentication**: Secure token-based authentication
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

### Business Verification
- `GET /api/tenants/pending` - Get pending businesses
- `PUT /api/tenants/{id}/approve` - Approve business (Admin)
- `PUT /api/tenants/{id}/suspend` - Suspend business (Admin)

### Rider Management
- `GET /api/riders/profile` - Get rider profile
- `PUT /api/riders/location` - Update GPS location
- `PUT /api/riders/status` - Update availability status

## Database Schema

### PostgreSQL Tables
- `users` - User accounts and authentication
- `tenants` - Business information and verification status
- `riders` - Rider profiles and vehicle details
- `packages` - Package information and tracking
- `commissions` - Rider earnings and payments

### MongoDB Collections
- `delivery_logs` - Real-time delivery tracking
- `package_tracking` - Location and status updates

## User Roles

- **ADMIN**: System administration and business approval
- **BUSINESS_OWNER**: Create packages and manage deliveries
- **RIDER**: Accept deliveries and update locations
- **RECIPIENT**: Track packages and confirm deliveries

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

# Server
PORT=3000
NODE_ENV=development
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Create Pull Request

## License

ISC License - see LICENSE file for details