# Task: Summary Generation & Project Analytics

**Phase:** 3 - Ecosystem (Weeks 9-12)
**Status:** pending

## Description

Implement AI-powered summary generation and project analytics using the Vercel AI SDK.

### Features

- **Summary Generation**: Generate sprint/project summaries from activity data using `generateText()` with activity log and task state as context
- **Project Analytics**: Task completion rates, agent vs. human contribution metrics, velocity tracking

### Requirements

- Summaries generated on-demand (not blocking)
- Graceful degradation when AI is unavailable (show raw stats instead)
- Analytics data queryable via API

### Deliverables

- Sprint/project summary generation endpoint
- Summary display in web UI
- Project analytics API endpoints
- Analytics dashboard view in web UI
