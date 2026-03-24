import { Command } from 'commander';
import { loadConfig, saveConfig } from '../lib/config';
import { printSuccess, printError } from '../lib/output';

export const configCommand = new Command('config')
  .description('Manage Pith CLI configuration');

// config show
configCommand
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig();
    console.log(`API URL:     ${config.apiUrl}`);
    console.log(`API Key:     ${config.apiKey ? config.apiKey.slice(0, 8) + '...' : '(not set)'}`);
    console.log(`Project:     ${config.project || '(not set)'}`);
  });

// config set
configCommand
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Config key (apiUrl, apiKey, project, ai.provider, ai.model, ai.apiKey, ai.baseUrl)')
  .argument('<value>', 'Config value')
  .option('-g, --global', 'Save to global config (~/.pithrc)')
  .action((key, value, options) => {
    const configMap: Record<string, string> = {
      'apiUrl': 'apiUrl',
      'apiKey': 'apiKey',
      'project': 'project',
      'ai.provider': 'aiProvider',
      'ai.model': 'aiModel',
      'ai.apiKey': 'aiApiKey',
      'ai.baseUrl': 'aiBaseUrl',
    };

    const mappedKey = configMap[key];
    if (!mappedKey) {
      printError(`Unknown config key: ${key}. Valid keys: ${Object.keys(configMap).join(', ')}`);
      process.exit(2);
    }

    saveConfig({ [mappedKey]: value } as any, options.global);
    printSuccess(`Set ${key} = ${key.includes('Key') ? value.slice(0, 8) + '...' : value}`);
  });

// config get
configCommand
  .command('get')
  .description('Get a configuration value')
  .argument('<key>', 'Config key (apiUrl, apiKey, project)')
  .action((key) => {
    const config = loadConfig();
    if (!Object.prototype.hasOwnProperty.call(config, key)) {
      printError(`Unknown key: ${key}. Valid keys: apiUrl, apiKey, project`);
      process.exit(1);
    }
    const val = config[key as keyof typeof config];
    if (val !== undefined) {
      console.log(val);
    } else {
      printError(`Key "${key}" is not set`);
      process.exit(1);
    }
  });
