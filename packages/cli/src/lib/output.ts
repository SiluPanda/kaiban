import chalk from 'chalk';

export type OutputFormat = 'table' | 'json' | 'minimal';

export function getOutputFormat(options: { json?: boolean; output?: string }): OutputFormat {
  if (options.json) return 'json';
  if (options.output) return options.output as OutputFormat;
  return 'table';
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(headers: string[], rows: string[][]): void {
  if (rows.length === 0) {
    console.log(chalk.dim('No results.'));
    return;
  }

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxRow = Math.max(...rows.map((r) => (r[i] || '').length));
    return Math.max(h.length, maxRow);
  });

  // Print header
  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  console.log(chalk.bold(headerLine));
  console.log(chalk.dim('─'.repeat(headerLine.length)));

  // Print rows
  for (const row of rows) {
    const line = row.map((cell, i) => (cell || '').padEnd(widths[i])).join('  ');
    console.log(line);
  }
}

export function printSuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function printError(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function formatPriority(priority: string): string {
  switch (priority) {
    case 'P0': return chalk.red.bold('P0');
    case 'P1': return chalk.yellow.bold('P1');
    case 'P2': return chalk.blue('P2');
    case 'P3': return chalk.dim('P3');
    default: return priority;
  }
}

export function formatStatus(status: string): string {
  switch (status) {
    case 'backlog': return chalk.dim(status);
    case 'todo': return chalk.cyan(status);
    case 'in_progress': return chalk.yellow(status);
    case 'in_review': return chalk.magenta(status);
    case 'done': return chalk.green(status);
    case 'cancelled': return chalk.red.strikethrough(status);
    default: return status;
  }
}

export function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
