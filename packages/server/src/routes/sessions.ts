import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { agentSessions } from '@pith/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { startSessionSchema, endSessionSchema, paginationSchema, uuidSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';

const MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

export const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // POST /api/v1/sessions — Start agent session
  app.post('/sessions', {
    schema: {
      body: startSessionSchema.extend({
        agentName: z.string().min(1).max(255).optional(),
      }),
      tags: ['Sessions'],
      summary: 'Start an agent work session',
    },
  }, async (request, reply) => {
    const { tasks, agentName } = request.body;

    const [session] = await db.insert(agentSessions).values({
      userId: request.user.id,
      agentName: agentName ?? request.user.name,
      tasksTouched: tasks,
    }).returning();

    reply.status(201);
    return success(session);
  });

  // GET /api/v1/sessions — List sessions
  app.get('/sessions', {
    schema: {
      querystring: paginationSchema,
      tags: ['Sessions'],
      summary: 'List agent sessions',
    },
  }, async (request) => {
    const { limit, offset } = request.query;

    const [items, [{ total }]] = await Promise.all([
      db.select().from(agentSessions).limit(limit).offset(offset).orderBy(desc(agentSessions.startedAt)),
      db.select({ total: count() }).from(agentSessions),
    ]);

    return paginated(items, total, limit, offset);
  });

  // GET /api/v1/sessions/:id — Get session by ID
  app.get('/sessions/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Sessions'],
      summary: 'Get session by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const session = await db.query.agentSessions.findFirst({
      where: eq(agentSessions.id, id),
      with: { user: true },
    });

    if (!session) {
      reply.status(404);
      return error('NOT_FOUND', 'Session not found');
    }

    return success(session);
  });

  // PATCH /api/v1/sessions/:id — End agent session
  app.patch('/sessions/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: endSessionSchema.extend({
        tasksTouched: z.array(uuidSchema).optional(),
      }),
      tags: ['Sessions'],
      summary: 'End an agent session with optional summary',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { summary, tasksTouched } = request.body;

    const [existing] = await db.select().from(agentSessions).where(eq(agentSessions.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Session not found');
    }

    // Only the session owner or an admin can end a session
    if (existing.userId !== request.user.id && request.user.role !== 'admin') {
      reply.status(403);
      return error('FORBIDDEN', 'You can only end your own sessions');
    }

    if (existing.endedAt) {
      reply.status(400);
      return error('SESSION_ENDED', 'Session has already ended');
    }

    // Check max duration
    const elapsed = Date.now() - existing.startedAt.getTime();
    if (elapsed > MAX_SESSION_DURATION_MS) {
      // Still allow ending, but note it exceeded max duration
    }

    const updates: Record<string, unknown> = {
      endedAt: new Date(),
    };
    if (summary !== undefined) updates.summary = summary;
    if (tasksTouched) {
      // Merge new tasks with existing
      const merged = [...new Set([...existing.tasksTouched, ...tasksTouched])];
      updates.tasksTouched = merged;
    }

    const [updated] = await db.update(agentSessions).set(updates).where(eq(agentSessions.id, id)).returning();

    return success(updated);
  });
};
