import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { tasks, projects } from '@pith/db/schema';
import { eq, sql, ne, and, gt, desc } from 'drizzle-orm';
import { success, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';

export const duplicateRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // POST /api/v1/projects/:slug/duplicates — Find potential duplicate tasks
  app.post('/projects/:slug/duplicates', {
    schema: {
      params: z.object({ slug: z.string() }),
      body: z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        threshold: z.number().min(0).max(1).default(0.3),
        limit: z.number().min(1).max(50).default(5),
        excludeTaskId: z.string().uuid().optional(),
      }),
      tags: ['Duplicates'],
      summary: 'Find potential duplicate tasks using pg_trgm similarity',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const { title, threshold, limit: maxResults, excludeTaskId } = request.body;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const similarityExpr = sql<number>`similarity(${tasks.title}, ${title})`;

    const conditions = [
      eq(tasks.projectId, project.id),
      gt(similarityExpr, threshold),
    ];
    if (excludeTaskId) {
      conditions.push(ne(tasks.id, excludeTaskId));
    }

    const results = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      labels: tasks.labels,
      similarity: similarityExpr,
    }).from(tasks)
      .where(and(...conditions))
      .orderBy(desc(similarityExpr))
      .limit(maxResults);

    const duplicates = results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      labels: r.labels,
      similarity: Number(r.similarity),
    }));

    return success({
      query: { title },
      threshold,
      duplicates,
      count: duplicates.length,
    });
  });

  // GET /api/v1/tasks/:id/similar — Find tasks similar to an existing task
  app.get('/tasks/:id/similar', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: z.object({
        threshold: z.coerce.number().min(0).max(1).default(0.3).optional(),
        limit: z.coerce.number().min(1).max(50).default(5).optional(),
      }),
      tags: ['Duplicates'],
      summary: 'Find tasks similar to an existing task',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const threshold = (request.query as any).threshold ?? 0.3;
    const maxResults = (request.query as any).limit ?? 5;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    const similarityExpr = sql<number>`similarity(${tasks.title}, ${task.title})`;

    const results = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      similarity: similarityExpr,
    }).from(tasks)
      .where(and(
        eq(tasks.projectId, task.projectId),
        ne(tasks.id, id),
        gt(similarityExpr, threshold),
      ))
      .orderBy(desc(similarityExpr))
      .limit(maxResults);

    const similar = results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      similarity: Number(r.similarity),
    }));

    return success({
      task: { id: task.id, title: task.title },
      similar,
      count: similar.length,
    });
  });
};
