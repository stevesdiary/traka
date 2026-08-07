# Backblaze B2 Storage Setup

## Overview
S3-compatible object storage for profile pictures, vehicle photos, package images, documents, receipts, and invoices.

## Setup Steps

### 1. Create Backblaze B2 Account
- Sign up at https://www.backblaze.com/b2/sign-up.html
- Free tier: 10GB storage, 1GB daily download

### 2. Create Bucket
- Go to B2 Cloud Storage → Buckets
- Click "Create a Bucket"
- Bucket Name: `traka-storage` (or your choice)
- Files in Bucket: Public or Private (recommend Private with signed URLs)
- Encryption: Server-Side Encryption (optional)

### 3. Generate Application Key
- Go to App Keys
- Click "Add a New Application Key"
- Name: `traka-api`
- Allow access to: Your bucket
- Permissions: Read and Write
- Save the `keyID` and `applicationKey` (shown once)

### 4. Get S3 Endpoint
- Go to Buckets → Your Bucket → Bucket Settings
- Find "Endpoint" under S3 Compatible API
- Format: `https://s3.us-west-000.backblazeb2.com`

### 5. Configure Environment
Add to `.env`:
```bash
B2_ENDPOINT=https://s3.us-west-000.backblazeb2.com
B2_KEY_ID=your_key_id_here
B2_APPLICATION_KEY=your_application_key_here
B2_BUCKET_NAME=traka-storage
```

## API Endpoints

### Upload Profile Picture
```http
POST /api/upload/profile
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image file>
```

### Upload Vehicle Picture
```http
POST /api/upload/vehicle
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image file>
```

### Upload Package Picture
```http
POST /api/upload/package
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image file>
```

### Upload Document (License, Receipt, Invoice)
```http
POST /api/upload/document
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <pdf or image>
```

### Get Signed URL (Private Files)
```http
GET /api/upload/signed-url/:key
Authorization: Bearer <token>
```

### Delete File
```http
DELETE /api/upload/:key
Authorization: Bearer <token>
```

## File Organization

```
bucket/
├── profiles/          # User profile pictures
├── vehicles/          # Vehicle photos
├── packages/          # Package images
└── documents/         # Licenses, receipts, invoices
```

## Supported File Types

- **Images**: JPEG, PNG, WEBP
- **Documents**: PDF
- **Max Size**: 5MB per file

## Usage Examples

### Upload Profile Picture
```bash
curl -X POST http://localhost:4000/api/upload/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@profile.jpg"
```

Response:
```json
{
  "key": "profiles/uuid.jpg",
  "url": "https://s3.us-west-000.backblazeb2.com/traka-storage/profiles/uuid.jpg"
}
```

### Update Rider Profile with Photo
```typescript
// 1. Upload photo
const formData = new FormData();
formData.append('file', file);

const uploadRes = await fetch('/api/upload/profile', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { key, url } = await uploadRes.json();

// 2. Update profile
await fetch('/api/riders/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ profile_photo: url })
});
```

## Cost Estimation

**Free Tier:**
- 10GB storage
- 1GB daily download
- Unlimited uploads

**Paid (if exceeded):**
- Storage: $0.005/GB/month
- Download: $0.01/GB
- Upload: Free

**Example Monthly Cost:**
- 50GB storage: $0.25
- 100GB downloads: $1.00
- Total: ~$1.25/month

## Security Best Practices

1. **Private Buckets**: Use signed URLs for sensitive files
2. **File Validation**: Validate file types and sizes
3. **Access Control**: Authenticate all upload/delete requests
4. **Key Rotation**: Rotate application keys periodically
5. **CORS**: Configure CORS if accessing from browser

## Troubleshooting

**Upload fails:**
- Check B2 credentials in `.env`
- Verify bucket name is correct
- Ensure application key has write permissions

**File not accessible:**
- For private buckets, use signed URLs
- Check bucket is public if using direct URLs
- Verify endpoint URL format

**Large files fail:**
- Current limit: 5MB
- Increase in `upload.middleware.ts` if needed
- B2 supports up to 5GB per file

## Migration from Local Storage

If currently storing files locally:

```typescript
import storageService from './storage/storage.service';
import fs from 'fs';

async function migrateFile(localPath: string, folder: string) {
  const buffer = fs.readFileSync(localPath);
  const file = {
    buffer,
    originalname: path.basename(localPath),
    mimetype: 'image/jpeg' // detect from file
  } as Express.Multer.File;
  
  const key = await storageService.uploadFile(file, folder);
  return storageService.getPublicUrl(key);
}
```
