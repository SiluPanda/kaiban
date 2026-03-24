import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { views, projects } from '@pith/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { createViewSchema, paginationSchema, uuidSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';

export const viewRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // POST /api/v1/projects/:slug/views — Create a saved view
  app.post('/projects/:slug/views', {
    schema: {
      params: z.object({ slug: z.string() }),
      body: createViewSchema,
      tags: ['Views'],
      summary: 'Create a saved view for a project',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const { name, filters, sort } = request.body;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const [view] = await db.insert(views).values({
      projectId: project.id,
      name,
      filters: filters ?? {},
      sort: sort ?? {},
      createdBy: request.user.id,
    }).returning();

    reply.status(201);
    return success(view);
  });

  // GET /api/v1/projects/:slug/views — List saved views
  app.get('/projects/:slug/views', {
    schema: {
      params: z.object({ slug: z.string() }),
      querystring: paginationSchema,
      tags: ['Views'],
      summary: 'List saved views for a project',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const { limit, offset } = request.query;

    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', 'Project not found');
    }

    const where = eq(views.projectId, project.id);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(views).where(where).limit(limit).offset(offset),
      db.select({ total: count() }).from(views).where(where),
    ]);

    return paginated(items, total, limit, offset);
  });

  // GET /api/v1/views/:id — Get a view by ID
  app.get('/views/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Views'],
      summary: 'Get a saved view by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const view = await db.query.views.findFirst({
      where: eq(views.id, id),
      with: { project: true, creator: true },
    });

    if (!view) {
      reply.status(404);
      return error('NOT_FOUND', 'View not found');
    }

    return success(view);
  });

  // PATCH /api/v1/views/:id — Update a view
  app.patch('/views/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      body: z.object({
        name: z.string().min(1).max(255).optional(),
        filters: z.record(z.unknown()).optional(),
        sort: z.record(z.unknown()).optional(),
      }),
      tags: ['Views'],
      summary: 'Update a saved view',
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [existing] = await db.select().from(views).where(eq(views.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'View not found');
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.filters !== undefined) updates.filters = body.filters;
    if (body.sort !== undefined) updates.sort = body.sort;

    if (Object.keys(updates).length === 0) {
      return success(existing);
    }

    const [updated] = await db.update(views).set(updates).where(eq(views.id, id)).returning();
    return success(updated);
  });

  // DELETE /api/v1/views/:id — Delete a view
  app.delete('/views/:id', {
    schema: {
      params: z.object({ id: uuidSchema }),
      tags: ['Views'],
      summary: 'Delete a saved view',
    },
  }, async (request, reply) => {
    const { id } = request.params;

    const [existing] = await db.select().from(views).where(eq(views.id, id)).limit(1);
    if (!existing) {
      reply.status(404);
      return error('NOT_FOUND', 'View not found');
    }

    await db.delete(views).where(eq(views.id, id));
    return success({ deleted: true });
  });
};
