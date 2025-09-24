import * as crypto from 'crypto';

// Derive a 32-byte key (AES-256 requires 32 bytes)
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'supersecretkey123', 'salt', 32);

export function encryptPHI(data: string) {
  const iv = crypto.randomBytes(12); // GCM usually uses 12-byte IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag(); // authentication tag

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decryptPHI(encryptedData: string, ivHex: string, tagHex: string) {
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
