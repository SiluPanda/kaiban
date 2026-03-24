import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getOutputFormat, printJson, printTable, printError, truncate } from '../lib/output';

export const projectCommand = new Command('project')
  .description('Manage projects');

projectCommand
  .command('list')
  .description('List all projects')
  .option('--json', 'Output as JSON')
  .option('--output <format>', 'Output format: json, table, minimal')
  .option('--limit <n>', 'Limit results', '20')
  .option('--offset <n>', 'Offset results', '0')
  .action(async (options) => {
    try {
      const format = getOutputFormat(options);
      const result = await api<any>('/api/v1/projects', {
        params: { limit: options.limit, offset: options.offset },
      });

      if (format === 'json') {
        printJson(result);
        return;
      }

      const projects = result.data || [];
      if (format === 'minimal') {
        for (const p of projects) {
          console.log(`${p.slug}\t${p.name}`);
        }
        return;
      }

      printTable(
        ['SLUG', 'NAME', 'DESCRIPTION', 'CREATED'],
        projects.map((p: any) => [
          p.slug,
          p.name,
          truncate(p.description || '', 40),
          new Date(p.createdAt).toLocaleDateString(),
        ]),
      );

      if (result.meta) {
        console.log(`\nShowing ${projects.length} of ${result.meta.total} projects`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        printError(`${err.code}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });
