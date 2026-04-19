---
name: systematic-debugging
description: >
  Use when something that worked now doesn't, or when a test or QA
  check fails unexpectedly, anywhere in Phase 3 / Phase 4. Walks
  through a 4-phase debug cycle — Reproduce, Localize, Understand,
  Fix — rather than guessing at changes. Invoke before reaching for
  destructive shortcuts like `git reset --hard` or `--no-verify`.
---

# systematic-debugging

Debugging goes wrong when we skip phases. A guess at the fix without
understanding the cause patches a symptom and plants a landmine. This
skill enforces the 4-phase cycle.

## The four phases (strict order)

```
Phase 1: Reproduce — make the failure reliable
        |
        v
Phase 2: Localize — narrow the failing region
        |
        v
Phase 3: Understand — explain why it fails
        |
        v
Phase 4: Fix — smallest change that resolves the cause
        |
        v
(Regress-proof: write a test that would have caught this)
```

Do NOT skip ahead. "Just try this" without a cause story is the
step that fails.

---

## Phase 1: Reproduce

**Goal:** make the failure reliable enough that any diagnostic
attempt produces useful signal.

### Checklist
- [ ] A single command reproduces the failure.
- [ ] The reproduction is deterministic (not "sometimes").
- [ ] Dependency versions, env vars, and seed data are captured.
- [ ] If the failure is flaky, what are the conditions under which
      it happens vs. not?

### Output of Phase 1
A note in `.debug/{slug}/repro.md`:

```markdown
# Reproduction — {issue slug}

## Command
npm test -- user.test.ts

## Expected
Test "creates user with default role" passes.

## Actual
Throws `TypeError: Cannot read property 'role' of undefined` at
src/user.ts:42.

## Conditions
- Node v20.11.0
- Clean install: npm ci before run
- No changes to .env
- Deterministic: 10/10 runs fail

## Frequency before we got here
Started failing after commit {sha} ("{subject}").
```

### If not deterministic
Before moving on, spend a bounded effort (30 min) to make it
deterministic. Enable verbose logging, reduce parallelism, fix
random seeds, pin the clock. Flaky = impossible to debug.

If still flaky after the bounded effort, write down what makes it
flaky and escalate to the human — don't guess.

---

## Phase 2: Localize

**Goal:** narrow the failing code region from "somewhere in the
system" to "this function / this line".

### Techniques (in order of cost)

1. **Bisect with git** — when the failure is a regression:
   ```bash
   git bisect start
   git bisect bad HEAD
   git bisect good {last-known-good-sha}
   git bisect run npm test -- user.test.ts
   ```
   Bisect usually finds the culprit commit in log2(N) tries.

2. **Read the stack trace.** Literally read it. The top frame in our
   code (ignoring library frames) is almost always where to look.

3. **Halve the input.** If the failure depends on data, try the
   failing case with half the data removed. Iterate.

4. **Insert deliberate failure.** Throw early in the suspected
   function and rerun. Did the error change? That confirms the
   region.

5. **Log values at the boundary.** Not `console.log('here')` — log
   the variables at function entry and exit. Remove after.

### Output of Phase 2
Append to `.debug/{slug}/localize.md`:

```markdown
## Localized to
- File: src/user.ts
- Function: buildUser()
- Line: 42 — `return { ...defaults, role: input.role.name };`

## Evidence
- Bisect found commit {sha} introduced the failure.
- That commit changed the signature of `parseRoleInput`.
- Stack trace's top-of-our-code frame is buildUser().

## Still unknown
Why `input.role` is undefined in this path.
```

---

## Phase 3: Understand

**Goal:** explain the failure in one or two sentences — a causal
chain from input to symptom.

The shape of a correct understanding:

> "When {precondition}, the function {f} produces {unexpected}
> because it assumes {assumption}, which was true before {change}
> but is no longer."

If you cannot write this sentence, you don't understand yet. Keep
investigating.

### Common gotchas

- The visible failure is a *symptom*, not the cause. A `TypeError`
  at line 42 usually means something earlier returned undefined.
- Assumption drift — a function's contract changed; a caller didn't.
- Environment drift — dev works, test/prod doesn't. Look at env
  vars, DB state, fixture differences.
- Race: two paths assume order; sometimes the order is reversed.
- Dependency update — a library's behavior changed in a minor bump.
- Date / TZ / locale — tests passing locally, failing in CI.

### Output of Phase 3
Append to `.debug/{slug}/understand.md`:

```markdown
## Root cause
When a new user signs up without a role (common path), `parseRoleInput`
returns `null`. buildUser() was not updated after parseRoleInput's
change in commit {sha} and still assumes a role object is always
present.

## Why our tests didn't catch it
The test fixture always provided a role; the signup-without-role path
had no test.
```

### ★ Do not proceed to Phase 4 without this file.

If you find yourself wanting to "just try a fix" — stop and write the
root cause first. Going back when the first fix doesn't work costs
more than writing the sentence now.

---

## Phase 4: Fix

**Goal:** smallest change that resolves the root cause, with a test
that would have caught this.

### Checklist
- [ ] The fix addresses the root cause from Phase 3, not a symptom.
- [ ] A regression test exists that would have failed without the
      fix (write it first — this is the TDD RED step).
- [ ] Run the full test suite, not just the failing test.
- [ ] Commit with a message that references the root cause:

      ```
      [verify] fix(user): handle null role in buildUser

      Root cause: parseRoleInput changed in {sha} to return null for
      users without roles; buildUser still dereferences input.role.
      Adds null-check and a regression test covering signup-without-
      role.
      ```

### Red flags — stop and reconsider

- "The fix is to wrap it in try/catch." — hiding the symptom. Why is
  the exception thrown? Fix that.
- "Downgrading the package fixes it." — may be correct, but document
  why we can't use the new version. File an issue if appropriate.
- "It works if I `git reset --hard`." — destructive; asks for
  explicit human approval per the harness rules.
- "I can just `--no-verify` the commit." — refused. Fix the hook
  failure, don't bypass it.

### Output of Phase 4
A commit (per the message format above) and the regression test.
Also append the outcome to `.debug/{slug}/fix.md`:

```markdown
## Fix commit
{sha}

## Regression test
tests/user.signup.no-role.test.ts

## Ran after fix
- Unit: PASS (167/167)
- E2E: PASS (9/9)

## Follow-ups (if any)
- Add E2E coverage for signup-without-role in next sprint.
```

---

## Bounded cost

Debugging has a time budget. When to stop and escalate:

| Phase | Budget | If over budget |
|---|---|---|
| Reproduce | 30 min | Escalate: "can't reproduce reliably; here's what I tried" |
| Localize | 2 hours | Escalate with the current narrowing + hypotheses |
| Understand | 1 hour after localize | Escalate with the root-cause candidates |
| Fix | 1 hour after understand | If failing, understanding is probably wrong — return to Phase 3 |

Total: ~4.5 hours. Beyond that, the problem is either bigger than
one session, or the hypothesis framing is wrong — both are reasons
to involve the human.

## Escalation format

```
Debug session paused at Phase {N}: {Phase name}

What happened
{1-2 sentence summary}

Repro
{command, conditions, determinism level}

What I've ruled out
- {hypothesis}: evidence against
- {hypothesis}: evidence against

Current suspicion
{best guess with low confidence}

What I need
{specific question — not "help me"}
```

## Hard rules

1. **Write down the cause BEFORE writing the fix.** Phase 3's file
   comes first.
2. **No shotgun debugging.** Changing three things at once and
   rerunning is forbidden. One change, one rerun.
3. **Preserve the debug trail.** `.debug/{slug}/` stays in the repo
   (ignored from builds via `.gitignore` if needed, but committed
   for transparency on trickier fixes).
4. **The regression test is non-negotiable** unless the fix is in a
   non-testable region (docs, config). A fix without a regression
   test is a bug waiting for its revenge.
5. **Do not use destructive git operations** to "make it go away."
   Reset, force-push, stash-drop all require explicit human
   approval per the harness rules.

## Completion

When Phase 4 succeeds:

1. Debug directory `.debug/{slug}/` contains repro/localize/
   understand/fix files.
2. Fix is committed with a root-cause-referencing message.
3. Regression test is in place.
4. Optionally delete the `.debug/{slug}/` directory if the fix is
   uncontroversial; keep it for anything tricky.
5. Return control to the skill that called this one (usually
   `subagent-development` or `browser-qa`).
