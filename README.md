<p align="center">
  <h1 align="center">Kaiban</h1>
  <p align="center">AI-Native Task Management for Humans & Agents</p>
</p>

<p align="center">
  <a href="#installation"><strong>Get Started</strong></a> &middot;
  <a href="#features"><strong>Features</strong></a> &middot;
  <a href="#mcp-integration"><strong>MCP Integration</strong></a> &middot;
  <a href="#cli"><strong>CLI</strong></a> &middot;
  <a href="#architecture"><strong>Architecture</strong></a> &middot;
  <a href="#roadmap"><strong>Roadmap</strong></a>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/PostgreSQL-16%2B-336791" alt="PostgreSQL 16+">
  <img src="https://img.shields.io/badge/MCP-Native-purple" alt="MCP Native">
  <img src="https://img.shields.io/badge/status-in%20development-orange" alt="Status: In Development">
</p>

---

**Kaiban** is an open-source, self-hosted task management system built from the ground up for a world where AI agents are first-class team members. Unlike existing tools that bolt AI onto human-centric workflows, Kaiban treats AI agents and humans as equal participants.

> In 2026 and beyond, most engineering work will be co-performed by humans and AI coding agents. These agents need to read tasks, update status, log work, create sub-tasks, and query project state — without a browser. Kaiban provides the infrastructure for this workflow natively.

## Why Kaiban?

Existing project management tools weren't designed for the AI-agent era:

- **The Agent Access Problem** — AI agents (Claude Code, Codex, Devin) perform real engineering work but operate blind to the project's task graph. Context is copy-pasted by humans.
- **The Integration Tax** — Every team building with AI agents writes custom glue code to bridge their task tracker and their agent workflows.
- **The Complexity Trap** — Open-source alternatives replicate Jira's complexity. They're designed for humans clicking through UIs, with APIs as afterthoughts.
- **The Vendor Lock-in Problem** — AI-native features in commercial tools lock you into specific AI providers.

## Features

### Dual-Citizen Design
Every feature works equally well for humans (via web UI) and AI agents (via MCP/CLI/API).

### MCP-Native
Ships as a first-class [MCP](https://modelcontextprotocol.io/) tool server. Any MCP-compatible client — Claude Code, Claude Desktop, Cursor, Windsurf, or custom agents — can manage tasks out of the box.

### CLI-First
A powerful CLI (`kaiban`) that AI coding agents can invoke directly from terminal sessions. Machine-parseable `--json` output on every command.

### AI-Powered, Not AI-Dependent
AI features (summarization, decomposition, prioritization) are optional. The tool works perfectly without any AI model configured.

### BYOM (Bring Your Own Model)
Configure your own AI provider and API key. Supports any provider via Vercel AI SDK — OpenAI, Anthropic, Google, Groq, Ollama, and more.

### Minimal & Opinionated
Deliberately avoids Jira's complexity. Simple primitives that compose well. No 47 issue types.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Presentation                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Web UI   │  │   CLI    │  │  MCP Server   │  │
│  │ React+Vite│  │Commander │  │ stdio + HTTP  │  │
│  └────┬──────┘  └────┬─────┘  └──────┬────────┘  │
├───────┴──────────────┴───────────────┴────────────┤
│                   API Layer                       │
│            Fastify + Zod + Swagger                │
├───────────────────────────────────────────────────┤
│                 Business Logic                    │
│          Task Lifecycle · RBAC · Webhooks         │
├───────────────────────────────────────────────────┤
│              AI Layer (Optional)                  │
│     Vercel AI SDK · BYOM · Structured Output      │
├───────────────────────────────────────────────────┤
│                  Data Layer                       │
│          PostgreSQL 16+ · Drizzle ORM             │
└───────────────────────────────────────────────────┘
```

## Installation

### Docker Compose (Recommended)

```bash
git clone https://github.com/SiluPanda/kaiban.git
cd kaiban
docker compose up
```

Target: under 512MB RAM. Under 5 minutes from `docker compose up` to your first task.

### Bare Metal

Requires Node.js 20+ and PostgreSQL 16+. No Redis, no message queue, no Elasticsearch.

```bash
git clone https://github.com/SiluPanda/kaiban.git
cd kaiban
npm install
npm run db:migrate
npm run dev
```

## MCP Integration

Kaiban ships as a fully compliant MCP tool server. Add to your `.mcp.json` (Claude Code, Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "kaiban": {
      "command": "npx",
      "args": ["-y", "@kaiban/mcp-server"],
      "env": {
        "KAIBAN_URL": "http://localhost:3456",
        "KAIBAN_API_KEY": "kb_..."
      }
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `list_tasks` | Query tasks with filters (status, priority, assignee, labels) |
| `get_task` | Full task details with comments, sub-tasks, activity |
| `create_task` | Create a task with title, description, priority, labels |
| `update_task` | Update any task field |
| `add_comment` | Add a Markdown comment to a task |
| `create_subtasks` | Batch-create sub-tasks (great for AI decomposition) |
| `get_my_tasks` | Tasks assigned to the current agent/user |
| `get_context` | Rich context for a task — parent, siblings, activity |
| `start_session` / `end_session` | Track agent work sessions |
| `search_tasks` | Full-text search across tasks and comments |

### MCP Resources

- `kaiban://project/{slug}/board` — Current board state
- `kaiban://project/{slug}/backlog` — Full backlog with priorities
- `kaiban://task/{id}/context` — Complete task context
- `kaiban://user/{id}/workload` — Assignment load

## CLI

```bash
# Initialize
kaiban init

# Task management
kaiban task list --status todo --priority P0
kaiban task create "Implement auth middleware" --priority P1
kaiban task show TASK-123
kaiban task update TASK-123 --status in_progress
kaiban task comment TASK-123 "Fixed the race condition, PR incoming"

# AI-powered (requires AI provider config)
kaiban task decompose TASK-123
kaiban task context TASK-123

# Agent sessions
kaiban session start --tasks TASK-123,TASK-124
kaiban session end --summary "Completed auth middleware and tests"

# Search
kaiban search "authentication bug"

# All commands support --json for machine-parseable output
kaiban task list --status todo --json | jq '.[].title'
```

## Agent Workflow Patterns

### Autonomous Coding Agent

```
Agent calls get_my_tasks     → sees assigned work
Agent calls start_session    → begins tracked session
Agent calls get_context      → understands the full picture
Agent does coding work       → (outside Kaiban)
Agent calls update_task      → sets status to in_review
Agent calls add_comment      → posts summary + PR link
Agent calls end_session      → records work summary
```

### Planning Agent

```
Reads high-level task        → via get_task
Calls AI decomposition       → via create_subtasks
Assigns sub-tasks            → to agents or humans
Monitors progress            → by polling task statuses
```

### Multi-Agent Orchestration

Kaiban serves as the shared state layer for multi-agent systems. Multiple agents read and write to the same project with full audit trails.

## AI Configuration (Optional)

```bash
kaiban config set ai.provider anthropic
kaiban config set ai.apiKey sk-ant-...
```

Or via environment variables:

| Variable | Example |
|----------|---------|
| `KAIBAN_AI_PROVIDER` | `anthropic`, `openai`, `google`, `groq`, `ollama` |
| `KAIBAN_AI_MODEL` | `claude-sonnet-4-20250514`, `gpt-4o`, `gemini-2.0-flash` |
| `KAIBAN_AI_API_KEY` | `sk-ant-...`, `sk-...` |
| `KAIBAN_AI_BASE_URL` | `http://localhost:11434` (for Ollama) |

### AI Features

- **Task Decomposition** — Break large tasks into actionable sub-tasks with estimates
- **Smart Triage** — Auto-suggest priority, labels, and assignee
- **Summary Generation** — Sprint and project summaries from activity data
- **Duplicate Detection** — Flag potential duplicates on task creation
- **Context Assembly** — Build rich context documents for agents
- **Effort Estimation** — Suggest estimates based on historical data

All AI features gracefully degrade when unconfigured. No AI call blocks a user action.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.x |
| Database | PostgreSQL 16+ |
| ORM | Drizzle ORM |
| API | Fastify + Zod + Swagger |
| AI | Vercel AI SDK |
| MCP | @modelcontextprotocol/sdk |
| CLI | Commander.js |
| Web UI | React 19 + Vite 6 |
| Testing | Vitest + Supertest |

## Project Structure

```
kaiban/
├── packages/
│   ├── core/           # Shared types, Zod schemas, constants
│   ├── db/             # Drizzle schema, migrations, seed data
│   ├── server/         # Fastify API server, business logic
│   ├── ai/             # AI SDK integration layer
│   ├── mcp-server/     # MCP tool server (stdio + HTTP)
│   ├── cli/            # Commander.js CLI
│   └── web/            # React + Vite web UI
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── task/               # Development task tracking
└── docs/               # Documentation
```

## Roadmap

### Phase 1: Foundation (Weeks 1-4)
Database schema, core CRUD API, authentication, CLI, MCP server (stdio), Docker setup, test suite.

### Phase 2: AI & Polish (Weeks 5-8)
AI SDK integration, agent session tracking, MCP HTTP transport, web UI, webhooks, documentation.

### Phase 3: Ecosystem (Weeks 9-12)
GitHub integration, agent activity review UI, analytics, duplicate detection, npm publishing, launch.

### Phase 4: Growth (Post-Launch)
Plugin system, Slack/Discord integration, custom views, time tracking, multi-tenant SaaS mode.

## Security

- **API Key Auth** — Per user/agent, bcrypt-hashed, Bearer token
- **JWT Sessions** — Short-lived access (15 min) + refresh tokens (7 days) for web UI
- **RBAC** — Admin, Member, Agent roles with scoped permissions
- **Agent Safety** — Rate limiting, attributed actions, configurable session limits, human approval gates
- **Webhook Signing** — HMAC-SHA256 payload verification

## Contributing

Contributions are welcome! Please check the [task/](./task) directory for current development tasks organized by phase.

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>Built for the era where humans and AI agents ship code together.</sub>
</p>
