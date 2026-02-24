# TRAKA API - Postman Collections

## Setup

1. **Import Collection**
   - Open Postman
   - Click "Import" button
   - Select `Upload-ProfilePhoto.postman_collection.json`

2. **Set Environment Variables**
   - `base_url`: Your API base URL (default: `http://localhost:4000/api`)
   - `token`: Your JWT authentication token (get from login endpoint)

## Collections

### Upload & Profile Photo Collection

This collection includes all endpoints for file upload and profile photo management.

#### Folders:

1. **Upload** - File upload endpoints
   - Upload Profile Photo
   - Upload Vehicle Photo
   - Upload Package Photo
   - Upload Document
   - Get Signed URL
   - Delete File

2. **Profile Photo Management** - User profile photo endpoints
   - Update Profile Photo URL
   - Get User Profile

3. **Complete Profile Photo Flow** - Automated workflow
   - Step 1: Upload Photo (saves URL to environment)
   - Step 2: Update Profile (uses saved URL)
   - Step 3: Verify Profile (check updated profile)

## Usage

### Quick Start - Upload Profile Photo

1. **Get Authentication Token**
   ```
   POST /auth/login
   Body: { "email": "user@example.com", "password": "password" }
   ```
   Copy the `token` from response and set it in environment variables.

2. **Upload Photo**
   ```
   POST /upload/profile
   Headers: Authorization: Bearer {token}
   Body: form-data with "file" field containing image
   ```
   Response will include `url` field with the uploaded file URL.

3. **Update Profile**
   ```
   PUT /auth/me/profile-photo
   Headers: Authorization: Bearer {token}
   Body: { "profile_photo": "URL_FROM_STEP_2" }
   ```

4. **Verify**
   ```
   GET /auth/me
   Headers: Authorization: Bearer {token}
   ```
   Check that `profile_photo` field contains your uploaded URL.

### Automated Flow

Use the "Complete Profile Photo Flow" folder to run all steps automatically:
1. Run "Step 1: Upload Photo" - URL is automatically saved to environment
2. Run "Step 2: Update Profile" - Uses the saved URL
3. Run "Step 3: Verify Profile" - Confirms the update

## File Upload Limits

- Maximum file size: 10MB
- Supported formats: JPEG, PNG, WebP, GIF
- Images are automatically optimized:
  - Resized to max 1200px width
  - Compressed to 85% quality
  - Converted to JPEG format

## Response Examples

### Upload Success
```json
{
  "key": "profiles/550e8400-e29b-41d4-a716-446655440000.jpg",
  "url": "https://f000.backblazeb2.com/file/bucket-name/profiles/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

### Profile Update Success
```json
{
  "message": "Profile photo updated",
  "profile_photo": "https://f000.backblazeb2.com/file/bucket-name/profiles/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

### Get Profile Response
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "USER",
    "first_name": "John",
    "last_name": "Doe",
    "profile_photo": "https://f000.backblazeb2.com/file/bucket-name/profiles/550e8400-e29b-41d4-a716-446655440000.jpg",
    "email_verified": true,
    "phone_verified": false
  }
}
```

## Error Handling

### Common Errors

- **400 Bad Request**: No file uploaded
- **401 Unauthorized**: Missing or invalid token
- **500 Internal Server Error**: Upload failed (check server logs)

### Troubleshooting

1. **Upload fails**: Check file size (max 10MB) and format
2. **401 Error**: Refresh your authentication token
3. **Profile update fails**: Ensure you're using the correct URL from upload response

## Environment Variables

Create a Postman environment with these variables:

```json
{
  "base_url": "http://localhost:4000/api",
  "token": "your-jwt-token-here",
  "uploaded_photo_url": ""
}
```

The `uploaded_photo_url` is automatically set by the automated flow.
