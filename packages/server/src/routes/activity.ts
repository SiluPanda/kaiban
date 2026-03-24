import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { activities, tasks } from '@pith/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { paginationSchema, uuidSchema } from '@pith/core';
import { paginated, error } from '../lib/response';

export const activityRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/tasks/:id/activity — Get activity log for a task
  app.get('/tasks/:id/activity', {
    schema: {
      params: z.object({ id: uuidSchema }),
      querystring: paginationSchema,
      tags: ['Activity'],
      summary: 'Get activity log for a task',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { limit, offset } = request.query;

    // Verify task exists
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    const where = eq(activities.taskId, id);

    const [items, [{ total }]] = await Promise.all([
      db.select().from(activities).where(where).limit(limit).offset(offset).orderBy(desc(activities.timestamp)),
      db.select({ total: count() }).from(activities).where(where),
    ]);

    return paginated(items, total, limit, offset);
  });
};
