import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@pith/db';
import { tasks } from '@pith/db/schema';
import { or, ilike, count } from 'drizzle-orm';
import { paginationSchema } from '@pith/core';
import { paginated } from '../lib/response';
import { authenticate } from '../middleware/authenticate';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // GET /api/v1/search
  app.get('/search', {
    schema: {
      querystring: paginationSchema.extend({
        q: z.string().min(1),
      }),
      tags: ['Search'],
      summary: 'Full-text search across tasks and comments',
    },
  }, async (request) => {
    const { q, limit, offset } = request.query;
    const escaped = q.replace(/[%_\\]/g, '\\$&');
    const pattern = `%${escaped}%`;

    const searchCondition = or(
      ilike(tasks.title, pattern),
      ilike(tasks.description, pattern),
    );

    const [items, [{ total }]] = await Promise.all([
      db.select()
        .from(tasks)
        .where(searchCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(tasks.createdAt),
      db.select({ total: count() })
        .from(tasks)
        .where(searchCondition),
    ]);

    return paginated(items, total, limit, offset);
  });
};
