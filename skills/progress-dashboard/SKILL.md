---
name: progress-dashboard
description: >
  Use to generate and maintain a self-contained HTML dashboard showing
  build progress, task completion, token usage, phase transitions, GAN
  iteration scores, and commit history. Auto-updates via hooks; this
  skill also documents how to read and run it manually.
---

# progress-dashboard

Humans cannot watch terminal output for hours. The dashboard gives a
single HTML page that always shows current state.

## What it tracks

- Phase progress (Discovery / Design / Build / Verify / Ship)
- Task list with status (✅ / 🔨 / ⏳ / ❌) and per-task token usage
- Cumulative token usage and estimated cost, broken down by phase
- Timeline of notable events (phase starts, gate approvals, task
  completions, GAN iterations, escalations)
- GAN design iteration scores over time (v0.2+)
- Commit history grouped by phase

## Files

```
skills/progress-dashboard/
├── SKILL.md                     # this file
└── scripts/
    ├── generate-dashboard.js    # (re)generates .dashboard/progress.html
    ├── collect-metrics.js       # aggregates events.jsonl into summary
    └── template.html            # self-contained HTML template
```

## Data flow

```
Claude Code / Copilot CLI session
  |
  | hooks fire (SessionStart, PostToolUse, SubagentStop, Stop)
  v
scripts/record-event.js
  |
  | appends one line per event
  v
.dashboard/events.jsonl
  |
  | periodic regeneration (Stop hook)
  v
scripts/generate-dashboard.js
  |
  | fills template with aggregated data
  v
.dashboard/progress.html
  |
  v
human opens in browser
```

## Event schema (what record-event.js writes)

Every line of `.dashboard/events.jsonl` is one JSON object with at
least `{ts, type}`:

| type              | extra fields |
|-------------------|--------------|
| `session-start`   | `platform` |
| `phase-start`     | `phase` |
| `phase-complete`  | `phase` |
| `gate-approved`   | `gate`, `by` |
| `tool-use`        | `tool`, `tokens.input`, `tokens.output` |
| `task-start`      | `task`, `agent` |
| `task-complete`   | `task`, `status`, `tokens` |
| `gan-iteration`   | `iteration`, `score`, `max` |
| `review-complete` | `task`, `reviewer` (`spec`\|`quality`), `result` |
| `commit`          | `sha`, `message`, `phase`, `files[]` |
| `escalation`      | `task`, `reason` |
| `turn-complete`   | `tokens_so_far` |

Readers tolerate unknown event types — never crash on them.

## Running manually

```
node skills/progress-dashboard/scripts/generate-dashboard.js
open .dashboard/progress.html
```

Because `file://` browsers cannot `fetch` local files, the dashboard
is fully regenerated each time. Ways to view:

1. **Manual refresh**: reload the page after the Stop hook fires.
2. **HTTP server**: `python -m http.server 8000` in the project root,
   then open `http://localhost:8000/.dashboard/progress.html`.
3. **Watch mode** (optional): `node scripts/generate-dashboard.js --watch`
   polls events.jsonl every 10s.

## Design constraints (all enforced in the template)

- Self-contained HTML — no CDN, no external JS, no external CSS.
- Dark theme by default.
- Each major section is collapsible.
- Escalations (`BLOCKED`, `NEEDS_CONTEXT`, security findings) are
  highlighted in the timeline.
- Commit SHAs are clickable to expand the changed-file list.
- Renders cleanly even with a small events.jsonl (cold start).

## What this skill tells the agent to do

- On session start: ensure `.dashboard/` exists. The hook does this
  via record-event.js, so no direct action is usually needed.
- When a phase completes or a gate is approved, emit a corresponding
  event (via the record-event.js CLI, not by writing to events.jsonl
  directly):

  ```
  node scripts/record-event.js gate-approved --gate prd --by human
  node scripts/record-event.js phase-start --phase design
  ```

- When a GAN iteration finishes (v0.2+), emit its score:

  ```
  node scripts/record-event.js gan-iteration --iteration 3 --score 27
  ```

- When the orchestrator escalates, emit:

  ```
  node scripts/record-event.js escalation --task "Task 4" --reason BLOCKED
  ```

## Hooks wiring

See `hooks/claude/hooks.json` and `hooks/copilot/hooks.json`. Relevant
hooks:

- `SessionStart` / `sessionStart` — initialize `.dashboard/`
- `PostToolUse` / `postToolUse` — record tool use + detect commits
- `SubagentStop` / `subagentStop` — record task-complete
- `Stop` / `sessionEnd` — regenerate HTML

## Graceful degradation

If Node is unavailable or scripts fail, the hooks do NOT block the
session — they are async (Claude Code) or short-timeout (Copilot CLI).
The dashboard is observability only, never a critical path.
