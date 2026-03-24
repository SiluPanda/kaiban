# Contributing to Pith

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Set up PostgreSQL and configure `DATABASE_URL` in `.env`
5. Run migrations: `npm run db:migrate`
6. Run tests: `npm test`

## Development

```bash
npm run dev    # Start API server with hot reload
```

Swagger docs: http://localhost:3456/docs

## Making Changes

1. Create a branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Add tests for new functionality
4. Run `npm test` to verify all tests pass
5. Commit with a descriptive message: `feat: add my feature`
6. Push and open a pull request

## Commit Convention

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `chore:` — Maintenance
- `test:` — Test changes

## Code Style

- TypeScript strict mode
- Zod for runtime validation
- Fastify plugins for route modules
- Match existing patterns in the codebase

## Testing

- All tests must pass before merging
- Write integration tests for API endpoints
- Test both happy path and error cases
- Use `packages/server/src/__tests__/helpers.ts` for test utilities
