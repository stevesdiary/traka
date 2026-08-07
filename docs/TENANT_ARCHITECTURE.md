# Tenant ID Architecture - Clarification

## Overview
The `tenant_id` field is used for **multi-tenant isolation** in the TRAKA platform, but it's **nullable** because not all users belong to a business tenant.

## User Types & tenant_id

### 1. Customers (USER role)
- **tenant_id**: `null`
- **Purpose**: Track packages, receive deliveries
- **Can create packages**: ✅ Yes
- **Example**: Regular person sending/receiving packages

### 2. Business Users (ADMIN, MANAGER roles)
- **tenant_id**: `business_id` (references tenants table)
- **Purpose**: Manage business operations, riders, packages
- **Can create packages**: ✅ Yes (on behalf of business)
- **Example**: Logistics company manager

### 3. Solo Riders (RIDER role)
- **tenant_id**: `null`
- **Purpose**: Independent delivery riders
- **Can create packages**: ❌ No (only deliver)
- **Example**: Freelance motorcycle courier

### 4. Business Riders (RIDER role)
- **tenant_id**: `business_id`
- **Purpose**: Riders employed by a business
- **Can create packages**: ❌ No (only deliver)
- **Example**: Company-employed driver

## Database Schema

### users table
```sql
tenant_id UUID NULL  -- Nullable: customers and solo riders have null
```

### packages table
```sql
tenant_id UUID NULL  -- Nullable: customer packages have null, business packages have business_id
```

### riders table
```sql
business_id UUID NULL  -- Nullable: solo riders have null
```

## Package Creation Flow

### Customer Creates Package
```
Customer (tenant_id: null)
  └─> Package (tenant_id: null)
      └─> Assigned to any available rider
```

### Business Creates Package
```
Business User (tenant_id: business_123)
  └─> Package (tenant_id: business_123)
      └─> Assigned to business riders or solo riders
```

## Why tenant_id is Nullable

### Before (Incorrect)
- ❌ Customers couldn't create packages (tenant_id required)
- ❌ Solo riders couldn't exist (tenant_id required)
- ❌ System was business-only

### After (Correct)
- ✅ Customers can create packages (tenant_id: null)
- ✅ Solo riders can deliver (tenant_id: null)
- ✅ Businesses have isolation (tenant_id: business_id)
- ✅ Platform serves both B2C and B2B

## Multi-Tenant Isolation

### Business Packages
- Only visible to users with matching `tenant_id`
- Business managers see only their business packages
- Enforced in repository layer: `WHERE tenant_id = ?`

### Customer Packages
- Visible to package creator (sender_id)
- Visible to recipient (recipient_id or guest_token)
- No tenant isolation needed

## API Behavior

### Endpoints Requiring tenant_id
```
GET  /api/users              - List users in tenant
POST /api/users              - Create user in tenant
GET  /api/dashboard          - Tenant dashboard
GET  /api/invoices           - Tenant invoices
```
**Returns 403** if `req.user.tenant_id` is null

### Endpoints NOT Requiring tenant_id
```
POST /api/packages           - Create package (customer or business)
GET  /api/packages/:tracking - Track package (public)
POST /api/wallet/balance     - Rider wallet (solo or business)
GET  /api/referrals/my-code  - Rider referrals
```
**Works with** `req.user.tenant_id` as null or business_id

## Migration Required

```sql
-- Run this migration
ALTER TABLE packages ALTER COLUMN tenant_id DROP NOT NULL;
```

## Code Changes Made

1. **UserModel**: `tenant_id: string | null`
2. **PackageModel**: `tenant_id?: string` (nullable)
3. **PackageService**: Accepts `tenant_id: string | null`
4. **PackageRepository**: Handles null tenant_id in updateStatus
5. **PricingService**: Accepts `tenant_id: string | null`

## Testing

### Customer Package Creation
```bash
# Register customer
POST /api/auth/register/customer
{
  "email": "customer@test.com",
  "password": "pass123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345678"
}

# Create package (tenant_id will be null)
POST /api/packages
Authorization: Bearer {customer_token}
{
  "recipient_name": "Jane Doe",
  "recipient_phone": "+2348087654321",
  "pickup_address": "123 Main St",
  "delivery_address": "456 Oak Ave",
  "description": "Documents",
  "package_size": "SMALL",
  "delivery_speed": "STANDARD"
}
```

### Business Package Creation
```bash
# Register business
POST /api/auth/register/business
{
  "email": "business@test.com",
  "password": "pass123",
  "business_name": "Fast Logistics",
  "business_address": "789 Business Blvd",
  "contact_person": "Manager Name",
  "phone": "+2348011111111"
}

# Create package (tenant_id will be business_id)
POST /api/packages
Authorization: Bearer {business_token}
{
  "recipient_name": "Client Name",
  "recipient_phone": "+2348087654321",
  "pickup_address": "Warehouse A",
  "delivery_address": "Client Office",
  "description": "Order #12345",
  "package_size": "MEDIUM",
  "delivery_speed": "EXPRESS"
}
```

## Summary

**tenant_id is nullable** because the platform serves:
1. **B2C**: Customers sending packages (no tenant)
2. **B2B**: Businesses managing logistics (with tenant)
3. **Gig Economy**: Solo riders delivering (no tenant)

This architecture enables a **hybrid marketplace** where individuals and businesses coexist.
