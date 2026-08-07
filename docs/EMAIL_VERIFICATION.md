# Email/Phone Verification System

## Overview
Users must verify their email after registration. A 6-digit code is sent via email and stored in Redis with 10-minute expiry.

## Flow

### 1. Registration
```
POST /api/auth/register/customer
POST /api/auth/register/business
POST /api/auth/register/rider
```

**Response:**
```json
{
  "message": "Customer registered successfully. Please check your email for verification code.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "email_verified": false
  },
  "verification_required": true
}
```

**Email Sent:**
```
Subject: Verify Your TRAKA Account
Body: Your verification code is: 123456
```

### 2. Verify Email
```
POST /api/verification/verify-email
```

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success Response:**
```json
{
  "message": "Email verified successfully"
}
```

**Error Response:**
```json
{
  "error": "Invalid or expired verification code"
}
```

### 3. Resend Verification Code
```
POST /api/verification/resend-email
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification code sent to email"
}
```

---

## Phone Verification (Optional)

### Verify Phone
```
POST /api/verification/verify-phone
```

**Request:**
```json
{
  "phone": "+2348012345678",
  "code": "123456"
}
```

### Resend Phone Code
```
POST /api/verification/resend-phone
```

**Request:**
```json
{
  "phone": "+2348012345678"
}
```

---

## Redis Storage

### Email Verification
- **Key**: `verify:email:{email}`
- **Value**: 6-digit code
- **TTL**: 600 seconds (10 minutes)

### Phone Verification
- **Key**: `verify:phone:{phone}`
- **Value**: 6-digit code
- **TTL**: 600 seconds (10 minutes)

---

## Database Fields

### users table
- `email_verified` (BOOLEAN, default: false)
- `phone_verified` (BOOLEAN, default: false)

---

## Testing

### 1. Register User
```bash
POST http://localhost:3000/api/auth/register/customer
{
  "email": "test@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345678"
}
```

### 2. Check Email for Code
Look for 6-digit code in email (or check Redis)

### 3. Verify Email
```bash
POST http://localhost:3000/api/verification/verify-email
{
  "email": "test@example.com",
  "code": "123456"
}
```

### 4. Check Verification Status
```bash
POST http://localhost:3000/api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}

# Response includes email_verified: true
```

---

## Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Invalid code | 400 | Invalid or expired verification code |
| User not found | 404 | User not found |
| Already verified | 400 | Email already verified |
| Code expired | 400 | Invalid or expired verification code |

---

## Security Features

1. **Code Expiry**: 10 minutes
2. **One-time Use**: Code deleted after successful verification
3. **Rate Limiting**: Should be added to prevent spam
4. **Secure Storage**: Codes stored in Redis, not database

---

## Environment Variables

```env
BREVO_API_KEY=your_brevo_api_key
SMTP_FROM=noreply@traka.com
KUDISMS_API_TOKEN=your_kudisms_token (for SMS)
```

---

## Future Enhancements

- [ ] Rate limiting on resend (max 3 per hour)
- [ ] Account lockout after 5 failed attempts
- [ ] Email verification required before certain actions
- [ ] SMS verification for riders
- [ ] 2FA option for business accounts
