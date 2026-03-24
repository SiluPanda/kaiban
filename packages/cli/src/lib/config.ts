import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface KaibanConfig {
  apiUrl: string;
  apiKey: string;
  project?: string;
}

const CONFIG_FILE = '.kaibanrc';

function getConfigPaths(): string[] {
  return [
    join(process.cwd(), CONFIG_FILE),
    join(homedir(), CONFIG_FILE),
  ];
}

export function loadConfig(): KaibanConfig {
  // Environment variables take precedence
  const envUrl = process.env.KAIBAN_URL;
  const envKey = process.env.KAIBAN_API_KEY;
  const envProject = process.env.KAIBAN_PROJECT;

  // Try to load from config file
  for (const path of getConfigPaths()) {
    if (existsSync(path)) {
      try {
        const raw = readFileSync(path, 'utf-8');
        const config = JSON.parse(raw) as Partial<KaibanConfig>;
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

export function saveConfig(config: Partial<KaibanConfig>, global = false): void {
  const path = global
    ? join(homedir(), CONFIG_FILE)
    : join(process.cwd(), CONFIG_FILE);

  let existing: Partial<KaibanConfig> = {};
  if (existsSync(path)) {
    try {
      existing = JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      // Overwrite invalid config
    }
  }

  const merged = { ...existing, ...config };
  writeFileSync(path, JSON.stringify(merged, null, 2) + '\n');
}
