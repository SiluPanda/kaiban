import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const API_KEY_PREFIX = 'kb_';
const SALT_ROUNDS = 10;

export function generateApiKey(): { raw: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const raw = `${API_KEY_PREFIX}${token}`;
  const hash = bcrypt.hashSync(raw, SALT_ROUNDS);
  return { raw, hash };
}

export async function verifyApiKey(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
