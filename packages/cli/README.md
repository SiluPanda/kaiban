# @pith/cli

Command-line interface for [Pith](https://github.com/pith-dev/pith) — AI-Native Task Management.

## Install

```bash
npx @pith/cli --help
```

## Configuration

```bash
pith config set apiUrl http://localhost:3456
pith config set apiKey kb_your_api_key
pith config set project my-project
```

## Commands

- `pith project list/create/show` — Manage projects
- `pith task list/create/show/update/comment` — Manage tasks
- `pith task decompose/context` — AI-powered features
- `pith session start/end/list/show` — Agent sessions
- `pith search <query>` — Full-text search
- `pith config show/set/get` — Configuration

All commands support `--json` for machine-readable output.

See [full CLI reference](https://github.com/pith-dev/pith/blob/main/docs/cli-reference.md).
