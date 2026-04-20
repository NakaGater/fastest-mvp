---
name: gan-design
description: >
  Use after planning completes and before implementation begins.
  Orchestrates a Generator -> Evaluator feedback loop to produce
  production-grade HTML/CSS design mocks. Generator subagent writes
  the design; Evaluator subagent scores it against a 4-axis rubric
  and writes feedback. Loops 5-15 iterations until the design passes
  a configurable threshold (default 32/40).
---

# gan-design

Claude alone generates AI-slop design (purple gradients, Inter font,
centered cards). Splitting Generator and Evaluator into separate
subagents, each with isolated context, produces design comparable to
a careful human designer.

## Architecture

```
                    orchestrator (this skill)
                           |
              +------------+------------+
              |                         |
              v                         v
       Generator subagent        Evaluator subagent
       (writes HTML/CSS)         (reads HTML, screenshots,
                                  grades, writes feedback)
              ^                         |
              |_________ feedback ______|
                  file handoff
```

The orchestrator coordinates but writes no HTML/CSS itself. Both
subagents operate in fresh contexts per invocation, so the Generator
cannot "remember" past criticism — it must re-read the current
`design-feedback.md` each iteration. This matches the Anthropic
engineering blog's harness design guidance.

## Inputs

- `docs/prd.md` (required)
- `docs/design-system.md` (required — produced by design-system skill)
- `docs/plan.md` (used to identify which screens to mock)
- target screens list (orchestrator identifies 2-5 primary screens
  from the plan: landing, main app view, settings, etc.)

## Outputs

- `docs/design/iter-{N}/index.html` — Generator output per iteration
- `docs/design/iter-{N}/screenshot-*.png` — Evaluator screenshots
- `docs/design/iter-{N}/feedback.md` — Evaluator's critique
- `docs/design/approved/` — final iteration copy on success
- `docs/design/scores.jsonl` — iteration scores for the dashboard

## Configuration (defaults)

| Setting | Default | Purpose |
|---|---|---|
| `PASS_THRESHOLD` | 32 / 40 | Minimum score to proceed |
| `MAX_ITERATIONS` | 10 | Hard cap to prevent infinite loops |
| `MIN_ITERATIONS` | 3 | Don't accept the first try even if it scores high |
| `VIEWPORTS` | desktop 1440, mobile 375 | Screenshot sizes |

Override via the orchestrator's invocation prompt if needed.

## The loop (pseudocode)

```
screens = identify_screens_from_plan()

for iter in 1..MAX_ITERATIONS:
    feedback_file = f"docs/design/iter-{iter-1}/feedback.md" if iter > 1 else null

    dispatch Generator subagent with:
      - PRD excerpt
      - design-system.md
      - screens list
      - previous feedback_file
      - iteration number

    generator returns: docs/design/iter-{iter}/index.html (+ assets)

    dispatch Evaluator subagent with:
      - generator output path
      - design-system.md
      - grading-criteria.md
      - screens list

    evaluator returns: feedback.md + score_per_axis

    record event: gan-iteration, iteration=iter, score=total

    if iter >= MIN_ITERATIONS and total >= PASS_THRESHOLD:
        copy iter-{iter} -> docs/design/approved/
        commit: "[design] feat: add approved UI design (GAN iter {iter}/{MAX})"
        return approved_path

if no pass:
    escalate to human: "reached MAX_ITERATIONS, best score was {best}"
```

## Subagent responsibilities (strict split)

**Generator** (see `generator-prompt.md`):
- Writes HTML/CSS/JS only.
- Reads feedback.md and addresses each point.
- MUST NOT evaluate its own work. No "I think this looks good."
- Uses only tokens defined in `design-system.md`.

**Evaluator** (see `evaluator-prompt.md`):
- Reads generator output, takes screenshots via Playwright.
- Scores against 4 axes (see `references/grading-criteria.md`).
- Writes feedback.md with per-axis findings.
- MUST NOT propose implementations or write code. Critique only. A
  generator-evaluator split collapses if the evaluator starts fixing
  things.
- Tunes its own strictness per iteration: loose early to allow
  exploration, strict near the end.

## Screen identification heuristic

From `docs/plan.md`, extract user-visible screens in this order of
priority:

1. **Landing / marketing** (if the product has one) — first impression.
2. **Primary app view** — what users spend the most time on.
3. **Auth** (sign-in / sign-up) — always present, always AI-slop risk.
4. **Settings / profile** — information density test.
5. **Empty states** — often neglected, disproportionately important.

Pick 2-5. More than 5 loses the focus of a single iteration.

## Progress dashboard integration

Emit a `gan-iteration` event for each iteration:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/record-event.js gan-iteration \
  --iteration {N} --score {total} --max 40
```

The dashboard plots score over iterations so the human can watch the
curve converge without reading every iteration.

## Escalation

- If scores plateau (same ±1 for 3 iterations) AND under threshold,
  emit escalation event and ask the human: "scores stalled at {N};
  relax threshold, change direction, or abort?"
- If an individual axis stays at <5/10 for 3 iterations, surface it
  separately — usually a design-system problem, not a generator problem.

## Completion

When a passing design is produced:

1. Copy the winning iteration directory to `docs/design/approved/`.
2. Record `phase-complete --phase design` not yet; design still needs
   Gate 3 (Playground).
3. Commit:

   ```
   [design] feat: add approved UI design (GAN iter {N}/{MAX})
   ```

4. **Next skill: `design-playground`** (Gate 3). Invoke
   `design-playground` now. Do NOT skip to Phase 3 (Build). The human
   must approve the design before implementation begins.

## References

- `generator-prompt.md` — Generator subagent template
- `evaluator-prompt.md` — Evaluator subagent template
- `references/grading-criteria.md` — 4-axis rubric (40 points total)
