---
name: shipping
description: >
  Use at Phase 5, after security-scan and browser-qa pass. Produces
  the release artifacts — updated README, release notes, a GitHub
  PR with a rich description, and the deploy-preparation checklist.
  Final step before a human merges.
---

# shipping

Turn the completed build into a merge-ready release. Everything up to
this point has lived on a feature branch; this skill produces the
pull request and the surrounding documentation a reviewer needs.

## Inputs

- `docs/prd.md`
- `docs/user-stories.md`
- `docs/plan.md`
- `docs/security-report.md`
- `docs/qa-report.md`
- `docs/architecture.md`
- Commit history of the feature branch

## Outputs

- Updated `README.md` (usually replaces or augments)
- `CHANGELOG.md` entry for this release
- `.env.example` (ensured up to date with actual env var usage)
- `docs/release-notes/v{version}.md`
- GitHub pull request with structured description

## Behavior

1. Decide version: **v0.1.0** for the first release produced by this
   plugin; subsequent runs read the latest CHANGELOG entry and bump
   minor (for new stories) or patch (for fixes only). No major bumps
   without explicit human approval.
2. Update README.md:
   - What the product is (2-3 sentences from PRD §1)
   - How to run it locally (from architecture.md + actual scripts in
     package.json)
   - Required env vars (from grepping `process.env.*`)
   - Where to find more docs (link to docs/)
3. Write `docs/release-notes/v{version}.md`:
   - User-visible changes from `docs/user-stories.md` (title-level)
   - Breaking changes (none for v0.1.0; for later, diff against last)
   - Known limitations (from qa-report medium/low + security-report
     medium/low)
4. Append to CHANGELOG.md (create if missing, follow
   https://keepachangelog.com conventions):
   ```
   ## [{version}] - {YYYY-MM-DD}

   ### Added
   - {user-visible capabilities}

   ### Fixed
   - {explicit fixes, if any}

   ### Security
   - {from security-report high/critical auto-fixes}
   ```
5. Verify `.env.example` against actual env-var usage:
   - grep the repo for `process.env.*`, `os.environ[...]`, etc.
   - diff against `.env.example`
   - add any missing keys with a `# TODO: describe` comment
   - commit if changed
6. Create the PR (see next section).
7. Record `phase-complete --phase ship`.

## Pull request template

Use this structure in the PR description:

```markdown
## Summary
{1-2 sentence what and why, derived from PRD §1-§2}

## User stories delivered
- US-1: ... {link to docs/user-stories.md#us-1}
- US-2: ...
- ...

## Demo
{link to a preview deployment if available; otherwise: `npm run dev`
+ screenshot of the landing page from browser-qa}

## How to review
1. **Start here:** `docs/prd.md` (the "what")
2. **Architecture:** `docs/architecture.md`, ADRs under `docs/adr/`
3. **Plan executed:** `docs/plan.md` — every task has a commit in
   this PR
4. **Design:** `docs/design/approved/` — rendered HTML mocks

## Test plan
- [ ] Unit tests pass: `npm test`
- [ ] E2E tests pass: `npx playwright test`
- [ ] Manual spot-check: {key flows}
- [ ] Env vars present in `.env.example` and deployment target
- [ ] Security: review `docs/security-report.md`
- [ ] Browser QA: review `docs/qa-report.md`

## Security summary
From `docs/security-report.md`:
- Critical: 0
- High (resolved via audit-fix): {n}
- Medium (deferred): {n} — see report
- Low: {n}

## Browser QA summary
From `docs/qa-report.md`:
- Flows tested: {n}
- Passed: {n}
- Warnings: {n} — see report
- Visual-regression vs. approved design: {summary}

## Known limitations (deferred to next release)
- {from scope-decisions.md "Deferred to v2 or later"}
- {from qa-report "warning" findings that were accepted}
- {from security-report medium/low findings}

## Deploy preparation checklist
- [ ] Deploy target provisioned: {from tech-selection.md}
- [ ] Secrets configured: {list from .env.example keys}
- [ ] DB migrations applied: {list}
- [ ] Webhooks registered (Stripe, auth provider, ...): {list}
- [ ] Monitoring / error tracking connected
- [ ] Backup / restore tested (if stateful)

## Autonomy disclosure
Built autonomously by the fastest-mvp plugin through these gates:
- PRD approved {timestamp} by {who}
- Tech stack selected {timestamp} (mode: {auto|human-approved})
- Design approved {timestamp} by {who}

See `docs/` for the full decision trail.
```

## Commands to run

Use the GitHub MCP server. Do NOT use `gh` CLI — it is not
available in this environment.

1. Ensure commits are pushed:

   ```bash
   git push -u origin {branch-name}
   ```

2. Create the PR via `mcp__github__create_pull_request`:

   ```
   repo: {owner}/{repo}
   base: main    (or the default branch)
   head: {current branch}
   title: "{one line derived from PRD §1}"
   body:  {rendered PR template from above}
   ```

3. Post the PR URL to the user.

## Hard rules

1. **Do not merge.** Creating the PR is the end. A human reviews and
   merges.
2. **Do not force-push.** The history on this branch is the
   decision trail — preserve it.
3. **Do not open more than one PR per release.** If a previous PR
   from this branch is open, update it instead (amend the body; add
   commits).
4. **Don't ship with critical findings.** security-scan and browser-qa
   should have already blocked this; if somehow a critical remained,
   abort and escalate.
5. **Don't auto-deploy.** Shipping prepares; a human (or a separate
   CI) triggers the deploy.

## Release notes style

Write release notes for users, not engineers. The PR description is
for engineers; `docs/release-notes/v*.md` is for users.

Good:
> Added the ability to share a note with a teammate. Click the share
> icon on any note; recipients get an email link and can view
> immediately.

Bad:
> Added the `ShareService` class and the `/api/notes/:id/share` POST
> endpoint. Uses the `NotesPolicy#canShare` authorization gate.

## When the repo isn't set up for PRs

If the repo has no remote configured, or no `main` branch, or no
GitHub connection:

1. Skip the PR step.
2. Produce a **"ship bundle"** at `docs/ship-bundle.md` with:
   - The rendered PR body (for the human to copy/paste)
   - The commands to push and create the PR manually
3. Announce the bundle path and the next steps to the user.

## Completion

1. All artifacts saved.
2. Final commit:

   ```
   [ship] chore: prepare release v{version}
   ```

3. PR created (or ship-bundle produced).
4. Record `phase-complete --phase ship`.
5. Post to the user:

   > Release v{version} is ready. PR: {url}.
   > Review checklist in the PR description. Merge when satisfied.
