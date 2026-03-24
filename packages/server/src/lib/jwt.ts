import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pith-dev-secret-change-in-production';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface JwtPayload {
  userId: string;
  role: string;
  type?: 'access' | 'refresh';
}

export function createAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function createRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
}
