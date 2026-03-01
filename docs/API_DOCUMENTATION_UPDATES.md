# API Documentation Updates - Rider Registration

## Updated Endpoints

### POST /api/auth/register/rider

**New Features:**
- ✅ Auto-generates unique rider ID (TRK-XXXX)
- ✅ Sends email verification code
- ✅ Returns JWT token immediately
- ✅ Includes rider_id in response

**Request Body:**
```json
{
  "email": "rider@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345678",
  "license_number": "LIC-12345",
  "vehicle_type": "MOTORCYCLE",
  "vehicle_plate": "ABC-123-XY",
  "business_id": "uuid-optional"
}
```

**Response (201 Created):**
```json
{
  "message": "Rider registered successfully. Please check your email for verification code.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "rider@example.com",
    "tenant_id": null
  },
  "rider_profile": {
    "id": "uuid",
    "rider_id": "TRK-1000",
    "full_name": "John Doe",
    "rider_type": "INDEPENDENT",
    "verification_status": "PENDING"
  },
  "verification_required": true
}
```

**Error Responses:**
```json
// 409 Conflict
{
  "error": "User already exists"
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "details": "Error message"
}
```

---

## New Verification Endpoints

### POST /api/verification/verify-email
Verify email with 6-digit code sent during registration.

**Request:**
```json
{
  "email": "rider@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

### POST /api/verification/resend-email
Resend verification code if expired or not received.

**Request:**
```json
{
  "email": "rider@example.com"
}
```

**Response:**
```json
{
  "message": "Verification code sent to email"
}
```

---

## Updated Login Response

### POST /api/auth/login

**Response (with encryption):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": "a1b2c3d4e5f6...encrypted_hex_string"
}
```

**Note:** User data is now encrypted. Client must decrypt the `data` field using AES-256-GCM with `ENCRYPTION_KEY`.

---

## Postman Collection Updates

### Import Updated Collection
1. Open Postman
2. Import → File → Select `TRAKA_API.postman_collection.json`
3. Update environment variables:
   ```
   baseUrl: http://localhost:3000/api
   ENCRYPTION_KEY: your-encryption-key
   ```

### New Requests to Add

#### 1. Rider Registration (Updated)
```
POST {{baseUrl}}/auth/register/rider
Content-Type: application/json

{
  "email": "rider@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345678",
  "license_number": "LIC-12345",
  "vehicle_type": "MOTORCYCLE",
  "vehicle_plate": "ABC-123-XY"
}
```

#### 2. Verify Email
```
POST {{baseUrl}}/verification/verify-email
Content-Type: application/json

{
  "email": "rider@example.com",
  "code": "123456"
}
```

#### 3. Resend Verification
```
POST {{baseUrl}}/verification/resend-email
Content-Type: application/json

{
  "email": "rider@example.com"
}
```

#### 4. Admin Registration (New)
```
POST {{baseUrl}}/auth/register/admin
Authorization: Bearer {{super_admin_token}}
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "AdminPass123!",
  "first_name": "Admin",
  "last_name": "User",
  "phone": "+2348012345678",
  "role": "ADMIN"
}
```

---

## Swagger Documentation

The Swagger file (`swagger.yaml`) has been updated with:
- Detailed rider registration endpoint
- Request/response examples
- Error codes and descriptions
- Verification endpoints
- Admin registration endpoint

**View Swagger UI:**
```bash
# Install swagger-ui-express (if not already)
npm install swagger-ui-express

# Access at: http://localhost:3000/api-docs
```

---

## Testing Workflow

### 1. Register Rider
```bash
POST /api/auth/register/rider
# Save token and rider_id from response
```

### 2. Check Email
```
Subject: Verify Your TRAKA Account
Code: 123456 (6-digit code)
```

### 3. Verify Email
```bash
POST /api/verification/verify-email
{
  "email": "rider@example.com",
  "code": "123456"
}
```

### 4. Login
```bash
POST /api/auth/login
{
  "email": "rider@example.com",
  "password": "SecurePass123!"
}
# Returns encrypted user data
```

### 5. Decrypt Response (Client-side)
```javascript
const userData = decryptAES(response.data, ENCRYPTION_KEY);
console.log(userData); // { id, email, tenant_id }
```

---

## Breaking Changes

### ⚠️ Login Response Changed
**Before:**
```json
{
  "token": "...",
  "user": { "id": "...", "email": "...", "role": "..." }
}
```

**After:**
```json
{
  "token": "...",
  "data": "encrypted_hex_string"
}
```

**Migration:** Update client to decrypt `data` field instead of reading `user` directly.

### ⚠️ Role Removed from Response
User role is no longer exposed in login/registration responses. It's still in the JWT token for authorization.

---

## Environment Variables Required

```env
# Existing
JWT_SECRET=your-jwt-secret
POSTGRES_URL=postgresql://...
REDIS_URL=redis://...

# New
ENCRYPTION_KEY=64-character-hex-string
BREVO_API_KEY=your-brevo-api-key
SMTP_FROM=noreply@traka.com
```

---

## Client Implementation

### Decrypt User Data (JavaScript)
```javascript
import CryptoJS from 'crypto-js';

function decryptUserData(encryptedHex, key) {
  const iv = CryptoJS.enc.Hex.parse(encryptedHex.slice(0, 32));
  const authTag = CryptoJS.enc.Hex.parse(encryptedHex.slice(32, 64));
  const encrypted = encryptedHex.slice(64);
  
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: CryptoJS.enc.Hex.parse(encrypted) },
    CryptoJS.enc.Hex.parse(key),
    { iv, mode: CryptoJS.mode.GCM }
  );
  
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}

// Usage
const userData = decryptUserData(response.data, process.env.ENCRYPTION_KEY);
```

---

## Documentation Files

1. **swagger.yaml** - OpenAPI 3.0 specification (✅ Updated)
2. **TRAKA_API.postman_collection.json** - Postman collection (⚠️ Manual update needed)
3. **ENCRYPTION_GUIDE.md** - Encryption implementation guide
4. **EMAIL_VERIFICATION.md** - Verification system documentation
5. **RIDER_ID_FEATURE.md** - Unique rider ID documentation
6. **ADMIN_REGISTRATION.md** - Admin registration guide

---

## Next Steps

1. ✅ Update Swagger documentation
2. ⚠️ Update Postman collection manually (add new requests above)
3. ✅ Test all endpoints
4. ✅ Update client applications to handle encryption
5. ✅ Configure email service (Brevo)
6. ✅ Generate encryption key for production
