import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { projects } from '@pith/db/schema';
import { eq, count } from 'drizzle-orm';
import { createProjectSchema, updateProjectSchema, paginationSchema } from '@pith/core';
import { success, paginated, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Require authentication for all project routes
  app.addHook('preHandler', authenticate);

  // GET /api/v1/projects
  app.get('/projects', {
    schema: {
      querystring: paginationSchema,
      tags: ['Projects'],
      summary: 'List all projects',
    },
  }, async (request) => {
    const { limit, offset } = request.query;

    const [items, [{ total }]] = await Promise.all([
      db.select().from(projects).limit(limit).offset(offset).orderBy(projects.createdAt),
      db.select({ total: count() }).from(projects),
    ]);

    return paginated(items, total, limit, offset);
  });

  // POST /api/v1/projects
  app.post('/projects', {
    schema: {
      body: createProjectSchema,
      tags: ['Projects'],
      summary: 'Create a new project',
    },
    preHandler: authorize('admin'),
  }, async (request, reply) => {
    const body = request.body;

    // Check slug uniqueness
    const existing = await db.select().from(projects).where(eq(projects.slug, body.slug)).limit(1);
    if (existing.length > 0) {
      reply.status(409);
      return error('SLUG_EXISTS', `Project with slug '${body.slug}' already exists`);
    }

    const [project] = await db.insert(projects).values({
      slug: body.slug,
      name: body.name,
      description: body.description ?? null,
      defaultStatusFlow: body.defaultStatusFlow,
      settings: body.settings ?? {},
    }).returning();

    reply.status(201);
    return success(project);
  });

  // GET /api/v1/projects/:slug
  app.get('/projects/:slug', {
    schema: {
      params: z.object({ slug: z.string() }),
      tags: ['Projects'],
      summary: 'Get project by slug',
    },
  }, async (request, reply) => {
    const { slug } = request.params;
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);

    if (!project) {
      reply.status(404);
      return error('NOT_FOUND', `Project '${slug}' not found`);
    }

    return success(project);
  });
};
