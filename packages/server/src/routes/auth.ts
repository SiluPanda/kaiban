import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { users } from '@pith/db/schema';
import { eq } from 'drizzle-orm';
import { success, error } from '../lib/response';
import { verifyApiKey } from '../lib/auth';
import { createAccessToken, createRefreshToken, verifyToken } from '../lib/jwt';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/auth/login — Login with email + API key, get JWT tokens
  app.post('/auth/login', {
    schema: {
      body: z.object({
        email: z.string().email(),
        apiKey: z.string().min(1),
      }),
      tags: ['Auth'],
      summary: 'Login with email and API key to get JWT tokens',
    },
  }, async (request, reply) => {
    const { email, apiKey } = request.body;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.apiKeyHash) {
      reply.status(401);
      return error('INVALID_CREDENTIALS', 'Invalid email or API key');
    }

    const valid = await verifyApiKey(apiKey, user.apiKeyHash);
    if (!valid) {
      reply.status(401);
      return error('INVALID_CREDENTIALS', 'Invalid email or API key');
    }

    const payload = { userId: user.id, role: user.role };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    return success({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });

  // POST /api/v1/auth/refresh — Refresh access token
  app.post('/auth/refresh', {
    schema: {
      body: z.object({
        refreshToken: z.string().min(1),
      }),
      tags: ['Auth'],
      summary: 'Refresh access token using refresh token',
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body;

    try {
      const payload = verifyToken(refreshToken);
      if (payload.type !== 'refresh') {
        reply.status(401);
        return error('INVALID_TOKEN', 'Expected a refresh token');
      }
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) {
        reply.status(401);
        return error('USER_NOT_FOUND', 'User not found');
      }

      const accessToken = createAccessToken({ userId: user.id, role: user.role });

      return success({ accessToken });
    } catch {
      reply.status(401);
      return error('INVALID_TOKEN', 'Invalid or expired refresh token');
    }
  });
};
