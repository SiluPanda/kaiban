# CLAUDE.md — Pith Agent Instructions

This file provides context for AI agents (Claude Code, Cursor, etc.) working on the Pith codebase.

## Project Overview

Pith is an AI-native task management system. Monorepo with 7 packages:

- `packages/core` — Shared Zod schemas, types, and constants
- `packages/db` — Drizzle ORM schema, migrations, PostgreSQL client
- `packages/server` — Fastify API server (all routes, auth, middleware)
- `packages/ai` — Vercel AI SDK integration (optional AI features)
- `packages/mcp-server` — MCP server (stdio + HTTP transports)
- `packages/cli` — Commander.js CLI
- `packages/web` — React + Vite web UI

## Key Commands

```bash
npm install          # Install all dependencies
npm run dev          # Start API server (port 3456)
npm test             # Run all tests (128 tests)
npm run db:migrate   # Run database migrations (from packages/db/)
npm run db:seed      # Seed sample data
```

## Architecture

- **API**: Fastify with Zod validation, JWT + API key auth, RBAC
- **Database**: PostgreSQL 16+ via Drizzle ORM
- **MCP**: @modelcontextprotocol/sdk with stdio and HTTP/SSE transports
- **AI**: Vercel AI SDK, provider-agnostic, graceful degradation
- **Testing**: Vitest + Fastify inject (no Supertest needed)

## Database

Connection via `DATABASE_URL` env var. Tables: users, projects, tasks, comments, activities, agent_sessions, labels, views, webhooks, webhook_deliveries, task_links, time_entries.

## Testing

Tests are in `packages/server/src/__tests__/` and `packages/mcp-server/src/__tests__/`. Run with `npm test`. Tests use a real PostgreSQL database (no mocks). The `cleanDatabase()` helper truncates all tables between test groups.

## Code Patterns

- Routes are in `packages/server/src/routes/` as Fastify plugins
- Response format: `success(data)`, `paginated(items, total, limit, offset)`, `error(code, message)`
- Auth: `authenticate` hook + `authorize(...roles)` for RBAC
- All list endpoints support pagination via `limit` and `offset` query params
- Activity logging on task mutations (status_changed, priority_changed, assigned, etc.)

## When Adding Features

1. Add Zod schema in `packages/core/src/schemas/`
2. Add DB schema in `packages/db/src/schema/`
3. Add route in `packages/server/src/routes/`
4. Register route in `packages/server/src/app.ts`
5. Add tests in `packages/server/src/__tests__/api.test.ts`
6. Run `npm test` to verify
