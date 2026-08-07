# Rider Unique ID Feature

## Overview
Each rider now has a unique identifier in the format `TRK-XXXX` (e.g., TRK-1000, TRK-1001, TRK-3245) that is automatically generated upon registration and displayed for every delivery.

## Implementation Details

### Database Schema
- **Field**: `rider_id` (VARCHAR(20), UNIQUE, NOT NULL)
- **Format**: `TRK-` followed by a 4-digit zero-padded number
- **Starting Number**: 1000
- **Auto-increment**: Sequential numbering based on registration order

### Migration
Run the migration to add the `rider_id` field:
```bash
psql -d traka -f migrations/add_rider_unique_id.sql
```

This migration will:
1. Add the `rider_id` column to the `riders` table
2. Create an index for faster lookups
3. Generate unique IDs for existing riders (starting from TRK-1000)
4. Set the column as NOT NULL

### API Changes

#### Rider Registration Response
When a rider registers, the response now includes the `rider_id`:
```json
{
  "message": "Independent rider registration submitted for verification",
  "profile": {
    "id": "uuid-here",
    "rider_id": "TRK-1000",
    "full_name": "John Doe",
    "phone": "+2348012345678",
    ...
  }
}
```

#### Rider Profile Response
All rider profile endpoints now include the `rider_id`:
```json
{
  "id": "uuid-here",
  "rider_id": "TRK-1000",
  "user_id": "user-uuid",
  "full_name": "John Doe",
  "vehicle_type": "MOTORCYCLE",
  ...
}
```

### New Service Methods

#### Get Rider by Rider ID
```typescript
const rider = await riderService.getRiderById('TRK-1000');
```

### Usage in Deliveries
The `rider_id` is automatically included in:
- Delivery assignments
- Package tracking information
- Rider profile responses
- Commission records
- Delivery logs

### Example Use Cases

1. **Customer Support**: "Your delivery is being handled by rider TRK-1000"
2. **Tracking**: Display rider ID on tracking pages
3. **Reports**: Filter deliveries by rider ID
4. **Referrals**: "Rider TRK-1000 referred you"

## Benefits

- **Easy Identification**: Short, memorable IDs for customer support
- **Privacy**: No need to expose rider names or phone numbers
- **Professional**: Consistent branding with TRK prefix
- **Scalable**: Supports up to 9,999 riders (TRK-1000 to TRK-9999)
- **Unique**: Database constraint ensures no duplicates
