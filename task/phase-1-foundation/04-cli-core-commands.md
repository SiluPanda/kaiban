# Task: CLI Core Commands - init, project, task CRUD, search

**Phase:** 1 - Foundation (Weeks 1-4)
**Status:** pending

## Description

Build the CLI application in `packages/cli` using Commander.js. The CLI is designed for both human developers and AI agents calling shell commands.

### Commands to Implement

| Command | Description |
|---------|-------------|
| `kaiban init` | Initialize Kaiban in current directory, create `.kaibanrc` config |
| `kaiban project list` | List all projects |
| `kaiban task list [--status STATUS] [--assignee ME] [--priority P0]` | List tasks with filters |
| `kaiban task create "Title" [--priority P1] [--desc "..."]` | Create a task |
| `kaiban task show TASK-123` | Show task details |
| `kaiban task update TASK-123 --status in_progress` | Update a task |
| `kaiban task comment TASK-123 "Comment text"` | Add a comment |
| `kaiban search "query string"` | Full-text search |

### Agent-Friendly Design Principles

- Deterministic output: same input always produces same structure
- Exit codes: 0 for success, 1 for errors, 2 for validation failures
- No interactive prompts in non-TTY mode (detect pipe/agent context automatically)
- Stderr for errors and diagnostics, stdout for data
- Every command supports `--json` and `--output json|table|minimal` flags
- Pagination via `--limit` and `--offset` with total count in JSON output

### Deliverables

- Commander.js CLI application scaffolding
- All core commands listed above
- `--json` output mode on every command
- `.kaibanrc` config file support (API URL, API key)
- Human-readable table output as default
