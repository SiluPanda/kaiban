import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getOutputFormat, printJson, printTable, printError, formatPriority, formatStatus, truncate } from '../lib/output';

export const searchCommand = new Command('search')
  .description('Full-text search across tasks')
  .argument('<query>', 'Search query')
  .option('--json', 'Output as JSON')
  .option('--output <format>', 'Output format: json, table, minimal')
  .option('--limit <n>', 'Limit results', '20')
  .option('--offset <n>', 'Offset results', '0')
  .action(async (query, options) => {
    try {
      const format = getOutputFormat(options);
      const result = await api<any>('/api/v1/search', {
        params: { q: query, limit: options.limit, offset: options.offset },
      });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const tasks = result.data || [];
      if (format === 'minimal') {
        for (const t of tasks) {
          console.log(`${t.id}\t${t.title}`);
        }
        return;
      }

      printTable(
        ['ID', 'TITLE', 'STATUS', 'PRIORITY'],
        tasks.map((t: any) => [
          t.id.slice(0, 8),
          truncate(t.title, 50),
          formatStatus(t.status),
          formatPriority(t.priority),
        ]),
      );

      if (result.meta) {
        console.log(`\n${result.meta.total} result(s) for "${query}"`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });
