---
name: planning
description: >
  Use after the PRD is approved and (if available) after tech-selection
  and architecture-design. Decomposes the approved work into 2-5 minute
  tasks with exact file paths, expected behaviors, dependencies, and
  verification commands. Output feeds subagent-development.
---

# planning

Break the approved work into atomic, dispatch-ready tasks. The output
is `docs/plan.md`, which `subagent-development` iterates over one task
at a time.

## Inputs

- `docs/prd.md` (approved)
- `docs/tech-selection.md` (if available)
- `docs/architecture.md` (if available)

## Task granularity rule

Each task must be completable by a subagent in **2-5 minutes**. If a
task would take longer, split it. If a task would take less than 2
minutes, combine it with a neighbor. This granularity is what makes
subagent-driven development tractable: small enough to verify, large
enough to be worth dispatching.

Heuristics for "2-5 minutes" sizing:

- Adds or modifies roughly 1-3 files.
- Has a single clear behavioral test.
- Does not span multiple architectural layers unless the layers are
  trivial (e.g., add an API route + handler + test).

## Task schema

Each task in `docs/plan.md` MUST have:

```markdown
### Task {N}: {Short imperative title}

**Files**
- `path/to/file1.ts` (create | modify | delete)
- `path/to/file2.test.ts` (create)

**Behavior**
{1-3 sentences describing what the code must do, phrased as if it
were a test assertion. This becomes the RED step in TDD.}

**Depends on**
- Task {M}

**Verify**
- `npm test -- path/to/file1.test.ts`
- `npm run typecheck`
```

## Ordering rules

1. **Foundations first.** DB schema, auth scaffolding, type definitions
   come before features that depend on them.
2. **Vertical slices over horizontal layers.** Prefer "build one small
   feature end-to-end" over "build all models, then all APIs, then all
   UIs". Vertical slices are verifiable earlier.
3. **Test-first tasks are allowed.** A task may be "write failing test
   for X" with the next task being "make X pass". This is sometimes
   cleaner than packing RED+GREEN into one task.
4. **Commit boundaries.** Each task ends with a commit. Do not author a
   task so large that the commit would mix unrelated changes.

## Behavior

1. Read the PRD and architecture docs.
2. For each user story or functional requirement, enumerate the
   implementation steps.
3. Apply the granularity rule; split or combine as needed.
4. Order tasks by dependency, then by priority (higher-value features
   first, modulo dependencies).
5. Write `docs/plan.md` with a header:

   ```markdown
   # Implementation Plan — {project_name}

   Total tasks: {N}
   Estimated time (autonomous): {N * ~4 min + review overhead}

   ## Dependency graph
   Task 1 -> Task 2, Task 3
   Task 2 -> Task 4
   ...
   ```

6. Present a one-line summary per task to the user for sanity check.
   The user may approve "proceed", or request reordering/splitting.
   This is a soft checkpoint, **not** a hard gate — default is
   "proceed in 30 seconds if no objection".

## Completion

1. Save `docs/plan.md`.
2. Commit:

   ```
   [design] feat: add implementation plan ({N} tasks)
   ```

3. Emit a `plan-ready` event so the dashboard reflects task count.
4. **Next skill: `gan-design`.** Do NOT skip this step or proceed
   directly to `subagent-development`. The GAN design loop and
   subsequent `design-playground` (Gate 3) must complete before
   Build begins.

## Common mistakes

- **Too coarse:** "Implement the auth system" — split into schema,
  signup endpoint, login endpoint, session middleware, tests.
- **Too fine:** "Add an import statement" — combine with its callsite.
- **Missing verify commands:** Every task MUST have a concrete command
  that proves the task was done. No "manually test" instructions.
- **Circular dependencies:** Ordering must be a DAG. If two tasks
  mutually depend, they are actually one task — merge them.
