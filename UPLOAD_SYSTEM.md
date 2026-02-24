# Upload System - Backblaze B2 Integration

## Overview
The upload system has been updated to use Backblaze B2 SDK directly with image processing capabilities.

## Changes Made

### 1. Storage Service (`storage.service.ts`)
- ✅ Replaced AWS S3 SDK with native Backblaze B2 SDK
- ✅ Uses `backblaze-b2` package for better B2 integration
- ✅ Automatic bucket initialization and authorization
- ✅ Proper download URL generation
- ✅ Signed URL support for private files

### 2. Image Processing Service (`image-processing.service.ts`)
- ✅ New service for image optimization
- ✅ Uses Sharp library for image processing
- ✅ Supports resize, format conversion, and quality adjustment
- ✅ Graceful fallback if Sharp is not available
- ✅ Pre-configured methods:
  - `optimizeForWeb()` - Resizes to 1200px width, 85% quality
  - `createThumbnail()` - Creates 200x200 thumbnails

### 3. Upload Controller (`upload.controller.ts`)
- ✅ Integrated image processing for all image uploads
- ✅ Automatically optimizes images before upload
- ✅ Reduces file sizes and improves performance

## Environment Variables

```env
B2_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=your_bucket_name
```

Note: `B2_ENDPOINT` is no longer needed as the SDK handles this automatically.

## API Endpoints

### Upload Profile Photo
```
POST /api/upload/profile
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: <image file>

Response:
{
  "key": "profiles/uuid.jpg",
  "url": "https://f000.backblazeb2.com/file/bucket-name/profiles/uuid.jpg"
}
```

### Update User Profile Photo
```
PUT /api/auth/me/profile-photo
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "profile_photo": "https://f000.backblazeb2.com/file/bucket-name/profiles/uuid.jpg"
}
```

### Other Upload Endpoints
- `POST /api/upload/vehicle` - Upload vehicle pictures
- `POST /api/upload/package` - Upload package pictures
- `POST /api/upload/document` - Upload documents
- `GET /api/upload/signed-url/:key` - Get signed URL for private files
- `DELETE /api/upload/:key` - Delete uploaded file

## Features

### Image Optimization
All image uploads are automatically:
- Resized to max 1200px width (maintains aspect ratio)
- Compressed to 85% quality
- Converted to JPEG format
- Optimized for web delivery

### Security
- All uploads require authentication
- Files are stored with random UUIDs
- Support for signed URLs for private access
- Proper error handling and logging

## Testing

1. **Upload a profile photo:**
```bash
curl -X POST http://localhost:4000/api/upload/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

2. **Update user profile with photo URL:**
```bash
curl -X PUT http://localhost:4000/api/auth/me/profile-photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profile_photo": "URL_FROM_UPLOAD"}'
```

3. **Get user profile:**
```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Dependencies

- `backblaze-b2@1.7.1` - Official Backblaze B2 SDK
- `sharp@0.34.5` - High-performance image processing

## Migration Notes

- Removed `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- Existing uploaded files remain accessible
- New uploads use the B2 SDK directly
- No changes needed to existing file URLs
