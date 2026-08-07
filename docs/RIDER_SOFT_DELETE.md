# Rider Soft Delete Feature

## Overview
Business-managed riders can be soft deleted by business admins/managers. Only Super Admins can permanently delete riders. Soft-deleted riders are automatically hard-deleted after 360 days.

## Features

### 1. Soft Delete (Business Admin/Manager)
- Sets `deleted_at` timestamp
- Rider becomes inactive (status: OFFLINE, is_available: false)
- User account is also soft-deleted (cascade)
- Email notification sent to rider
- Can be restored within 30 days

### 2. Hard Delete (Super Admin Only)
- Permanently removes rider from database
- Cannot be restored
- Should only be used in exceptional cases

### 3. Restore (Business Admin/Super Admin)
- Restore soft-deleted riders within 30 days
- After 30 days, only Super Admin can restore
- Rider status remains OFFLINE after restore (manual activation required)

### 4. Auto-Cleanup
- Cron job runs daily at 2 AM
- Permanently deletes riders soft-deleted > 360 days ago
- Logs all deletions for audit trail

## API Endpoints

### Soft Delete Rider
```http
DELETE /api/riders/:id
Authorization: Bearer <token>
Role: ADMIN, MANAGER (business-managed riders only)
```

**Response:**
```json
{
  "message": "Rider deactivated successfully"
}
```

**Validation Rules:**
- ✅ Rider must belong to the business (for business admins)
- ✅ No active deliveries (PENDING, IN_TRANSIT, OUT_FOR_DELIVERY)
- ✅ Wallet balance must be zero or positive
- ✅ Email notification sent to rider

**Error Responses:**
```json
// Unauthorized
{ "error": "Unauthorized: Rider does not belong to this business" }

// Active deliveries
{ "error": "Cannot delete rider with active deliveries" }

// Negative balance
{ "error": "Cannot delete rider with negative wallet balance" }

// Not found
{ "error": "Rider not found" }
```

---

### Hard Delete Rider (Super Admin Only)
```http
DELETE /api/riders/:id/permanent
Authorization: Bearer <token>
Role: SUPER_ADMIN
```

**Response:**
```json
{
  "message": "Rider permanently deleted"
}
```

---

### Restore Rider
```http
POST /api/riders/:id/restore
Authorization: Bearer <token>
Role: ADMIN (within 30 days), SUPER_ADMIN (anytime)
```

**Response:**
```json
{
  "message": "Rider restored successfully",
  "rider": {
    "id": "uuid",
    "rider_id": "TRK-1000",
    "full_name": "John Doe",
    "status": "OFFLINE",
    ...
  }
}
```

**Validation Rules:**
- ✅ Rider must belong to the business (for business admins)
- ✅ Can only restore within 30 days (business admins)
- ✅ Super Admin can restore anytime

**Error Responses:**
```json
// Expired
{ "error": "Cannot restore rider deleted more than 30 days ago" }

// Unauthorized
{ "error": "Unauthorized: Rider does not belong to this business" }
```

---

### Get Deleted Riders
```http
GET /api/riders/deleted
Authorization: Bearer <token>
Role: ADMIN, SUPER_ADMIN
```

**Response:**
```json
{
  "riders": [
    {
      "id": "uuid",
      "rider_id": "TRK-1000",
      "full_name": "John Doe",
      "deleted_at": "2024-01-15T10:30:00Z",
      ...
    }
  ]
}
```

---

## Database Schema

### Migration
```sql
-- Add deleted_at columns
ALTER TABLE riders ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create indexes
CREATE INDEX idx_riders_deleted_at ON riders(deleted_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_riders_business_deleted ON riders(business_id, deleted_at);
```

### Sequelize Paranoid Mode
Both `RiderModel` and `UserModel` have `paranoid: true` enabled:
- Automatically adds `deleted_at` field
- `destroy()` performs soft delete
- `destroy({ force: true })` performs hard delete
- `restore()` undeletes records
- Queries automatically exclude soft-deleted records

---

## Business Logic

### Deletion Validation Checklist
1. ✅ **Active Deliveries Check**
   - Query packages with status: PENDING, IN_TRANSIT, OUT_FOR_DELIVERY
   - Block deletion if any active deliveries exist

2. ✅ **Wallet Balance Check**
   - Query rider's wallet balance
   - Block deletion if balance < 0
   - Rider must settle debts before deletion

3. ✅ **Business Ownership Check**
   - Verify rider belongs to requesting business
   - Super Admin can delete any rider

4. ✅ **Pre-Deletion Actions**
   - Set rider status to OFFLINE
   - Set is_available to false
   - Cascade soft delete to user account

5. ✅ **Post-Deletion Actions**
   - Send email notification to rider
   - Log deletion event

### Restore Validation Checklist
1. ✅ **Time Limit Check**
   - Business admins: 30 days max
   - Super Admin: no time limit

2. ✅ **Business Ownership Check**
   - Verify rider belongs to requesting business
   - Super Admin can restore any rider

3. ✅ **Post-Restore Actions**
   - Rider remains OFFLINE (manual activation required)
   - Email notification (optional)

---

## Cron Job Setup

### Enable Auto-Cleanup
Add to your main server file (`src/index.ts`):

```typescript
import { RiderCleanupCron } from './rider/rider-cleanup.cron.js';

// Start cron job
RiderCleanupCron.startCronJob();
```

### Manual Cleanup
```typescript
import { RiderCleanupCron } from './rider/rider-cleanup.cron.js';

// Run cleanup manually
await RiderCleanupCron.cleanupOldDeletedRiders();
```

### Configuration
- **Retention Period**: 360 days (configurable in `rider-cleanup.cron.ts`)
- **Schedule**: Daily at 2 AM
- **Logging**: All deletions logged to console

---

## Email Notifications

### Deletion Notification
**Subject:** Account Deactivated

**Body:**
```
Dear [Rider Name],

Your rider account ([Rider ID]) has been deactivated. 
If you believe this is an error, please contact support.

Best regards,
TRAKA Team
```

### Restore Notification (Optional)
**Subject:** Account Restored

**Body:**
```
Dear [Rider Name],

Your rider account ([Rider ID]) has been restored. 
Please contact your business admin to reactivate your account.

Best regards,
TRAKA Team
```

---

## Permission Matrix

| Role | Soft Delete | Hard Delete | Restore (< 30 days) | Restore (> 30 days) | View Deleted |
|------|-------------|-------------|---------------------|---------------------|--------------|
| SUPER_ADMIN | ✅ All riders | ✅ All riders | ✅ All riders | ✅ All riders | ✅ All riders |
| ADMIN (Business) | ✅ Own riders | ❌ | ✅ Own riders | ❌ | ✅ Own riders |
| MANAGER (Business) | ✅ Own riders | ❌ | ❌ | ❌ | ❌ |
| RIDER | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Testing

### Test Soft Delete
```bash
# Soft delete rider
curl -X DELETE http://localhost:3000/api/riders/{rider_id} \
  -H "Authorization: Bearer <token>"

# Verify rider is soft deleted
curl http://localhost:3000/api/riders/deleted \
  -H "Authorization: Bearer <token>"
```

### Test Restore
```bash
# Restore rider
curl -X POST http://localhost:3000/api/riders/{rider_id}/restore \
  -H "Authorization: Bearer <token>"

# Verify rider is restored
curl http://localhost:3000/api/riders/profile \
  -H "Authorization: Bearer <rider_token>"
```

### Test Hard Delete (Super Admin)
```bash
# Hard delete rider
curl -X DELETE http://localhost:3000/api/riders/{rider_id}/permanent \
  -H "Authorization: Bearer <super_admin_token>"
```

---

## Migration Steps

1. **Run Database Migration**
   ```bash
   psql -d traka -f migrations/add_soft_delete_to_riders_and_users.sql
   ```

2. **Update Environment Variables** (if needed)
   ```env
   BREVO_API_KEY=your_brevo_api_key
   SMTP_FROM=noreply@traka.com
   ```

3. **Enable Cron Job**
   Add to `src/index.ts`:
   ```typescript
   import { RiderCleanupCron } from './rider/rider-cleanup.cron.js';
   RiderCleanupCron.startCronJob();
   ```

4. **Test Endpoints**
   - Import updated Postman collection
   - Test soft delete, restore, and hard delete flows

---

## Troubleshooting

### Issue: Cannot delete rider with active deliveries
**Solution:** Wait for deliveries to complete or reassign them to another rider

### Issue: Cannot delete rider with negative balance
**Solution:** Rider must settle wallet debt before deletion

### Issue: Cannot restore rider after 30 days
**Solution:** Contact Super Admin for restoration

### Issue: Email notifications not sent
**Solution:** Check BREVO_API_KEY environment variable

---

## Future Enhancements

- [ ] Bulk soft delete for multiple riders
- [ ] Scheduled deletion (delete at specific date/time)
- [ ] Deletion reason tracking
- [ ] SMS notifications in addition to email
- [ ] Audit log for all deletion/restore actions
- [ ] Dashboard for deleted riders management
