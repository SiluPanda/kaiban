# Task: CLI - AI Commands, Session Management, JSON Output

**Phase:** 2 - AI & Polish (Weeks 5-8)
**Status:** pending

## Description

Extend the CLI with AI-powered commands and agent session management.

### New Commands

| Command | Description |
|---------|-------------|
| `kaiban task decompose TASK-123` | AI-powered: break task into sub-tasks (requires AI config) |
| `kaiban task context TASK-123` | Get full context for a task (for feeding into an agent) |
| `kaiban session start [--tasks TASK-123,TASK-124]` | Start a work session |
| `kaiban session end [--summary "..."]` | End session with summary |
| `kaiban config set ai.provider anthropic` | Configure AI provider |
| `kaiban config set ai.apiKey sk-ant-...` | Set API key (stored encrypted locally) |

### Machine-Readable Output Enhancements

- Ensure `--json` output is stable and versioned across all commands (including new ones)
- JSON output suitable for piping into other tools or for AI agents to parse
- Example: `kaiban task list --status todo --json | jq '.[].title'`

### Deliverables

- AI decompose command
- Task context assembly command
- Session start/end commands
- Config management commands for AI providers
- Encrypted local API key storage
- JSON output on all new commands
