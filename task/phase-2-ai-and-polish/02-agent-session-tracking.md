# Task: Agent Session Tracking

**Phase:** 2 - AI & Polish (Weeks 5-8)
**Status:** pending

## Description

Implement agent work session tracking using the `AgentSession` entity. Sessions group an agent's work into logical units (e.g., a Claude Code session working on a feature), making it easy for human reviewers to see what happened.

### AgentSession Entity

- id, user_id, agent_name, started_at, ended_at, tasks_touched[], summary

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/sessions | Start agent session |
| PATCH | /api/v1/sessions/:id | End agent session |

### Agent Workflow Support

The session system supports common agent patterns:

**Autonomous Coding Agent:**
1. Agent calls `get_my_tasks` to see assigned work
2. Agent calls `start_session` with the task ID
3. Agent calls `get_context` to understand the full picture
4. Agent does the coding work (outside Pith)
5. Agent calls `update_task` to set status = in_review
6. Agent calls `add_comment` with summary of changes and PR link
7. Agent calls `end_session` with a work summary

### Agent Safety

- Agent sessions have configurable max duration (default: 4 hours)
- All agent actions during a session are recorded in the activity feed
- Sessions track which tasks were touched for review

### Deliverables

- Session start/end API endpoints
- Session duration limits
- Task-touch tracking within sessions
- Session summary storage
- Activity log integration (session.started, session.ended events)
