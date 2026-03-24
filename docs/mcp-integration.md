# MCP Integration Guide

Pith exposes a fully compliant [Model Context Protocol](https://modelcontextprotocol.io/) server, making it the primary integration surface for AI agents.

## Transports

### stdio (Local agents)

For Claude Code, Claude Desktop, Cursor, Windsurf, and other local agents.

```json
{
  "mcpServers": {
    "pith": {
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/index.ts"],
      "env": {
        "PITH_URL": "http://localhost:3456",
        "PITH_API_KEY": "kb_..."
      }
    }
  }
}
```

### HTTP/SSE (Remote agents)

For remote agents and shared team setups.

```bash
# Start the HTTP MCP server
MCP_PORT=3100 PITH_URL=http://localhost:3456 PITH_API_KEY=kb_... npx tsx packages/mcp-server/src/http.ts
```

Endpoint: `http://localhost:3100/mcp`

## Available Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects |
| `get_project` | Get project details |
| `list_tasks` | Query tasks with filters (status, priority, assignee, label, search) |
| `get_task` | Get full task details with comments, subtasks, activity |
| `create_task` | Create a new task |
| `update_task` | Update task fields (status, priority, assignee, etc.) |
| `add_comment` | Add a comment to a task |
| `create_subtasks` | Batch-create subtasks under a parent |
| `search_tasks` | Full-text search across tasks |
| `get_my_tasks` | Get tasks assigned to the current user |
| `start_session` | Begin an agent work session |
| `end_session` | End a session with summary |
| `get_context` | Get rich context for a task |

## Available Resources

| URI Template | Description |
|-------------|-------------|
| `pith://project/{slug}/board` | Board state grouped by status |
| `pith://project/{slug}/backlog` | Full backlog with priorities |
| `pith://task/{id}/context` | Complete task context |
| `pith://user/{id}/workload` | User assignment workload |

## Agent Workflow Example

```
1. Agent calls list_tasks to see assigned work
2. Agent calls start_session with task IDs
3. Agent calls get_context to understand the task
4. Agent does the work (coding, research, etc.)
5. Agent calls update_task to set status = in_review
6. Agent calls add_comment with a summary of changes
7. Agent calls end_session with a work summary
```

## Authentication

All MCP tools authenticate via the `PITH_API_KEY` environment variable, which is passed as a Bearer token to the Pith API.

For HTTP transport, include the API key in the Authorization header:
```
Authorization: Bearer kb_...
```
