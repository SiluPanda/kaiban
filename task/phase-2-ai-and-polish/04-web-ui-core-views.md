# Task: Web UI - Board View, List View, Task Detail

**Phase:** 2 - AI & Polish (Weeks 5-8)
**Status:** pending

## Description

Build the optional, lightweight React web application in `packages/web`. The UI exists for human convenience: visual board management, quick triage, and reviewing agent activity. It is NOT the primary interface -- the API, CLI, and MCP server are.

### Views to Implement

- **Board view**: Kanban-style columns by status. Drag-and-drop. Minimal and fast.
- **List view**: Sortable, filterable table of tasks. Supports bulk actions.
- **Task detail**: Full task view with description (Markdown rendered), comments, activity timeline, sub-tasks, and AI action buttons.

### Design Principles

- **No SPA framework overhead**: Vite + React, minimal dependencies
- **Dark mode by default** (developers live in dark mode)
- **Keyboard-first**: All actions accessible via keyboard shortcuts
- **Sub-200ms page loads** on all views
- **No real-time WebSocket** complexity in v1 (polling with configurable interval)
- All AI-generated content is marked as such in the UI

### Tech Stack

- React 19 + Vite 6
- REST API client with types generated from Swagger/OpenAPI schema
- No Next.js overhead -- simple admin panel

### Deliverables

- Board (Kanban) view with drag-and-drop
- List view with sorting, filtering, bulk actions
- Task detail view with Markdown rendering, comments, activity timeline
- Dark mode default
- Keyboard shortcuts
- Responsive layout
