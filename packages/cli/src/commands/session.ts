import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getOutputFormat, printJson, printTable, printSuccess, printError, truncate } from '../lib/output';

export const sessionCommand = new Command('session')
  .description('Manage agent work sessions');

// session start
sessionCommand
  .command('start')
  .description('Start a new agent work session')
  .option('--name <name>', 'Agent name')
  .option('--tasks <ids>', 'Comma-separated task IDs to work on')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const format = getOutputFormat(options);
      const body: Record<string, unknown> = {};
      if (options.name) body.agentName = options.name;
      if (options.tasks) body.tasks = options.tasks.split(',').map((t: string) => t.trim());

      const result = await api<any>('/api/v1/sessions', { method: 'POST', body });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const session = result.data;
      printSuccess(`Session started: ${session.id}`);
      console.log(`  Agent:   ${session.agentName}`);
      console.log(`  Started: ${new Date(session.startedAt).toLocaleString()}`);
      if (session.tasksTouched?.length > 0) {
        console.log(`  Tasks:   ${session.tasksTouched.join(', ')}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

// session end
sessionCommand
  .command('end')
  .description('End an agent work session')
  .argument('<id>', 'Session ID')
  .option('--summary <text>', 'Session summary')
  .option('--tasks <ids>', 'Additional task IDs touched')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const format = getOutputFormat(options);
      const body: Record<string, unknown> = {};
      if (options.summary) body.summary = options.summary;
      if (options.tasks) body.tasksTouched = options.tasks.split(',').map((t: string) => t.trim());

      const result = await api<any>(`/api/v1/sessions/${encodeURIComponent(id)}`, { method: 'PATCH', body });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const session = result.data;
      printSuccess(`Session ended: ${session.id}`);
      if (session.summary) console.log(`  Summary: ${session.summary}`);
      console.log(`  Duration: ${formatDuration(new Date(session.startedAt), new Date(session.endedAt))}`);
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

// session list
sessionCommand
  .command('list')
  .description('List agent sessions')
  .option('--json', 'Output as JSON')
  .option('--limit <n>', 'Limit results', '20')
  .action(async (options) => {
    try {
      const format = getOutputFormat(options);
      const result = await api<any>('/api/v1/sessions', { params: { limit: options.limit } });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const sessions = result.data || [];
      printTable(
        ['ID', 'AGENT', 'STARTED', 'ENDED', 'TASKS', 'SUMMARY'],
        sessions.map((s: any) => [
          s.id.slice(0, 8),
          truncate(s.agentName, 20),
          new Date(s.startedAt).toLocaleString(),
          s.endedAt ? new Date(s.endedAt).toLocaleString() : 'active',
          String(s.tasksTouched?.length ?? 0),
          truncate(s.summary || '—', 30),
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

// session show
sessionCommand
  .command('show')
  .description('Show session details')
  .argument('<id>', 'Session ID')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const format = getOutputFormat(options);
      const result = await api<any>(`/api/v1/sessions/${encodeURIComponent(id)}`);

      if (format === 'json') {
        printJson(result);
        return;
      }

      const s = result.data;
      console.log(`Session:  ${s.id}`);
      console.log(`Agent:    ${s.agentName}`);
      console.log(`User:     ${s.user?.name || s.userId}`);
      console.log(`Started:  ${new Date(s.startedAt).toLocaleString()}`);
      console.log(`Ended:    ${s.endedAt ? new Date(s.endedAt).toLocaleString() : 'active'}`);
      console.log(`Tasks:    ${s.tasksTouched?.length > 0 ? s.tasksTouched.join(', ') : '—'}`);
      if (s.summary) console.log(`Summary:  ${s.summary}`);
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}
