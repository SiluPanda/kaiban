<p align="center">
  <h1 align="center">Pith</h1>
  <p align="center">Task management where AI agents and humans are equal teammates.</p>
</p>

<p align="center">
  <a href="#quick-start"><strong>Quick Start</strong></a> &middot;
  <a href="#connect-your-ai-agent"><strong>Connect Your Agent</strong></a> &middot;
  <a href="#cli"><strong>CLI</strong></a> &middot;
  <a href="#web-ui"><strong>Web UI</strong></a> &middot;
  <a href="#api"><strong>API</strong></a> &middot;
  <a href="#ai-features"><strong>AI Features</strong></a>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/PostgreSQL-16%2B-336791" alt="PostgreSQL 16+">
  <img src="https://img.shields.io/badge/MCP-Native-purple" alt="MCP Native">
</p>

---

<p align="center">
  <img src="docs/screenshots/pith-demo.gif" alt="Pith — Board view, list view, task details, and agent activity" width="720">
</p>

AI coding agents do real engineering work — they read specs, write code, fix bugs, and submit PRs. But they're blind to the project's task board. Every context switch requires a human to copy-paste task details, update statuses, and relay decisions.

**Pith fixes this.** It's an open-source task management system where agents can read tasks, update progress, log work, and create sub-tasks — the same way humans do, but through APIs and MCP instead of a browser.

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/SiluPanda/pith.git
cd pith/docker
docker compose up
```

The API is ready at `http://localhost:3456`. Check it with `curl http://localhost:3456/health`.

### Without Docker

Requires Node.js 20+ and PostgreSQL 16+.

```bash
git clone https://github.com/SiluPanda/pith.git
cd pith
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
npm install
npm run db:migrate
npm run dev
```

### Create your first user and project

```bash
# Seed sample data (creates admin user, project, and example tasks)
npm run db:seed

# Or use the API directly:
curl -X POST http://localhost:3456/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "email": "admin@example.com", "role": "admin"}'
# Save the apiKey from the response — it's shown only once
```

## Connect Your AI Agent

Pith is a native [MCP](https://modelcontextprotocol.io/) tool server. Any MCP-compatible client — Claude Code, Claude Desktop, Cursor, Windsurf, or custom agents — works out of the box.

### Setup

Add to your MCP client config (e.g. `.mcp.json`):

```json
{
  "mcpServers": {
    "pith": {
      "command": "npx",
      "args": ["-y", "@pith/mcp-server"],
      "env": {
        "PITH_URL": "http://localhost:3456",
        "PITH_API_KEY": "kb_your_api_key_here"
      }
    }
  }
}
```

### What your agent can do

| Tool | What it does |
|------|-------------|
| `list_tasks` | Query tasks with filters — status, priority, assignee, labels, free-text search |
| `get_task` | Get full task details including comments, sub-tasks, and activity history |
| `create_task` | Create a task with title, description, priority, labels |
| `update_task` | Change status, priority, assignee, or any other field |
| `add_comment` | Post a Markdown comment on a task |
| `create_subtasks` | Break a task into sub-tasks (up to 20 at once) |
| `search_tasks` | Full-text search across all tasks |
| `get_my_tasks` | See what's assigned to the current agent |
| `get_context` | Get rich context — parent task, siblings, recent activity |
| `start_session` / `end_session` | Track work sessions with summaries |

Your agent also gets read access to live resources:

- `pith://project/{slug}/board` — Current board state by status column
- `pith://project/{slug}/backlog` — Full backlog with priorities
- `pith://task/{id}/context` — Complete task context for deep work
- `pith://user/{id}/workload` — Current assignment load

### Example: autonomous coding agent workflow

```
1. Agent calls get_my_tasks          → sees "Fix auth middleware" assigned to it
2. Agent calls get_context           → reads task details, parent task, recent comments
3. Agent calls start_session         → begins tracked work session
4. Agent writes code, runs tests     → (happens outside Pith)
5. Agent calls update_task           → moves status to "in_review"
6. Agent calls add_comment           → posts summary + PR link
7. Agent calls end_session           → records what it accomplished
```

No human had to copy-paste context or update the board.

## CLI

Install globally or use via npx:

```bash
npx @pith/cli init --url http://localhost:3456 --key kb_your_key --project my-project
```

### Managing tasks

```bash
# List tasks with filters
pith task list --status todo --priority P0

# Create a task
pith task create "Implement rate limiting" --priority P1 --labels security,api

# View task details with comments and activity
pith task show <task-id>

# Update status
pith task update <task-id> --status in_progress

# Add a comment
pith task comment <task-id> "Started work, ETA 2 hours"

# Search across all tasks
pith search "authentication bug"
```

### Agent sessions

```bash
pith session start --name "Claude Code" --tasks <task-id-1>,<task-id-2>
# ... do work ...
pith session end <session-id> --summary "Fixed auth bug and added tests"
pith session list
```

### Machine-readable output

Every command supports `--json` for piping into scripts:

```bash
pith task list --status todo --json | jq '.[].title'
```

## Web UI

Pith includes a lightweight web interface at `http://localhost:5173` (dev mode) or served by the API in production.

- **Board view** — Kanban-style columns by status
- **List view** — Sortable table with filters
- **Task detail** — Full context with comments, sub-tasks, and activity timeline
- **Agent activity feed** — Review what your AI agents have been working on
- **Session review** — Inspect individual agent work sessions

Start the dev server:

```bash
cd packages/web
npm run dev
```

## API

Full REST API with OpenAPI/Swagger documentation at `/docs` (development mode).

### Authentication

Every request requires a `Bearer` token — either an API key or a JWT access token:

```bash
# Using an API key
curl -H "Authorization: Bearer kb_your_api_key" http://localhost:3456/api/v1/projects

# Using JWT (get tokens via login)
curl -X POST http://localhost:3456/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "apiKey": "kb_your_api_key"}'
```

### Key endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/projects` | List projects |
| `POST` | `/api/v1/projects` | Create project (admin) |
| `GET` | `/api/v1/projects/:slug/tasks` | List tasks with filters |
| `POST` | `/api/v1/projects/:slug/tasks` | Create task |
| `GET` | `/api/v1/tasks/:id` | Get task with full context |
| `PATCH` | `/api/v1/tasks/:id` | Update task fields |
| `POST` | `/api/v1/tasks/:id/comments` | Add comment |
| `POST` | `/api/v1/tasks/:id/subtasks` | Batch create sub-tasks |
| `GET` | `/api/v1/search?q=...` | Full-text search |
| `POST` | `/api/v1/sessions` | Start agent session |
| `GET` | `/api/v1/projects/:slug/analytics` | Project analytics |

Full reference: [docs/api-reference.md](docs/api-reference.md)

### Roles

| Role | Can do |
|------|--------|
| **admin** | Everything — manage users, projects, webhooks, tenants |
| **member** | Create/update tasks, add comments, view projects |
| **agent** | Same as member — designed for AI agent API keys |

### Webhooks

Get notified when things happen in your project:

```bash
curl -X POST http://localhost:3456/api/v1/projects/my-project/webhooks \
  -H "Authorization: Bearer kb_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-server.com/webhook", "events": ["task.created", "task.updated"]}'
```

Events: `task.created`, `task.updated`, `task.deleted`, `comment.created`, `session.started`, `session.ended`, `project.created`, `*`

Payloads are signed with HMAC-SHA256 via the `X-Pith-Signature` header.

### Slack & Discord notifications

```bash
curl -X POST http://localhost:3456/api/v1/projects/my-project/notifications \
  -H "Authorization: Bearer kb_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"provider": "slack", "name": "dev-channel", "webhookUrl": "https://hooks.slack.com/...", "events": ["task.created", "task.status_changed"]}'
```

## AI Features

AI features are **optional**. Pith works fully without any AI model configured. When configured, AI enhances — never blocks — your workflow.

### Configure a provider

```bash
# Via CLI
pith config set ai.provider anthropic
pith config set ai.model claude-sonnet-4-20250514
pith config set ai.apiKey sk-ant-...

# Or via environment variables
export PITH_AI_PROVIDER=anthropic      # anthropic, openai, google, groq, ollama
export PITH_AI_MODEL=claude-sonnet-4-20250514
export PITH_AI_API_KEY=sk-ant-...
export PITH_AI_BASE_URL=               # optional, for self-hosted models
```

Supports any provider via Vercel AI SDK: Anthropic, OpenAI, Google, Groq, OpenRouter, and Ollama for local models.

### What AI can do

- **Decompose tasks** — Break a large task into actionable sub-tasks with estimates
- **Triage** — Auto-suggest priority and labels for new tasks
- **Context assembly** — Build a briefing document with key points and risks for an agent starting work
- **Effort estimation** — Suggest time estimates based on historical project data
- **Sprint summaries** — Generate project summaries from activity data
- **Duplicate detection** — Flag similar tasks using pg_trgm similarity

```bash
# Decompose from CLI
pith task decompose <task-id>

# Get AI-assembled context
pith task context <task-id>

# Via API
curl -X POST http://localhost:3456/api/v1/ai/triage \
  -H "Authorization: Bearer kb_..." \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix memory leak in worker pool", "description": "Workers are not being cleaned up..."}'
```

## Multi-Tenant Mode

Pith supports multi-tenant SaaS deployments with isolated workspaces:

```bash
curl -X POST http://localhost:3456/api/v1/tenants \
  -H "Authorization: Bearer kb_admin_key" \
  -H "Content-Type: application/json" \
  -d '{"slug": "acme-corp", "name": "Acme Corp", "plan": "pro"}'
```

Each tenant gets configurable user and project limits.

## Configuration Reference

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes (production) | `postgres://postgres:postgres@localhost:5432/pith` | PostgreSQL connection string |
| `JWT_SECRET` | Yes (production) | dev fallback | Secret for signing JWT tokens |
| `PORT` | No | `3456` | API server port |
| `HOST` | No | `0.0.0.0` | API server bind address |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `PITH_AI_PROVIDER` | No | — | AI provider name |
| `PITH_AI_MODEL` | No | — | AI model identifier |
| `PITH_AI_API_KEY` | No | — | AI provider API key |
| `GITHUB_WEBHOOK_SECRET` | No | — | Secret for verifying GitHub webhook signatures |

## Project Structure

```
packages/
  core/           Shared types, Zod schemas, constants
  db/             PostgreSQL schema, migrations, seed data (Drizzle ORM)
  server/         REST API — Fastify, auth, RBAC, webhooks, analytics
  ai/             AI integration layer (Vercel AI SDK, provider-agnostic)
  mcp-server/     MCP tool server (stdio + HTTP transports)
  cli/            Command-line interface (Commander.js)
  web/            Web UI (React + Vite)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

```bash
git clone https://github.com/SiluPanda/pith.git
cd pith
npm install
npm run db:migrate
npm test            # 146 tests
npm run dev         # Start API server with hot reload
```

## License

[MIT](LICENSE)
