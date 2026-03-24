import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@kaiban/db';
import { tasks, projects, activities, comments } from '@kaiban/db/schema';
import { eq, and, count, desc, inArray, ilike, or, sql, asc } from 'drizzle-orm';
import { createTaskSchema, updateTaskSchema, paginationSchema, statusSchema, prioritySchema, uuidSchema } from '@kaiban/core';
import { success, paginated, error } from '../lib/response';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/projects/:slug/tasks — List tasks with filters
  app.get('/projects/:slug/tasks', {
    schema: {
      params: z.object({ slug: z.string() }),
      querystring: paginationSchema.extend({
        status: statusSchema.optional(),
        priority: prioritySchema.optional(),
        assignee_id: uuidSchema.optional(),
        label: z.string().optional(),
        q: z.string().optional(),
      }),
      tags: ['Tasks'],
      summary: 'List tasks for a project with filters',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const { limit, offset, status, priority, assignee_id, label, q } = request.query;

    // Find project
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', `Project '${slug}' not found`);
    }

    const conditions = [eq(tasks.projectId, project.id)];
    if (status) conditions.push(eq(tasks.status, status));
    if (priority) conditions.push(eq(tasks.priority, priority));
    if (assignee_id) conditions.push(eq(tasks.assigneeId, assignee_id));
    if (q) {
      conditions.push(or(
        ilike(tasks.title, `%${q}%`),
        ilike(tasks.description, `%${q}%`),
      )!);
    }

    const where = and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      db.select().from(tasks).where(where).limit(limit).offset(offset).orderBy(desc(tasks.createdAt)),
      db.select({ total: count() }).from(tasks).where(where),
    ]);

    // Filter by label in JS (text array — can't easily filter with drizzle)
    const filtered = label
      ? items.filter((t) => t.labels.includes(label))
      : items;

    return paginated(filtered, total, limit, offset);
  });

  // POST /api/v1/projects/:slug/tasks — Create task
  app.post('/projects/:slug/tasks', {
    schema: {
      params: z.object({ slug: z.string() }),
      body: createTaskSchema,
      tags: ['Tasks'],
      summary: 'Create a new task in a project',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const body = request.body;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', `Project '${slug}' not found`);
    }

    // Validate parent_task_id if provided
    if (body.parentTaskId) {
      const [parent] = await db.select().from(tasks)
        .where(and(eq(tasks.id, body.parentTaskId), eq(tasks.projectId, project.id)))
        .limit(1);
      if (!parent) {
        reply.status(400);
        return error('INVALID_PARENT', 'Parent task not found in this project');
      }
      // Prevent nested subtasks (parent can't itself have a parent)
      if (parent.parentTaskId) {
        reply.status(400);
        return error('NESTING_LIMIT', 'Sub-tasks cannot have their own sub-tasks');
      }
    }

    // TODO: In Phase 1 Task 03 (auth), createdBy will come from auth context
    // For now, use a placeholder UUID
    const [task] = await db.insert(tasks).values({
      projectId: project.id,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? 'backlog',
      priority: body.priority ?? 'P2',
      assigneeId: body.assigneeId ?? null,
      assigneeType: body.assigneeType ?? null,
      parentTaskId: body.parentTaskId ?? null,
      labels: body.labels ?? [],
      estimate: body.estimate ?? null,
      dueDate: body.dueDate ?? null,
      metadata: body.metadata ?? {},
      createdBy: '00000000-0000-0000-0000-000000000000', // placeholder until auth
      createdByType: 'human',
    }).returning();

    // Log creation activity
    await db.insert(activities).values({
      taskId: task.id,
      actorId: '00000000-0000-0000-0000-000000000000', // placeholder until auth
      actorType: 'human',
      action: 'created',
    });

    reply.status(201);
    return success(task);
  });

  // GET /api/v1/tasks/:id — Get task with full context
  app.get('/tasks/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Tasks'],
      summary: 'Get task with full context (comments, subtasks, activity)',
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        comments: { orderBy: [asc(comments.createdAt)] },
        subtasks: true,
        activities: { orderBy: [desc(activities.timestamp)], limit: 50 },
        project: true,
        assignee: true,
        parentTask: true,
      },
    });

    if (!task) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    return success(task);
  });

  // PATCH /api/v1/tasks/:id — Update task fields
  app.patch('/tasks/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: updateTaskSchema,
      tags: ['Tasks'],
      summary: 'Update task fields',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    // Get current task for activity logging
    const [current] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!current) {
      reply.status(404);
      return error('NOT_FOUND', 'Task not found');
    }

    // Build update values (only include provided fields)
    const updateValues: Record<string, unknown> = {};
    const activityEntries: Array<{
      taskId: string;
      actorId: string;
      actorType: string;
      action: string;
      fieldChanged: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    const trackableFields = ['status', 'priority', 'title', 'assigneeId', 'labels', 'description', 'estimate', 'dueDate'] as const;

    for (const field of trackableFields) {
      if (body[field] !== undefined) {
        updateValues[field] = body[field];

        const oldVal = current[field];
        const newVal = body[field];
        const action = field === 'status' ? 'status_changed'
          : field === 'priority' ? 'priority_changed'
          : field === 'assigneeId' ? 'assigned'
          : 'updated';

        activityEntries.push({
          taskId: id,
          actorId: '00000000-0000-0000-0000-000000000000', // placeholder until auth
          actorType: 'human',
          action,
          fieldChanged: field,
          oldValue: oldVal != null ? String(oldVal) : null,
          newValue: newVal != null ? String(newVal) : null,
        });
      }
    }

    if (body.metadata !== undefined) updateValues.metadata = body.metadata;
    if (body.assigneeType !== undefined) updateValues.assigneeType = body.assigneeType;

    if (Object.keys(updateValues).length === 0) {
      return success(current);
    }

    const [updated] = await db.update(tasks).set(updateValues).where(eq(tasks.id, id)).returning();

    // Log activity for each changed field
    if (activityEntries.length > 0) {
      await db.insert(activities).values(activityEntries);
    }

    return success(updated);
  });

  // POST /api/v1/tasks/:id/subtasks — Batch create sub-tasks
  app.post('/tasks/:id/subtasks', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: z.object({
        subtasks: z.array(createTaskSchema.pick({
          title: true,
          description: true,
          priority: true,
          assigneeId: true,
          assigneeType: true,
          labels: true,
          estimate: true,
        })).min(1).max(20),
      }),
      tags: ['Tasks'],
      summary: 'Batch create sub-tasks under a parent task',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { subtasks } = request.body;

    // Verify parent exists and is not itself a subtask
    const [parent] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!parent) {
      reply.status(404);
      return error('NOT_FOUND', 'Parent task not found');
    }
    if (parent.parentTaskId) {
      reply.status(400);
      return error('NESTING_LIMIT', 'Cannot create sub-tasks under a sub-task');
    }

    const created = await db.insert(tasks).values(
      subtasks.map((st) => ({
        projectId: parent.projectId,
        title: st.title,
        description: st.description ?? null,
        status: 'backlog' as const,
        priority: st.priority ?? 'P2',
        assigneeId: st.assigneeId ?? null,
        assigneeType: st.assigneeType ?? null,
        parentTaskId: id,
        labels: st.labels ?? [],
        metadata: {},
        createdBy: '00000000-0000-0000-0000-000000000000', // placeholder until auth
        createdByType: 'human' as const,
      }))
    ).returning();

    reply.status(201);
    return success(created);
  });
};
