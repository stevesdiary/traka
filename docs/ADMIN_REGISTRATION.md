# Admin Registration Guide

## Overview
ADMIN and SUPER_ADMIN users are **not registered through public endpoints** for security reasons. They must be created via:
1. Database seeding script (recommended)
2. Direct database insertion
3. Promotion from existing users (future feature)

---

## Method 1: Seeding Script (Recommended)

### Run the Seed Script
```bash
npm run seed:admins
```

### Default Credentials Created

**Super Admin:**
- Email: `superadmin@traka.com`
- Password: `SuperAdmin@123`
- Role: `SUPER_ADMIN`
- Verified: ✅ (email & phone)

**Admin:**
- Email: `admin@traka.com`
- Password: `Admin@123`
- Role: `ADMIN`
- Verified: ✅ (email & phone)

### Test Login
```bash
POST http://localhost:3000/api/auth/login
{
  "email": "superadmin@traka.com",
  "password": "SuperAdmin@123"
}
```

---

## Method 2: Direct Database Insertion

### Using psql
```sql
-- Connect to database
psql -d traka

-- Create Super Admin
INSERT INTO users (
  id, 
  email, 
  password_hash, 
  role, 
  tenant_id, 
  first_name, 
  last_name, 
  phone,
  email_verified,
  phone_verified,
  created_at, 
  updated_at
) VALUES (
  gen_random_uuid(),
  'superadmin@traka.com',
  '$2b$10$YourHashedPasswordHere',  -- Use bcrypt to hash
  'SUPER_ADMIN',
  NULL,
  'Super',
  'Admin',
  '+2348000000001',
  true,
  true,
  NOW(),
  NOW()
);
```

### Generate Password Hash
```bash
# Using Node.js
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword', 10).then(console.log);"
```

---

## Method 3: Promote Existing User (Future)

Create an endpoint to promote users (Super Admin only):

```typescript
// Future implementation
POST /api/users/:id/promote
Authorization: Bearer <super_admin_token>
{
  "role": "ADMIN"
}
```

---

## Role Hierarchy

```
SUPER_ADMIN (highest)
  ├── Full system access
  ├── Can create/delete admins
  ├── Can hard delete riders
  └── System configuration

ADMIN
  ├── Business approval
  ├── User management
  ├── Financial oversight
  └── Cannot modify super admins

MANAGER
  ├── Package management
  ├── Rider coordination
  └── Operational tasks

RIDER
  ├── Accept deliveries
  ├── Update locations
  └── Wallet management

USER (Customer)
  ├── Track packages
  ├── Manage deliveries
  └── Customer support
```

---

## Security Best Practices

### 1. Change Default Passwords
```bash
POST /api/auth/change-password
Authorization: Bearer <admin_token>
{
  "current_password": "SuperAdmin@123",
  "new_password": "YourSecurePassword123!"
}
```

### 2. Use Strong Passwords
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Not in common password lists

### 3. Enable 2FA (Future)
- SMS verification
- Authenticator app
- Backup codes

### 4. Limit Admin Accounts
- Only create admins when necessary
- Review admin list regularly
- Deactivate unused accounts

### 5. Audit Logs (Future)
- Track all admin actions
- Monitor login attempts
- Alert on suspicious activity

---

## Troubleshooting

### Script Fails to Run
```bash
# Ensure database is running
psql -d traka -c "SELECT 1;"

# Check environment variables
cat .env | grep POSTGRES

# Rebuild TypeScript
npm run build
```

### Admin Already Exists
The script will skip creation and show:
```
⚠️  Super Admin already exists
⚠️  Admin already exists
```

### Cannot Login
1. Check password is correct
2. Verify email in database: `SELECT * FROM users WHERE email = 'superadmin@traka.com';`
3. Check JWT_SECRET in .env
4. Verify email_verified is true

---

## Production Deployment

### 1. Seed Admins on First Deploy
```bash
# In production environment
NODE_ENV=production npm run seed:admins
```

### 2. Change Default Passwords Immediately
```bash
# Login and change password
POST /api/auth/login
POST /api/auth/change-password
```

### 3. Secure Environment Variables
```env
# Use strong, unique values
JWT_SECRET=<generate-random-256-bit-key>
POSTGRES_URL=<production-database-url>
```

### 4. Restrict Database Access
- Only allow admin creation from secure networks
- Use VPN or IP whitelist
- Enable database audit logs

---

## Future Enhancements

- [ ] Admin invitation system (email invite with token)
- [ ] Role promotion endpoint (Super Admin only)
- [ ] Admin approval workflow
- [ ] 2FA for admin accounts
- [ ] Admin activity audit logs
- [ ] Password reset for admins
- [ ] Session management (force logout)
- [ ] IP whitelist for admin access
