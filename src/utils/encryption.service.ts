import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  private ivLength = 16;
  private authTagLength = 16;
  private iterations = 100000;
  private salt = 'salt';

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not configured in environment');
    }
    // Derive 32-byte key for AES-256 using PBKDF2 (browser-compatible)
    this.key = crypto.pbkdf2Sync(encryptionKey, this.salt, this.iterations, 32, 'sha256');
  }

  encrypt(data: any): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;
    
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv + authTag + encrypted data
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  }

  decrypt(encryptedData: string): any {
    // Extract iv, authTag, and encrypted content
    const ivHex = encryptedData.slice(0, this.ivLength * 2);
    const authTagHex = encryptedData.slice(this.ivLength * 2, (this.ivLength + this.authTagLength) * 2);
    const encrypted = encryptedData.slice((this.ivLength + this.authTagLength) * 2);
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
