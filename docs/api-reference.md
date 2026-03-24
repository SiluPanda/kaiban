# API Reference

Base URL: `http://localhost:3456/api/v1`

Interactive docs: `http://localhost:3456/docs` (Swagger UI)

## Authentication

All endpoints (except health and search) require a Bearer token:

```
Authorization: Bearer <api_key_or_jwt>
```

- **API Key**: Starts with `kb_`, verified via bcrypt
- **JWT**: Obtained via `/auth/login`, expires in 15 minutes

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check with DB status |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login with email + API key, returns JWT |
| POST | `/auth/refresh` | No | Refresh access token |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Admin | List users (filter by role) |
| POST | `/users` | Admin | Create user (returns API key) |
| GET | `/users/me` | Any | Get current user |
| GET | `/users/:id` | Any | Get user by ID |
| PATCH | `/users/:id` | Admin | Update user |
| POST | `/users/:id/regenerate-key` | Admin | Regenerate API key |

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects` | Any | List projects |
| POST | `/projects` | Admin | Create project |
| GET | `/projects/:slug` | Any | Get project by slug |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:slug/tasks` | Any | List tasks (filters: status, priority, assignee, label, q) |
| POST | `/projects/:slug/tasks` | Any | Create task |
| GET | `/tasks/:id` | Any | Get task with full context |
| PATCH | `/tasks/:id` | Any | Update task fields |
| POST | `/tasks/:id/subtasks` | Any | Batch create subtasks |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/tasks/:id/comments` | Any | Add comment |
| GET | `/tasks/:id/comments` | Any | List comments |

### Activity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tasks/:id/activity` | Any | Get activity log |

### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search?q=<query>` | No | Full-text search |

### Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sessions` | Any | Start agent session |
| GET | `/sessions` | Any | List sessions |
| GET | `/sessions/:id` | Any | Get session details |
| PATCH | `/sessions/:id` | Any | End session |

### AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/ai/status` | Any | Check AI configuration |
| POST | `/ai/decompose` | Any | AI task decomposition |
| POST | `/ai/triage` | Any | AI priority/label suggestions |
| POST | `/ai/context/:taskId` | Any | AI context assembly |
| POST | `/ai/estimate` | Any | AI effort estimation |

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/projects/:slug/webhooks` | Admin | Register webhook |
| GET | `/projects/:slug/webhooks` | Admin | List webhooks |
| DELETE | `/webhooks/:id` | Admin | Delete webhook |
| GET | `/webhooks/:id/deliveries` | Admin | Delivery logs |

### Links (GitHub)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/tasks/:id/links` | Any | Link external resource |
| GET | `/tasks/:id/links` | Any | List task links |
| PATCH | `/links/:linkId` | Any | Update link status |
| DELETE | `/links/:linkId` | Any | Remove link |
| POST | `/github/webhook` | No | GitHub webhook receiver |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/projects/:slug/analytics` | Any | Project analytics |
| POST | `/projects/:slug/summary` | Any | Sprint summary |

### Duplicates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/projects/:slug/duplicates` | Any | Find duplicate tasks |
| GET | `/tasks/:id/similar` | Any | Find similar tasks |

### Views

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/projects/:slug/views` | Any | Create saved view |
| GET | `/projects/:slug/views` | Any | List views |
| GET | `/views/:id` | Any | Get view details |
| PATCH | `/views/:id` | Any | Update view |
| DELETE | `/views/:id` | Any | Delete view |

### Time Tracking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/tasks/:id/time` | Any | Log time |
| GET | `/tasks/:id/time` | Any | List time entries |
| DELETE | `/time/:entryId` | Any | Delete time entry |
| GET | `/projects/:slug/time-report` | Any | Time report |

### Plugins

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plugins` | Any | List plugins |
| GET | `/plugins/:name` | Any | Plugin details |
| POST | `/plugins/emit` | Admin | Emit hook event |

## Response Format

All responses follow the envelope:

```json
{
  "data": { ... },
  "meta": { "total": 100, "limit": 20, "offset": 0 },
  "errors": null
}
```

Error responses:

```json
{
  "data": null,
  "meta": null,
  "errors": { "code": "NOT_FOUND", "message": "Task not found" }
}
```
