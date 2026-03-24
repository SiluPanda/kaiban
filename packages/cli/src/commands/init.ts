import { Command } from 'commander';
import { saveConfig } from '../lib/config';
import { printSuccess } from '../lib/output';

export const initCommand = new Command('init')
  .description('Initialize Pith in current directory')
  .option('--url <url>', 'API server URL', 'http://localhost:3456')
  .option('--key <key>', 'API key')
  .option('--project <slug>', 'Default project slug')
  .option('--global', 'Save to home directory instead of current directory')
  .action((options) => {
    saveConfig(
      {
        apiUrl: options.url,
        apiKey: options.key || '',
        project: options.project,
      },
      options.global,
    );
    printSuccess(`Pith config written to ${options.global ? '~/' : './'}.pithrc`);
  });
