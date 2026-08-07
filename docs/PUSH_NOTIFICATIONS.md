# Push Notification Setup

## Firebase Cloud Messaging (FCM) Integration

### Prerequisites
1. Firebase project created at https://console.firebase.google.com
2. Firebase Admin SDK service account JSON file

### Setup Steps

#### 1. Create Firebase Project
- Go to Firebase Console
- Create new project or select existing
- Enable Cloud Messaging

#### 2. Generate Service Account Key
- Go to Project Settings → Service Accounts
- Click "Generate New Private Key"
- Download JSON file

#### 3. Configure Environment Variable
Add to `.env`:
```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
```

Or use file path (alternative):
```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

### Client Integration

#### Mobile App (React Native / Flutter)
1. Install Firebase SDK
2. Get FCM token on app launch
3. Send token to backend via API

#### Web App
1. Add Firebase JS SDK
2. Request notification permission
3. Get FCM token
4. Send to backend

### API Endpoints

#### Register FCM Token
```http
PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "fcm_token": "device-fcm-token-here",
  "push_enabled": true
}
```

#### Get Notifications
```http
GET /api/notifications
Authorization: Bearer <token>
```

#### Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

### Notification Types

- `DELIVERY_ASSIGNED` - Rider gets new delivery
- `RIDER_ASSIGNED` - Customer notified of rider assignment
- `RIDER_ARRIVED` - Rider arrived at pickup location
- `PICKUP_CONFIRMED` - Package picked up
- `IN_TRANSIT` - Package in transit
- `OUT_FOR_DELIVERY` - Package out for delivery
- `DELIVERED` - Package delivered
- `CANCELLED` - Package cancelled
- `PAYMENT_RECEIVED` - Payment credited to wallet
- `RATING_RECEIVED` - New rating received

### Testing

#### Send Test Notification
```typescript
import { NotificationService, NotificationType } from './notification/notification.service';

const notificationService = new NotificationService();

await notificationService.sendToRider('rider-id', NotificationType.DELIVERY_ASSIGNED, {
  tracking_number: 'TRK123456',
  pickup_address: '123 Main St'
});
```

### Troubleshooting

**Push not received:**
- Check FCM token is valid and registered
- Verify Firebase service account credentials
- Check device notification permissions
- Review Firebase Console logs

**Token expired:**
- Tokens can expire, implement refresh logic
- Re-register token when app detects expiration

### Security Notes

- Never commit service account JSON to git
- Use environment variables or secret management
- Rotate service account keys periodically
- Validate FCM tokens before storing
