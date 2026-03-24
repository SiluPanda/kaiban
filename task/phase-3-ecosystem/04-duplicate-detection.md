# Task: Duplicate Detection

**Phase:** 3 - Ecosystem (Weeks 9-12)
**Status:** pending

## Description

Flag potential duplicate tasks when creating new ones.

### Implementation

- Primary: Embedding similarity via AI SDK embeddings
- Fallback: `pg_trgm` text similarity when AI is unavailable
- Triggered on task creation -- suggest potential duplicates before confirming

### Requirements

- Low latency: should not significantly slow down task creation
- Configurable similarity threshold
- Works without AI configured (falls back to pg_trgm)
- Surface duplicates in API response and CLI output

### Deliverables

- Embedding-based similarity search
- pg_trgm fallback implementation
- Duplicate suggestion in task creation API response
- Duplicate warning in CLI task create command
- Duplicate suggestion in web UI task creation form
