---
name: security-scan
description: >
  Use at the start of Phase 4 (Verify), after all tasks in
  docs/plan.md have been reviewed and committed. Runs dependency,
  secret, and static-analysis scans against the build, categorizes
  findings by severity, and gates further progress on critical issues.
---

# security-scan

Before shipping, check the obvious. This skill runs automated scanners
appropriate to the stack, aggregates findings, and decides whether to
block Phase 5 (Ship) or proceed with notes.

## Inputs

- Everything in the repo after Phase 3 completes
- `docs/tech-selection.md` — informs which scanners apply
- `docs/architecture.md` §6 — records the expected security posture
  (auth, rate limiting, etc.) that the scan checks against

## Output

- `docs/security-report.md` — full report
- `docs/security-findings.jsonl` — one finding per line (used by the
  dashboard and the shipping skill)

## Scans to run (by stack)

### Always
1. **Secret scan** — grep for high-entropy strings and known-key
   patterns in the repo (excluding .gitignore'd paths, excluding
   `.dashboard/`). Tools: `gitleaks` (preferred), or a built-in
   regex sweep.
2. **Dependency scan** — run the ecosystem's native auditor.

### JavaScript / TypeScript
- `npm audit --audit-level=high --json`
- `npx --yes eslint-plugin-security` (if eslint configured)
- `npx --yes knip` (unused deps / exports, indirect bloat)

### Python
- `pip-audit --format=json`
- `bandit -r src -f json`

### Ruby / Go / Rust
- `bundler-audit`, `govulncheck`, `cargo audit`

### HTTP surface (if an API exists)
- Check that every route listed in `architecture.md §4` enforces the
  documented auth posture. This is a static grep for the auth
  middleware's presence on each handler file, not a runtime check.

## Severity mapping

Every finding is tagged:

| Level | Rule | Action |
|---|---|---|
| `critical` | Exploitable in our deployment (RCE, auth bypass, secret leak). | **Block Phase 5.** Autonomous work halts. |
| `high` | Known CVE w/ patch available AND we import the vulnerable path. | Try auto-fix (`npm audit fix` etc.); if not fixable, escalate. |
| `medium` | Known CVE but our code doesn't exercise the vulnerable path, OR style-level security issue (missing CSP, weak CORS default). | Record; do not block. |
| `low` | Informational (unused dep, outdated non-vulnerable package). | Note in report; do not block. |

The mapping is deliberate: not every `npm audit` "high" severity
means our code is exploitable. The reviewer must check whether the
vulnerable function is actually imported.

## Behavior

1. Detect stack from `docs/tech-selection.md` and from lockfile(s)
   present in the repo.
2. Run the appropriate scans in sequence. Capture raw JSON output
   per scan into `.dashboard/security/{scan}.json`.
3. For each raw finding:
   a. Determine whether our code exercises the vulnerable path.
      Grep for the imported function name / module.
   b. Apply the severity mapping above.
4. For `high` findings: attempt auto-fix once:
   - `npm audit fix` (non-breaking only; do NOT pass `--force`)
   - `pip install -U <package>` if no major bump
   - Re-run the relevant scan. If the finding is gone, re-commit.
5. Aggregate results into `docs/security-report.md`.
6. Decide the gate:
   - Any `critical` remaining: block, emit escalation event,
     present findings to the human.
   - Any `high` remaining that auto-fix couldn't resolve: block and
     escalate (but with a suggested fix path).
   - Otherwise: proceed to `browser-qa`.

## Output file structure

```markdown
# Security report — {project}

## Summary
- Critical: {n}  (BLOCKING if > 0)
- High:     {n}
- Medium:   {n}
- Low:      {n}

Scan date: {timestamp}
Stack detected: {from tech-selection}

## Critical findings
{for each: title, severity, file/package, what, why dangerous here,
recommended fix}

## High findings
...

## Medium findings
...

## Low findings (collapsed)
...

## Auto-fixes applied
- {package}: {old version} -> {new version} (finding F-N resolved)
- ...

## Findings NOT auto-fixable
- {reason per finding}

## Posture check (from architecture.md §6)
- Auth middleware on all private routes: {PASS/FAIL} + evidence
- Rate limiting on auth endpoints: {PASS/FAIL}
- Secrets in env vars only, not in repo: {PASS/FAIL}
- ...

## Notes for shipping
{anything the shipping skill should include in PR description}
```

## findings.jsonl schema

One line per finding:

```json
{"id":"F-001","severity":"high","kind":"dep-vuln","package":"lodash","version":"4.17.20","fix":"4.17.21","exploited":true,"fixed":false,"cve":"CVE-2021-23337"}
{"id":"F-002","severity":"medium","kind":"missing-header","file":"next.config.js","issue":"CSP header absent","fixed":false}
```

## Hard rules

1. **No `npm audit fix --force`.** Force-upgrading across majors is a
   change we do not make autonomously.
2. **No new dependencies to fix security issues.** If the fix requires
   adding a package, escalate — search-first/tech-selection own that
   decision.
3. **No pushing to origin during scan.** Commits only; the shipping
   skill handles remote.
4. **Don't hide findings.** Even low-severity ones go in the report.
5. **Don't simulate scans.** If a tool isn't installed, install it
   with `npx --yes` (never add to package.json dependencies), or
   record the scan as "unavailable" and escalate.

## Edge cases

- **Monorepos:** run per-package. Merge findings into one report.
- **Generated lockfile drift after auto-fix:** commit the lockfile
  change as a separate commit: `[verify] fix(security): audit fix
  ({n} packages)`.
- **False positives:** if a flagged package is not actually imported
  in runtime code (only in dev tooling), mark as `medium` not
  `high`, and note the rationale in the report.

## Progress dashboard integration

Emit per-finding events for the dashboard:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/record-event.js escalation \
  --task "security-scan" --reason "critical: {title}"
```

A single summary event is also fine:

```
record-event.js tool-use ...  # captured automatically
```

## Completion

If no critical or unfixed-high findings:

1. Save `docs/security-report.md`.
2. Commit:

   ```
   [verify] docs: add security report ({n} findings, all below block threshold)
   ```

3. If auto-fixes produced lockfile changes:

   ```
   [verify] fix(security): audit fix ({n} packages)
   ```

4. Meta-skill chain advances to `browser-qa`.

If blocking findings remain:

1. Save the report.
2. Record an escalation event.
3. Present findings to the user and wait.
