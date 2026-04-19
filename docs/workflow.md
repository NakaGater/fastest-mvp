# fastest-mvp workflow

End-to-end flow for taking an idea through to a deployable web app.

## The high-level loop

```
Human: "I want to build ___"
  |
  v
Phase 1: Discovery (human-driven)
  discovery-dialogue -> ceo-challenge -> user-story-generation -> prd-generation
  [GATE 1: human approves PRD]
  |
  v
Phase 2: Design (mostly autonomous)
  search-first -> tech-selection -> architecture-design -> design-system
    -> planning -> gan-design -> design-playground
  [GATE 3: human approves design]
  |
  v
Phase 3: Build (fully autonomous)
  subagent-development (loops over docs/plan.md):
    implementer -> spec-reviewer -> quality-reviewer -> commit
  |
  v
Phase 4: Verify (fully autonomous)
  [security-scan] -> [browser-qa]
  |
  v
Phase 5: Ship (fully autonomous)
  [shipping]
```

Skills in `[brackets]` are later-version additions. As of v0.3 the
plugin ships with the full Discovery and Design phases plus the Build
loop. Verify and Ship are scheduled for v0.4.

## Gates

Three points require explicit human approval:

1. **PRD approval** — decides *what* to build.
2. **Tech-stack selection** — decides *how* to build it.
   Only surfaces for engineer-mode users; non-engineers auto-accept
   the recommendation.
3. **Design approval** — decides *how it looks*. Uses the
   design-playground for interactive refinement.

Between gates, the plugin operates autonomously. It escalates to the
human only on `BLOCKED`, `NEEDS_CONTEXT`, repeated review failures, or
critical security findings.

## Human actions (minimum)

1. Describe the idea.
2. Answer 5-10 discovery questions.
3. Approve PRD (Gate 1).
4. Approve tech stack if prompted (Gate 2, engineers only).
5. Adjust design in Playground, approve (Gate 3).
6. Monitor progress via the dashboard.
7. Review the completed PR.

## Artifacts produced

| Phase | File(s) |
|-------|---------|
| Discovery | `docs/discovery-notes.md`, `docs/user-stories.md`, `docs/prd.md` |
| Design | `docs/tech-selection.md`, `docs/architecture.md`, `docs/design-system.md`, `docs/plan.md`, design HTML under `docs/design/` |
| Build | project source code, tests, commits |
| Verify | `docs/qa-report.md`, `docs/security-report.md` |
| Ship | GitHub PR, updated README, release notes |

Throughout: `.dashboard/events.jsonl` (event log) and
`.dashboard/progress.html` (rendered dashboard).

## Commit conventions

Every commit is prefixed with its phase:

```
[discovery] docs: add PRD for {project}
[design]    feat: add plan ({n} tasks)
[build]     feat({area}): {change}
[verify]    fix(security): {issue}
[ship]      chore: prepare release {version}
```

The `PostToolUse` hook detects `git commit` commands and records them
to the events log.

## Installation

As a Claude Code plugin:

```
/plugin marketplace add <path-or-url-to-this-repo>
/plugin install fastest-mvp
```

Under Copilot CLI:

```
copilot plugin add <path-or-url-to-this-repo>
```

The plugin detects the platform at bootstrap time and loads the
appropriate hook set.

## Observing progress

```
# one-shot render
node skills/progress-dashboard/scripts/generate-dashboard.js
open .dashboard/progress.html

# or serve locally for auto-reload-on-refresh
python -m http.server 8000
# open http://localhost:8000/.dashboard/progress.html
```

The `Stop` / `sessionEnd` hook regenerates the HTML at the end of
every agent turn, so refreshing the browser shows the latest state.

## Escalation

When the plugin stops autonomous operation, it does so by:

1. Recording an `escalation` event (`.dashboard/events.jsonl`)
2. Posting a message in the session with the failing task, the
   subagent's report, and a recommended next step
3. Waiting for human input

There is no "try harder" loop — if the plugin can't make progress
after one retry, it surfaces the problem rather than spinning.

## Known omissions (scheduled for later versions)

- No automated security-scan — reviewers catch most security concerns
  in the quality review stage; a dedicated skill comes in v0.4.
- No browser-qa — manually open the app in a browser after Build; the
  Playwright-driven QA skill comes in v0.4.
- No shipping skill — final PR creation and docs generation are
  manual; a skill automating this comes in v0.4.
- No systematic-debugging / learnings / Heartbeat integration — v0.5.
