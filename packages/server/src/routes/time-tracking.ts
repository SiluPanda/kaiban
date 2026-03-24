import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { timeEntries, tasks, projects, users } from '@pith/db/schema';
import { eq, and, gte, lte, count, sql, desc } from 'drizzle-orm';
import { uuidSchema, paginationSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';

export const timeTrackingRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // POST /api/v1/tasks/:id/time — Log time against a task
  app.post('/tasks/:id/time', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: z.object({
        minutes: z.number().min(1).max(14400), // max 10 days
        description: z.string().optional(),
        loggedAt: z.string().datetime().optional(),
      }),
      tags: ['Time Tracking'],
      summary: 'Log time against a task',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { minutes, description, loggedAt } = request.body;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    const [entry] = await db.insert(timeEntries).values({
      taskId: id,
      userId: request.user.id,
      minutes,
      description: description ?? null,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
    }).returning();

    reply.status(201);
    return success(entry);
  });

  // GET /api/v1/tasks/:id/time — List time entries for a task
  app.get('/tasks/:id/time', {
    schema: {
      params: z.object({ id: uuidSchema }),
      querystring: paginationSchema,
      tags: ['Time Tracking'],
      summary: 'List time entries for a task',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { limit, offset } = request.query;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    const where = eq(timeEntries.taskId, id);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(timeEntries).where(where).limit(limit).offset(offset).orderBy(desc(timeEntries.loggedAt)),
      db.select({ total: count() }).from(timeEntries).where(where),
    ]);

    const totalMinutes = items.reduce((sum, e) => sum + e.minutes, 0);

    return success({ entries: items, totalMinutes, meta: { total, limit, offset } });
  });

  // DELETE /api/v1/time/:entryId — Delete a time entry
  app.delete('/time/:entryId', {
    schema: {
      params: z.object({ entryId: uuidSchema }),
      tags: ['Time Tracking'],
      summary: 'Delete a time entry',
    },
  }, async (request, reply) => {
    const { entryId } = request.params;

    const [existing] = await db.select().from(timeEntries).where(eq(timeEntries.id, entryId)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'Time entry not found');
    }

    await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
    return success({ deleted: true });
  });

  // GET /api/v1/projects/:slug/time-report — Time report for a project
  app.get('/projects/:slug/time-report', {
    schema: {
      params: z.object({ slug: z.string() }),
      querystring: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        userId: uuidSchema.optional(),
      }),
      tags: ['Time Tracking'],
      summary: 'Get time report for a project',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const { from, to, userId } = request.query as any;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const conditions = [eq(tasks.projectId, project.id)];
    if (from) conditions.push(gte(timeEntries.loggedAt, new Date(from)));
    if (to) conditions.push(lte(timeEntries.loggedAt, new Date(to)));
    if (userId) conditions.push(eq(timeEntries.userId, userId));

    // Aggregate by user
    const byUser = await db.select({
      userId: timeEntries.userId,
      totalMinutes: sql<number>`sum(${timeEntries.minutes})`.as('total_minutes'),
      entryCount: count(),
    }).from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(and(...conditions))
      .groupBy(timeEntries.userId);

    // Aggregate by task
    const byTask = await db.select({
      taskId: timeEntries.taskId,
      taskTitle: tasks.title,
      totalMinutes: sql<number>`sum(${timeEntries.minutes})`.as('total_minutes'),
      entryCount: count(),
    }).from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(and(...conditions))
      .groupBy(timeEntries.taskId, tasks.title);

    const grandTotal = byUser.reduce((sum, r) => sum + Number(r.totalMinutes), 0);

    return success({
      project: { id: project.id, slug: project.slug, name: project.name },
      period: { from: from ?? null, to: to ?? null },
      totalMinutes: grandTotal,
      totalHours: Math.round(grandTotal / 6) / 10, // 1 decimal place
      byUser: byUser.map(r => ({
        userId: r.userId,
        totalMinutes: Number(r.totalMinutes),
        entryCount: Number(r.entryCount),
      })),
      byTask: byTask.map(r => ({
        taskId: r.taskId,
        taskTitle: r.taskTitle,
        totalMinutes: Number(r.totalMinutes),
        entryCount: Number(r.entryCount),
      })),
    });
  });
};
