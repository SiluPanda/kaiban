import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@kaiban/db';
import { comments, tasks, activities } from '@kaiban/db/schema';
import { eq, count, asc } from 'drizzle-orm';
import { createCommentSchema, paginationSchema, uuidSchema } from '@kaiban/core';
import { success, paginated, error } from '../lib/response';

export const commentRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/tasks/:id/comments — Add comment
  app.post('/tasks/:id/comments', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: createCommentSchema,
      tags: ['Comments'],
      summary: 'Add a comment to a task',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { body: commentBody } = request.body;

    // Verify task exists
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    const [comment] = await db.insert(comments).values({
      taskId: id,
      body: commentBody,
      authorId: '00000000-0000-0000-0000-000000000000', // placeholder until auth
      authorType: 'human',
    }).returning();

    // Log activity
    await db.insert(activities).values({
      taskId: id,
      actorId: '00000000-0000-0000-0000-000000000000',
      actorType: 'human',
      action: 'commented',
    });

    reply.status(201);
    return success(comment);
  });

  // GET /api/v1/tasks/:id/comments — List comments for a task
  app.get('/tasks/:id/comments', {
    schema: {
      params: z.object({ id: uuidSchema }),
      querystring: paginationSchema,
      tags: ['Comments'],
      summary: 'List comments for a task',
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

    const where = eq(comments.taskId, id);

    const [items, [{ total }]] = await Promise.all([
      db.select().from(comments).where(where).limit(limit).offset(offset).orderBy(asc(comments.createdAt)),
      db.select({ total: count() }).from(comments).where(where),
    ]);

    return paginated(items, total, limit, offset);
  });
};
