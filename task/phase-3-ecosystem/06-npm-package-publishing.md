# Task: npm Package Publishing - @pith/cli, @pith/mcp-server

**Phase:** 3 - Ecosystem (Weeks 9-12)
**Status:** pending

## Description

Prepare and publish npm packages for the CLI and MCP server so users can install via `npx`.

### Packages

- `@pith/cli` -- CLI application installable globally
- `@pith/mcp-server` -- MCP server runnable via `npx -y @pith/mcp-server`

### Requirements

- Package.json metadata (description, keywords, repository, license)
- Proper bin entries for CLI executables
- Peer dependency declarations for AI SDK providers (users install only what they need)
- Build pipeline producing clean dist output
- Version management

### Deliverables

- npm-ready package configurations
- Build scripts for publishable packages
- CI/CD pipeline for automated publishing
- Package README files for npm registry
