# tests

End-to-end verification for the fastest-mvp plugin.

## Running

```bash
bash tests/verify.sh
```

Exits 0 on full pass, non-zero with a summary of failed checks.
Requires Node.js (tested on v20+). No other dependencies.

## What it checks

### Layer 1 — static validation (9 checks)
- `.claude-plugin/plugin.json` parses and has required fields in semver form
- `.claude-plugin/marketplace.json` parses
- `hooks/claude/hooks.json` declares all 4 required hooks with Claude Code shape
- `hooks/copilot/hooks.json` declares all 4 required hooks with Copilot CLI shape (`version: 1`, `bash`/`powershell`)
- Every script path referenced by either hooks.json actually exists under the plugin root
- Every `SKILL.md` has valid front-matter (`name:` matches directory name, `description:` present)
- Every `agents/*.md` has the same

### Layer 2 — script unit tests (17 checks)
- `scripts/bootstrap.js` emits the meta-skill content in both Claude Code mode (stdout) and Copilot mode (JSON with `additionalContext`)
- `scripts/record-event.js` CLI modes (`phase-start`, `gate-approved`, `gan-iteration`) write correct events
- `scripts/record-event.js` stdin modes (`tool-use`) parse JSON and record
- `skills/progress-dashboard/scripts/collect-metrics.js` replays an event log and produces the expected derived state
- `skills/progress-dashboard/scripts/generate-dashboard.js` writes an HTML file that is self-contained (no external CDN/script references) and includes all major sections
- `skills/learnings/scripts/load-learnings.js` returns `[]` with no learnings, loads a project-local fixture, supports `--format context` markdown output
- `skills/subagent-development/scripts/board.js` parses `docs/plan.md`, picks the right next task, walks through claim/complete/block correctly, and produces correct `stats`

### Layer 3 — session simulation (7 checks)
Replays a realistic autonomous session against the scripts:

- `session-start` → Discovery phase → tool use → PRD gate approval → phase complete
- Design phase → 3 GAN iterations (scores 18, 25, 33) → design gate approval → phase complete
- Build phase → board init from plan → claim+complete T1 → claim+block T2 with escalation
- Generates the dashboard and verifies:
  - All phases/tasks/events render
  - GAN score trajectory is correctly captured
  - Board reflects `T1=done, T2=blocked, T3=pending`
  - Tokens are correctly attributed to the phase that was in-progress
  - A learning written to `.learnings/` round-trips through the loader

## Files

```
tests/
├── README.md                 # this file
├── verify.sh                 # the harness (bash)
├── lib/
│   └── check.js              # single-purpose validators used by verify.sh
└── fixtures/
    ├── plan.md               # sample plan with 3 tasks
    └── learning.md           # sample learning file
```

## Adding a check

Add a `run "<label>" <command>` line to the appropriate section of
`verify.sh`. The command should exit 0 on success, non-zero on
failure. Prefer pure bash/`node -e` one-liners over new files.

For more elaborate checks, add a subcommand to `tests/lib/check.js`.

## What this does NOT verify

- **Plugin installs in Claude Code.** That requires running the
  Claude Code CLI and loading the marketplace. Do it by pointing
  Claude Code at this repo: `/plugin marketplace add <path>`.
- **Hooks actually fire.** The hook JSON is validated and the
  referenced scripts are validated; whether Claude Code or Copilot
  CLI invokes them as configured is outside this harness.
- **Skill content is correct.** Front-matter is linted, but the
  skill bodies are read by LLMs, and LLM quality is not unit-testable.
