# Task: Custom Views & Saved Filters

**Phase:** 4 - Growth (Post-Launch)
**Status:** pending

## Description

Allow users to create and save custom views with specific filter and sort configurations, using the existing `View` entity.

### View Entity

- id, project_id, name, filters (JSONB), sort (JSONB), created_by

### Features

- Save current filter/sort state as a named view
- Share views across team members
- Quick-switch between views
- Default views per project

### Deliverables

- View CRUD API endpoints
- View management in web UI
- CLI support for saved views (`pith task list --view "My View"`)
- Default view configuration per project
