# Task: AI SDK Integration - Provider Configuration, Task Decomposition, Smart Triage

**Phase:** 2 - AI & Polish (Weeks 5-8)
**Status:** pending

## Description

Build the AI integration layer in `packages/ai` using the Vercel AI SDK for provider-agnostic model access. All AI features are optional and require user-configured provider + API key.

### Provider Configuration

Users configure via environment variables or the `pith config` command:

| Variable | Example |
|----------|---------|
| PITH_AI_PROVIDER | anthropic, openai, google, groq, ollama, openrouter |
| PITH_AI_MODEL | claude-sonnet-4-20250514, gpt-4o, gemini-2.0-flash |
| PITH_AI_API_KEY | sk-ant-..., sk-..., (empty for Ollama) |
| PITH_AI_BASE_URL | http://localhost:11434 (for Ollama / custom endpoints) |

Uses `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, etc. as peer dependencies -- users install only what they need.

### AI Features to Implement

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Task Decomposition | Break a large task into smaller sub-tasks with estimates | `generateObject()` with Zod schema |
| Smart Triage | Suggest priority, labels, and assignee for new tasks | `generateObject()` analyzing task description against project context |
| Context Assembly | Build rich context documents for agents about to work on a task | Template-based context with AI-generated summaries |
| Effort Estimation | Suggest story points / time estimates based on description and historical data | `generateObject()` with historical task data as few-shot examples |

### AI SDK Integration Pattern

All AI calls follow the same internal pattern:
1. Build a system prompt with project context
2. Construct the user message from the feature's input
3. Call AI SDK (`generateText` or `generateObject`) with the configured provider
4. Validate output against a Zod schema
5. Return structured result or gracefully degrade if AI is unavailable

**Critical rule**: No AI call blocks a user action. If AI is unconfigured or fails, the operation completes without AI enhancement and the user is notified.

### Deliverables

- Provider configuration and registry using Vercel AI SDK
- Task decomposition with structured Zod output
- Smart triage suggestions
- Context assembly for agents
- Effort estimation
- Graceful degradation when AI is unavailable
