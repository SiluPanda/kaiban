# Pith — Product Specification

**AI-Native Task Management for Humans & Agents**

Version 1.0 · March 2026
Open Source · Self-Hosted · MCP-First · CLI-Native

Tech Stack: Node.js · PostgreSQL · Drizzle ORM · Fastify · Zod · Vercel AI SDK
License: MIT · Bring Your Own Model & API Key

---

## 1. Executive Summary

Pith is an open-source, self-hosted task management system built from the ground up for a world where AI agents are first-class team members. Unlike existing tools (Jira, Linear, Plane) that bolt AI onto traditional human-centric workflows, Pith treats AI agents and humans as equal participants with a unified interface: a REST API, a CLI, and MCP (Model Context Protocol) tool servers.

The core thesis: in 2026 and beyond, most engineering work will be co-performed by humans and AI coding agents (Claude Code, Codex, Devin, custom agents). These agents need to read tasks, update status, log work, create sub-tasks, and query project state — without a browser. Pith provides the infrastructure for this workflow natively.

### Key Differentiators

- **Dual-citizen design**: Every feature works equally well for humans (via web UI) and AI agents (via MCP/CLI/API).
- **MCP-native**: Ships as a first-class MCP server. Any MCP-compatible client (Claude Code, Claude Desktop, Cursor, Windsurf, custom agents) can manage tasks out of the box.
- **CLI-first**: A powerful CLI (`pith`) that AI coding agents can invoke directly from terminal sessions.
- **AI-powered, not AI-dependent**: AI features (summarization, decomposition, prioritization) are optional. The tool works perfectly without any AI model configured.
- **BYOM (Bring Your Own Model)**: Users configure their own AI provider and API key. Supports any provider via Vercel AI SDK — OpenAI, Anthropic, Google, Groq, Ollama, etc.
- **Minimal and opinionated**: Deliberately avoids Jira's complexity. No 47 issue types, no Scrum-vs-Kanban religious wars. Simple primitives that compose well.

---

## 2. Problem Statement

The rise of AI coding agents has exposed a fundamental gap in the project management toolchain:

### 2.1 The Agent Access Problem

AI agents (Claude Code, GitHub Copilot Workspace, Codex, custom automation) are increasingly performing real engineering work — writing code, fixing bugs, running tests. But they operate blind to the project's task graph. An agent writing code doesn't know what task it's working on, what the acceptance criteria are, or what related tasks exist. Context is copy-pasted by humans.

### 2.2 The Integration Tax

Every team building with AI agents ends up writing custom glue code to bridge their task tracker and their agent workflows. This is the same N×M integration problem that MCP was designed to solve, but for project management specifically.

### 2.3 The Complexity Trap

Existing open-source alternatives (Plane, OpenProject, Redmine, Taiga) replicate Jira's complexity. They're designed for humans clicking through UIs, with APIs as afterthoughts. None were designed with agents as a primary user persona.

### 2.4 The Vendor Lock-in Problem

AI-native features in commercial tools (Linear, DevRev) lock you into specific AI providers. Teams want to use their own models, their own API keys, and run everything on their own infrastructure.

---

## 3. System Architecture

### 3.1 High-Level Architecture

Pith follows a layered architecture with clear separation between the data layer, business logic, integration layer, and presentation surfaces.

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Data | PostgreSQL 16+ | Tasks, projects, users, activity log, full-text search via pg_trgm |
| ORM / Query | Drizzle ORM | Type-safe schema, migrations, query builder |
| API | Fastify + Zod | REST endpoints with schema validation and auto-generated Swagger docs |
| AI Layer | Vercel AI SDK | Model-agnostic LLM calls for optional AI features |
| MCP Server | @modelcontextprotocol/sdk | Exposes Pith as an MCP tool server (stdio + HTTP/SSE) |
| CLI | Commander.js | Terminal interface for humans and agents |
| Web UI | React + Vite (optional) | Lightweight board/list view for human users |
| Auth | API Keys + JWT | Simple, agent-friendly authentication |

### 3.2 Deployment Model

Pith is designed for self-hosting with minimal operational overhead:

- **Docker Compose (recommended)**: Single `docker compose up` brings up the API server, Postgres, and optionally the web UI. Target: under 512MB RAM for small teams.
- **Bare metal / VM**: Node.js 20+ and PostgreSQL 16+ are the only dependencies. No Redis, no message queue, no Elasticsearch.

### 3.3 Database Schema (Core Entities)

The schema is deliberately minimal. Complex workflows are built by composing simple primitives.

| Entity | Key Fields |
|--------|-----------|
| Project | id, slug, name, description, default_status_flow, settings (JSONB), created_at |
| Task | id, project_id, title, description (Markdown), status, priority, assignee_id, assignee_type (human\|agent), parent_task_id, labels[], estimate, due_date, metadata (JSONB), created_by, created_by_type |
| Comment | id, task_id, body (Markdown), author_id, author_type (human\|agent), created_at |
| Activity | id, task_id, actor_id, actor_type, action (enum), field_changed, old_value, new_value, timestamp |
| User | id, name, email, api_key_hash, role (admin\|member\|agent), created_at |
| AgentSession | id, user_id, agent_name, started_at, ended_at, tasks_touched[], summary |
| Label | id, project_id, name, color |
| View | id, project_id, name, filters (JSONB), sort (JSONB), created_by |

Design decisions:

1. `assignee_type` and `actor_type` distinguish human from agent actions throughout the system, enabling audit trails that show exactly what an agent did.
2. `metadata` JSONB allows extensibility without schema changes.
3. `AgentSession` tracks what an agent did during a work session for review and accountability.

---

## 4. Core Data Model & Concepts

### 4.1 Task Lifecycle

Tasks follow a simple, configurable status flow. The default flow is:

```
backlog → todo → in_progress → in_review → done → cancelled
```

Projects can customize their status flow via settings. Statuses are strings, not enums, allowing flexibility without migrations.

### 4.2 Priority System

| Level | Value | Use Case |
|-------|-------|----------|
| Critical | P0 | Production incidents, security vulnerabilities |
| High | P1 | Important features, significant bugs |
| Medium | P2 | Standard work items (default) |
| Low | P3 | Nice-to-haves, cleanup tasks |

### 4.3 Task Hierarchy

Tasks support a single level of parent-child nesting via `parent_task_id`. This is intentionally limited — deeply nested hierarchies create confusion for both humans and agents. If a task needs to be broken down, it gets sub-tasks. Sub-tasks cannot have their own sub-tasks.

### 4.4 Agent Identity

Agents are first-class users with `role = "agent"`. Every action an agent takes is attributed, timestamped, and auditable. The `AgentSession` entity groups an agent's work into logical sessions (e.g., a Claude Code session working on a feature), making it easy for human reviewers to see what happened.

Agent users authenticate via API keys, identical to how human API access works. The system makes no distinction in capability — only in attribution and audit.

---

## 5. MCP Server Integration

Pith ships as a fully compliant MCP tool server, exposing project management operations as MCP tools. This is the primary integration surface for AI agents.

### 5.1 Transport Modes

| Transport | Use Case |
|-----------|----------|
| stdio | Local agents like Claude Code. The MCP server runs as a child process. Zero network overhead. Configured in `claude_desktop_config.json` or `.mcp.json`. |
| HTTP/SSE (Streamable HTTP) | Remote agents, shared team setups, cloud-hosted Pith instances. Supports stateful sessions, authentication via Bearer tokens. |

### 5.2 MCP Tools Exposed

Each tool maps directly to a task management operation. Tools use structured input/output schemas for type safety.

| Tool Name | Description |
|-----------|-------------|
| list_projects | List all projects the authenticated user has access to |
| get_project | Get project details including settings and status flow |
| list_tasks | Query tasks with filters: status, priority, assignee, label, date range, free-text search |
| get_task | Get full task details including comments, sub-tasks, and activity history |
| create_task | Create a new task with title, description, priority, labels, assignee, parent_task_id |
| update_task | Update any task field: status, priority, assignee, description, labels, due_date |
| add_comment | Add a comment to a task (supports Markdown) |
| create_subtasks | Batch-create multiple sub-tasks under a parent task (useful for AI decomposition) |
| log_work | Record time or effort against a task with optional notes |
| search_tasks | Full-text search across task titles, descriptions, and comments |
| get_my_tasks | Get all tasks assigned to the current agent/user |
| start_session | Begin an agent work session, recording which tasks are being worked on |
| end_session | End an agent session with an optional summary of work done |
| get_context | Get rich context for a task: parent, siblings, related tasks, recent activity. Designed to give an agent full situational awareness. |

### 5.3 MCP Resources Exposed

In addition to tools, Pith exposes MCP resources for passive context:

- `pith://project/{slug}/board` — Current board state as structured data
- `pith://project/{slug}/backlog` — Full backlog with priorities
- `pith://task/{id}/context` — Complete task context including parent, sub-tasks, comments, and linked items
- `pith://user/{id}/workload` — Current assignment load for a team member or agent

### 5.4 MCP Configuration Example

For Claude Code or Claude Desktop, add to `.mcp.json`:

```json
{
  "mcpServers": {
    "pith": {
      "command": "npx",
      "args": ["-y", "@pith/mcp-server"],
      "env": {
        "PITH_URL": "http://localhost:3456",
        "PITH_API_KEY": "kb_..."
      }
    }
  }
}
```

---

## 6. CLI Design

The CLI (`pith`) is designed for both human developers and AI agents calling shell commands. It prioritizes machine-parseable output (`--json` flag) alongside human-readable defaults.

### 6.1 Command Reference

| Command | Description |
|---------|-------------|
| `pith init` | Initialize Pith in current directory, create `.pithrc` config |
| `pith project list` | List all projects |
| `pith task list [--status STATUS] [--assignee ME] [--priority P0]` | List tasks with filters |
| `pith task create "Title" [--priority P1] [--desc "..."]` | Create a task |
| `pith task show TASK-123` | Show task details |
| `pith task update TASK-123 --status in_progress` | Update a task |
| `pith task comment TASK-123 "Comment text"` | Add a comment |
| `pith task decompose TASK-123` | AI-powered: break task into sub-tasks (requires AI config) |
| `pith task context TASK-123` | Get full context for a task (for feeding into an agent) |
| `pith session start [--tasks TASK-123,TASK-124]` | Start a work session |
| `pith session end [--summary "..."]` | End session with summary |
| `pith search "query string"` | Full-text search |
| `pith config set ai.provider anthropic` | Configure AI provider |
| `pith config set ai.apiKey sk-ant-...` | Set API key (stored encrypted locally) |

### 6.2 Machine-Readable Output

Every command supports `--json` and `--output json|table|minimal` flags. The `--json` output is stable and versioned, suitable for piping into other tools or for AI agents to parse.

```bash
pith task list --status todo --json | jq '.[].title'
```

### 6.3 Agent-Friendly Design Principles

- **Deterministic output**: same input always produces same structure
- **Exit codes**: 0 for success, 1 for errors, 2 for validation failures
- **No interactive prompts** in non-TTY mode (detects pipe/agent context automatically)
- **Stderr for errors** and diagnostics, stdout for data
- **Pagination** via `--limit` and `--offset` with total count in JSON output

---

## 7. AI Features (Optional Layer)

All AI features are optional and require the user to configure an AI provider and API key. The AI layer uses the Vercel AI SDK for provider-agnostic model access.

### 7.1 Provider Configuration

Users configure their AI provider via environment variables or the config command:

| Variable | Example |
|----------|---------|
| `PITH_AI_PROVIDER` | `anthropic` \| `openai` \| `google` \| `groq` \| `ollama` \| `openrouter` |
| `PITH_AI_MODEL` | `claude-sonnet-4-20250514` \| `gpt-4o` \| `gemini-2.0-flash` |
| `PITH_AI_API_KEY` | `sk-ant-...` \| `sk-...` \| (empty for Ollama) |
| `PITH_AI_BASE_URL` | `http://localhost:11434` (for Ollama / custom endpoints) |

The Vercel AI SDK's provider registry pattern is used internally, allowing hot-swappable models and provider fallback chains. The system uses `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, etc. as peer dependencies — users install only what they need.

### 7.2 AI-Powered Features

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Task Decomposition | Break a large task into smaller, actionable sub-tasks with estimates | `generateObject()` with Zod schema for structured sub-task output |
| Smart Triage | Suggest priority, labels, and assignee for new tasks | `generateObject()` analyzing task description against project context |
| Summary Generation | Generate sprint/project summaries from activity data | `generateText()` with activity log and task state as context |
| Duplicate Detection | Flag potential duplicate tasks when creating new ones | Embedding similarity via AI SDK embeddings + pg_trgm fallback |
| Context Assembly | Build rich context documents for agents about to work on a task | Template-based context with AI-generated summaries of related tasks |
| Effort Estimation | Suggest story points or time estimates based on task description and historical data | `generateObject()` with historical task data as few-shot examples |

### 7.3 AI SDK Integration Pattern

All AI calls follow the same pattern internally:

1. Build a system prompt with project context
2. Construct the user message from the specific feature's input
3. Call the AI SDK (`generateText` or `generateObject`) with the configured provider
4. Validate output against a Zod schema
5. Return structured result or gracefully degrade if AI is unavailable

No AI call blocks a user action. If AI is unconfigured or fails, the operation completes without AI enhancement and the user is notified that AI features are unavailable.

---

## 8. REST API Design

The REST API is the backbone that powers the CLI, MCP server, and web UI. Built with Fastify for high performance and low overhead.

### 8.1 Authentication

API key authentication via `Authorization: Bearer kb_...` header. API keys are generated per user (human or agent) and stored as bcrypt hashes. For the web UI, session-based JWT auth is also supported.

### 8.2 Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/projects | List projects |
| POST | /api/v1/projects | Create project |
| GET | /api/v1/projects/:slug/tasks | List tasks (filterable, paginated) |
| POST | /api/v1/projects/:slug/tasks | Create task |
| GET | /api/v1/tasks/:id | Get task with full context |
| PATCH | /api/v1/tasks/:id | Update task fields |
| POST | /api/v1/tasks/:id/comments | Add comment |
| POST | /api/v1/tasks/:id/subtasks | Batch create sub-tasks |
| GET | /api/v1/tasks/:id/activity | Get activity log |
| POST | /api/v1/tasks/:id/ai/decompose | AI: decompose task |
| POST | /api/v1/tasks/:id/ai/triage | AI: triage/categorize task |
| GET | /api/v1/search?q=... | Full-text search |
| POST | /api/v1/sessions | Start agent session |
| PATCH | /api/v1/sessions/:id | End agent session |

### 8.3 Request/Response Validation

All request and response schemas are defined with **Zod** and integrated via `fastify-type-provider-zod`. This provides:

- **Runtime validation** on all incoming request bodies, query parameters, and path parameters
- **Type inference** — TypeScript types are derived from Zod schemas, no duplicate type definitions
- **Auto-generated Swagger/OpenAPI documentation** via `@fastify/swagger` + `@fastify/swagger-ui`, served at `/docs`
- **Structured error responses** with field-level validation details on schema violations

### 8.4 Response Format

All responses follow a consistent envelope:

```json
{
  "data": { ... },
  "meta": { "total": 42, "page": 1, "limit": 20 },
  "errors": null
}
```

Error responses use standard HTTP codes with structured error objects including a machine-readable code, human message, and optional field-level validation details.

---

## 9. Web UI (Optional)

The web UI is an optional, lightweight React application. It is not the primary interface — the API, CLI, and MCP server are. The UI exists for human convenience: visual board management, quick triage, and reviewing agent activity.

### 9.1 Views

- **Board view**: Kanban-style columns by status. Drag-and-drop. Minimal and fast.
- **List view**: Sortable, filterable table of tasks. Supports bulk actions.
- **Task detail**: Full task view with description (Markdown rendered), comments, activity timeline, sub-tasks, and AI action buttons.
- **Agent activity feed**: Timeline of agent actions across the project. Shows what agents did, when, and to which tasks.
- **Session review**: Review a specific agent's work session: tasks touched, changes made, comments left.

### 9.2 Design Principles

- **No SPA framework overhead**: Vite + React, minimal dependencies
- **Dark mode by default** (developers live in dark mode)
- **Keyboard-first**: all actions accessible via keyboard shortcuts
- **Sub-200ms page loads** on all views
- **No real-time WebSocket** complexity in v1 (polling with configurable interval)

---

## 10. Agent Workflow Patterns

Pith is designed to support common agent workflow patterns out of the box:

### 10.1 Autonomous Coding Agent

An agent (e.g., Claude Code) picks up a task, works on it, and reports back:

1. Agent calls `get_my_tasks` to see assigned work
2. Agent calls `start_session` with the task ID
3. Agent calls `get_context` to understand the full picture
4. Agent does the coding work (outside Pith)
5. Agent calls `update_task` to set status = in_review
6. Agent calls `add_comment` with a summary of changes and PR link
7. Agent calls `end_session` with a work summary

### 10.2 Planning Agent

A higher-level agent breaks down epics into tasks:

1. Reads a high-level task via `get_task`
2. Calls AI decomposition via `create_subtasks` with structured output
3. Assigns sub-tasks to specific agents or humans
4. Monitors progress by polling task statuses

### 10.3 Review Agent

An agent that reviews other agents' work:

1. Queries tasks in `in_review` status
2. Reads the agent session summary and associated code changes
3. Adds review comments via `add_comment`
4. Moves task to `done` or back to `in_progress` with feedback

### 10.4 Multi-Agent Orchestration

Pith serves as the shared state layer for multi-agent systems. Multiple agents can read and write to the same project, with the activity log providing a complete audit trail. Conflict resolution is last-write-wins at the field level, with the activity log preserving the full history.

---

## 11. Technology Stack Details

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Runtime | Node.js 20+ (LTS) | Largest ecosystem for AI/MCP tooling, async I/O, broad hosting support |
| Language | TypeScript 5.x | Type safety, AI SDK types, Drizzle schema types, Zod inference |
| Database | PostgreSQL 16+ | JSONB for flexible metadata, pg_trgm for search, battle-tested, self-hostable |
| ORM | Drizzle ORM | Lightweight, type-safe, explicit SQL, zero overhead, great migration story |
| API Framework | Fastify 5 | High performance, low overhead, built-in schema validation, plugin ecosystem |
| Validation | Zod + fastify-type-provider-zod | Runtime validation, AI SDK structured output, request/response schemas, Swagger generation |
| API Docs | @fastify/swagger + @fastify/swagger-ui | Auto-generated OpenAPI spec and interactive Swagger UI at `/docs` |
| AI SDK | Vercel AI SDK 6 | Unified provider API, structured output, tool calling, streaming, MCP client support |
| MCP SDK | @modelcontextprotocol/sdk | Official MCP implementation, stdio + HTTP/SSE transports |
| CLI Framework | Commander.js | Lightweight, declarative, widely adopted |
| Web UI | React 19 + Vite 6 | Minimal, fast, good DX. No Next.js overhead for a simple admin panel |
| Testing | Vitest + Supertest | Fast, Jest-compatible, native TypeScript support |
| Containerization | Docker + Docker Compose | Standard self-hosting, multi-arch images (amd64/arm64) |

---

## 12. Repository Structure

The project uses a monorepo managed with npm workspaces (or Turborepo for build orchestration):

```
pith/
├── packages/
│   ├── core/           # Shared types, schemas (Zod), constants
│   ├── db/             # Drizzle schema, migrations, seed data
│   ├── server/         # Fastify API server, route handlers, business logic
│   ├── ai/             # AI SDK integration layer, prompts, structured schemas
│   ├── mcp-server/     # MCP tool server (stdio + HTTP)
│   ├── cli/            # Commander.js CLI application
│   └── web/            # React + Vite web UI
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/               # Documentation (Markdown)
├── task/               # Development tasks organized by phase
├── CLAUDE.md           # Agent instructions for contributing
└── package.json        # Workspace root
```

---

## 13. Security Model

### 13.1 Authentication

- **API Keys**: Primary auth method. Scoped per user/agent. Stored as bcrypt hashes. Transmitted via Bearer token.
- **JWT Sessions**: For web UI login. Short-lived access tokens (15 min) + refresh tokens (7 days).
- **MCP Auth**: stdio transport inherits the API key from environment. HTTP transport uses Bearer tokens per the MCP auth spec.

### 13.2 Authorization

Simple RBAC with three roles:

| Role | Permissions |
|------|------------|
| admin | Full access: create/delete projects, manage users, manage agents, all task operations |
| member | Create/edit/delete own tasks and comments, view all tasks, update any task status |
| agent | Same as member, plus: create/end sessions, batch operations. Cannot manage users or delete projects. |

### 13.3 Agent Safety

- Rate limiting per API key (configurable, default: 100 req/min)
- Agent actions are always attributed and logged in the activity feed
- Optional: require human approval for agent-initiated task deletion or status transitions to specific states (e.g., `done`)
- Agent sessions have configurable max duration (default: 4 hours)
- All AI-generated content is marked as such in the UI and API responses

---

## 14. Extensibility & Integrations

### 14.1 Webhooks

Pith fires webhooks on key events, enabling integration with external systems:

- `task.created`, `task.updated`, `task.deleted`
- `comment.created`
- `session.started`, `session.ended`
- `project.created`

Webhook payloads are signed with HMAC-SHA256 for verification.

### 14.2 GitHub Integration (v1.1)

- Link tasks to GitHub issues and PRs
- Auto-update task status when a linked PR is merged
- Sync GitHub issue labels to Pith labels

### 14.3 Plugin System (v2.0)

Future: a lightweight plugin system for extending Pith with custom logic, additional MCP tools, custom AI prompts, and third-party integrations.

---

## 15. Development Roadmap

### Phase 1: Foundation (Weeks 1-4)

- Database schema, Drizzle migrations, seed data
- Core CRUD API: projects, tasks, comments, activity log
- API key auth and basic RBAC
- CLI: init, project, task CRUD, search
- MCP server: stdio transport with core tools
- Docker Compose setup
- Test suite: unit + integration tests for API

### Phase 2: AI & Polish (Weeks 5-8)

- AI SDK integration: provider configuration, task decomposition, smart triage
- Agent session tracking
- MCP HTTP/SSE transport
- Web UI: board view, list view, task detail
- CLI: AI commands, session management, JSON output
- Webhook system
- Documentation: README, setup guide, MCP integration guide

### Phase 3: Ecosystem (Weeks 9-12)

- GitHub integration
- Agent activity review UI
- Summary generation and project analytics
- Duplicate detection
- Performance optimization and load testing
- npm packages published: @pith/cli, @pith/mcp-server
- Launch: GitHub repo, docs site, demo video

### Phase 4: Growth (Post-Launch)

- Plugin system for extensibility
- Slack / Discord integration
- Custom views and saved filters
- Time tracking and reporting
- Multi-tenant mode for SaaS deployment

---

## 16. Competitive Landscape

| Tool | Open Source | AI-Native | MCP Support | Agent-First |
|------|-----------|-----------|-------------|-------------|
| Jira | No | Bolt-on | No | No |
| Linear | No | Partial | No | No |
| Plane | Yes | Minimal | No | No |
| DevRev | No | Yes | No | Partial |
| OpenProject | Yes | No | No | No |
| Huly | Yes | Minimal | No | No |
| **Pith** | **Yes** | **Core** | **Yes (native)** | **Yes (core)** |

Pith's positioning: The only open-source task management tool where AI agents are a first-class user persona, with native MCP support and a CLI designed for programmatic access. Not competing on feature count — competing on agent ergonomics.

---

## 17. Success Metrics

| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| GitHub stars | 1,000+ |
| Docker Hub pulls | 5,000+ |
| Active MCP integrations (unique agent types) | 3+ (Claude Code, Cursor, custom) |
| API response time (p99) | < 100ms for CRUD, < 2s for AI operations |
| Setup time (docker compose up to first task) | < 5 minutes |
| Agent workflow completion (task picked up to done) | Fully automatable without human intervention |
| Community contributors | 10+ active contributors |

---

## 18. Naming Note

"Pith" refers to the essential core of something — the central, most important part. In botany, pith is the spongy tissue at the center of a stem that provides structure and nourishment. The name reflects the project's role as the essential core layer that connects humans and AI agents in their shared work. Short, memorable, and easy to type in a terminal.

---

*End of Specification*
