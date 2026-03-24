import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { tenants, tenantMembers, users } from '@pith/db/schema';
import { eq, count } from 'drizzle-orm';
import { uuidSchema, paginationSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

export const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // POST /api/v1/tenants — Create a tenant (admin only)
  app.post('/tenants', {
    schema: {
      body: z.object({
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
        name: z.string().min(1).max(255),
        plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
        billingEmail: z.string().email().optional(),
        maxUsers: z.number().int().min(1).optional(),
        maxProjects: z.number().int().min(1).optional(),
      }),
      tags: ['Tenants'],
      summary: 'Create a new tenant (SaaS mode)',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const body = request.body;

    const existing = await db.select().from(tenants).where(eq(tenants.slug, body.slug)).limit(1);
    if (existing.length > 0) {
      reply.status(409);
      return error('SLUG_EXISTS', `Tenant with slug '${body.slug}' already exists`);
    }

    const tenant = await db.transaction(async (tx) => {
      const [created] = await tx.insert(tenants).values({
        slug: body.slug,
        name: body.name,
        plan: body.plan,
        billingEmail: body.billingEmail ?? null,
        maxUsers: body.maxUsers ?? 10,
        maxProjects: body.maxProjects ?? 5,
      }).returning();

      await tx.insert(tenantMembers).values({
        tenantId: created.id,
        userId: request.user.id,
        role: 'owner',
      });

      return created;
    });

    reply.status(201);
    return success(tenant);
  });

  // GET /api/v1/tenants — List tenants (admin only)
  app.get('/tenants', {
    schema: {
      querystring: paginationSchema,
      tags: ['Tenants'],
      summary: 'List all tenants',
    },
    preHandler: authorize('admin'),
  }, async (request) => {
    const { limit, offset } = request.query;

    const [items, [{ total }]] = await Promise.all([
      db.select().from(tenants).limit(limit).offset(offset),
      db.select({ total: count() }).from(tenants),
    ]);

    return paginated(items, total, limit, offset);
  });

  // GET /api/v1/tenants/:id — Get tenant details
  app.get('/tenants/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Tenants'],
      summary: 'Get tenant details with members',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
      with: { members: true },
    });

    if (!tenant) {
      reply.status(404);
      return error('NOT_FOUND', 'Tenant not found');
    }

    return success(tenant);
  });

  // PATCH /api/v1/tenants/:id — Update tenant
  app.patch('/tenants/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: z.object({
        name: z.string().min(1).max(255).optional(),
        plan: z.enum(['free', 'pro', 'enterprise']).optional(),
        active: z.boolean().optional(),
        billingEmail: z.string().email().optional(),
        maxUsers: z.number().int().min(1).optional(),
        maxProjects: z.number().int().min(1).optional(),
        settings: z.record(z.unknown()).optional(),
      }),
      tags: ['Tenants'],
      summary: 'Update tenant details',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [existing] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Tenant not found');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.plan !== undefined) updates.plan = body.plan;
    if (body.active !== undefined) updates.active = body.active;
    if (body.billingEmail !== undefined) updates.billingEmail = body.billingEmail;
    if (body.maxUsers !== undefined) updates.maxUsers = body.maxUsers;
    if (body.maxProjects !== undefined) updates.maxProjects = body.maxProjects;
    if (body.settings !== undefined) updates.settings = body.settings;

    const [updated] = await db.update(tenants).set(updates).where(eq(tenants.id, id)).returning();
    return success(updated);
  });

  // POST /api/v1/tenants/:id/members — Add a member to a tenant
  app.post('/tenants/:id/members', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: z.object({
        userId: uuidSchema,
        role: z.enum(['owner', 'admin', 'member']).default('member'),
      }),
      tags: ['Tenants'],
      summary: 'Add a member to a tenant',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;
    const { userId, role } = request.body;

    const [existing] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Tenant not found');
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      reply.status(404);
      return error('NOT_FOUND', 'User not found');
    }

    const [member] = await db.insert(tenantMembers).values({
      tenantId: id,
      userId,
      role,
    }).returning();

    reply.status(201);
    return success(member);
  });

  // DELETE /api/v1/tenants/:id — Delete a tenant
  app.delete('/tenants/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Tenants'],
      summary: 'Delete a tenant and all associated data',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;

    const [existing] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Tenant not found');
    }

    await db.delete(tenants).where(eq(tenants.id, id));
    return success({ deleted: true });
  });
};
