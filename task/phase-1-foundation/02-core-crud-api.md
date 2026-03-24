# Task: Core CRUD API - Projects, Tasks, Comments, Activity Log

**Phase:** 1 - Foundation (Weeks 1-4)
**Status:** pending

## Description

Build the REST API backbone in `packages/server` using Fastify. This API powers the CLI, MCP server, and web UI.

### Endpoints to Implement

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
| GET | /api/v1/search?q=... | Full-text search |

### Response Format

All responses must follow the consistent envelope:

```json
{
  "data": { ... },
  "meta": { "total": 42, "page": 1, "limit": 20 },
  "errors": null
}
```

Error responses use standard HTTP codes with structured error objects including machine-readable code, human message, and optional field-level validation details.

### Task Lifecycle

Default status flow: `backlog -> todo -> in_progress -> in_review -> done -> cancelled`

Projects can customize their status flow via settings.

### Requirements

- Pagination via `limit` and `offset` with total count
- Task filtering by status, priority, assignee, label, date range, free-text search
- Activity log entries auto-created on task mutations (field_changed, old_value, new_value)
- Zod validation on all request/response schemas via `fastify-type-provider-zod`
- Auto-generated Swagger/OpenAPI documentation via `@fastify/swagger` + `@fastify/swagger-ui`
- Swagger UI served at `/docs` for interactive API exploration
