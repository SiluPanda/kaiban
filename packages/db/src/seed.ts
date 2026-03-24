import { db, queryClient } from './client';
import { projects, users, tasks, comments, activities, labels, agentSessions } from './schema/index';

async function seed() {
  console.log('Seeding database...');

  // Create users
  const [adminUser] = await db.insert(users).values({
    name: 'Admin User',
    email: 'admin@pith.dev',
    role: 'admin',
  }).onConflictDoNothing({ target: users.email }).returning();

  const [memberUser] = await db.insert(users).values({
    name: 'Alice Developer',
    email: 'alice@pith.dev',
    role: 'member',
  }).onConflictDoNothing({ target: users.email }).returning();

  const [agentUser] = await db.insert(users).values({
    name: 'Claude Code',
    email: 'claude@agent.pith.dev',
    role: 'agent',
  }).onConflictDoNothing({ target: users.email }).returning();

  if (!adminUser || !memberUser || !agentUser) {
    console.log('Seed data already exists. Skipping.');
    await queryClient.end();
    return;
  }

  // Create project
  const [project] = await db.insert(projects).values({
    slug: 'pith-dev',
    name: 'Pith Development',
    description: 'Building the AI-native task management system',
  }).returning();

  // Create labels
  await db.insert(labels).values([
    { projectId: project.id, name: 'bug', color: '#EF4444' },
    { projectId: project.id, name: 'feature', color: '#3B82F6' },
    { projectId: project.id, name: 'enhancement', color: '#8B5CF6' },
    { projectId: project.id, name: 'documentation', color: '#10B981' },
    { projectId: project.id, name: 'ai', color: '#F59E0B' },
  ]);

  // Create tasks
  const [parentTask] = await db.insert(tasks).values({
    projectId: project.id,
    title: 'Set up database schema and migrations',
    description: 'Define Drizzle ORM schemas for all core entities and generate initial migrations.',
    status: 'in_progress',
    priority: 'P1',
    assigneeId: memberUser.id,
    assigneeType: 'human',
    labels: ['feature'],
    createdBy: adminUser.id,
    createdByType: 'human',
  }).returning();

  const [subtask1] = await db.insert(tasks).values({
    projectId: project.id,
    title: 'Define user and project schemas',
    description: 'Create Drizzle table definitions for users and projects tables.',
    status: 'done',
    priority: 'P1',
    assigneeId: memberUser.id,
    assigneeType: 'human',
    parentTaskId: parentTask.id,
    labels: ['feature'],
    createdBy: adminUser.id,
    createdByType: 'human',
  }).returning();

  await db.insert(tasks).values({
    projectId: project.id,
    title: 'Define task and comment schemas',
    description: 'Create Drizzle table definitions for tasks and comments tables with all indexes.',
    status: 'in_progress',
    priority: 'P1',
    assigneeId: agentUser.id,
    assigneeType: 'agent',
    parentTaskId: parentTask.id,
    labels: ['feature'],
    createdBy: adminUser.id,
    createdByType: 'human',
  });

  await db.insert(tasks).values({
    projectId: project.id,
    title: 'Implement MCP server stdio transport',
    description: 'Build the MCP tool server with stdio transport for local agent integration.',
    status: 'backlog',
    priority: 'P2',
    labels: ['feature', 'ai'],
    createdBy: adminUser.id,
    createdByType: 'human',
  });

  await db.insert(tasks).values({
    projectId: project.id,
    title: 'Fix task search returning stale results',
    description: 'The pg_trgm search is returning results from deleted tasks. Need to add a filter.',
    status: 'todo',
    priority: 'P0',
    assigneeId: agentUser.id,
    assigneeType: 'agent',
    labels: ['bug'],
    createdBy: memberUser.id,
    createdByType: 'human',
  });

  await db.insert(tasks).values({
    projectId: project.id,
    title: 'Write API documentation',
    description: 'Document all REST API endpoints with request/response examples.',
    status: 'backlog',
    priority: 'P3',
    labels: ['documentation'],
    createdBy: adminUser.id,
    createdByType: 'human',
  });

  // Create comments
  await db.insert(comments).values([
    {
      taskId: parentTask.id,
      body: 'Starting work on the database schema. Will follow the spec for all 8 entities.',
      authorId: memberUser.id,
      authorType: 'human',
    },
    {
      taskId: subtask1.id,
      body: 'Completed user and project schemas. All indexes and constraints are in place.',
      authorId: memberUser.id,
      authorType: 'human',
    },
  ]);

  // Create activity entries
  await db.insert(activities).values([
    {
      taskId: parentTask.id,
      actorId: adminUser.id,
      actorType: 'human',
      action: 'created',
    },
    {
      taskId: parentTask.id,
      actorId: adminUser.id,
      actorType: 'human',
      action: 'assigned',
      fieldChanged: 'assignee_id',
      oldValue: null,
      newValue: memberUser.id,
    },
    {
      taskId: parentTask.id,
      actorId: memberUser.id,
      actorType: 'human',
      action: 'status_changed',
      fieldChanged: 'status',
      oldValue: 'backlog',
      newValue: 'in_progress',
    },
  ]);

  // Create agent session
  await db.insert(agentSessions).values({
    userId: agentUser.id,
    agentName: 'Claude Code',
    tasksTouched: [parentTask.id],
    summary: 'Reviewed task schema definitions and added missing indexes.',
  });

  console.log('Seed complete!');
  await queryClient.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
