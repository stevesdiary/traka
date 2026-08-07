# AES Encryption Service

## Overview
AES-256-GCM encryption for sensitive data in API responses. User data is encrypted before sending to client.

## Setup

### Environment Variable
Add to `.env`:
```env
ENCRYPTION_KEY=your-secure-32-character-key-here-minimum
```

**Generate a secure key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Usage

### Server-Side (Encrypt)
```typescript
import { EncryptionService } from './utils/encryption.service.js';

const encryptionService = new EncryptionService();
const encrypted = encryptionService.encrypt({ id: '123', email: 'user@example.com' });
// Returns: hex string
```

### Client-Side (Decrypt)
```javascript
// JavaScript/TypeScript client
import CryptoJS from 'crypto-js';

function decrypt(encryptedData, key) {
  // Extract IV (first 32 hex chars = 16 bytes)
  const iv = CryptoJS.enc.Hex.parse(encryptedData.slice(0, 32));
  
  // Extract Auth Tag (next 32 hex chars = 16 bytes)
  const authTag = CryptoJS.enc.Hex.parse(encryptedData.slice(32, 64));
  
  // Extract encrypted content
  const encrypted = encryptedData.slice(64);
  
  // Decrypt
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: CryptoJS.enc.Hex.parse(encrypted) },
    CryptoJS.enc.Hex.parse(key),
    {
      iv: iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding
    }
  );
  
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}

// Usage
const userData = decrypt(response.data, ENCRYPTION_KEY);
console.log(userData); // { id: '123', email: 'user@example.com' }
```

## API Response Format

### Before (Unencrypted)
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "tenant_id": null
  }
}
```

### After (Encrypted)
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": "a1b2c3d4e5f6...encrypted_hex_string"
}
```

## Encryption Details

- **Algorithm**: AES-256-GCM
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes) - randomly generated per encryption
- **Auth Tag**: 128 bits (16 bytes) - for integrity verification
- **Output Format**: `IV (32 hex) + AuthTag (32 hex) + Encrypted Data (variable hex)`

## Security Features

1. **AES-256**: Industry-standard encryption
2. **GCM Mode**: Authenticated encryption (prevents tampering)
3. **Random IV**: Different IV for each encryption
4. **Auth Tag**: Ensures data integrity
5. **Key Derivation**: Uses scrypt for key strengthening

## Client Libraries

### React/Next.js
```bash
npm install crypto-js
```

### React Native
```bash
npm install react-native-crypto-js
```

### Flutter/Dart
```dart
import 'package:encrypt/encrypt.dart';

final key = Key.fromUtf8('your-32-character-key');
final iv = IV.fromLength(16);
final encrypter = Encrypter(AES(key, mode: AESMode.gcm));

final decrypted = encrypter.decrypt64(encrypted, iv: iv);
```

### Swift/iOS
```swift
import CryptoKit

func decrypt(data: String, key: String) -> [String: Any]? {
    // Implementation using CryptoKit
}
```

## Testing

### Test Encryption
```bash
POST http://localhost:3000/api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Response includes encrypted data field
```

### Decrypt in Node.js
```javascript
const { EncryptionService } = require('./utils/encryption.service');
const service = new EncryptionService();

const encrypted = "a1b2c3d4..."; // from API response
const decrypted = service.decrypt(encrypted);
console.log(decrypted);
```

## Environment Setup

```env
# Required
ENCRYPTION_KEY=64-character-hex-string-from-crypto-randomBytes

# Example (DO NOT USE IN PRODUCTION)
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

## Production Considerations

1. **Key Rotation**: Implement key rotation strategy
2. **Key Storage**: Use AWS Secrets Manager, Azure Key Vault, or similar
3. **HTTPS Only**: Always use HTTPS in production
4. **Key Per Environment**: Different keys for dev/staging/prod
5. **Audit Logging**: Log encryption/decryption events

## Troubleshooting

### Error: "ENCRYPTION_KEY not configured"
- Add `ENCRYPTION_KEY` to `.env` file
- Restart server

### Error: "Unsupported state or unable to authenticate data"
- Wrong encryption key
- Corrupted encrypted data
- Verify key matches on client and server

### Client Can't Decrypt
- Ensure same encryption key on both sides
- Check IV and AuthTag extraction logic
- Verify hex string parsing

## Future Enhancements

- [ ] Key rotation mechanism
- [ ] Multiple encryption keys support
- [ ] Compression before encryption
- [ ] Field-level encryption (encrypt specific fields only)
- [ ] Encryption middleware for all responses
