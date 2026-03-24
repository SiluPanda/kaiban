# Task: CLI - AI Commands, Session Management, JSON Output

**Phase:** 2 - AI & Polish (Weeks 5-8)
**Status:** pending

## Description

Extend the CLI with AI-powered commands and agent session management.

### New Commands

| Command | Description |
|---------|-------------|
| `pith task decompose TASK-123` | AI-powered: break task into sub-tasks (requires AI config) |
| `pith task context TASK-123` | Get full context for a task (for feeding into an agent) |
| `pith session start [--tasks TASK-123,TASK-124]` | Start a work session |
| `pith session end [--summary "..."]` | End session with summary |
| `pith config set ai.provider anthropic` | Configure AI provider |
| `pith config set ai.apiKey sk-ant-...` | Set API key (stored encrypted locally) |

### Machine-Readable Output Enhancements

- Ensure `--json` output is stable and versioned across all commands (including new ones)
- JSON output suitable for piping into other tools or for AI agents to parse
- Example: `pith task list --status todo --json | jq '.[].title'`

### Deliverables

- AI decompose command
- Task context assembly command
- Session start/end commands
- Config management commands for AI providers
- Encrypted local API key storage
- JSON output on all new commands
