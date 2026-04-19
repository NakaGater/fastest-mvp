---
name: browser-qa
description: >
  Use after security-scan passes, at Phase 4. Launches the app,
  exercises the primary user flows from docs/user-stories.md in a
  headless Chromium via Playwright, captures console/network errors,
  takes screenshots, and writes a QA report. Blocks Phase 5 on
  critical regressions.
---

# browser-qa

Unit tests say the code is self-consistent; browser QA says the app
actually runs. Many failure modes (CSS breakage, missing env vars,
client-side routing bugs) are invisible to unit tests but obvious in
a 30-second walkthrough.

## Inputs

- `docs/user-stories.md` (primary user flows derive from stories)
- `docs/plan.md` (which tasks built the flows in question)
- `docs/design/approved/` (visual baseline — compare rendered pages
  to the GAN-approved design)
- Repo with the full implementation

## Output

- `docs/qa-report.md`
- `.dashboard/qa/` — screenshots and per-flow traces
- `tests/e2e/*.spec.ts` (or equivalent) — reusable Playwright specs
  saved for future runs

## Scope

Keep QA to the **critical path**: every M1 user story gets at least
one flow. Do not try to exhaustively test every form and edge case —
that's a v2 investment. Target: 5-15 flows for a typical v1.

## Flows to generate

For each M1 user story, generate at minimum:

1. **Happy path** — the user story's main success scenario.
2. **One failure** — the most likely thing that can go wrong in that
   flow (validation error, missing resource, auth required).

For the app overall, add:

- **First visit (unauthenticated)** — does the landing render without
  errors?
- **Signup / signin** — auth happy path.
- **404** — does the 404 page render?
- **Mobile viewport pass** — run one canonical flow at 375px and
  verify no horizontal scroll / clipped content.

## Behavior

1. Read inputs, enumerate target flows.
2. Start the dev server in the background:

   ```bash
   npm run dev &
   # or: npm run build && npm run start &
   ```

   Wait for the server to accept connections. Prefer a health check
   over `sleep`.
3. For each flow, generate a Playwright spec in `tests/e2e/`:

   ```ts
   import { test, expect } from '@playwright/test';

   test('US-1: create a note (happy path)', async ({ page }) => {
     const errors: string[] = [];
     page.on('pageerror', (e) => errors.push(e.message));
     page.on('console', (m) => {
       if (m.type() === 'error') errors.push(m.text());
     });

     await page.goto('http://localhost:3000/');
     await page.click('role=button[name=/sign in/i]');
     await page.fill('input[name=email]', 'qa@example.com');
     await page.fill('input[name=password]', 'correct-horse-battery');
     await page.click('role=button[name=/continue/i]');
     await expect(page).toHaveURL(/\/app$/);
     await page.click('role=button[name=/new note/i]');
     await page.fill('textarea', 'hello from qa');
     await page.click('role=button[name=/save/i]');
     await expect(page.getByText('hello from qa')).toBeVisible();

     expect(errors, 'no console/page errors').toEqual([]);
   });
   ```

4. Run the specs with `playwright test --reporter=json` and capture
   the output.
5. For each flow that fails, take a full-page screenshot at the point
   of failure and save it to `.dashboard/qa/{flow-slug}-fail.png`.
6. Compare rendered screenshots to `docs/design/approved/` using a
   coarse visual-diff (SSIM or pixel delta > 5% tolerance on key
   regions). Flag large deltas as a `visual-regression` finding.
7. Aggregate into `docs/qa-report.md`.
8. Decide the gate:
   - Any `critical` failure (auth path broken, primary flow fails,
     5xx on any page): block Phase 5.
   - `warning` findings (console warnings, minor visual drift,
     accessibility nits): record but do not block.

## Severity rubric

| Level | Examples |
|---|---|
| `critical` | Happy path for any M1 story fails; 5xx on any page reached during QA; auth loop; app fails to start. |
| `high` | Form validation silently fails; user sees a blank area where content should render; mobile layout unusable. |
| `medium` | Console errors that don't prevent completion; visual drift >5% in non-critical region. |
| `low` | Non-blocking console warnings; accessibility nits (missing alt text, low contrast on non-critical text). |

Critical blocks. High blocks unless the user explicitly overrides.
Medium/low are noted in the PR description by `shipping`.

## Hard rules

1. **Do not commit test credentials.** Fixtures use seed data
   generated at test-start; no real credentials in specs.
2. **Do not set long sleeps.** Use `waitFor` with semantic matchers
   (`toBeVisible`, `toHaveURL`). See tdd anti-pattern A7.
3. **Kill background servers.** Always `kill` or `trap EXIT` the dev
   server after QA completes. A stray process wastes tokens on every
   subsequent hook.
4. **Do not modify production code** to make QA pass. If a flow
   fails, that's a regression — escalate, don't paper over.
5. **Headless only.** No visible browser windows; a subagent has no
   display.

## Output file structure

```markdown
# QA report — {project}

## Summary
- Flows tested: {n}
- Passed: {n}
- Failed: {n}
- Critical failures: {n}   (BLOCKING if > 0)

Run date: {timestamp}
Playwright version: {v}
Test server: {url}
Base commit: {sha}

## Per-flow results

### US-1 happy path — create a note
- Status: PASS
- Screenshots: .dashboard/qa/us-1-happy.png (passing)
- Console errors: 0
- Network errors: 0
- Duration: 2.3s

### US-2 happy path — share a note
- Status: FAIL (critical)
- Failure: expected page.getByText('Shared with') visible, received not visible
- Screenshot at failure: .dashboard/qa/us-2-happy-fail.png
- Console errors observed:
  - "TypeError: Cannot read properties of undefined (reading 'email')"
- Suggested cause: {1-2 lines from code inspection}

... (one per flow)

## Visual regression vs. approved design
- Landing page (desktop 1440): 2.1% delta — PASS
- App primary view (desktop): 7.4% delta — WARNING
  - regions changed: sidebar width
- Auth page (mobile 375): PASS

## Accessibility spot checks
- Tab order follows visual order on auth page: PASS
- All form inputs have labels: PASS
- Color contrast on body text: PASS (verified from GAN-design report)

## Recommended for shipping PR description
{bulleted items the shipping skill should include as known limitations}
```

## Reusing the specs

The `tests/e2e/*.spec.ts` files are committed. On future runs (CI,
pre-push hook, manual), `npx playwright test` reruns them. The
browser-qa skill REGENERATES specs only for new or changed user
stories — it does not rewrite existing passing specs.

## Environment / config

- `BASE_URL` env var for the dev server URL (default
  `http://localhost:3000`)
- Creates `.env.test` if missing, seeded from `.env.example`
- Seeds a test user via the app's signup endpoint OR a DB seed
  script, whichever exists. Never hardcodes credentials.

## Escalation

If the dev server can't start:

> Browser QA could not start the dev server. stderr captured to
> .dashboard/qa/dev-server.log. Likely cause: {1-line guess}.
> Autonomous work is paused. Please resolve and re-run.

If a critical flow fails and the cause is non-obvious, escalate with:

- The failing test
- The stack trace from the test run
- The last 50 lines of server log
- The screenshot at failure

## Completion

If no critical failures remain:

1. Save `docs/qa-report.md` and screenshots under `.dashboard/qa/`.
2. Commit the spec files:

   ```
   [verify] test(e2e): add browser QA specs ({n} flows)
   ```

3. Commit the report:

   ```
   [verify] docs: add QA report ({n} PASS, {n} warnings)
   ```

4. Kill the dev server.
5. Record `phase-complete --phase verify` + `phase-start --phase ship`.
6. Meta-skill chain advances to `shipping`.

If critical failures remain:

1. Save the partial report.
2. Emit `escalation --task browser-qa --reason "critical: {summary}"`.
3. Wait for human input.
