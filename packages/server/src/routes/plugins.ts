import { type FastifyPluginAsync } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { success, error } from '../lib/response';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { pluginRegistry } from '../plugins/registry';

export const pluginRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', authenticate);

  // GET /api/v1/plugins — List loaded plugins
  app.get('/plugins', {
    schema: {
      tags: ['Plugins'],
      summary: 'List all loaded plugins',
    },
  }, async () => {
    return success({
      plugins: pluginRegistry.list(),
      count: pluginRegistry.size,
    });
  });

  // GET /api/v1/plugins/:name — Get plugin details
  app.get('/plugins/:name', {
    schema: {
      params: z.object({ name: z.string() }),
      tags: ['Plugins'],
      summary: 'Get plugin details by name',
    },
  }, async (request, reply) => {
    const { name } = request.params;
    const plugin = pluginRegistry.get(name);
    if (!plugin) {
      reply.status(404);
      return error('NOT_FOUND', `Plugin "${name}" not found`);
    }

    return success({
      name: plugin.name,
      version: plugin.version,
      hooks: plugin.hooks ? Object.keys(plugin.hooks) : [],
    });
  });

  // POST /api/v1/plugins/:name/emit — Manually emit a hook event (admin only, for testing)
  app.post('/plugins/emit', {
    schema: {
      body: z.object({
        event: z.string().min(1),
        data: z.record(z.unknown()).optional(),
      }),
      tags: ['Plugins'],
      summary: 'Emit a plugin hook event (admin only)',
    },
    preHandler: authorize('admin'),
  }, async (request) => {
    const { event, data } = request.body;
    await pluginRegistry.emit(event as any, data ?? {});
    return success({ emitted: event });
  });
};
