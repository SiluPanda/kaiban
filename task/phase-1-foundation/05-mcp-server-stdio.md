# Task: MCP Server - stdio Transport with Core Tools

**Phase:** 1 - Foundation (Weeks 1-4)
**Status:** pending

## Description

Build a fully compliant MCP tool server in `packages/mcp-server` using `@modelcontextprotocol/sdk`. This is the primary integration surface for AI agents (Claude Code, Claude Desktop, Cursor, Windsurf, custom agents).

### Transport

- **stdio**: Local agents like Claude Code. The MCP server runs as a child process. Zero network overhead. Configured in `claude_desktop_config.json` or `.mcp.json`.

### MCP Tools to Expose

| Tool Name | Description |
|-----------|-------------|
| list_projects | List all projects the authenticated user has access to |
| get_project | Get project details including settings and status flow |
| list_tasks | Query tasks with filters: status, priority, assignee, label, date range, free-text search |
| get_task | Get full task details including comments, sub-tasks, and activity history |
| create_task | Create a new task with title, description, priority, labels, assignee, parent_task_id |
| update_task | Update any task field: status, priority, assignee, description, labels, due_date |
| add_comment | Add a comment to a task (supports Markdown) |
| create_subtasks | Batch-create multiple sub-tasks under a parent task |
| log_work | Record time or effort against a task with optional notes |
| search_tasks | Full-text search across task titles, descriptions, and comments |
| get_my_tasks | Get all tasks assigned to the current agent/user |
| start_session | Begin an agent work session |
| end_session | End an agent session with optional summary |
| get_context | Get rich context for a task: parent, siblings, related tasks, recent activity |

### MCP Resources to Expose

- `pith://project/{slug}/board` -- Current board state as structured data
- `pith://project/{slug}/backlog` -- Full backlog with priorities
- `pith://task/{id}/context` -- Complete task context (parent, sub-tasks, comments, linked items)
- `pith://user/{id}/workload` -- Current assignment load for a team member or agent

### Configuration Example

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

### Deliverables

- MCP server with stdio transport
- All tools with structured input/output schemas
- All resources listed above
- Type-safe tool definitions
