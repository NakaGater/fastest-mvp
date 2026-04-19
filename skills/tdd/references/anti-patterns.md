# TDD anti-patterns reference

Catalog of common ways TDD goes wrong in Claude-driven development.
Reviewers use this to identify shortcuts.

## A1. Retroactive tests

**Smell:** Tests were written after the implementation. They pass on
first run. They mirror the implementation's shape rather than the
behavior's shape.

**Detection:** The test's assertions literally restate the code's
branches. `if x then y` in code, `expect(fn(x)).toBe(y)` with the
same conditions in tests.

**Fix:** Delete the tests, specify the behavior from the caller's
perspective ("given ___, the caller should observe ___"), and rewrite
the tests. Only then touch the implementation.

## A2. Tautological assertions

**Smell:** `expect(true).toBe(true)`, `expect(value).toBeDefined()` on
a hard-coded value, `expect(1 + 1).toBe(2)`.

**Detection:** Test passes even if all production code is deleted.

**Fix:** The test must fail if the behavior is removed. If it doesn't,
it asserts nothing useful.

## A3. Testing implementation details

**Smell:** Tests spy on private methods, check call counts on internal
helpers, or assert the shape of intermediate data structures.

**Detection:** Renaming a private helper breaks a test.

**Fix:** Test through the public API. If the only way to verify a
behavior is through an internal, you may have an abstraction problem —
consider if the internal should be public, or the test should be at a
different layer.

## A4. Over-mocked tests

**Smell:** The test mocks every collaborator, runs the system-under-
test against the mocks, and asserts that the mocks were called. The
mocks are just a restatement of the code's structure.

**Detection:** If a mock's behavior changes in a way real code could,
the test still passes.

**Fix:** Mock only at trust/process boundaries (databases, external
APIs, clocks). Use real objects for internal collaborators.

## A5. Fragile assertions

**Smell:** `expect(html).toBe('<div class="...">...')` matching exact
markup. `expect(obj).toEqual({...huge object...})`.

**Detection:** Any cosmetic change breaks the test.

**Fix:** Assert the *behavior*. Use structural helpers like
`screen.getByRole('button', { name: /submit/i })` for UI. Use
`toMatchObject` with only the fields you care about.

## A6. Skipping RED

**Smell:** Implementation and test land in the same commit, with no
evidence the test was ever red.

**Detection:** Hard to detect after the fact. Watch for it in review.

**Fix:** Separate commits or visible evidence (screenshot, test
output) that the test failed before implementation.

## A7. Sleeping instead of waiting

**Smell:** `await sleep(500)` in tests to "wait for the thing to
happen".

**Detection:** Occasional flaky failures in CI. Tests pass locally
but time out under load.

**Fix:** Use deterministic waits: `waitFor(() => expect(...))`,
polling with a timeout, or event-based signaling. Sleeps hide race
conditions rather than solving them.

## A8. Shared mutable state across tests

**Smell:** Test order matters. Running one test in isolation fails;
running after its neighbor passes.

**Detection:** `pytest --random-order` or equivalent surfaces it.

**Fix:** Reset state (database, globals, mocks) in `beforeEach` /
`setUp`. Prefer fresh fixtures over reused ones.

## A9. "It's too hard to test, skip it"

**Smell:** A comment like `// tested manually` or the implementer
subagent returning `DONE_WITH_CONCERNS — skipped tests because...`.

**Detection:** Follow-ups file grows, bug count grows.

**Fix:** If it cannot be unit-tested, can it be integration-tested?
Contract-tested? E2E-tested in `browser-qa`? If truly none of these,
the code likely has a testability problem — inject dependencies, split
side effects from pure logic.

## A10. Commented-out failing tests

**Smell:** A test is disabled with `.skip` or commented out to "fix
later".

**Detection:** Grep for `xit`, `it.skip`, `describe.skip`, `# pytest.mark.skip`.

**Fix:** Either delete the test (with reason in the commit) or make
it pass. Never leave a skipped test without a linked issue.

## How reviewers use this

The quality-reviewer subagent's "TESTS" rubric maps to A1, A2, A3,
A7, A10 in particular. When returning a finding, reference the
anti-pattern ID for clarity:

> Finding: high — `src/foo.test.ts:42` — A2 tautological assertion.
> The test will pass even if `computeFoo` always returns undefined.
