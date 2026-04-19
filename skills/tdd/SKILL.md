---
name: tdd
description: >
  Use whenever writing or modifying any production code. Enforces the
  RED -> GREEN -> IMPROVE discipline: write a failing test first,
  minimal code to pass, then refactor. Applies to every implementer
  subagent and any inline implementation work.
---

# tdd

Test-driven development is not a suggestion. Every behavioral change
goes through RED -> GREEN -> IMPROVE.

## The three phases

### RED — Write a failing test

Write the test *before* any implementation.

1. State the behavior in the test's name: `returns 404 when user not
   found`, not `test_user_handler`.
2. Write the minimal assertion that would fail if the behavior is
   missing.
3. Run the test. Confirm it fails — and fails for the *right reason*
   (the behavior is missing), not a syntax error, missing import, or
   broken test setup.
4. If the failure is not for the right reason, fix the test plumbing
   first, then reconfirm the failure.

**Common RED mistakes:**

- Writing the test after the implementation (retrofitting). This
  defeats the purpose; the test will always pass and you can't verify
  it catches regressions.
- Writing a test that passes immediately (asserts something already
  true). If it passes without code changes, it is not exercising new
  behavior.

### GREEN — Make the test pass with minimal code

Write the *smallest* code that turns the test green. Resist the urge
to:

- Add features not demanded by the test.
- Add error handling for cases no test covers.
- Refactor before the test is green.

If the implementation feels ugly, that is FINE at this stage — it
becomes the input to IMPROVE.

### IMPROVE — Refactor with the safety net

Now that the test is green, clean up. Extract helpers, rename, delete
dead code, consolidate. Run the tests after each change. If a test
goes red, revert or fix before continuing.

Stop refactoring when:

- The code reads clearly.
- Duplication is eliminated.
- Names match the domain.

Do NOT use IMPROVE as cover for adding features. Features require a
new RED test.

## Scope of "test"

A "test" is any automated check that would fail if the behavior
regressed. Concretely:

- Unit tests (primary)
- Integration / API tests
- Contract tests (mocked external services)
- Occasionally, a typechecker assertion (`expectType<...>`)

End-to-end browser tests from `browser-qa` are NOT a substitute for
unit tests at this stage. They are a separate verification layer.

## When TDD seems impossible

You may be tempted to skip TDD for:

- "Trivial" changes — rename, config, typo. Skip TDD here is OK if
  the change cannot affect runtime behavior.
- Prototyping / spikes. Mark the code as a spike with a TODO and
  tests added within the next task.
- Legacy code without tests. Write a characterization test for the
  current behavior *before* changing it, then proceed RED-GREEN-IMPROVE.

If a specific task genuinely cannot be tested (e.g., visual design),
that task belongs in `gan-design`, `design-playground`, or
`browser-qa`, not here.

## Integration with subagent-development

The implementer subagent (`implementer-prompt.md`) MUST follow this
skill. If the subagent skips RED, it self-reports
`DONE_WITH_CONCERNS` with concern "skipped RED step" — the
orchestrator may then redispatch.

The spec-reviewer checks that tests cover acceptance criteria. The
quality-reviewer checks that tests assert behavior, not internals.
Between them, shortcuts get caught.

## References

- `references/anti-patterns.md` — common failure modes and fixes.
