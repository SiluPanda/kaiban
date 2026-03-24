# Task: MCP HTTP/SSE Transport

**Phase:** 2 - AI & Polish (Weeks 5-8)
**Status:** pending

## Description

Add HTTP/SSE (Streamable HTTP) transport to the MCP server alongside the existing stdio transport.

### Use Case

Remote agents, shared team setups, and cloud-hosted Kaiban instances. Supports stateful sessions and authentication via Bearer tokens.

### Requirements

- HTTP/SSE transport per the MCP spec (Streamable HTTP)
- Bearer token authentication
- Stateful sessions support
- All existing MCP tools and resources accessible via HTTP transport
- Same tool behavior regardless of transport

### Deliverables

- HTTP/SSE transport implementation in `packages/mcp-server`
- Bearer token auth integration
- Transport selection based on configuration
- Documentation for configuring remote MCP access
