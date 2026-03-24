#!/usr/bin/env node
import { createServer as createHttpServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

const PORT = parseInt(process.env.MCP_PORT || '3100', 10);
const API_KEY = process.env.PITH_API_KEY || '';
const MAX_SESSIONS = 100;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

if (!API_KEY) {
  console.warn('WARNING: PITH_API_KEY is not set. MCP HTTP server has no authentication.');
}

const sessions = new Map<string, { server: ReturnType<typeof createServer>; transport: StreamableHTTPServerTransport; timer: ReturnType<typeof setTimeout> }>();

const httpServer = createHttpServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', transport: 'http', sessions: sessions.size }));
    return;
  }

  // Only handle /mcp
  if (url.pathname !== '/mcp') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  // Bearer token auth
  if (API_KEY) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const tokenBuf = Buffer.from(token);
    const keyBuf = Buffer.from(API_KEY);
    if (!token || tokenBuf.length !== keyBuf.length || !timingSafeEqual(tokenBuf, keyBuf)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  // Check for existing session
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
    return;
  }

  // New session for initialization requests
  if (req.method === 'POST' && !sessionId) {
    if (sessions.size >= MAX_SESSIONS) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many active sessions' }));
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const server = createServer();
    await server.connect(transport);

    // Store session on successful init
    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        const session = sessions.get(sid);
        if (session) clearTimeout(session.timer);
        sessions.delete(sid);
      }
    };

    await transport.handleRequest(req, res);

    const sid = transport.sessionId;
    if (sid) {
      const timer = setTimeout(() => {
        sessions.delete(sid);
        transport.close?.();
      }, SESSION_TTL_MS);
      sessions.set(sid, { server, transport, timer });
    }
    return;
  }

  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Bad Request: missing or invalid session' }));
});

httpServer.listen(PORT, () => {
  console.log(`MCP HTTP server listening on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/mcp`);
});
