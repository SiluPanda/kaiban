import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@kaiban/db';
import { tasks } from '@kaiban/db/schema';
import { or, ilike, count } from 'drizzle-orm';
import { paginationSchema } from '@kaiban/core';
import { paginated } from '../lib/response';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

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
    const pattern = `%${q}%`;

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
