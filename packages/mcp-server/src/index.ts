#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { api } from './api-client.js';

const server = new McpServer({
  name: 'pith',
  version: '0.0.1',
});

// ─── Tools ───────────────────────────────────────────────────────────────────

server.registerTool('list_projects', {
  description: 'List all projects the authenticated user has access to',
  inputSchema: {
    limit: z.number().min(1).max(100).default(20).describe('Max results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
  },
}, async ({ limit, offset }) => {
  const result = await api.listProjects(limit, offset);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('get_project', {
  description: 'Get project details including settings and status flow',
  inputSchema: {
    slug: z.string().describe('Project slug'),
  },
}, async ({ slug }) => {
  const result = await api.getProject(slug);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('list_tasks', {
  description: 'Query tasks with filters: status, priority, assignee, label, free-text search',
  inputSchema: {
    project_slug: z.string().describe('Project slug'),
    status: z.string().optional().describe('Filter by status (backlog, todo, in_progress, in_review, done, cancelled)'),
    priority: z.string().optional().describe('Filter by priority (P0, P1, P2, P3)'),
    assignee_id: z.string().optional().describe('Filter by assignee UUID'),
    label: z.string().optional().describe('Filter by label name'),
    q: z.string().optional().describe('Free-text search query'),
    limit: z.number().min(1).max(100).default(20).describe('Max results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
  },
}, async ({ project_slug, limit, offset, ...filters }) => {
  const params: Record<string, string> = {
    limit: String(limit),
    offset: String(offset),
  };
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined) params[k] = String(v);
  }
  const result = await api.listTasks(project_slug, params);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('get_task', {
  description: 'Get full task details including comments, sub-tasks, and activity history',
  inputSchema: {
    task_id: z.string().uuid().describe('Task UUID'),
  },
}, async ({ task_id }) => {
  const result = await api.getTask(task_id);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('create_task', {
  description: 'Create a new task with title, description, priority, labels, assignee, parent_task_id',
  inputSchema: {
    project_slug: z.string().describe('Project slug'),
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Task description (Markdown)'),
    status: z.string().optional().describe('Initial status (default: backlog)'),
    priority: z.string().optional().describe('Priority: P0, P1, P2, P3 (default: P2)'),
    assignee_id: z.string().optional().describe('Assignee user UUID'),
    assignee_type: z.string().optional().describe('Assignee type: human or agent'),
    parent_task_id: z.string().optional().describe('Parent task UUID for sub-tasks'),
    labels: z.array(z.string()).optional().describe('Label names'),
    estimate: z.string().optional().describe('Time estimate'),
    due_date: z.string().optional().describe('Due date (ISO 8601)'),
  },
}, async ({ project_slug, title, description, status, priority, assignee_id, assignee_type, parent_task_id, labels, estimate, due_date }) => {
  const body: Record<string, unknown> = { title };
  if (description !== undefined) body.description = description;
  if (status !== undefined) body.status = status;
  if (priority !== undefined) body.priority = priority;
  if (assignee_id !== undefined) body.assigneeId = assignee_id;
  if (assignee_type !== undefined) body.assigneeType = assignee_type;
  if (parent_task_id !== undefined) body.parentTaskId = parent_task_id;
  if (labels !== undefined) body.labels = labels;
  if (estimate !== undefined) body.estimate = estimate;
  if (due_date !== undefined) body.dueDate = due_date;

  const result = await api.createTask(project_slug, body);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('update_task', {
  description: 'Update any task field: status, priority, assignee, description, labels, due_date',
  inputSchema: {
    task_id: z.string().uuid().describe('Task UUID'),
    title: z.string().optional().describe('New title'),
    description: z.string().nullable().optional().describe('New description'),
    status: z.string().optional().describe('New status'),
    priority: z.string().optional().describe('New priority'),
    assignee_id: z.string().nullable().optional().describe('New assignee UUID (null to unassign)'),
    assignee_type: z.string().optional().describe('Assignee type'),
    labels: z.array(z.string()).optional().describe('New labels array'),
    estimate: z.string().nullable().optional().describe('New estimate'),
    due_date: z.string().nullable().optional().describe('New due date'),
  },
}, async ({ task_id, title, description, status, priority, assignee_id, assignee_type, labels, estimate, due_date }) => {
  const body: Record<string, unknown> = {};
  if (title !== undefined) body.title = title;
  if (description !== undefined) body.description = description;
  if (status !== undefined) body.status = status;
  if (priority !== undefined) body.priority = priority;
  if (assignee_id !== undefined) body.assigneeId = assignee_id;
  if (assignee_type !== undefined) body.assigneeType = assignee_type;
  if (labels !== undefined) body.labels = labels;
  if (estimate !== undefined) body.estimate = estimate;
  if (due_date !== undefined) body.dueDate = due_date;

  const result = await api.updateTask(task_id, body);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('add_comment', {
  description: 'Add a comment to a task (supports Markdown)',
  inputSchema: {
    task_id: z.string().uuid().describe('Task UUID'),
    body: z.string().min(1).describe('Comment body (Markdown)'),
  },
}, async ({ task_id, body }) => {
  const result = await api.addComment(task_id, body);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('create_subtasks', {
  description: 'Batch-create multiple sub-tasks under a parent task',
  inputSchema: {
    parent_task_id: z.string().uuid().describe('Parent task UUID'),
    subtasks: z.array(z.object({
      title: z.string().describe('Subtask title'),
      description: z.string().optional().describe('Subtask description'),
      priority: z.string().optional().describe('Priority'),
      assignee_id: z.string().optional().describe('Assignee UUID'),
      assignee_type: z.string().optional().describe('Assignee type'),
      labels: z.array(z.string()).optional().describe('Labels'),
      estimate: z.string().optional().describe('Estimate'),
    })).min(1).max(20).describe('Array of subtasks to create'),
  },
}, async ({ parent_task_id, subtasks }) => {
  const mapped = subtasks.map(st => ({
    title: st.title,
    description: st.description,
    priority: st.priority,
    assigneeId: st.assignee_id,
    assigneeType: st.assignee_type,
    labels: st.labels,
    estimate: st.estimate,
  }));
  const result = await api.createSubtasks(parent_task_id, mapped);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('search_tasks', {
  description: 'Full-text search across task titles, descriptions, and comments',
  inputSchema: {
    query: z.string().min(1).describe('Search query'),
    limit: z.number().min(1).max(100).default(20).describe('Max results'),
    offset: z.number().min(0).default(0).describe('Offset'),
  },
}, async ({ query, limit, offset }) => {
  const result = await api.search(query, limit, offset);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('get_my_tasks', {
  description: 'Get all tasks assigned to the current agent/user',
  inputSchema: {
    project_slug: z.string().describe('Project slug'),
    status: z.string().optional().describe('Filter by status'),
    limit: z.number().min(1).max(100).default(50).describe('Max results'),
  },
}, async ({ project_slug, status, limit }) => {
  const me = await api.getMe();
  const params: Record<string, string> = {
    assignee_id: me.data.id,
    limit: String(limit),
  };
  if (status) params.status = status;
  const result = await api.listTasks(project_slug, params);
  return { content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }] };
});

server.registerTool('start_session', {
  description: 'Begin an agent work session (logs that you are starting work)',
  inputSchema: {
    tasks: z.array(z.string()).default([]).describe('Task IDs you plan to work on'),
  },
}, async ({ tasks }) => {
  // Session management is tracked client-side; log context
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'Session started',
        tasks,
        startedAt: new Date().toISOString(),
      }, null, 2),
    }],
  };
});

server.registerTool('end_session', {
  description: 'End an agent session with optional summary',
  inputSchema: {
    summary: z.string().optional().describe('Summary of work done'),
  },
}, async ({ summary }) => {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'Session ended',
        summary,
        endedAt: new Date().toISOString(),
      }, null, 2),
    }],
  };
});

server.registerTool('get_context', {
  description: 'Get rich context for a task: parent, siblings, related tasks, recent activity',
  inputSchema: {
    task_id: z.string().uuid().describe('Task UUID'),
  },
}, async ({ task_id }) => {
  const result = await api.getTask(task_id);
  const task = result.data;

  const context: Record<string, unknown> = {
    task: { id: task.id, title: task.title, status: task.status, priority: task.priority },
    project: task.project,
    parent: task.parentTask ?? null,
    subtasks: task.subtasks ?? [],
    comments: task.comments ?? [],
    recentActivity: (task.activities ?? []).slice(0, 10),
    assignee: task.assignee ?? null,
  };

  return { content: [{ type: 'text', text: JSON.stringify(context, null, 2) }] };
});

// ─── Resources ───────────────────────────────────────────────────────────────

server.registerResource(
  'Project Board',
  new ResourceTemplate('pith://project/{slug}/board', { list: undefined }),
  { description: 'Current board state as structured data' },
  async (uri, { slug }) => {
    const tasks = await api.listTasks(slug as string, { limit: '100' });
    const grouped: Record<string, unknown[]> = {};
    for (const t of tasks.data) {
      (grouped[t.status] ??= []).push({ id: t.id, title: t.title, priority: t.priority, assigneeId: t.assigneeId });
    }
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(grouped, null, 2),
      }],
    };
  },
);

server.registerResource(
  'Project Backlog',
  new ResourceTemplate('pith://project/{slug}/backlog', { list: undefined }),
  { description: 'Full backlog with priorities' },
  async (uri, { slug }) => {
    const tasks = await api.listTasks(slug as string, { status: 'backlog', limit: '100' });
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(tasks.data, null, 2),
      }],
    };
  },
);

server.registerResource(
  'Task Context',
  new ResourceTemplate('pith://task/{id}/context', { list: undefined }),
  { description: 'Complete task context (parent, sub-tasks, comments, linked items)' },
  async (uri, { id }) => {
    const result = await api.getTask(id as string);
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(result.data, null, 2),
      }],
    };
  },
);

server.registerResource(
  'User Workload',
  new ResourceTemplate('pith://user/{id}/workload', { list: undefined }),
  { description: 'Current assignment load for a team member or agent' },
  async (uri, { id }) => {
    // Search across all projects for tasks assigned to this user
    // Note: The API currently doesn't have a global assignee filter,
    // so we search broadly and filter
    const searchResult = await api.search(' ', 100, 0);
    const assigned = searchResult.data.filter((t: any) => t.assigneeId === id);
    const summary = {
      userId: id,
      totalAssigned: assigned.length,
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      tasks: assigned.map((t: any) => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
      })),
    };
    for (const t of assigned) {
      summary.byStatus[t.status] = (summary.byStatus[t.status] || 0) + 1;
      summary.byPriority[t.priority] = (summary.byPriority[t.priority] || 0) + 1;
    }
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(summary, null, 2),
      }],
    };
  },
);

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed:', err);
  process.exit(1);
});
