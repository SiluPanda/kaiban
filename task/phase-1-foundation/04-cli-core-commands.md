# Task: CLI Core Commands - init, project, task CRUD, search

**Phase:** 1 - Foundation (Weeks 1-4)
**Status:** done

## Description

Build the CLI application in `packages/cli` using Commander.js. The CLI is designed for both human developers and AI agents calling shell commands.

### Commands to Implement

| Command | Description |
|---------|-------------|
| `pith init` | Initialize Pith in current directory, create `.pithrc` config |
| `pith project list` | List all projects |
| `pith task list [--status STATUS] [--assignee ME] [--priority P0]` | List tasks with filters |
| `pith task create "Title" [--priority P1] [--desc "..."]` | Create a task |
| `pith task show TASK-123` | Show task details |
| `pith task update TASK-123 --status in_progress` | Update a task |
| `pith task comment TASK-123 "Comment text"` | Add a comment |
| `pith search "query string"` | Full-text search |

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
- `.pithrc` config file support (API URL, API key)
- Human-readable table output as default
