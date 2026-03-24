import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { tasks, projects, activities, comments } from '@pith/db/schema';
import { eq, count, and, gte, sql } from 'drizzle-orm';
import { success, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // GET /api/v1/projects/:slug/analytics — Project analytics
  app.get('/projects/:slug/analytics', {
    schema: {
      params: z.object({ slug: z.string() }),
      querystring: z.object({
        days: z.coerce.number().min(1).max(365).default(30).optional(),
      }),
      tags: ['Analytics'],
      summary: 'Get project analytics (task counts, velocity, activity)',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const days = (request.query as any).days ?? 30;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const pid = project.id;
    const since = new Date(Date.now() - days * 86400000);

    // Task counts by status
    const statusCounts = await db.select({
      status: tasks.status,
      count: count(),
    }).from(tasks).where(eq(tasks.projectId, pid)).groupBy(tasks.status);

    // Task counts by priority
    const priorityCounts = await db.select({
      priority: tasks.priority,
      count: count(),
    }).from(tasks).where(eq(tasks.projectId, pid)).groupBy(tasks.priority);

    // Total tasks
    const [{ total: totalTasks }] = await db.select({ total: count() }).from(tasks).where(eq(tasks.projectId, pid));

    // Tasks completed in period
    const completedTasks = await db.select({
      count: count(),
    }).from(activities).where(
      and(
        eq(activities.action, 'status_changed'),
        eq(activities.newValue, 'done'),
        gte(activities.timestamp, since),
      )
    );

    // Tasks created in period
    const createdTasks = await db.select({
      count: count(),
    }).from(tasks).where(
      and(eq(tasks.projectId, pid), gte(tasks.createdAt, since))
    );

    // Activity count in period
    const [{ activityCount }] = await db.select({
      activityCount: count(),
    }).from(activities)
      .innerJoin(tasks, eq(activities.taskId, tasks.id))
      .where(and(eq(tasks.projectId, pid), gte(activities.timestamp, since)));

    // Comment count in period
    const [{ commentCount }] = await db.select({
      commentCount: count(),
    }).from(comments)
      .innerJoin(tasks, eq(comments.taskId, tasks.id))
      .where(and(eq(tasks.projectId, pid), gte(comments.createdAt, since)));

    return success({
      project: { id: project.id, slug: project.slug, name: project.name },
      period: { days, since: since.toISOString() },
      totals: {
        tasks: totalTasks,
        byStatus: Object.fromEntries(statusCounts.map(r => [r.status, r.count])),
        byPriority: Object.fromEntries(priorityCounts.map(r => [r.priority, r.count])),
      },
      velocity: {
        created: createdTasks[0].count,
        completed: completedTasks[0].count,
      },
      activity: {
        totalActions: activityCount,
        totalComments: commentCount,
      },
    });
  });

  // POST /api/v1/projects/:slug/summary — AI-powered sprint summary
  app.post('/projects/:slug/summary', {
    schema: {
      params: z.object({ slug: z.string() }),
      body: z.object({
        days: z.number().min(1).max(365).default(14),
      }).optional(),
      tags: ['Analytics'],
      summary: 'Generate AI-powered sprint summary for a project',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const days = (request.body as any)?.days ?? 14;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const since = new Date(Date.now() - days * 86400000);
    const pid = project.id;

    // Gather data for summary
    const recentTasks = await db.select({
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
    }).from(tasks).where(
      and(eq(tasks.projectId, pid), gte(tasks.createdAt, since))
    ).limit(50);

    const recentActivity = await db.select({
      action: activities.action,
      fieldChanged: activities.fieldChanged,
      newValue: activities.newValue,
    }).from(activities)
      .innerJoin(tasks, eq(activities.taskId, tasks.id))
      .where(and(eq(tasks.projectId, pid), gte(activities.timestamp, since)))
      .limit(100);

    // Try AI summary
    try {
      const { getAiConfig } = await import('@pith/ai');
      const config = getAiConfig();

      if (config) {
        const { generateObject } = await import('ai');
        const { getModel } = await import('@pith/ai');
        const model = await getModel();

        if (model) {
          const { object } = await generateObject({
            model,
            schema: z.object({
              summary: z.string().describe('2-3 paragraph sprint summary'),
              highlights: z.array(z.string()).describe('Key accomplishments'),
              blockers: z.array(z.string()).describe('Current blockers or risks'),
              recommendations: z.array(z.string()).describe('Recommendations for next sprint'),
            }),
            system: 'You are a project manager writing a sprint summary. Be concise and data-driven.',
            prompt: `Summarize the last ${days} days of project "${project.name}":
Tasks created: ${recentTasks.length}
Status breakdown: ${JSON.stringify(recentTasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string, number>))}
Recent activity (${recentActivity.length} actions): ${recentActivity.slice(0, 20).map(a => a.action).join(', ')}`,
          });

          return success({ ...object, aiGenerated: true, period: { days, since: since.toISOString() } });
        }
      }
    } catch {
      // Fall through to manual summary
    }

    // Fallback: structured data summary without AI
    const statusBreakdown = recentTasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const actionBreakdown = recentActivity.reduce((acc, a) => {
      acc[a.action] = (acc[a.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return success({
      summary: `In the last ${days} days, ${recentTasks.length} tasks were active in "${project.name}". ${statusBreakdown.done || 0} tasks completed, ${statusBreakdown.in_progress || 0} in progress.`,
      highlights: Object.entries(statusBreakdown).map(([s, c]) => `${c} tasks in ${s}`),
      blockers: [],
      recommendations: [],
      aiGenerated: false,
      period: { days, since: since.toISOString() },
      raw: { statusBreakdown, actionBreakdown, taskCount: recentTasks.length },
    });
  });
};
