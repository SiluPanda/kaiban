import { buildApp } from '../app';
import { db, queryClient } from '@pith/db';
import { users, projects, tasks, comments, activities, labels, agentSessions, views } from '@pith/db/schema';
import { generateApiKey } from '../lib/auth';
import { createAccessToken } from '../lib/jwt';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: string;
  apiKey: string;
  accessToken: string;
}

let app: FastifyInstance;

export async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
  }
  await queryClient.end();
}

export async function cleanDatabase(): Promise<void> {
  await db.execute(sql`TRUNCATE time_entries, task_links, webhook_deliveries, webhooks, activities, agent_sessions, comments, views, tasks, labels, projects, users CASCADE`);
}

export async function createTestUser(opts: {
  name: string;
  email: string;
  role: 'admin' | 'member' | 'agent';
}): Promise<TestUser> {
  const { raw: apiKey, hash: apiKeyHash } = generateApiKey();

  const [user] = await db.insert(users).values({
    name: opts.name,
    email: opts.email,
    role: opts.role,
    apiKeyHash,
  }).returning();

  const accessToken = createAccessToken({ userId: user.id, role: user.role });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    apiKey,
    accessToken,
  };
}

export function authHeader(user: TestUser): Record<string, string> {
  return { Authorization: `Bearer ${user.accessToken}` };
}

export function apiKeyHeader(user: TestUser): Record<string, string> {
  return { Authorization: `Bearer ${user.apiKey}` };
}
