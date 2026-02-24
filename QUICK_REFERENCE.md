# Profile Photo Upload - Quick Reference

## 🚀 Quick Start

### 1. Upload Photo
```bash
POST /api/upload/profile
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body: file=<image>
```

**Response:**
```json
{
  "key": "profiles/uuid.jpg",
  "url": "https://...backblazeb2.com/.../profiles/uuid.jpg"
}
```

### 2. Save to Profile
```bash
PUT /api/auth/me/profile-photo
Content-Type: application/json
Authorization: Bearer {token}

Body: { "profile_photo": "URL_FROM_STEP_1" }
```

### 3. View Profile
```bash
GET /api/auth/me
Authorization: Bearer {token}
```

## 📋 All Upload Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload/profile` | POST | Upload profile photo |
| `/api/upload/vehicle` | POST | Upload vehicle photo |
| `/api/upload/package` | POST | Upload package photo |
| `/api/upload/document` | POST | Upload document |
| `/api/upload/signed-url/:key` | GET | Get signed URL |
| `/api/upload/:key` | DELETE | Delete file |

## 🎨 Image Processing

All images are automatically:
- ✅ Resized to max 1200px width
- ✅ Compressed to 85% quality
- ✅ Converted to JPEG format
- ✅ Optimized for web delivery

## 📏 Limits

- **Max file size**: 10MB
- **Formats**: JPEG, PNG, WebP, GIF
- **Authentication**: Required for all endpoints

## 🔧 Environment Variables

```env
B2_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=your_bucket_name
```

## 📚 Documentation

- **Swagger UI**: http://localhost:4000/api-docs
- **Postman**: Import `postman/Upload-ProfilePhoto.postman_collection.json`
- **Full Docs**: See `UPLOAD_SYSTEM.md`

## ⚡ Testing

### Postman (Recommended)
1. Import collection
2. Set `token` variable
3. Run "Complete Profile Photo Flow"

### cURL
```bash
# Upload
curl -X POST http://localhost:4000/api/upload/profile \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@photo.jpg"

# Update profile
curl -X PUT http://localhost:4000/api/auth/me/profile-photo \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profile_photo": "URL"}'
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check token is valid |
| 400 No file | Ensure file field is named "file" |
| 500 Upload failed | Check B2 credentials in .env |
| Image not optimized | Sharp library not installed |

## 💡 Tips

- Use the Postman automated flow for testing
- Profile photo URL is saved in user.profile_photo field
- Signed URLs expire after 1 hour (default)
- Files are stored with random UUIDs for security
