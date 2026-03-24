# Setup Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm 10+

## Quick Start with Docker

```bash
cd docker
docker compose up -d
```

This starts PostgreSQL and the Pith API server. The API is available at `http://localhost:3456`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://pith:pith-secret@postgres:5432/pith` | PostgreSQL connection string |
| `JWT_SECRET` | `change-me-in-production` | Secret for JWT token signing |
| `PORT` | `3456` | API server port |
| `HOST` | `0.0.0.0` | API server host |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |

## Development Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/pith.git
cd pith
npm install
```

### 2. Configure database

Create a `.env` file in the project root:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pith
JWT_SECRET=dev-secret
```

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. Seed sample data (optional)

```bash
npm run db:seed
```

### 5. Start development server

```bash
npm run dev
```

The API is now running at `http://localhost:3456`. Swagger docs are at `http://localhost:3456/docs`.

## Bare Metal Deployment

### 1. Install dependencies

```bash
npm ci
```

### 2. Configure environment

Set the environment variables listed above via your system's environment or a `.env` file.

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. Start the server

```bash
npm run dev
```

For production, use a process manager like PM2:

```bash
npx pm2 start "npx tsx packages/server/src/index.ts" --name pith-api
```

## Verify Installation

```bash
curl http://localhost:3456/health
# {"status":"ok","database":"connected"}
```

## Create Your First User

```bash
# Using the API directly (no auth required for initial admin setup via seed)
npm run db:seed
```

The seed creates three users:
- `admin@pith.dev` (admin role)
- `alice@pith.dev` (member role)
- `claude@agent.pith.dev` (agent role)
