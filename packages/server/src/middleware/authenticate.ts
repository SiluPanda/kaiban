import { type FastifyRequest, type FastifyReply } from 'fastify';
import { db } from '@pith/db';
import { users } from '@pith/db/schema';
import { eq } from 'drizzle-orm';
import { verifyApiKey } from '../lib/auth';
import { verifyToken } from '../lib/jwt';
import { error } from '../lib/response';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'agent';
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401);
    return reply.send(error('UNAUTHORIZED', 'Missing or invalid Authorization header'));
  }

  const token = authHeader.slice(7);

  // Try API key first (starts with kb_)
  if (token.startsWith('kb_')) {
    // Find user by checking all API key hashes
    // For performance, in production you'd index a key prefix or use a lookup table
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      if (user.apiKeyHash && await verifyApiKey(token, user.apiKeyHash)) {
        request.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as AuthUser['role'],
        };
        return;
      }
    }
    reply.status(401);
    return reply.send(error('INVALID_API_KEY', 'Invalid API key'));
  }

  // Try JWT
  try {
    const payload = verifyToken(token);
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) {
      reply.status(401);
      return reply.send(error('USER_NOT_FOUND', 'User associated with token not found'));
    }
    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as AuthUser['role'],
    };
  } catch {
    reply.status(401);
    return reply.send(error('INVALID_TOKEN', 'Invalid or expired token'));
  }
}
