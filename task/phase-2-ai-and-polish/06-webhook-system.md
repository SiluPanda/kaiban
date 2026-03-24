# Task: Webhook System

**Phase:** 2 - AI & Polish (Weeks 5-8)
**Status:** pending

## Description

Implement a webhook system that fires on key events, enabling integration with external systems.

### Events to Support

- `task.created`
- `task.updated`
- `task.deleted`
- `comment.created`
- `session.started`
- `session.ended`
- `project.created`

### Requirements

- Webhook payloads signed with HMAC-SHA256 for verification
- Webhook URL registration per project
- Retry logic for failed deliveries
- Webhook delivery logs for debugging

### Deliverables

- Webhook registration API endpoints
- Event firing on all supported events
- HMAC-SHA256 payload signing
- Delivery retry logic
- Delivery logs
