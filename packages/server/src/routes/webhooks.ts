import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db } from '@pith/db';
import { webhooks, webhookDeliveries, projects } from '@pith/db/schema';
import { eq, and, count, desc } from 'drizzle-orm';
import { uuidSchema, paginationSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { validateExternalUrl } from '../lib/url-validation';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const WEBHOOK_EVENTS = [
  'task.created', 'task.updated', 'task.deleted',
  'comment.created',
  'session.started', 'session.ended',
  'project.created',
  '*',
] as const;

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // POST /api/v1/projects/:slug/webhooks — Register webhook
  app.post('/projects/:slug/webhooks', {
    schema: {
      params: z.object({ slug: z.string() }),
      body: z.object({
        url: z.string().url().max(2048),
        events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
      }),
      tags: ['Webhooks'],
      summary: 'Register a webhook for a project',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { slug } = request.params;
    const { url, events } = request.body;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const urlCheck = validateExternalUrl(url);
    if (!urlCheck.valid) {
      reply.status(400);
      return error('INVALID_URL', urlCheck.reason!);
    }

    const secret = crypto.randomBytes(32).toString('hex');

    const [webhook] = await db.insert(webhooks).values({
      projectId: project.id,
      url,
      secret,
      events,
    }).returning();

    reply.status(201);
    return success({ ...webhook, secret });
  });

  // GET /api/v1/projects/:slug/webhooks — List webhooks
  app.get('/projects/:slug/webhooks', {
    schema: {
      params: z.object({ slug: z.string() }),
      querystring: paginationSchema,
      tags: ['Webhooks'],
      summary: 'List webhooks for a project',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { slug } = request.params;
    const { limit, offset } = request.query;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const where = eq(webhooks.projectId, project.id);
    const [items, [{ total }]] = await Promise.all([
      db.select({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        active: webhooks.active,
        createdAt: webhooks.createdAt,
      }).from(webhooks).where(where).limit(limit).offset(offset),
      db.select({ total: count() }).from(webhooks).where(where),
    ]);

    return paginated(items, total, limit, offset);
  });

  // DELETE /api/v1/webhooks/:id — Delete webhook
  app.delete('/webhooks/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Webhooks'],
      summary: 'Delete a webhook',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;

    const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Webhook not found');
    }

    await db.delete(webhooks).where(eq(webhooks.id, id));

    return success({ deleted: true });
  });

  // GET /api/v1/webhooks/:id/deliveries — Webhook delivery logs
  app.get('/webhooks/:id/deliveries', {
    schema: {
      params: z.object({ id: uuidSchema }),
      querystring: paginationSchema,
      tags: ['Webhooks'],
      summary: 'Get webhook delivery logs',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;
    const { limit, offset } = request.query;

    const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Webhook not found');
    }

    const where = eq(webhookDeliveries.webhookId, id);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(webhookDeliveries).where(where).limit(limit).offset(offset).orderBy(desc(webhookDeliveries.createdAt)),
      db.select({ total: count() }).from(webhookDeliveries).where(where),
    ]);

    return paginated(items, total, limit, offset);
  });
};
