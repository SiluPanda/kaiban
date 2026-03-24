# AI Configuration Guide

Pith's AI features are optional. When configured, they provide task decomposition, smart triage, context assembly, and effort estimation.

## Provider Setup

Configure via environment variables:

| Variable | Example | Description |
|----------|---------|-------------|
| `PITH_AI_PROVIDER` | `anthropic` | Provider name |
| `PITH_AI_MODEL` | `claude-sonnet-4-20250514` | Model identifier |
| `PITH_AI_API_KEY` | `sk-ant-...` | API key |
| `PITH_AI_BASE_URL` | (optional) | Custom API endpoint |

Or via CLI:

```bash
pith config set ai.provider anthropic
pith config set ai.model claude-sonnet-4-20250514
pith config set ai.apiKey sk-ant-...
```

## Supported Providers

### Anthropic

```bash
PITH_AI_PROVIDER=anthropic
PITH_AI_MODEL=claude-sonnet-4-20250514
PITH_AI_API_KEY=sk-ant-...
```

### OpenAI

```bash
PITH_AI_PROVIDER=openai
PITH_AI_MODEL=gpt-4o
PITH_AI_API_KEY=sk-...
```

### Google

```bash
PITH_AI_PROVIDER=google
PITH_AI_MODEL=gemini-2.0-flash
PITH_AI_API_KEY=...
```

### OpenRouter

```bash
PITH_AI_PROVIDER=openrouter
PITH_AI_MODEL=anthropic/claude-sonnet-4-20250514
PITH_AI_API_KEY=sk-or-...
```

### Ollama (Local)

```bash
PITH_AI_PROVIDER=ollama
PITH_AI_MODEL=llama3
PITH_AI_BASE_URL=http://localhost:11434/v1
```

No API key needed for Ollama.

## AI Features

### Task Decomposition

Break large tasks into actionable subtasks:

```bash
pith task decompose <task-id>
```

API: `POST /api/v1/ai/decompose`

### Smart Triage

Get priority and label suggestions:

API: `POST /api/v1/ai/triage`

### Context Assembly

Build a briefing for a task:

```bash
pith task context <task-id>
```

API: `POST /api/v1/ai/context/<task-id>`

### Effort Estimation

Get time estimates:

API: `POST /api/v1/ai/estimate`

## Graceful Degradation

All AI features return `422 AI_UNAVAILABLE` when AI is not configured. No AI call ever blocks a user action. Check status:

```bash
curl -H "Authorization: Bearer kb_..." http://localhost:3456/api/v1/ai/status
```

## Installing Provider SDKs

Provider packages are peer dependencies. Install only what you use:

```bash
# For Anthropic
npm install @ai-sdk/anthropic

# For OpenAI / OpenRouter / Ollama
npm install @ai-sdk/openai

# For Google
npm install @ai-sdk/google
```
