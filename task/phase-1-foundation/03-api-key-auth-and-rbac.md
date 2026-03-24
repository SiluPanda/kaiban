# Task: API Key Authentication & Basic RBAC

**Phase:** 1 - Foundation (Weeks 1-4)
**Status:** done

## Description

Implement authentication and authorization for the API.

### Authentication

- **API Keys**: Primary auth method. Generated per user (human or agent). Stored as bcrypt hashes. Transmitted via `Authorization: Bearer kb_...` header.
- **JWT Sessions**: For web UI login. Short-lived access tokens (15 min) + refresh tokens (7 days).
- **MCP Auth**: stdio transport inherits API key from environment. HTTP transport uses Bearer tokens per MCP auth spec.

### Authorization (RBAC)

Three roles with the following permissions:

| Role | Permissions |
|------|------------|
| admin | Full access: create/delete projects, manage users, manage agents, all task operations |
| member | Create/edit/delete own tasks and comments, view all tasks, update any task status |
| agent | Same as member, plus: create/end sessions, batch operations. Cannot manage users or delete projects. |

### Agent Identity

- Agents are first-class users with `role = "agent"`
- Every agent action is attributed, timestamped, and auditable
- Agent users authenticate via API keys, identical to human API access
- System makes no distinction in capability -- only in attribution and audit

### Deliverables

- API key generation, hashing, and validation middleware
- JWT session creation and refresh for web UI
- Role-based authorization middleware
- User management endpoints (create, list, update roles)
