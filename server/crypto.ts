import crypto from 'crypto';

// 32-byte key derived from process.env.ENCRYPTION_KEY or a persistent fallback
const MASTER_SECRET = process.env.ENCRYPTION_KEY || 'irepair-mobiles-uk-cms-master-key-32b-seed!';
const KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(dataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return '';
  }
}

export function maskSecret(secret?: string): string {
  if (!secret) return '';
  if (secret.length <= 4) return '••••';
  const last4 = secret.slice(-4);
  return '••••••••••••••••' + last4;
}
