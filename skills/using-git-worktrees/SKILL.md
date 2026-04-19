---
name: using-git-worktrees
description: >
  Use when a build would benefit from parallel or isolated work —
  e.g., subagent-development dispatching independent tasks, or a
  human wanting to keep the current branch stable while exploring
  an alternative. Covers creating, switching, listing, and cleaning
  up git worktrees safely.
---

# using-git-worktrees

Git worktrees let one repository have multiple working directories
checked out to different branches simultaneously. For autonomous
builds, this means:

- A subagent can work on Task 4 while the orchestrator inspects the
  state of Task 3 in a different worktree — no stash juggling.
- An experimental branch can be spun up for a spike without
  disturbing the main feature branch.
- Long-running processes (dev server, Playwright) can run in one
  worktree while edits happen in another.

## When to use worktrees

**Good reasons:**
- Parallel subagent tasks that cannot reuse the same dirty tree.
- Running a long process (dev server, test watcher, Playwright) in
  isolation while edits continue elsewhere.
- Human asks for a spike ("try this direction without committing to
  it").
- Bisecting / comparing two branches side-by-side.

**Bad reasons:**
- Every task. Worktrees have overhead; for sequential work, branches
  on a single working tree are simpler.
- Avoiding commits. Commits are how we record decisions; a worktree
  is not a substitute for committing.
- "Because it feels safer." Work in the main tree unless an explicit
  reason applies.

## Commands

### List
```bash
git worktree list
```

### Create
```bash
# For a new branch:
git worktree add ../{project}-{slug} -b {branch-name}

# For an existing branch (already on remote or local):
git worktree add ../{project}-{slug} {branch-name}
```

The path convention is **adjacent directories with a suffix**. Do
not nest worktrees inside each other — that breaks git internals.

### Remove

```bash
# Clean way (rejects if dirty):
git worktree remove ../{project}-{slug}

# After the directory is gone but metadata lingers:
git worktree prune
```

### Switch

Worktrees are separate directories; "switching" is `cd`. Each
worktree has its own checked-out branch; a branch can only be
checked out in one worktree at a time.

## Safety rules

1. **Never `rm -rf` a worktree directory.** Use `git worktree remove`
   so git cleans metadata. If you must delete manually, follow up
   with `git worktree prune`.
2. **Never share a branch between worktrees.** Git refuses, but if
   someone hacks around it, commits will collide.
3. **Never commit the `.git/worktrees/` directory.** It's already
   git-internal; shouldn't be in the working tree.
4. **Confirm before removal if the worktree is dirty.** Dirty means
   uncommitted changes the user might care about. `git worktree
   remove --force` bypasses the check — do not use without asking.

## Autonomous use by subagent-development

When the orchestrator wants to dispatch 2+ parallel implementer
subagents for independent tasks:

```
for task in parallel_tasks:
    slug = sanitize(task.id)
    branch = f"parallel/{slug}"
    git worktree add ../{project}-{slug} -b {branch}

    dispatch(implementer, task, cwd=f"../{project}-{slug}")

# after all return:
for task in parallel_tasks:
    # merge the branch back
    git merge parallel/{task.id} --no-ff
    git worktree remove ../{project}-{task.id}
```

The orchestrator MUST:
- Pick genuinely independent tasks (from `docs/plan.md` dependency
  graph, tasks with no shared ancestor that's still uncommitted).
- Sequentialize the final merge. Conflicts are possible; pause if
  any.
- Clean up worktrees on completion or on abort.

## Autonomous use by gan-design

The Generator and Evaluator subagents can share the same worktree —
they produce files in `docs/design/iter-N/`, so no checkout conflict.
Worktrees are not needed for the GAN loop.

## Troubleshooting

### "fatal: '{path}' is not a working tree"
The directory has been deleted but metadata lingers. Run
`git worktree prune`.

### "fatal: '{branch}' is already checked out at '{path}'"
Another worktree has that branch. Either switch to that worktree
(`cd {path}`), or create a new branch.

### Stale `.git/worktrees/<name>` entries
```bash
git worktree list       # see all
git worktree prune -v   # clean stale
```

### Accidentally nested worktree
If `git worktree add` was run with a nested path, remove the nested
one first (`git worktree remove <nested>`), then recreate adjacent
to the main tree.

## Integration with this plugin

- **Paths:** Worktrees live one level up from the main repo, sharing
  the parent directory. Avoid absolute-path assumptions in skills;
  use `git rev-parse --show-toplevel`.
- **Dashboard:** `.dashboard/` is written to `process.cwd()`. If a
  subagent runs in a worktree, its events go to that worktree's
  dashboard. The orchestrator should consolidate at the end by
  concatenating `events.jsonl` files:
  ```bash
  cat ../{project}-*/.dashboard/events.jsonl \
    >> .dashboard/events.jsonl.tmp
  sort -u .dashboard/events.jsonl.tmp > .dashboard/events.jsonl
  ```
- **Hooks:** Hooks run in the worktree they fire in. No special
  handling needed.

## Anti-patterns

- **Spawning a worktree to "try something" and forgetting to remove
  it.** Every worktree has a branch; stale worktrees pile up stale
  branches. Remove promptly.
- **Running migrations / DB seeds in a worktree pointed at a shared
  DB.** Both worktrees connect to the same database — migrations
  ordered wrong break the tree that didn't initiate them. Use
  separate DBs per worktree if you run stateful processes.
- **Putting `node_modules` in a shared location to "save disk".**
  Lockfile drift between worktrees becomes invisible. Keep
  `node_modules` per-worktree; rely on npm/yarn cache for disk
  savings.
