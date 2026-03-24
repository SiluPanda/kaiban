import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { loadConfig } from '../lib/config';
import { getOutputFormat, printJson, printTable, printSuccess, printError, formatPriority, formatStatus, truncate } from '../lib/output';

function getProject(options: { project?: string }): string {
  const project = options.project || loadConfig().project;
  if (!project) {
    printError('No project specified. Use --project <slug> or set "project" in .pithrc');
    process.exit(2);
  }
  return project;
}

export const taskCommand = new Command('task')
  .description('Manage tasks');

// task list
taskCommand
  .command('list')
  .description('List tasks with filters')
  .option('-p, --project <slug>', 'Project slug')
  .option('-s, --status <status>', 'Filter by status')
  .option('--priority <priority>', 'Filter by priority (P0-P3)')
  .option('--assignee <id>', 'Filter by assignee ID')
  .option('--label <label>', 'Filter by label')
  .option('-q, --query <text>', 'Search within tasks')
  .option('--json', 'Output as JSON')
  .option('--output <format>', 'Output format: json, table, minimal')
  .option('--limit <n>', 'Limit results', '20')
  .option('--offset <n>', 'Offset results', '0')
  .action(async (options) => {
    try {
      const project = getProject(options);
      const format = getOutputFormat(options);
      const params: Record<string, string> = {
        limit: options.limit,
        offset: options.offset,
      };
      if (options.status) params.status = options.status;
      if (options.priority) params.priority = options.priority;
      if (options.assignee) params.assignee_id = options.assignee;
      if (options.label) params.label = options.label;
      if (options.query) params.q = options.query;

      const result = await api<any>(`/api/v1/projects/${encodeURIComponent(project)}/tasks`, { params });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const tasks = result.data || [];
      if (format === 'minimal') {
        for (const t of tasks) {
          console.log(`${t.id}\t${t.status}\t${t.title}`);
        }
        return;
      }

      printTable(
        ['ID', 'TITLE', 'STATUS', 'PRIORITY', 'ASSIGNEE', 'LABELS'],
        tasks.map((t: any) => [
          t.id.slice(0, 8),
          truncate(t.title, 40),
          formatStatus(t.status),
          formatPriority(t.priority),
          t.assigneeId ? t.assigneeId.slice(0, 8) : '—',
          t.labels?.length > 0 ? t.labels.join(', ') : '—',
        ]),
      );

      if (result.meta) {
        console.log(`\nShowing ${tasks.length} of ${result.meta.total} tasks`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

// task create
taskCommand
  .command('create')
  .description('Create a new task')
  .argument('<title>', 'Task title')
  .option('-p, --project <slug>', 'Project slug')
  .option('-d, --desc <description>', 'Task description')
  .option('--priority <priority>', 'Priority (P0-P3)', 'P2')
  .option('-s, --status <status>', 'Initial status', 'backlog')
  .option('--assignee <id>', 'Assignee user ID')
  .option('--labels <labels>', 'Comma-separated labels')
  .option('--parent <id>', 'Parent task ID for subtask')
  .option('--json', 'Output as JSON')
  .option('--output <format>', 'Output format')
  .action(async (title, options) => {
    try {
      const project = getProject(options);
      const format = getOutputFormat(options);

      const body: Record<string, unknown> = {
        title,
        priority: options.priority,
        status: options.status,
      };
      if (options.desc) body.description = options.desc;
      if (options.assignee) body.assigneeId = options.assignee;
      if (options.labels) body.labels = options.labels.split(',').map((l: string) => l.trim());
      if (options.parent) body.parentTaskId = options.parent;

      const result = await api<any>(`/api/v1/projects/${encodeURIComponent(project)}/tasks`, {
        method: 'POST',
        body,
      });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const task = result.data;
      printSuccess(`Created task ${task.id}`);
      console.log(`  Title:    ${task.title}`);
      console.log(`  Status:   ${formatStatus(task.status)}`);
      console.log(`  Priority: ${formatPriority(task.priority)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

// task show
taskCommand
  .command('show')
  .description('Show task details')
  .argument('<id>', 'Task ID')
  .option('--json', 'Output as JSON')
  .option('--output <format>', 'Output format')
  .action(async (id, options) => {
    try {
      const format = getOutputFormat(options);
      const result = await api<any>(`/api/v1/tasks/${encodeURIComponent(id)}`);

      if (format === 'json') {
        printJson(result);
        return;
      }

      const task = result.data;
      console.log(`Task: ${task.id}`);
      console.log(`Title:       ${task.title}`);
      console.log(`Status:      ${formatStatus(task.status)}`);
      console.log(`Priority:    ${formatPriority(task.priority)}`);
      console.log(`Project:     ${task.project?.name || task.projectId}`);
      console.log(`Assignee:    ${task.assignee?.name || task.assigneeId || '—'}`);
      console.log(`Labels:      ${task.labels?.length > 0 ? task.labels.join(', ') : '—'}`);
      console.log(`Created:     ${new Date(task.createdAt).toLocaleString()}`);
      console.log(`Updated:     ${new Date(task.updatedAt).toLocaleString()}`);

      if (task.description) {
        console.log(`\nDescription:\n${task.description}`);
      }

      if (task.subtasks && task.subtasks.length > 0) {
        console.log(`\nSub-tasks (${task.subtasks.length}):`);
        for (const st of task.subtasks) {
          console.log(`  ${formatStatus(st.status)} ${st.id.slice(0, 8)} ${st.title}`);
        }
      }

      if (task.comments && task.comments.length > 0) {
        console.log(`\nComments (${task.comments.length}):`);
        for (const c of task.comments) {
          console.log(`  [${new Date(c.createdAt).toLocaleString()}] ${c.body}`);
        }
      }

      if (task.activities && task.activities.length > 0) {
        console.log(`\nRecent Activity (${task.activities.length}):`);
        for (const a of task.activities.slice(0, 10)) {
          const detail = a.fieldChanged ? ` ${a.fieldChanged}: ${a.oldValue} → ${a.newValue}` : '';
          console.log(`  ${a.action}${detail} (${new Date(a.timestamp).toLocaleString()})`);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

// task update
taskCommand
  .command('update')
  .description('Update a task')
  .argument('<id>', 'Task ID')
  .option('-s, --status <status>', 'New status')
  .option('--priority <priority>', 'New priority')
  .option('--title <title>', 'New title')
  .option('-d, --desc <description>', 'New description')
  .option('--assignee <id>', 'New assignee ID')
  .option('--labels <labels>', 'New labels (comma-separated)')
  .option('--json', 'Output as JSON')
  .option('--output <format>', 'Output format')
  .action(async (id, options) => {
    try {
      const format = getOutputFormat(options);
      const body: Record<string, unknown> = {};
      if (options.status) body.status = options.status;
      if (options.priority) body.priority = options.priority;
      if (options.title) body.title = options.title;
      if (options.desc) body.description = options.desc;
      if (options.assignee) body.assigneeId = options.assignee;
      if (options.labels) body.labels = options.labels.split(',').map((l: string) => l.trim());

      if (Object.keys(body).length === 0) {
        printError('No fields to update. Use --status, --priority, --title, etc.');
        process.exit(2);
      }

      const result = await api<any>(`/api/v1/tasks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body,
      });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const task = result.data;
      printSuccess(`Updated task ${task.id}`);
      if (options.status) console.log(`  Status:   ${formatStatus(task.status)}`);
      if (options.priority) console.log(`  Priority: ${formatPriority(task.priority)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

// task decompose (AI)
taskCommand
  .command('decompose')
  .description('AI-powered task decomposition into subtasks')
  .argument('<id>', 'Task ID to decompose')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const format = getOutputFormat(options);
      const taskResult = await api<any>(`/api/v1/tasks/${encodeURIComponent(id)}`);
      const task = taskResult.data;

      const result = await api<any>('/api/v1/ai/decompose', {
        method: 'POST',
        body: { title: task.title, description: task.description || '' },
      });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const data = result.data;
      console.log(`\nDecomposition for: ${task.title}`);
      console.log(`Reasoning: ${data.reasoning}\n`);
      printTable(
        ['#', 'TITLE', 'PRIORITY', 'ESTIMATE'],
        data.subtasks.map((st: any, i: number) => [
          String(i + 1),
          truncate(st.title, 50),
          formatPriority(st.priority),
          st.estimate,
        ]),
      );
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

// task context (AI)
taskCommand
  .command('context')
  .description('AI-powered context assembly for a task')
  .argument('<id>', 'Task ID')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const format = getOutputFormat(options);
      const result = await api<any>(`/api/v1/ai/context/${encodeURIComponent(id)}`, { method: 'POST' });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const data = result.data;
      console.log(`\nSummary: ${data.summary}`);
      console.log(`\nKey Points:`);
      for (const p of data.keyPoints) console.log(`  • ${p}`);
      console.log(`\nSuggested Approach: ${data.suggestedApproach}`);
      if (data.risks.length > 0) {
        console.log(`\nRisks:`);
        for (const r of data.risks) console.log(`  ⚠ ${r}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

// task comment
taskCommand
  .command('comment')
  .description('Add a comment to a task')
  .argument('<id>', 'Task ID')
  .argument('<text>', 'Comment text')
  .option('--json', 'Output as JSON')
  .option('--output <format>', 'Output format')
  .action(async (id, text, options) => {
    try {
      const format = getOutputFormat(options);
      const result = await api<any>(`/api/v1/tasks/${encodeURIComponent(id)}/comments`, {
        method: 'POST',
        body: { body: text },
      });

      if (format === 'json') {
        printJson(result);
        return;
      }

      printSuccess(`Comment added to task ${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });
