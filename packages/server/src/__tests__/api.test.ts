import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getApp,
  closeApp,
  cleanDatabase,
  createTestUser,
  authHeader,
  apiKeyHeader,
  type TestUser,
} from './helpers';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let admin: TestUser;
let member: TestUser;
let agent: TestUser;

let seq = 0;
function unique(prefix: string) {
  return `${prefix}-${++seq}`;
}

beforeAll(async () => {
  app = await getApp();
  await cleanDatabase();
  admin = await createTestUser({ name: 'Admin', email: 'admin@test.dev', role: 'admin' });
  member = await createTestUser({ name: 'Member', email: 'member@test.dev', role: 'member' });
  agent = await createTestUser({ name: 'Agent', email: 'agent@test.dev', role: 'agent' });
});

afterAll(async () => {
  await cleanDatabase();
  await closeApp();
});

// Helper to create a project
async function createProject(slug?: string, name?: string) {
  const s = slug ?? unique('proj');
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/projects',
    headers: authHeader(admin),
    payload: { slug: s, name: name ?? `Project ${s}` },
  });
  return { slug: s, ...res.json().data };
}

// Helper to create a task
async function createTask(projectSlug: string, payload: Record<string, unknown> = {}, user?: TestUser) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/projects/${projectSlug}/tasks`,
    headers: authHeader(user ?? member),
    payload: { title: unique('task'), ...payload },
  });
  return res.json().data;
}

// ─── Health Check ────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns ok status with database connected', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
  });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('Auth', () => {
  describe('POST /api/v1/auth/login', () => {
    it('returns JWT tokens for valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: admin.email, apiKey: admin.apiKey },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.user.email).toBe(admin.email);
    });

    it('returns 401 for invalid email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nobody@test.dev', apiKey: admin.apiKey },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().errors.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 for invalid API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: admin.email, apiKey: 'kb_invalid' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().errors.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns a new access token', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: admin.email, apiKey: admin.apiKey },
      });
      const { refreshToken } = loginRes.json().data;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.accessToken).toBeDefined();
    });

    it('returns 401 for invalid refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'invalid-token' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('API key authentication', () => {
    it('authenticates with a valid API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: apiKeyHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.email).toBe(admin.email);
    });

    it('returns 401 for missing auth header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
      });
      expect(res.statusCode).toBe(401);
    });
  });
});

// ─── Users ───────────────────────────────────────────────────────────────────

describe('Users', () => {
  describe('GET /api/v1/users/me', () => {
    it('returns the authenticated user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.email).toBe('admin@test.dev');
    });
  });

  describe('GET /api/v1/users', () => {
    it('lists users for admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.length).toBeGreaterThanOrEqual(3);
      expect(body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(403);
    });

    it('filters by role', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users?role=agent',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      const agents = res.json().data;
      expect(agents.length).toBeGreaterThanOrEqual(1);
      expect(agents.every((u: any) => u.role === 'agent')).toBe(true);
    });
  });

  describe('POST /api/v1/users', () => {
    it('creates a new user with API key (admin only)', async () => {
      const email = `new-${Date.now()}@test.dev`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: authHeader(admin),
        payload: { name: 'New User', email, role: 'member' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.data.email).toBe(email);
      expect(body.data.apiKey).toBeDefined();
      expect(body.data.apiKey).toMatch(/^kb_/);
    });

    it('returns 409 for duplicate email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: authHeader(admin),
        payload: { name: 'Dup', email: 'admin@test.dev' },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().errors.code).toBe('EMAIL_EXISTS');
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: authHeader(member),
        payload: { name: 'X', email: `x-${Date.now()}@test.dev` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns user by ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${member.id}`,
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.email).toBe('member@test.dev');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/00000000-0000-0000-0000-000000000000',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('updates user name (admin only)', async () => {
      // Create a separate user to update
      const target = await createTestUser({ name: 'Updatable', email: `upd-${Date.now()}@test.dev`, role: 'member' });
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${target.id}`,
        headers: authHeader(admin),
        payload: { name: 'Updated Name' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.name).toBe('Updated Name');
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${member.id}`,
        headers: authHeader(member),
        payload: { name: 'Nope' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/users/:id/regenerate-key', () => {
    it('regenerates API key (admin only)', async () => {
      const target = await createTestUser({ name: 'RegenTarget', email: `regen-${Date.now()}@test.dev`, role: 'member' });
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${target.id}/regenerate-key`,
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.apiKey).toMatch(/^kb_/);
    });
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────

describe('Projects', () => {
  describe('POST /api/v1/projects', () => {
    it('creates a project (admin only)', async () => {
      const slug = unique('test-proj');
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(admin),
        payload: { slug, name: 'Test Project', description: 'A test project' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.data.slug).toBe(slug);
      expect(body.data.name).toBe('Test Project');
      expect(body.data.defaultStatusFlow).toEqual(
        ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']
      );
    });

    it('returns 409 for duplicate slug', async () => {
      const slug = unique('dup-slug');
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(admin),
        payload: { slug, name: 'First' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(admin),
        payload: { slug, name: 'Second' },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().errors.code).toBe('SLUG_EXISTS');
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(member),
        payload: { slug: unique('no-access'), name: 'Nope' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('lists projects', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/projects/:slug', () => {
    it('returns project by slug', async () => {
      const slug = unique('get-proj');
      await createProject(slug, 'Get Project');

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${slug}`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.slug).toBe(slug);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/nonexistent',
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

describe('Tasks', () => {
  let projectSlug: string;

  beforeAll(async () => {
    projectSlug = unique('task-proj');
    await createProject(projectSlug, 'Task Project');
  });

  describe('POST /api/v1/projects/:slug/tasks', () => {
    it('creates a task with defaults', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectSlug}/tasks`,
        headers: authHeader(member),
        payload: { title: 'Test task' },
      });
      expect(res.statusCode).toBe(201);
      const task = res.json().data;
      expect(task.title).toBe('Test task');
      expect(task.status).toBe('backlog');
      expect(task.priority).toBe('P2');
      expect(task.createdBy).toBe(member.id);
    });

    it('creates a task with all fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectSlug}/tasks`,
        headers: authHeader(admin),
        payload: {
          title: 'Full task',
          description: 'Detailed description',
          status: 'todo',
          priority: 'P0',
          assigneeId: member.id,
          assigneeType: 'human',
          labels: ['bug', 'urgent'],
          estimate: '3h',
        },
      });
      expect(res.statusCode).toBe(201);
      const task = res.json().data;
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('P0');
      expect(task.assigneeId).toBe(member.id);
      expect(task.labels).toEqual(['bug', 'urgent']);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/no-such-project/tasks',
        headers: authHeader(member),
        payload: { title: 'Orphan task' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('validates parent task nesting limit', async () => {
      const parent = await createTask(projectSlug, { title: 'Parent' });
      const child = await createTask(projectSlug, { title: 'Child', parentTaskId: parent.id });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectSlug}/tasks`,
        headers: authHeader(member),
        payload: { title: 'Grandchild', parentTaskId: child.id },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().errors.code).toBe('NESTING_LIMIT');
    });
  });

  describe('GET /api/v1/projects/:slug/tasks', () => {
    let listSlug: string;

    beforeAll(async () => {
      listSlug = unique('list-proj');
      await createProject(listSlug);
      await createTask(listSlug, { title: 'List task 1' });
      await createTask(listSlug, { title: 'List task 2', status: 'todo' });
      await createTask(listSlug, { title: 'Filter auth bug', priority: 'P0' });
      await createTask(listSlug, { title: 'Low priority item', priority: 'P3' });
    });

    it('lists tasks for a project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${listSlug}/tasks`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(4);
      expect(res.json().meta.total).toBe(4);
    });

    it('filters by status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${listSlug}/tasks?status=todo`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(1);
      expect(res.json().data[0].status).toBe('todo');
    });

    it('filters by priority', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${listSlug}/tasks?priority=P0`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(1);
      expect(res.json().data[0].priority).toBe('P0');
    });

    it('searches by query string', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${listSlug}/tasks?q=auth%20bug`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('returns task with full context', async () => {
      const task = await createTask(projectSlug, { title: 'Context task', description: 'Full details' });

      await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${task.id}/comments`,
        headers: authHeader(member),
        payload: { body: 'A comment on this task' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${task.id}`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.title).toBe('Context task');
      expect(data.comments).toHaveLength(1);
      expect(data.activities.length).toBeGreaterThanOrEqual(1);
      expect(data.project).toBeDefined();
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/00000000-0000-0000-0000-000000000000',
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates task status and logs activity', async () => {
      const task = await createTask(projectSlug, { title: 'Status task' });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        headers: authHeader(member),
        payload: { status: 'in_progress' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('in_progress');

      const activityRes = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${task.id}/activity`,
        headers: authHeader(member),
      });
      const acts = activityRes.json().data;
      const statusChange = acts.find((a: any) => a.action === 'status_changed');
      expect(statusChange).toBeDefined();
      expect(statusChange.oldValue).toBe('backlog');
      expect(statusChange.newValue).toBe('in_progress');
    });

    it('updates priority', async () => {
      const task = await createTask(projectSlug, { title: 'Priority task' });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        headers: authHeader(member),
        payload: { priority: 'P0' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.priority).toBe('P0');
    });

    it('assigns a task', async () => {
      const task = await createTask(projectSlug, { title: 'Assign task' }, admin);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        headers: authHeader(admin),
        payload: { assigneeId: member.id },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.assigneeId).toBe(member.id);
    });

    it('returns current task when no fields provided', async () => {
      const task = await createTask(projectSlug, { title: 'No-op task' });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        headers: authHeader(member),
        payload: {},
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.title).toBe('No-op task');
    });
  });

  describe('POST /api/v1/tasks/:id/subtasks', () => {
    it('batch creates subtasks', async () => {
      const parent = await createTask(projectSlug, { title: 'Parent for subtasks' });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${parent.id}/subtasks`,
        headers: authHeader(member),
        payload: {
          subtasks: [
            { title: 'Subtask 1' },
            { title: 'Subtask 2', priority: 'P1' },
            { title: 'Subtask 3', labels: ['bug'] },
          ],
        },
      });
      expect(res.statusCode).toBe(201);
      const subtasks = res.json().data;
      expect(subtasks).toHaveLength(3);
      expect(subtasks[0].parentTaskId).toBe(parent.id);
      expect(subtasks[1].priority).toBe('P1');
      expect(subtasks[2].labels).toEqual(['bug']);
    });

    it('prevents subtasks under a subtask', async () => {
      const parent = await createTask(projectSlug, { title: 'Top parent' });
      const child = await createTask(projectSlug, { title: 'Child', parentTaskId: parent.id });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${child.id}/subtasks`,
        headers: authHeader(member),
        payload: { subtasks: [{ title: 'Grand-subtask' }] },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().errors.code).toBe('NESTING_LIMIT');
    });
  });
});

// ─── Comments ────────────────────────────────────────────────────────────────

describe('Comments', () => {
  let taskId: string;
  let commentSlug: string;

  beforeAll(async () => {
    commentSlug = unique('comment-proj');
    await createProject(commentSlug);
    const task = await createTask(commentSlug, { title: 'Commentable task' });
    taskId = task.id;
  });

  describe('POST /api/v1/tasks/:id/comments', () => {
    it('adds a comment to a task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${taskId}/comments`,
        headers: authHeader(member),
        payload: { body: 'This is a comment' },
      });
      expect(res.statusCode).toBe(201);
      const comment = res.json().data;
      expect(comment.body).toBe('This is a comment');
      expect(comment.authorId).toBe(member.id);
      expect(comment.taskId).toBe(taskId);
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/00000000-0000-0000-0000-000000000000/comments',
        headers: authHeader(member),
        payload: { body: 'Orphan comment' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/tasks/:id/comments', () => {
    it('lists comments for a task', async () => {
      const commentTask = await createTask(commentSlug, { title: 'Multi-comment task' });
      await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${commentTask.id}/comments`,
        headers: authHeader(member),
        payload: { body: 'Comment 1' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${commentTask.id}/comments`,
        headers: authHeader(admin),
        payload: { body: 'Comment 2' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${commentTask.id}/comments`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(2);
      expect(res.json().meta.total).toBe(2);
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/00000000-0000-0000-0000-000000000000/comments',
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

// ─── Activity ────────────────────────────────────────────────────────────────

describe('Activity', () => {
  let actSlug: string;

  beforeAll(async () => {
    actSlug = unique('act-proj');
    await createProject(actSlug);
  });

  describe('GET /api/v1/tasks/:id/activity', () => {
    it('returns activity log for a task', async () => {
      const task = await createTask(actSlug, { title: 'Activity task' });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${task.id}/activity`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data.some((a: any) => a.action === 'created')).toBe(true);
    });

    it('logs multiple activity types', async () => {
      const task = await createTask(actSlug, { title: 'Multi-activity task' });

      await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${task.id}`,
        headers: authHeader(member),
        payload: { status: 'todo' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${task.id}/comments`,
        headers: authHeader(member),
        payload: { body: 'Testing activity' },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${task.id}/activity`,
        headers: authHeader(member),
      });
      const actions = res.json().data.map((a: any) => a.action);
      expect(actions).toContain('created');
      expect(actions).toContain('status_changed');
      expect(actions).toContain('commented');
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/00000000-0000-0000-0000-000000000000/activity',
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

// ─── Search ──────────────────────────────────────────────────────────────────

describe('Search', () => {
  beforeAll(async () => {
    const slug = unique('search-proj');
    await createProject(slug);
    await createTask(slug, { title: 'Implement authentication flow' });
    await createTask(slug, { title: 'Fix database migration', description: 'The auth migration is broken' });
    await createTask(slug, { title: 'Write documentation for search' });
  });

  describe('GET /api/v1/search', () => {
    it('searches tasks by title', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=authentication%20flow',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    });

    it('searches tasks by description', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=auth%20migration',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty results for no match', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=zzzzzznonexistent',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(0);
    });

    it('validates search query is required', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=',
      });
      expect(res.statusCode).toBe(400);
    });
  });
});

// ─── Sessions ────────────────────────────────────────────────────────────────

describe('Sessions', () => {
  describe('POST /api/v1/sessions', () => {
    it('starts a new agent session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        headers: authHeader(agent),
        payload: { tasks: [], agentName: 'Claude Code' },
      });
      expect(res.statusCode).toBe(201);
      const session = res.json().data;
      expect(session.agentName).toBe('Claude Code');
      expect(session.userId).toBe(agent.id);
      expect(session.endedAt).toBeNull();
      expect(session.startedAt).toBeDefined();
    });

    it('starts a session with task IDs', async () => {
      const slug = unique('session-proj');
      await createProject(slug);
      const task = await createTask(slug, { title: 'Session task' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        headers: authHeader(agent),
        payload: { tasks: [task.id] },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.tasksTouched).toContain(task.id);
    });
  });

  describe('GET /api/v1/sessions', () => {
    it('lists sessions', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/sessions/:id', () => {
    it('returns session by ID with user', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        headers: authHeader(agent),
        payload: { agentName: 'Test Agent' },
      });
      const sessionId = createRes.json().data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/sessions/${sessionId}`,
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.agentName).toBe('Test Agent');
      expect(res.json().data.user).toBeDefined();
    });

    it('returns 404 for non-existent session', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/sessions/00000000-0000-0000-0000-000000000000',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/sessions/:id', () => {
    it('ends a session with summary', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        headers: authHeader(agent),
        payload: { agentName: 'End Test' },
      });
      const sessionId = createRes.json().data.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/sessions/${sessionId}`,
        headers: authHeader(agent),
        payload: { summary: 'Completed work on feature X' },
      });
      expect(res.statusCode).toBe(200);
      const session = res.json().data;
      expect(session.endedAt).not.toBeNull();
      expect(session.summary).toBe('Completed work on feature X');
    });

    it('merges tasksTouched when ending', async () => {
      const slug = unique('merge-proj');
      await createProject(slug);
      const t1 = await createTask(slug, { title: 'T1' });
      const t2 = await createTask(slug, { title: 'T2' });

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        headers: authHeader(agent),
        payload: { tasks: [t1.id] },
      });
      const sessionId = createRes.json().data.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/sessions/${sessionId}`,
        headers: authHeader(agent),
        payload: { tasksTouched: [t2.id], summary: 'Done' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.tasksTouched).toContain(t1.id);
      expect(res.json().data.tasksTouched).toContain(t2.id);
    });

    it('returns 400 when ending an already-ended session', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/sessions',
        headers: authHeader(agent),
        payload: {},
      });
      const sessionId = createRes.json().data.id;

      await app.inject({
        method: 'PATCH',
        url: `/api/v1/sessions/${sessionId}`,
        headers: authHeader(agent),
        payload: { summary: 'First end' },
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/sessions/${sessionId}`,
        headers: authHeader(agent),
        payload: { summary: 'Second end' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().errors.code).toBe('SESSION_ENDED');
    });
  });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

describe('Analytics', () => {
  let analyticsSlug: string;

  beforeAll(async () => {
    analyticsSlug = unique('analytics-proj');
    await createProject(analyticsSlug);
    await createTask(analyticsSlug, { title: 'A1', status: 'backlog', priority: 'P0' });
    await createTask(analyticsSlug, { title: 'A2', status: 'todo', priority: 'P1' });
    await createTask(analyticsSlug, { title: 'A3', status: 'in_progress', priority: 'P2' });
  });

  describe('GET /api/v1/projects/:slug/analytics', () => {
    it('returns project analytics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${analyticsSlug}/analytics`,
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.totals.tasks).toBe(3);
      expect(data.totals.byStatus).toBeDefined();
      expect(data.totals.byPriority).toBeDefined();
      expect(data.velocity).toBeDefined();
      expect(data.activity).toBeDefined();
    });

    it('returns 404 for non-existent project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/nonexistent/analytics',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/projects/:slug/summary', () => {
    it('returns a summary (fallback without AI)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${analyticsSlug}/summary`,
        headers: authHeader(admin),
        payload: { days: 30 },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.summary).toBeDefined();
      expect(data.aiGenerated).toBe(false);
      expect(data.period.days).toBe(30);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/nonexistent/summary',
        headers: authHeader(admin),
        payload: { days: 7 },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

// ─── Links (GitHub Integration) ──────────────────────────────────────────────

describe('Links', () => {
  let linkSlug: string;
  let linkTaskId: string;

  beforeAll(async () => {
    linkSlug = unique('link-proj');
    await createProject(linkSlug);
    const task = await createTask(linkSlug, { title: 'Task with links' });
    linkTaskId = task.id;
  });

  describe('POST /api/v1/tasks/:id/links', () => {
    it('links a GitHub PR to a task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${linkTaskId}/links`,
        headers: authHeader(member),
        payload: {
          provider: 'github',
          linkType: 'pull_request',
          externalId: 'org/repo#42',
          externalUrl: 'https://github.com/org/repo/pull/42',
          title: 'Fix auth flow',
          status: 'open',
        },
      });
      expect(res.statusCode).toBe(201);
      const link = res.json().data;
      expect(link.provider).toBe('github');
      expect(link.linkType).toBe('pull_request');
      expect(link.externalId).toBe('org/repo#42');
    });

    it('links a GitHub issue to a task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${linkTaskId}/links`,
        headers: authHeader(member),
        payload: {
          provider: 'github',
          linkType: 'issue',
          externalId: 'org/repo#10',
          externalUrl: 'https://github.com/org/repo/issues/10',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('returns 404 for non-existent task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/00000000-0000-0000-0000-000000000000/links',
        headers: authHeader(member),
        payload: {
          provider: 'github',
          linkType: 'issue',
          externalId: 'org/repo#1',
          externalUrl: 'https://github.com/org/repo/issues/1',
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/tasks/:id/links', () => {
    it('lists links for a task', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${linkTaskId}/links`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PATCH /api/v1/links/:linkId', () => {
    it('updates link status', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${linkTaskId}/links`,
        headers: authHeader(member),
        payload: {
          provider: 'github',
          linkType: 'pull_request',
          externalId: 'org/repo#99',
          externalUrl: 'https://github.com/org/repo/pull/99',
          status: 'open',
        },
      });
      const linkId = createRes.json().data.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/links/${linkId}`,
        headers: authHeader(member),
        payload: { status: 'merged', title: 'Merged PR' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('merged');
      expect(res.json().data.title).toBe('Merged PR');
    });
  });

  describe('DELETE /api/v1/links/:linkId', () => {
    it('deletes a link', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${linkTaskId}/links`,
        headers: authHeader(member),
        payload: {
          provider: 'github',
          linkType: 'branch',
          externalId: 'feature-branch',
          externalUrl: 'https://github.com/org/repo/tree/feature-branch',
        },
      });
      const linkId = createRes.json().data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/links/${linkId}`,
        headers: authHeader(member),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.deleted).toBe(true);
    });
  });

  describe('POST /api/v1/github/webhook', () => {
    it('receives a PR webhook event', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/github/webhook',
        headers: { 'x-github-event': 'pull_request' },
        payload: {
          action: 'closed',
          pull_request: { number: 42, title: 'Fix auth', state: 'closed', merged: true },
          repository: { full_name: 'org/repo' },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.received).toBe(true);
    });
  });
});

// ─── Webhooks ────────────────────────────────────────────────────────────────

describe('Webhooks', () => {
  let whSlug: string;

  beforeAll(async () => {
    whSlug = unique('wh-proj');
    await createProject(whSlug);
  });

  describe('POST /api/v1/projects/:slug/webhooks', () => {
    it('registers a webhook (admin only)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${whSlug}/webhooks`,
        headers: authHeader(admin),
        payload: { url: 'https://example.com/hook', events: ['task.created', 'task.updated'] },
      });
      expect(res.statusCode).toBe(201);
      const wh = res.json().data;
      expect(wh.url).toBe('https://example.com/hook');
      expect(wh.events).toEqual(['task.created', 'task.updated']);
      expect(wh.secret).toBeDefined();
      expect(wh.secret.length).toBeGreaterThan(0);
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${whSlug}/webhooks`,
        headers: authHeader(member),
        payload: { url: 'https://example.com/hook', events: ['task.created'] },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/nonexistent/webhooks',
        headers: authHeader(admin),
        payload: { url: 'https://example.com/hook', events: ['task.created'] },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/projects/:slug/webhooks', () => {
    it('lists webhooks for a project', async () => {
      const listSlug = unique('wh-list');
      await createProject(listSlug);
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${listSlug}/webhooks`,
        headers: authHeader(admin),
        payload: { url: 'https://a.com/hook', events: ['task.created'] },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${listSlug}/webhooks`,
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(1);
      // Secret should NOT be in the list response
      expect(res.json().data[0].secret).toBeUndefined();
    });
  });

  describe('DELETE /api/v1/webhooks/:id', () => {
    it('deletes a webhook', async () => {
      const delSlug = unique('wh-del');
      await createProject(delSlug);
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${delSlug}/webhooks`,
        headers: authHeader(admin),
        payload: { url: 'https://b.com/hook', events: ['*'] },
      });
      const whId = createRes.json().data.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/webhooks/${whId}`,
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.deleted).toBe(true);
    });

    it('returns 404 for non-existent webhook', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/webhooks/00000000-0000-0000-0000-000000000000',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/webhooks/:id/deliveries', () => {
    it('returns empty delivery log for new webhook', async () => {
      const logSlug = unique('wh-log');
      await createProject(logSlug);
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${logSlug}/webhooks`,
        headers: authHeader(admin),
        payload: { url: 'https://c.com/hook', events: ['task.created'] },
      });
      const whId = createRes.json().data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/webhooks/${whId}/deliveries`,
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(0);
    });
  });
});

// ─── AI ──────────────────────────────────────────────────────────────────────

describe('AI', () => {
  describe('GET /api/v1/ai/status', () => {
    it('reports AI not configured when no env vars set', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/status',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.configured).toBe(false);
    });
  });

  describe('POST /api/v1/ai/decompose', () => {
    it('returns 422 when AI is not configured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/decompose',
        headers: authHeader(admin),
        payload: { title: 'Build feature X', description: 'Detailed description of feature X' },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().errors.code).toBe('AI_UNAVAILABLE');
    });
  });

  describe('POST /api/v1/ai/triage', () => {
    it('returns 422 when AI is not configured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/triage',
        headers: authHeader(admin),
        payload: { title: 'Fix login bug', description: 'Users cannot log in' },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().errors.code).toBe('AI_UNAVAILABLE');
    });
  });

  describe('POST /api/v1/ai/context/:taskId', () => {
    it('returns 404 for non-existent task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/context/00000000-0000-0000-0000-000000000000',
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 422 when AI not configured for valid task', async () => {
      const slug = unique('ai-ctx-proj');
      await createProject(slug);
      const task = await createTask(slug, { title: 'AI context task', description: 'Needs context' });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/context/${task.id}`,
        headers: authHeader(admin),
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().errors.code).toBe('AI_UNAVAILABLE');
    });
  });

  describe('POST /api/v1/ai/estimate', () => {
    it('returns 422 when AI is not configured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/estimate',
        headers: authHeader(admin),
        payload: { title: 'Refactor module', description: 'Extract shared code' },
      });
      expect(res.statusCode).toBe(422);
      expect(res.json().errors.code).toBe('AI_UNAVAILABLE');
    });
  });
});

// ─── RBAC ────────────────────────────────────────────────────────────────────

describe('RBAC', () => {
  it('admin can access admin-only routes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: authHeader(admin),
    });
    expect(res.statusCode).toBe(200);
  });

  it('member cannot access admin-only routes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: authHeader(member),
    });
    expect(res.statusCode).toBe(403);
  });

  it('agent cannot access admin-only routes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: authHeader(agent),
    });
    expect(res.statusCode).toBe(403);
  });

  it('all roles can access authenticated routes', async () => {
    for (const user of [admin, member, agent]) {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: authHeader(user),
      });
      expect(res.statusCode).toBe(200);
    }
  });

  it('agent role can create tasks and is tracked as agent type', async () => {
    const slug = unique('agent-proj');
    await createProject(slug);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${slug}/tasks`,
      headers: authHeader(agent),
      payload: { title: 'Agent-created task' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.createdByType).toBe('agent');
  });
});
