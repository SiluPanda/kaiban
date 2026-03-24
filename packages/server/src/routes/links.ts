import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'node:crypto';
import { db } from '@pith/db';
import { taskLinks, tasks } from '@pith/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { uuidSchema, paginationSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';

export const linkRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Authenticated routes
  app.addHook('preHandler', authenticate);

  // POST /api/v1/tasks/:id/links — Link external resource to task
  app.post('/tasks/:id/links', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: z.object({
        provider: z.string().min(1).max(50),
        linkType: z.enum(['issue', 'pull_request', 'branch', 'commit']),
        externalId: z.string().min(1).max(255),
        externalUrl: z.string().url().max(2048),
        title: z.string().optional(),
        status: z.string().optional(),
      }),
      tags: ['Links'],
      summary: 'Link an external resource (GitHub issue/PR) to a task',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    const [link] = await db.insert(taskLinks).values({
      taskId: id,
      provider: body.provider,
      linkType: body.linkType,
      externalId: body.externalId,
      externalUrl: body.externalUrl,
      title: body.title ?? null,
      status: body.status ?? null,
    }).returning();

    reply.status(201);
    return success(link);
  });

  // GET /api/v1/tasks/:id/links — List links for a task
  app.get('/tasks/:id/links', {
    schema: {
      params: z.object({ id: uuidSchema }),
      querystring: paginationSchema,
      tags: ['Links'],
      summary: 'List external links for a task',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { limit, offset } = request.query;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    const where = eq(taskLinks.taskId, id);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(taskLinks).where(where).limit(limit).offset(offset).orderBy(desc(taskLinks.createdAt)),
      db.select({ total: count() }).from(taskLinks).where(where),
    ]);

    return paginated(items, total, limit, offset);
  });

  // DELETE /api/v1/links/:linkId — Remove a link
  app.delete('/links/:linkId', {
    schema: {
      params: z.object({ linkId: uuidSchema }),
      tags: ['Links'],
      summary: 'Remove an external link',
    },
  }, async (request, reply) => {
    const { linkId } = request.params;

    const [existing] = await db.select().from(taskLinks).where(eq(taskLinks.id, linkId)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Link not found');
    }

    await db.delete(taskLinks).where(eq(taskLinks.id, linkId));
    return success({ deleted: true });
  });

  // PATCH /api/v1/links/:linkId — Update link status (e.g., PR merged)
  app.patch('/links/:linkId', {
    schema: {
      params: z.object({ linkId: uuidSchema }),
      body: z.object({
        status: z.string().optional(),
        title: z.string().optional(),
      }),
      tags: ['Links'],
      summary: 'Update a link status (e.g., when a PR is merged)',
    },
  }, async (request, reply) => {
    const { linkId } = request.params;
    const body = request.body;

    const [existing] = await db.select().from(taskLinks).where(eq(taskLinks.id, linkId)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Link not found');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) updates.status = body.status;
    if (body.title !== undefined) updates.title = body.title;

    const [updated] = await db.update(taskLinks).set(updates).where(eq(taskLinks.id, linkId)).returning();
    return success(updated);
  });
};

// ─── GitHub Webhook Handler ──────────────────────────────────────────────────

export const githubWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/github/webhook — Receive GitHub webhook events
  app.post('/github/webhook', {
    schema: {
      tags: ['GitHub'],
      summary: 'Receive GitHub webhook events (PR status updates)',
    },
    config: { rawBody: true },
  }, async (request, reply) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret) {
      const sig = request.headers['x-hub-signature-256'] as string | undefined;
      if (!sig) {
        reply.status(401);
        return error('UNAUTHORIZED', 'Missing signature');
      }
      const rawBody = (request as any).rawBody ?? JSON.stringify(request.body);
      const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const sigBuf = Buffer.from(sig);
      const expectedBuf = Buffer.from(expected);
      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        reply.status(401);
        return error('UNAUTHORIZED', 'Invalid signature');
      }
    }

    const event = request.headers['x-github-event'] as string;
    const payload = request.body as any;

    if (event === 'pull_request') {
      const pr = payload.pull_request;
      const externalId = `${payload.repository.full_name}#${pr.number}`;

      // Find matching links and update status
      const links = await db.select().from(taskLinks).where(eq(taskLinks.externalId, externalId));
      const prStatus = pr.merged ? 'merged' : pr.state; // 'open', 'closed', 'merged'

      for (const link of links) {
        await db.update(taskLinks).set({
          status: prStatus,
          title: pr.title,
          updatedAt: new Date(),
        }).where(eq(taskLinks.id, link.id));
      }
    }

    return success({ received: true });
  });
};
