---
name: subagent-development
description: >
  Use after planning has produced docs/plan.md and design is approved
  (Gate 3). Orchestrates implementation by dispatching one subagent per
  task: implementer -> spec-reviewer -> quality-reviewer. The
  orchestrator (you) does NOT write implementation code — only
  dispatches, reviews statuses, and commits.
---

# subagent-development

Phase 3 (Build) orchestrator. For each task in `docs/plan.md` you:

1. Dispatch an **implementer** subagent with `implementer-prompt.md`
2. When implementer returns `DONE`, dispatch a **spec-reviewer** with
   `spec-reviewer-prompt.md`
3. When spec-reviewer passes, dispatch a **quality-reviewer** with
   `quality-reviewer-prompt.md`
4. When both pass, mark the task complete in TodoWrite and commit
5. Move to the next task

The orchestrator NEVER writes implementation code itself. Its entire
job is dispatch and coordination. This keeps your context clean and
lets each subagent work in a focused, isolated context.

## Pre-flight check (MUST run before dispatching any task)

Before starting the dispatch loop, verify that Phase 2 completed
fully. Check for the following artifacts:

1. `docs/design-system.md` exists — if missing, invoke `design-system`.
2. `docs/design/approved/` directory exists and contains at least one
   HTML file — if missing, invoke `gan-design` then
   `design-playground`.
3. Gate 3 (design) was approved — check `.dashboard/events.jsonl` for
   a `gate-approved` event with `gate: design`.

If ANY check fails, do NOT proceed with the dispatch loop. Instead:

> Phase 2 incomplete: {missing artifact}. Returning to the Design
> phase to complete the missing step(s).

Resume from the earliest missing skill in Phase 2.

## Inputs

- `docs/plan.md` (required)
- `docs/prd.md` and `docs/architecture.md` (passed to subagents for
  context)
- `docs/design-system.md` or approved playground HTML (for UI tasks)

## Task state — board.jsonl (v0.5+)

Task state lives in `.board/board.jsonl` — an append-only event log
managed by `scripts/board.js`. TodoWrite is a convenience layer for
the current turn; the board is the source of truth across turns,
resumptions, and parallel worktrees.

On first entry (or when the plan changes), seed the board:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/subagent-development/scripts/board.js init --from docs/plan.md
```

For every dispatch: ask the board for the next actionable task:

```bash
node scripts/board.js next
```

Claim before dispatching (prevents double-claim in parallel
scenarios):

```bash
node scripts/board.js claim T4 --agent implementer
```

Complete after commits:

```bash
node scripts/board.js complete T4 --status DONE --sha abc1234
```

On block / escalation:

```bash
node scripts/board.js block T4 --reason "needs decision from human about X"
```

The board replays its events each call, so state is consistent even
across separate processes. No locking needed — append is atomic on
POSIX line length limits.

## Dispatch loop

Pseudocode:

```
board.init(from="docs/plan.md")
while True:
    task = board.next()
    if task is None: break

    board.claim(task.id, agent="implementer")
    todo.add(task); todo.mark(task, in_progress)

    loop up to 3 times:
        result = dispatch(implementer, task)
        if result.status == DONE: break
        if result.status == NEEDS_CONTEXT:
            attach more context and redispatch
        if result.status == BLOCKED:
            split task or escalate; break
        if result.status == DONE_WITH_CONCERNS:
            log concerns; break

    if result.status != DONE and != DONE_WITH_CONCERNS:
        escalate to human
        continue

    # --- TDD verification gate (MANDATORY) ---
    if result.RED_EVIDENCE is missing or empty:
        redispatch implementer with message:
            "Report rejected: RED_EVIDENCE is missing. You MUST
             write a failing test FIRST, run it, record the failing
             output, then implement. Resubmit with valid RED_EVIDENCE."
        tdd_retry_count += 1
        if tdd_retry_count >= 2:
            log "TDD compliance failure after 2 attempts"
            mark as DONE_WITH_CONCERNS
            # proceed to reviewers anyway — they will also check
    # --- end TDD gate ---

    spec_result = dispatch(spec-reviewer, task, implementer_output)
    if spec_result.status != PASS:
        redispatch implementer with spec_result.findings

    quality_result = dispatch(quality-reviewer, task, implementer_output)
    if quality_result.status != PASS:
        redispatch implementer with quality_result.findings

    commit(f"[build] {task.commit_message}")
    board.complete(task.id, status="DONE", sha=current_sha())
    todo.mark(task, completed)
```

## Status protocol (subagents must return one)

| Status | Meaning | Next action |
|---|---|---|
| `DONE` | Task complete, tests pass | Move to reviewers |
| `DONE_WITH_CONCERNS` | Complete but surfaced follow-ups | Log in `docs/follow-ups.md`; move on |
| `BLOCKED` | Cannot proceed (missing dep, ambiguous spec) | Split task or escalate |
| `NEEDS_CONTEXT` | Need more info | Attach context, redispatch |

## Escalation rules

Escalate to the human (stop autonomous run) if:

- Same task returns `BLOCKED` twice in a row after splitting
- 3 consecutive tasks return `DONE_WITH_CONCERNS`
- A security-critical concern is surfaced by either reviewer
- The cumulative failed-review-retry count exceeds 10 for the session

When escalating, post the task title, the reason, the last subagent's
full report, and a recommended next step. Then wait for human input.

## Two-stage review rationale

- **Spec review** answers "does this actually implement the task as
  specified?" — it checks behavior against the task definition.
- **Quality review** answers "is the code well-structured, secure, and
  maintainable?" — it checks craftsmanship.

Splitting these prevents the two concerns from getting tangled. A
subagent can fix spec issues without triggering a rewrite for style,
and vice versa.

## Commit convention

Each task commit:

```
[build] {type}({area}): {short description}

Task: {N} — {title from plan.md}
```

Where `type` is `feat` / `fix` / `refactor` / `test` / `chore` and
`area` is the top-level module name.

## Dashboard integration

The `SubagentStop` hook automatically records `task-complete` events
with token usage and duration. No action required from the
orchestrator.

## When to use subagents vs. inline work

**Use a subagent when:**
- The task has a clear, dispatchable spec in `docs/plan.md`.
- Isolating context would save tokens.
- The work is parallelizable with another task.

**Do NOT use a subagent when:**
- The user is asking a question (answer inline).
- You need to orchestrate — orchestration is the main agent's job.
- A task is so small that the dispatch overhead exceeds the work.

## References

- `implementer-prompt.md` — template for the implementer subagent
- `spec-reviewer-prompt.md` — template for the spec-reviewer subagent
- `quality-reviewer-prompt.md` — template for the quality-reviewer
  subagent

## Completion

When all tasks in `docs/plan.md` are `DONE` (or logged as
`DONE_WITH_CONCERNS`):

1. Write `docs/build-summary.md` with task outcomes.
2. Commit:

   ```
   [build] chore: complete implementation ({N}/{M} tasks DONE)
   ```

3. Meta-skill chain advances to Phase 4 (`security-scan`, `browser-qa`).
