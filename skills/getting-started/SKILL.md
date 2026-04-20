---
name: getting-started
description: >
  Use when starting any conversation in this plugin's workspace.
  Establishes skill discovery rules and mandatory invocation for the
  Discovery -> Design -> Build -> Verify -> Ship workflow. Applies to
  every session before any other work begins.
---

# getting-started (meta-skill)

This skill is the bootstrap entry point for the `fastest-mvp` plugin. It is
injected automatically at the start of every session via the `SessionStart`
hook. Your job is to read the rules below and apply them for the rest of
the conversation.

## Core rules (MUST follow)

1. **Skill-first.** Before doing creative work (creating features, building
   components, adding functionality, starting a new project), you MUST
   invoke the matching skill. If a skill matches with >=1% probability,
   invoke it. Do not answer from prior knowledge.

2. **Discovery before anything else.** Whenever the user expresses an
   intent to *build*, *create*, *make*, *start*, or *prototype* anything
   new, you MUST invoke `discovery-dialogue` first. Do not jump into
   implementation, architecture, or technology selection without
   completing Discovery.

3. **Phase gates are human-controlled.** Three gates require explicit
   human approval; do not cross them autonomously:
   - **Gate 1 (PRD approval)** after `prd-generation`
   - **Gate 2 (tech stack)** after `tech-selection` — only for
     engineer-mode users; non-engineers skip this gate
   - **Gate 3 (design approval)** after `design-playground`

4. **Everything else is autonomous.** Between the gates, Phase 2 (Design)
   and Phases 3-5 (Build, Verify, Ship) run without asking for human
   approval on each step. The only reasons to stop are `BLOCKED` or
   `NEEDS_CONTEXT` statuses from subagents, or critical QA failures.

5. **Subagent exemption (SUBAGENT-STOP gate).** If you were started as a
   subagent (e.g., via the Task tool), SKIP this meta-skill and the
   auto-chaining rules. Execute only the prompt you were given. The
   orchestrator above you is responsible for skill chaining.

## Cross-cutting skills (usable in any phase)

- `systematic-debugging` — when a test / QA / build unexpectedly
  fails, run the 4-phase cycle (Reproduce -> Localize -> Understand
  -> Fix) instead of guessing. Mandatory before any destructive
  git operation.
- `learnings` — at the end of notable sessions, capture what was
  learned. Already-recorded learnings are loaded automatically at
  session start (see "Prior learnings" in this context, if any).
- `using-git-worktrees` — for parallel subagent work or long-running
  processes needing isolation.

## Phase chain (auto-invocation order)

**Every step below is MANDATORY. Do NOT skip any step.**

### Phase 1 — Discovery (human-driven)

| Step | Skill | Required output | Skip? |
|------|-------|-----------------|-------|
| 1.1 | `discovery-dialogue` | `docs/discovery-notes.md` | NO |
| 1.2 | `ceo-challenge` | `docs/scope-decisions.md` | NO |
| 1.3 | `user-story-generation` | `docs/user-stories.md` | NO |
| 1.4 | `prd-generation` | `docs/prd.md` | NO |

**★ GATE 1: Human approves PRD. Do not proceed without approval.**

### Phase 2 — Design (mostly autonomous, ALL 7 steps required)

| Step | Skill | Required output | Skip? |
|------|-------|-----------------|-------|
| 2.1 | `search-first` | `docs/search-first.md` | NO |
| 2.2 | `tech-selection` | `docs/tech-selection.md` | NO |
| 2.3 | `architecture-design` | `docs/architecture.md` + `docs/adr/*.md` | NO |
| 2.4 | `design-system` | `docs/design-system.md` + `docs/design/tokens-preview.html` | NO |
| 2.5 | `planning` | `docs/plan.md` | NO |
| 2.6 | `gan-design` | `docs/design/approved/` (non-empty) | NO |
| 2.7 | `design-playground` | Gate 3 approved | NO |

**★ GATE 2: Tech stack (engineers only, after step 2.2).**
**★ GATE 3: Human approves design (after step 2.7). Do not start Build without this.**

Execute steps 2.1 through 2.7 **IN ORDER**. Each step's Completion
section names the next skill explicitly. If a step's output file
already exists from a prior session, read it and proceed to the next
step — but never skip a step whose output is missing.

### Phase 3 — Build (fully autonomous)

| Step | Skill | Required output | Skip? |
|------|-------|-----------------|-------|
| 3.1 | `subagent-development` | Source code, tests, commits | NO |

Uses `tdd` skill internally. Commits after each reviewed task.

### Phase 4 — Verify (fully autonomous)

| Step | Skill | Required output | Skip? |
|------|-------|-----------------|-------|
| 4.1 | `security-scan` | `docs/security-report.md` | NO |
| 4.2 | `browser-qa` | `docs/qa-report.md` + `tests/e2e/*.spec.ts` | NO |

### Phase 5 — Ship (fully autonomous)

| Step | Skill | Required output | Skip? |
|------|-------|-----------------|-------|
| 5.1 | `shipping` | GitHub PR | NO |

## Phase transition checklists

Before crossing a phase boundary, verify all required outputs exist.

### Design → Build transition checklist

Before ANY Phase 3 work, verify ALL of these:

- [ ] `docs/search-first.md` exists
- [ ] `docs/tech-selection.md` exists
- [ ] `docs/architecture.md` exists
- [ ] `docs/design-system.md` exists
- [ ] `docs/plan.md` exists
- [ ] `docs/design/approved/` exists and is non-empty
- [ ] Gate 3 (design) recorded in `.dashboard/events.jsonl`

If ANY item is missing, return to the earliest missing step in
Phase 2. Do NOT start Phase 3 with an incomplete Design phase.

### Build → Verify transition checklist

- [ ] All tasks in `docs/plan.md` are DONE or DONE_WITH_CONCERNS
- [ ] `docs/build-summary.md` exists

### Verify → Ship transition checklist

- [ ] `docs/security-report.md` exists with 0 critical findings
- [ ] `docs/qa-report.md` exists with 0 critical failures

Skills marked `[vX.Y+]` ship in later versions. If a skill is missing,
continue with the available ones and note the omission in the progress
dashboard.

## Commit strategy (all phases)

Every phase completion MUST commit with a `[phase]` prefix in the message:

```
[discovery] docs: add PRD for {project}
[design]    feat: add plan ({n} tasks)
[build]     feat({area}): {change}
[verify]    fix(security): {issue}
[ship]      chore: prepare release {version}
```

The `PostToolUse` hook detects `git commit` commands and records them to
`.dashboard/events.jsonl` for the progress dashboard.

## Platform detection

This plugin runs on both Claude Code and Copilot CLI. The bootstrap
script (`scripts/bootstrap.js`) detects the platform from the
`COPILOT_CLI` environment variable and, for Copilot, appends the tool
mapping from `references/copilot-tools.md` to the session context.

If you see tool names like `view`, `create`, `apply_patch`, or `rg` in
the current session, you are running under Copilot CLI. Consult
`references/copilot-tools.md` for the equivalents used in skill
documents (which are written with Claude Code tool names).

## Quick status protocol

When subagents report back, they MUST use one of these statuses:

- `DONE` — task completed; move to the next
- `DONE_WITH_CONCERNS` — completed but surfaced follow-ups; orchestrator
  decides whether to address now or log
- `BLOCKED` — cannot proceed; split the task or escalate to human
- `NEEDS_CONTEXT` — insufficient context; supply more and re-dispatch

## What to do right now

1. If the user has just described an idea or feature, respond by
   invoking `discovery-dialogue`.
2. If a PRD already exists under `docs/prd.md`, continue from the
   appropriate phase based on what artifacts are present.
3. Otherwise, wait for the user and apply the rules above as they act.
