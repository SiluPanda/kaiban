#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { projectCommand } from './commands/project';
import { taskCommand } from './commands/task';
import { searchCommand } from './commands/search';

const program = new Command();

program
  .name('pith')
  .description('AI-Native Task Management CLI')
  .version('0.0.1');

program.addCommand(initCommand);
program.addCommand(projectCommand);
program.addCommand(taskCommand);
program.addCommand(searchCommand);

program.parse();
