// Extension token doğrulama - ayrı dosya
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production-min-32-chars';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function verifyExtensionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.type !== 'extension') return null;
    return payload;
  } catch {
    return null;
  }
}