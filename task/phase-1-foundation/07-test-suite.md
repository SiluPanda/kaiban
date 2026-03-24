# Task: Test Suite - Unit & Integration Tests for API

**Phase:** 1 - Foundation (Weeks 1-4)
**Status:** pending

## Description

Set up the testing infrastructure and write comprehensive tests using Vitest + Supertest.

### Testing Scope

- **Unit tests**: Business logic, validation, data transformations, utility functions
- **Integration tests**: API endpoints against a real PostgreSQL database (no mocks for DB)
- **Test coverage**: All CRUD operations for projects, tasks, comments, activity log
- **Auth tests**: API key validation, RBAC permission checks, JWT session lifecycle

### Requirements

- Vitest as test runner (fast, Jest-compatible, native TypeScript support)
- Supertest for HTTP endpoint testing
- Test database setup/teardown helpers
- Seed data fixtures for consistent test state
- Both happy path and error/edge case coverage
- CI-friendly: all tests runnable via `npm test`

### Test Quality Bar (from CLAUDE.md)

- Tests verify behavior, not implementation details
- Mock external dependencies (AI providers) but test logic thoroughly
- Test both happy path and error/edge cases
- Follow existing test patterns in `src/__tests__/`

### Deliverables

- Vitest configuration
- Test database setup utilities
- Seed data fixtures
- Unit tests for core business logic
- Integration tests for all API endpoints
- Auth and RBAC test coverage
