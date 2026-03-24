import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { users } from '@pith/db/schema';
import { eq, count } from 'drizzle-orm';
import { createUserSchema, updateUserSchema, paginationSchema, uuidSchema, userRoleSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { generateApiKey } from '../lib/auth';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // All user management routes require authentication
  app.addHook('preHandler', authenticate);

  // GET /api/v1/users — List users (admin only)
  app.get('/users', {
    schema: {
      querystring: paginationSchema.extend({
        role: userRoleSchema.optional(),
      }),
      tags: ['Users'],
      summary: 'List all users (admin only)',
    },
    preHandler: authorize('admin'),
  }, async (request) => {
    const { limit, offset, role } = request.query;

    const where = role ? eq(users.role, role) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users).where(where).limit(limit).offset(offset).orderBy(users.createdAt),
      db.select({ total: count() }).from(users).where(where),
    ]);

    return paginated(items, total, limit, offset);
  });

  // POST /api/v1/users — Create user (admin only)
  app.post('/users', {
    schema: {
      body: createUserSchema,
      tags: ['Users'],
      summary: 'Create a new user and generate API key (admin only)',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const body = request.body;

    // Check email uniqueness
    const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing.length > 0) {
      reply.status(409);
      return error('EMAIL_EXISTS', `User with email '${body.email}' already exists`);
    }

    // Generate API key
    const { raw: apiKey, hash: apiKeyHash } = generateApiKey();

    const [user] = await db.insert(users).values({
      name: body.name,
      email: body.email,
      role: body.role ?? 'member',
      apiKeyHash,
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

    reply.status(201);
    // Return the raw API key only on creation — it can never be retrieved again
    return success({ ...user, apiKey });
  });

  // GET /api/v1/users/:id — Get user by ID
  app.get('/users/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Users'],
      summary: 'Get user by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      reply.status(404);
      return error('NOT_FOUND', 'User not found');
    }

    return success(user);
  });

  // PATCH /api/v1/users/:id — Update user (admin only)
  app.patch('/users/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: updateUserSchema,
      tags: ['Users'],
      summary: 'Update user details (admin only)',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'User not found');
    }

    if (body.email) {
      const [emailConflict] = await db.select().from(users)
        .where(eq(users.email, body.email)).limit(1);
      if (emailConflict && emailConflict.id !== id) {
        reply.status(409);
        return error('EMAIL_EXISTS', `Email '${body.email}' is already in use`);
      }
    }

    const [updated] = await db.update(users).set(body).where(eq(users.id, id)).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

    return success(updated);
  });

  // POST /api/v1/users/:id/regenerate-key — Regenerate API key (admin only)
  app.post('/users/:id/regenerate-key', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Users'],
      summary: 'Regenerate API key for a user (admin only)',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;

    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'User not found');
    }

    const { raw: apiKey, hash: apiKeyHash } = generateApiKey();

    await db.update(users).set({ apiKeyHash }).where(eq(users.id, id));

    return success({ apiKey });
  });

  // GET /api/v1/users/me — Get current authenticated user
  app.get('/users/me', {
    schema: {
      tags: ['Users'],
      summary: 'Get the currently authenticated user',
    },
  }, async (request) => {
    return success(request.user);
  });
};
