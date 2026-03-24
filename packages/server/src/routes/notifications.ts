import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { notificationChannels, projects } from '@pith/db/schema';
import { eq, count } from 'drizzle-orm';
import { uuidSchema, paginationSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { formatSlackMessage, formatDiscordMessage, type NotificationEvent } from '../lib/notifications';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // POST /api/v1/projects/:slug/notifications — Create notification channel
  app.post('/projects/:slug/notifications', {
    schema: {
      params: z.object({ slug: z.string() }),
      body: z.object({
        provider: z.enum(['slack', 'discord']),
        name: z.string().min(1).max(255),
        webhookUrl: z.string().url().max(2048),
        events: z.array(z.enum([
          'task.created', 'task.updated', 'task.assigned', 'task.status_changed',
          'comment.created', 'session.started', 'session.ended', '*',
        ])).min(1),
      }),
      tags: ['Notifications'],
      summary: 'Create a Slack/Discord notification channel for a project',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { slug } = request.params;
    const body = request.body;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const [channel] = await db.insert(notificationChannels).values({
      projectId: project.id,
      provider: body.provider,
      name: body.name,
      webhookUrl: body.webhookUrl,
      events: body.events,
    }).returning();

    reply.status(201);
    return success(channel);
  });

  // GET /api/v1/projects/:slug/notifications — List notification channels
  app.get('/projects/:slug/notifications', {
    schema: {
      params: z.object({ slug: z.string() }),
      querystring: paginationSchema,
      tags: ['Notifications'],
      summary: 'List notification channels for a project',
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

    const where = eq(notificationChannels.projectId, project.id);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(notificationChannels).where(where).limit(limit).offset(offset),
      db.select({ total: count() }).from(notificationChannels).where(where),
    ]);

    // Mask webhook URLs — they are secrets (can post to Slack/Discord channels)
    const masked = items.map(({ webhookUrl, ...rest }) => ({
      ...rest,
      webhookUrl: webhookUrl.slice(0, 20) + '••••••',
    }));

    return paginated(masked, total, limit, offset);
  });

  // DELETE /api/v1/notifications/:id — Delete notification channel
  app.delete('/notifications/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Notifications'],
      summary: 'Delete a notification channel',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;

    const [existing] = await db.select().from(notificationChannels).where(eq(notificationChannels.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Notification channel not found');
    }

    await db.delete(notificationChannels).where(eq(notificationChannels.id, id));
    return success({ deleted: true });
  });

  // PATCH /api/v1/notifications/:id — Toggle active/inactive
  app.patch('/notifications/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: z.object({
        active: z.boolean().optional(),
        events: z.array(z.string()).optional(),
        name: z.string().min(1).max(255).optional(),
      }),
      tags: ['Notifications'],
      summary: 'Update a notification channel',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [existing] = await db.select().from(notificationChannels).where(eq(notificationChannels.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Notification channel not found');
    }

    const updates: Record<string, unknown> = {};
    if (body.active !== undefined) updates.active = body.active;
    if (body.events !== undefined) updates.events = body.events;
    if (body.name !== undefined) updates.name = body.name;

    if (Object.keys(updates).length === 0) return success(existing);

    const [updated] = await db.update(notificationChannels).set(updates).where(eq(notificationChannels.id, id)).returning();
    return success(updated);
  });

  // POST /api/v1/notifications/preview — Preview a notification message
  app.post('/notifications/preview', {
    schema: {
      body: z.object({
        provider: z.enum(['slack', 'discord']),
        event: z.string().min(1),
        task: z.object({
          id: z.string().default('00000000-0000-0000-0000-000000000000'),
          title: z.string().default('Example task'),
          status: z.string().default('in_progress'),
          priority: z.string().default('P1'),
        }).optional(),
      }),
      tags: ['Notifications'],
      summary: 'Preview the notification message format',
    },
  }, async (request) => {
    const { provider, event } = request.body;
    const task = request.body.task || { id: '00000000', title: 'Example task', status: 'in_progress', priority: 'P1' };

    const data = {
      task,
      project: { slug: 'example', name: 'Example Project' },
      actor: { name: request.user.name },
    };

    const message = provider === 'slack'
      ? formatSlackMessage(event as NotificationEvent, data)
      : formatDiscordMessage(event as NotificationEvent, data);

    return success({ provider, event, message });
  });
};
