# Task: Database Schema, Drizzle Migrations & Seed Data

**Phase:** 1 - Foundation (Weeks 1-4)
**Status:** done

## Description

Set up the PostgreSQL database layer using Drizzle ORM in the `packages/db` package.

### Core Entities to Define

- **Project**: id, slug, name, description, default_status_flow, settings (JSONB), created_at
- **Task**: id, project_id, title, description (Markdown), status, priority (P0-P3), assignee_id, assignee_type (human|agent), parent_task_id, labels[], estimate, due_date, metadata (JSONB), created_by, created_by_type
- **Comment**: id, task_id, body (Markdown), author_id, author_type (human|agent), created_at
- **Activity**: id, task_id, actor_id, actor_type, action (enum), field_changed, old_value, new_value, timestamp
- **User**: id, name, email, api_key_hash, role (admin|member|agent), created_at
- **AgentSession**: id, user_id, agent_name, started_at, ended_at, tasks_touched[], summary
- **Label**: id, project_id, name, color
- **View**: id, project_id, name, filters (JSONB), sort (JSONB), created_by

### Key Design Decisions

- `assignee_type` and `actor_type` distinguish human from agent actions throughout the system
- `metadata` JSONB allows extensibility without schema changes
- `AgentSession` tracks what an agent did during a work session
- Task statuses are strings (not enums) for flexibility without migrations
- Single level of parent-child nesting via `parent_task_id` (sub-tasks cannot have sub-tasks)
- Priority levels: P0 (Critical), P1 (High), P2 (Medium/default), P3 (Low)
- Enable `pg_trgm` extension for full-text search

### Deliverables

- Drizzle schema definitions for all entities
- Migration files
- Seed data script (sample project, users, tasks, comments)
- TypeScript types exported from `packages/core`
