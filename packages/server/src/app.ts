import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { db } from '@pith/db';
import { sql } from 'drizzle-orm';
import { projectRoutes } from './routes/projects';
import { taskRoutes } from './routes/tasks';
import { commentRoutes } from './routes/comments';
import { activityRoutes } from './routes/activity';
import { searchRoutes } from './routes/search';
import { userRoutes } from './routes/users';
import { authRoutes } from './routes/auth';
import { sessionRoutes } from './routes/sessions';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors);

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Pith API',
        description: 'AI-Native Task Management API',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3456' }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  // Health check
  app.get('/health', async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'ok', database: 'connected' };
    } catch {
      return { status: 'error', database: 'disconnected' };
    }
  });

  // Register routes
  await app.register(projectRoutes, { prefix: '/api/v1' });
  await app.register(taskRoutes, { prefix: '/api/v1' });
  await app.register(commentRoutes, { prefix: '/api/v1' });
  await app.register(activityRoutes, { prefix: '/api/v1' });
  await app.register(searchRoutes, { prefix: '/api/v1' });
  await app.register(userRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(sessionRoutes, { prefix: '/api/v1' });

  return app;
}
