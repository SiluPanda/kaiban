import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { tasks, labels } from '@pith/db/schema';
import { eq } from 'drizzle-orm';
import { uuidSchema } from '@pith/core';
import { success, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';
import { decomposeTask, triageTask, assembleContext, estimateEffort, getAiConfig } from '@pith/ai';

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // GET /api/v1/ai/status — Check AI configuration
  app.get('/ai/status', {
    schema: {
      tags: ['AI'],
      summary: 'Check if AI features are configured',
    },
  }, async () => {
    const config = getAiConfig();
    return success({
      configured: config !== null,
      provider: config?.provider ?? null,
      model: config?.model ?? null,
    });
  });

  // POST /api/v1/ai/decompose — Decompose a task into subtasks
  app.post('/ai/decompose', {
    schema: {
      body: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        projectContext: z.string().optional(),
      }),
      tags: ['AI'],
      summary: 'AI-powered task decomposition into subtasks',
    },
  }, async (request, reply) => {
    const result = await decomposeTask(request.body);
    if (!result.ok) {
      reply.status(422);
      return error('AI_UNAVAILABLE', result.reason);
    }
    return success(result.data);
  });

  // POST /api/v1/ai/triage — Suggest priority and labels for a task
  app.post('/ai/triage', {
    schema: {
      body: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        projectId: uuidSchema.optional(),
        projectContext: z.string().optional(),
      }),
      tags: ['AI'],
      summary: 'AI-powered task triage (priority, labels)',
    },
  }, async (request, reply) => {
    const { title, description, projectId, projectContext } = request.body;

    let availableLabels: string[] = [];
    if (projectId) {
      const projectLabels = await db.select({ name: labels.name }).from(labels).where(eq(labels.projectId, projectId));
      availableLabels = projectLabels.map(l => l.name);
    }

    const result = await triageTask({ title, description, availableLabels, projectContext });
    if (!result.ok) {
      reply.status(422);
      return error('AI_UNAVAILABLE', result.reason);
    }
    return success(result.data);
  });

  // POST /api/v1/ai/context/:taskId — Assemble rich context for a task
  app.post('/ai/context/:taskId', {
    schema: {
      params: z.object({ taskId: uuidSchema }),
      tags: ['AI'],
      summary: 'AI-powered context assembly for a task',
    },
  }, async (request, reply) => {
    const { taskId } = request.params;

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        parentTask: true,
        subtasks: true,
        comments: { limit: 10 },
        activities: { limit: 10 },
      },
    });

    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    const result = await assembleContext({
      task: { title: task.title, description: task.description ?? '', status: task.status, priority: task.priority },
      parentTask: task.parentTask ? { title: task.parentTask.title, description: task.parentTask.description ?? '' } : null,
      subtasks: task.subtasks.map(s => ({ title: s.title, status: s.status })),
      comments: task.comments.map(c => ({ body: c.body, authorType: c.authorType })),
      recentActivity: task.activities.map(a => ({ action: a.action, fieldChanged: a.fieldChanged })),
    });

    if (!result.ok) {
      reply.status(422);
      return error('AI_UNAVAILABLE', result.reason);
    }
    return success(result.data);
  });

  // POST /api/v1/ai/estimate — Estimate effort for a task
  app.post('/ai/estimate', {
    schema: {
      body: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        projectId: uuidSchema.optional(),
      }),
      tags: ['AI'],
      summary: 'AI-powered effort estimation',
    },
  }, async (request, reply) => {
    const { title, description, projectId } = request.body;

    let historicalTasks: Array<{ title: string; estimate: string | null }> = [];
    if (projectId) {
      const recent = await db.select({ title: tasks.title, estimate: tasks.estimate })
        .from(tasks)
        .where(eq(tasks.projectId, projectId))
        .limit(10);
      historicalTasks = recent;
    }

    const result = await estimateEffort({ title, description, historicalTasks });
    if (!result.ok) {
      reply.status(422);
      return error('AI_UNAVAILABLE', result.reason);
    }
    return success(result.data);
  });
};
