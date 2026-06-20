import crypto from 'crypto';
import { generateSecret as otplibGenerateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import config from '../config/environment.js';

// ─── Encryption ──────────────────────────────────────────────────────────────
// Format stored in DB: <iv_hex>:<ciphertext_hex>:<authtag_hex>
// TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).

function deriveKey(): Buffer {
  const raw = config.totp.encryptionKey;
  if (raw.length !== 64) {
    throw new Error('TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(raw, 'hex');
}

export function encryptSecret(secret: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv) as crypto.CipherGCM;
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`;
}

export function decryptSecret(enc: string): string {
  const parts = enc.split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted TOTP secret');
  const [ivHex, ciphertextHex, authTagHex] = parts;
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  ) as crypto.DecipherGCM;
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final()
  ]);
  return plain.toString('utf8');
}

// ─── TOTP ─────────────────────────────────────────────────────────────────────

export function generateSecret(email: string): { secret: string; otpauthUrl: string } {
  const secret = otplibGenerateSecret({ length: 20 });
  const otpauthUrl = generateURI({
    issuer: config.totp.issuer,
    label: email,
    secret
  });
  return { secret, otpauthUrl };
}

export async function generateQRCodeDataURL(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256
  });
}

export function verifyCode(secret: string, code: string): boolean {
  try {
    // epochTolerance: 30 = ±30 sec window, covers typical clock skew
    const result = verifySync({ secret, token: code, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}
