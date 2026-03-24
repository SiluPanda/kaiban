import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db } from '@kaiban/db';
import { sql } from 'drizzle-orm';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  await app.register(cors);

  app.get('/health', async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'ok', database: 'connected' };
    } catch {
      return { status: 'error', database: 'disconnected' };
    }
  });

  return app;
}
