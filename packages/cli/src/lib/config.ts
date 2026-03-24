import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface PithConfig {
  apiUrl: string;
  apiKey: string;
  project?: string;
}

const CONFIG_FILE = '.pithrc';

function getConfigPaths(): string[] {
  return [
    join(process.cwd(), CONFIG_FILE),
    join(homedir(), CONFIG_FILE),
  ];
}

export function loadConfig(): PithConfig {
  // Environment variables take precedence
  const envUrl = process.env.PITH_URL;
  const envKey = process.env.PITH_API_KEY;
  const envProject = process.env.PITH_PROJECT;

  // Try to load from config file
  for (const path of getConfigPaths()) {
    if (existsSync(path)) {
      try {
        const raw = readFileSync(path, 'utf-8');
        const config = JSON.parse(raw) as Partial<PithConfig>;
        return {
          apiUrl: envUrl || config.apiUrl || 'http://localhost:3456',
          apiKey: envKey || config.apiKey || '',
          project: envProject || config.project,
        };
      } catch {
        // Invalid config file, continue to next
      }
    }
  }

  return {
    apiUrl: envUrl || 'http://localhost:3456',
    apiKey: envKey || '',
    project: envProject,
  };
}

export function saveConfig(config: Partial<PithConfig>, global = false): void {
  const path = global
    ? join(homedir(), CONFIG_FILE)
    : join(process.cwd(), CONFIG_FILE);

  let existing: Partial<PithConfig> = {};
  if (existsSync(path)) {
    try {
      existing = JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      // Overwrite invalid config
    }
  }

  const merged = { ...existing, ...config };
  writeFileSync(path, JSON.stringify(merged, null, 2) + '\n', { mode: 0o600 });
}
