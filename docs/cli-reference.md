# CLI Reference

## Installation

```bash
npx tsx packages/cli/src/index.ts <command>
# Or set up an alias:
alias pith="npx tsx packages/cli/src/index.ts"
```

## Configuration

```bash
pith config set apiUrl http://localhost:3456
pith config set apiKey kb_your_api_key
pith config set project my-project
pith config show
```

Config is stored in `.pithrc` (local or `~/.pithrc` global). Environment variables `PITH_URL`, `PITH_API_KEY`, `PITH_PROJECT` override file config.

## Commands

### Projects

```bash
pith project list [--json]
pith project create <name> --slug <slug> [--desc <description>]
pith project show <slug> [--json]
```

### Tasks

```bash
# List tasks
pith task list -p <project> [--status <status>] [--priority <P0-P3>] [--assignee <id>] [--label <label>] [-q <search>] [--json]

# Create task
pith task create <title> -p <project> [-d <description>] [--priority <P0-P3>] [-s <status>] [--assignee <id>] [--labels <a,b>] [--parent <id>]

# Show task details
pith task show <id> [--json]

# Update task
pith task update <id> [-s <status>] [--priority <P0-P3>] [--title <title>] [-d <description>] [--assignee <id>] [--labels <a,b>]

# Add comment
pith task comment <id> <text>

# AI: Decompose task into subtasks
pith task decompose <id> [--json]

# AI: Get context briefing
pith task context <id> [--json]
```

### Sessions

```bash
pith session start [--name <agent-name>] [--tasks <id1,id2>]
pith session end <session-id> [--summary <text>] [--tasks <id1,id2>]
pith session list [--limit <n>] [--json]
pith session show <session-id> [--json]
```

### Search

```bash
pith search <query> [--limit <n>] [--json]
```

### Config

```bash
pith config show
pith config set <key> <value> [-g]   # -g for global
pith config get <key>
```

Config keys: `apiUrl`, `apiKey`, `project`, `ai.provider`, `ai.model`, `ai.apiKey`, `ai.baseUrl`

## Output Formats

All list/show commands support:
- `--json` — Machine-readable JSON output
- `--output table` — Human-readable table (default)
- `--output minimal` — Tab-separated minimal output
