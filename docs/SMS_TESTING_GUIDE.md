# SMS Service Testing Guide

## Prerequisites

### 1. Get KudiSMS API Credentials
1. Sign up at [KudiSMS](https://my.kudisms.net)
2. Get your API token from the dashboard
3. Register a Sender ID (e.g., "TRAKA")

### 2. Configure Environment Variables
Add to your `.env` file:
```env
KUDISMS_API_TOKEN=your_api_token_here
KUDISMS_SENDER_ID=TRAKA
KUDISMS_GATEWAY=2
```

**Gateway Options:**
- `1` = No Refunds (cheaper, no refunds for DND numbers)
- `2` = Refunds (default, refunds for DND numbers)

---

## Testing in Postman

### Endpoint
```
POST http://localhost:3000/api/notifications/test-sms
```

### Headers
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "phone": "+2348012345678",
  "message": "Hello from TRAKA! This is a test SMS."
}
```

### Success Response (200)
```json
{
  "message": "SMS sent successfully",
  "phone": "+2348012345678"
}
```

### Error Response (500)
```json
{
  "error": "KudiSMS API error: You do not have enough credit balance to perform the transaction (Code: 109)"
}
```

---

## Phone Number Format

KudiSMS accepts multiple formats:
- International: `+2348012345678`
- Local: `08012345678`
- Multiple recipients: `+2348012345678,+2348087654321`

---

## Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 000 | Message Sent Successfully | ✅ Success |
| 100 | Token provided is invalid | Check KUDISMS_API_TOKEN |
| 105 | Sender ID has been blocked | Contact KudiSMS support |
| 106 | Sender ID doesn't exist | Register sender ID first |
| 107 | Invalid phone number | Check phone format |
| 109 | Insufficient credit balance | Top up your account |
| 188 | Sender ID is unapproved | Wait for approval or use approved ID |

---

## Testing Steps

### 1. Get Authentication Token
```bash
# Login first
POST http://localhost:3000/api/auth/login
{
  "email": "admin@traka.com",
  "password": "your_password"
}

# Copy the token from response
```

### 2. Test SMS Endpoint
```bash
POST http://localhost:3000/api/notifications/test-sms
Authorization: Bearer <token>
{
  "phone": "+2348012345678",
  "message": "Test message from TRAKA"
}
```

### 3. Check Console Logs
The server will log:
```
SMS sent successfully to +2348012345678. Cost: ₦2.50, Balance: ₦97.50
```

---

## Postman Collection Example

```json
{
  "name": "Test SMS",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{auth_token}}",
        "type": "text"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "type": "text"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"phone\": \"+2348012345678\",\n  \"message\": \"Hello from TRAKA! This is a test SMS.\"\n}"
    },
    "url": {
      "raw": "http://localhost:3000/api/notifications/test-sms",
      "protocol": "http",
      "host": ["localhost"],
      "port": "3000",
      "path": ["api", "notifications", "test-sms"]
    }
  }
}
```

---

## SMS Service Methods

### 1. Send Generic SMS
```typescript
const smsService = new SMSService();
await smsService.sendSMS('+2348012345678', 'Your message here');
```

### 2. Send OTP
```typescript
await smsService.sendOTP('+2348012345678', '123456');
// Sends: "Your TRAKA verification code is: 123456. This code will expire in 10 minutes."
```

### 3. Send Notification
```typescript
await smsService.sendNotification(
  '+2348012345678',
  'Package Update',
  'Your package has been delivered!'
);
```

---

## Cost Estimation

**KudiSMS Pricing (approximate):**
- 1 SMS page = 160 characters
- Cost per page: ₦2.50 - ₦4.00 (varies by gateway)
- Bulk discounts available

**Message Length:**
- 1 page: 0-160 characters
- 2 pages: 161-306 characters
- 3 pages: 307-459 characters

---

## Production Considerations

### 1. Rate Limiting
Add rate limiting to prevent abuse:
```typescript
// In routes
import rateLimit from 'express-rate-limit';

const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 SMS per 15 minutes
});

router.post('/test-sms', smsLimiter, notificationController.testSMS);
```

### 2. Remove Test Endpoint
Remove or restrict the test endpoint in production:
```typescript
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-sms', notificationController.testSMS);
}
```

### 3. Logging
Log all SMS for audit:
```typescript
await logSMS({
  phone,
  message,
  status: 'sent',
  cost: result.cost,
  timestamp: new Date()
});
```

---

## Troubleshooting

### SMS Not Sending
1. Check API token is correct
2. Verify sender ID is approved
3. Check account balance
4. Verify phone number format
5. Check console logs for errors

### Invalid Token Error
- Regenerate token from KudiSMS dashboard
- Update `.env` file
- Restart server

### Sender ID Not Approved
- Use default sender ID temporarily
- Contact KudiSMS support for approval
- Approval usually takes 24-48 hours

---

## Alternative: Test Without KudiSMS

If you don't have KudiSMS credentials yet:

```typescript
// In sms.service.ts constructor
if (!this.apiToken) {
  console.warn('KudiSMS API token not configured. SMS not sent.');
  return; // Will just log to console
}
```

The service will log messages to console instead of sending actual SMS.

---

## Next Steps

1. ✅ Configure environment variables
2. ✅ Get authentication token
3. ✅ Test SMS endpoint in Postman
4. ✅ Verify SMS received on phone
5. ✅ Check server logs for cost/balance
6. ✅ Integrate into package tracking notifications
