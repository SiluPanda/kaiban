# Task: Docker Compose Setup

**Phase:** 1 - Foundation (Weeks 1-4)
**Status:** pending

## Description

Create Docker configuration for self-hosting with minimal operational overhead in the `docker/` directory.

### Requirements

- Single `docker compose up` brings up the API server, Postgres, and optionally the web UI
- Target: under 512MB RAM for small teams
- Multi-arch images (amd64/arm64)
- Node.js 20+ and PostgreSQL 16+ as base images

### Deployment Models to Support

- **Docker Compose (recommended)**: Primary deployment target
- **Bare metal / VM**: Node.js 20+ and PostgreSQL 16+ as only dependencies. No Redis, no message queue, no Elasticsearch.

### Deliverables

- `docker/Dockerfile` (multi-stage build for minimal image size)
- `docker/docker-compose.yml` (API server + PostgreSQL + optional web UI)
- Environment variable configuration
- Health checks for all services
- Volume mounts for Postgres data persistence
- Setup time target: < 5 minutes from `docker compose up` to first task
