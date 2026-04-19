# Copilot CLI Tool Mapping

Skills in this plugin are authored with Claude Code tool names. When
running under Copilot CLI, translate using the table below.

## Core translation table

| Skill authored as     | Copilot CLI equivalent         | Notes |
|-----------------------|--------------------------------|-------|
| `Read`                | `view`                         | — |
| `Write`               | `create`                       | Fails if file exists; use `apply_patch` to overwrite |
| `Edit`                | `edit` / `apply_patch`         | `apply_patch` for structural edits |
| `Bash`                | `bash`                         | Supports `async: true` |
| `Grep`                | `rg`                           | Same ripgrep semantics |
| `Glob`                | `glob`                         | — |
| `Task` (subagent)     | `task`                         | Use `agent_type` parameter |
| `TodoWrite`           | `sql` against built-in `todos` | See TodoWrite note below |
| `WebSearch`           | *(not available)*              | Fallback: `web_fetch` against a search-engine URL |
| `WebFetch`            | `web_fetch`                    | — |
| `AskUserQuestion`     | `ask_user`                     | — |
| `NotebookEdit`        | *(not available)*              | Use `apply_patch` on the `.ipynb` JSON |
| `ExitPlanMode`        | *(not available)*              | Remain in main session |

## Subagent dispatch

**Claude Code:** `Task` tool with `description` + `prompt` + `subagent_type` parameters.

**Copilot CLI:** `task` tool with `agent_type` parameter. Named agents
(e.g. `code-reviewer`) defined in `agents/` are auto-discovered by the
plugin loader and become valid `agent_type` values.

Prompt templates in this plugin (`*-prompt.md` files) are written
platform-neutral. They reference tools generically; pass them as the
subagent prompt on either platform.

## TodoWrite translation

When a skill says "use TodoWrite", under Copilot CLI:

```sql
-- create todo
INSERT INTO todos (content, status, activeForm) VALUES (...);

-- update status
UPDATE todos SET status = 'completed' WHERE content = ...;
```

## Copilot-specific extras you may use

| Tool                        | Use case |
|-----------------------------|----------|
| `bash(async: true)`         | Long-running background commands (dev server, tests) |
| `write_bash`                | Send input to a running async bash session |
| `read_agent` / `list_agents`| Inspect status of dispatched tasks |

## Environment variable differences

| Purpose            | Claude Code            | Copilot CLI           |
|--------------------|------------------------|-----------------------|
| Plugin root        | `CLAUDE_PLUGIN_ROOT`   | `COPILOT_PLUGIN_ROOT` |
| Detect platform    | *(absence of COPILOT_CLI)* | `COPILOT_CLI=1`  |

Scripts in `scripts/` resolve either variable; skill authors should
reference plugin paths via scripts, not raw env vars.
