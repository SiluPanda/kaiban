import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

let client: Client;
let transport: StdioClientTransport;

const EXPECTED_TOOLS = [
  'list_projects',
  'get_project',
  'list_tasks',
  'get_task',
  'create_task',
  'update_task',
  'add_comment',
  'create_subtasks',
  'search_tasks',
  'get_my_tasks',
  'start_session',
  'end_session',
  'get_context',
];

const EXPECTED_RESOURCE_TEMPLATES = [
  'pith://project/{slug}/board',
  'pith://project/{slug}/backlog',
  'pith://task/{id}/context',
  'pith://user/{id}/workload',
];

beforeAll(async () => {
  const serverPath = path.resolve(import.meta.dirname, '../index.ts');

  transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', serverPath],
    env: {
      ...process.env,
      PITH_URL: 'http://localhost:3456',
      PITH_API_KEY: 'test',
    },
  });

  client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(transport);
});

afterAll(async () => {
  await client.close();
});

describe('MCP Server', () => {
  it('registers all expected tools', async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map(t => t.name);

    for (const expected of EXPECTED_TOOLS) {
      expect(toolNames).toContain(expected);
    }
    expect(toolNames.length).toBe(EXPECTED_TOOLS.length);
  });

  it('each tool has a description and input schema', async () => {
    const result = await client.listTools();

    for (const tool of result.tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('registers all expected resource templates', async () => {
    const result = await client.listResourceTemplates();
    const templates = result.resourceTemplates.map(r => r.uriTemplate);

    for (const expected of EXPECTED_RESOURCE_TEMPLATES) {
      expect(templates).toContain(expected);
    }
  });

  it('start_session tool returns session info', async () => {
    const result = await client.callTool({ name: 'start_session', arguments: { tasks: ['task-1'] } });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].type).toBe('text');
    const data = JSON.parse(content[0].text);
    expect(data.message).toBe('Session started');
    expect(data.tasks).toEqual(['task-1']);
    expect(data.startedAt).toBeDefined();
  });

  it('end_session tool returns session summary', async () => {
    const result = await client.callTool({ name: 'end_session', arguments: { summary: 'Done testing' } });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.message).toBe('Session ended');
    expect(data.summary).toBe('Done testing');
  });
});

describe('MCP HTTP Server', () => {
  let httpProcess: ChildProcess;
  const port = 3199;

  beforeAll(async () => {
    const httpPath = path.resolve(import.meta.dirname, '../http.ts');
    httpProcess = spawn('npx', ['tsx', httpPath], {
      env: { ...process.env, MCP_PORT: String(port), PITH_URL: 'http://localhost:3456', PITH_API_KEY: '' },
      stdio: 'pipe',
    });
    // Wait for server to start
    await new Promise<void>((resolve) => {
      httpProcess.stdout?.on('data', (data: Buffer) => {
        if (data.toString().includes('listening')) resolve();
      });
      setTimeout(resolve, 3000);
    });
  });

  afterAll(() => {
    httpProcess?.kill();
  });

  it('health endpoint returns ok', async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.transport).toBe('http');
  });

  it('returns 404 for unknown paths', async () => {
    const res = await fetch(`http://localhost:${port}/unknown`);
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated requests when API key is set', async () => {
    // Start a separate server with API key
    const authPath = path.resolve(import.meta.dirname, '../http.ts');
    const authPort = 3198;
    const authProcess = spawn('npx', ['tsx', authPath], {
      env: { ...process.env, MCP_PORT: String(authPort), PITH_API_KEY: 'test-secret' },
      stdio: 'pipe',
    });
    await new Promise<void>((resolve) => {
      authProcess.stdout?.on('data', (data: Buffer) => {
        if (data.toString().includes('listening')) resolve();
      });
      setTimeout(resolve, 3000);
    });

    try {
      const res = await fetch(`http://localhost:${authPort}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(res.status).toBe(401);
    } finally {
      authProcess.kill();
    }
  });
});
