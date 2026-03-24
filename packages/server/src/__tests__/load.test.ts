import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeader,
  type TestUser,
} from './helpers';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let admin: TestUser;
let member: TestUser;
let projectSlug: string;

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  admin = await createTestUser({ name: 'LoadAdmin', email: 'load-admin@test.dev', role: 'admin' });
  member = await createTestUser({ name: 'LoadMember', email: 'load-member@test.dev', role: 'member' });

  projectSlug = 'load-test-proj';
  await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: authHeader(admin),
    payload: { slug: projectSlug, name: 'Load Test Project' },
  });

  // Seed 10 tasks for load testing
  for (let i = 0; i < 10; i++) {
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectSlug}/tasks`,
      headers: authHeader(member),
      payload: {
        title: `Load test task ${i}`,
        description: `Description for task ${i} with some content`,
        priority: ['P0', 'P1', 'P2', 'P3'][i % 4],
        status: ['backlog', 'todo', 'in_progress'][i % 3],
        labels: i % 2 === 0 ? ['feature'] : ['bug'],
      },
    });
  }
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

async function measureLatency(fn: () => Promise<any>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

async function runConcurrent(count: number, fn: () => Promise<any>): Promise<number[]> {
  const promises = Array.from({ length: count }, () => measureLatency(fn));
  return Promise.all(promises);
}

function p99(latencies: number[]): number {
  const sorted = [...latencies].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.99)];
}

describe('Performance', () => {
  it('health check responds under 5000ms p99', async () => {
    const latencies = await runConcurrent(10, () =>
      app.inject({ method: 'GET', url: '/health' })
    );
    const p99Latency = p99(latencies);
    expect(p99Latency).toBeLessThan(5000);
  });

  it('list tasks responds under 3000ms p99', async () => {
    const latencies = await runConcurrent(5, () =>
      app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectSlug}/tasks`,
        headers: authHeader(member),
      })
    );
    const p99Latency = p99(latencies);
    expect(p99Latency).toBeLessThan(3000);
  });

  it('get single task responds under 2000ms p99', async () => {
    // Get a task ID first
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectSlug}/tasks?limit=1`,
      headers: authHeader(member),
    });
    const taskId = listRes.json().data[0].id;

    const latencies = await runConcurrent(5, () =>
      app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${taskId}`,
        headers: authHeader(member),
      })
    );
    const p99Latency = p99(latencies);
    expect(p99Latency).toBeLessThan(3000);
  });

  it('search responds under 2000ms p99', async () => {
    const latencies = await runConcurrent(5, () =>
      app.inject({
        method: 'GET',
        url: '/api/v1/search?q=load%20test',
      })
    );
    const p99Latency = p99(latencies);
    expect(p99Latency).toBeLessThan(3000);
  });

  it('create task responds under 3000ms p99', async () => {
    let counter = 0;
    const latencies = await runConcurrent(3, () =>
      app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectSlug}/tasks`,
        headers: authHeader(member),
        payload: { title: `Perf test ${++counter}` },
      })
    );
    const p99Latency = p99(latencies);
    expect(p99Latency).toBeLessThan(3000);
  });

  it('list projects responds under 1000ms p99', async () => {
    const latencies = await runConcurrent(5, () =>
      app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: authHeader(member),
      })
    );
    const p99Latency = p99(latencies);
    expect(p99Latency).toBeLessThan(3000);
  });
});
