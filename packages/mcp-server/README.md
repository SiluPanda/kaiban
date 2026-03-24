# @pith/mcp-server

[Model Context Protocol](https://modelcontextprotocol.io/) server for [Pith](https://github.com/pith-dev/pith) — AI-Native Task Management.

## Usage with Claude Code / Claude Desktop

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

## Transports

- **stdio** (default): `pith-mcp` — for local agents
- **HTTP/SSE**: `pith-mcp-http` — for remote agents

## Tools

13 tools: `list_projects`, `get_project`, `list_tasks`, `get_task`, `create_task`, `update_task`, `add_comment`, `create_subtasks`, `search_tasks`, `get_my_tasks`, `start_session`, `end_session`, `get_context`

## Resources

4 resource templates: project board, backlog, task context, user workload.

See [full MCP integration guide](https://github.com/pith-dev/pith/blob/main/docs/mcp-integration.md).
