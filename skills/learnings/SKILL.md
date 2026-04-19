---
name: learnings
description: >
  Use at the end of notable sessions (feature shipped, debug resolved,
  design decision made) to capture what worked, what didn't, and
  what should be remembered next time. Also loaded at session start
  — the meta-skill surfaces relevant learnings as context before
  any new work begins. Persists knowledge across sessions that would
  otherwise be lost.
---

# learnings

The plugin runs many sessions against many projects. Without a
learning layer, every session starts from scratch and repeats the
same mistakes. This skill captures lessons in small, tagged,
searchable notes that future sessions pull in automatically.

## Storage

Two tiers, queried in order:

1. **Project-local:** `.learnings/` in the project repo. Committed
   to git. Scope: this project's specifics (framework quirks, API
   decisions, non-obvious fixes).
2. **User-global:** `~/.claude/fastest-mvp/learnings/`. Not
   committed. Scope: cross-project patterns (TDD insights, tooling
   preferences, recurring bug classes).

Each learning is one file: `{YYYY-MM-DD}-{slug}.md`.

## File format

```markdown
---
title: "When npm audit fix breaks the lockfile"
tags: [npm, lockfile, security-scan, ecosystem-js]
scope: project | user-global
confidence: high | medium | low
applies_to: [Node.js, npm-workspaces]    # optional; narrows matches
anti: false    # true if this is an anti-pattern to avoid
created_at: 2026-04-19
last_seen: 2026-04-19
hits: 1    # incremented each time the learning is surfaced
---

# {title}

## Situation
{1-2 sentences describing when this comes up}

## What we learned
{2-4 sentences, the actionable takeaway}

## Evidence
- Session where first observed: {session id or date}
- {link to commit, file, or discussion}

## What to do next time
{concrete instruction — do X, avoid Y}

## Related
- {link to related learning file, if any}
```

## When to write a learning

Write one at the end of a session when:

- A non-obvious fix resolved a subtle bug (the `systematic-debugging`
  Phase 3 output is often a good seed).
- A tool / library choice paid off (or didn't) for a specific reason.
- An approach the PRD / plan anticipated turned out to be wrong.
- A review finding recurred across multiple tasks (it's a pattern).

Do NOT write a learning for:

- Things already obvious from the design docs.
- Single-commit decisions fully captured in an ADR.
- Trivial typo fixes.

Target: 0-3 learnings per session. More than 5 usually means noise.

## When learnings are loaded

**Session start:** the bootstrap script reads the project-local
`.learnings/` and the matching user-global learnings, ranks by
recency * confidence * tag match, and appends the top 5 to the
meta-skill context. The agent sees them as prior knowledge before
any skill runs.

**During planning:** `planning` can grep learnings by tag
(`framework:nextjs`, `area:auth`) to pull domain-specific knowledge
into the plan.

**During debug:** `systematic-debugging` Phase 3 searches learnings
by tag for similar past causes.

## Tagging conventions

Tags are lowercase, hyphenated, categorical. Useful categories:

- `framework:{name}` — e.g., `framework:nextjs`, `framework:remix`
- `area:{domain}` — `area:auth`, `area:payments`, `area:db`
- `ecosystem:{lang}` — `ecosystem-js`, `ecosystem-py`
- `tool:{name}` — `tool:playwright`, `tool:prisma`
- `topic:{theme}` — `topic:perf`, `topic:a11y`, `topic:migration`

Tagging too loosely (e.g., just `important`) defeats retrieval.
Target 3-5 tags per learning.

## Anti-learnings

Some learnings record what NOT to do. Set `anti: true` in the
front-matter. The bootstrap marks these with a warning icon in the
context so the agent treats them as prohibitions, not templates.

Example:

```
---
title: "Don't npm audit fix --force to resolve a single high"
tags: [npm, lockfile, security-scan]
anti: true
---

## Situation
A single high-severity finding tempted us to run `npm audit fix
--force`. This upgraded 14 packages across majors and broke the
build. Reverting took an hour.

## What to do next time
Upgrade only the vulnerable package explicitly. If the fix requires
a major bump, escalate — search-first owns dependency decisions.
```

## Behavior

### Writing a learning

1. At the end of a session (Stop hook, or manual invocation), the
   agent reviews recent events and asks itself:
   - Was there a non-obvious resolution?
   - Did a hypothesis turn out wrong in an instructive way?
   - Did a tool / library behave unexpectedly?
2. For each yes, draft one learning using the format above.
3. Save to `.learnings/` or `~/.claude/fastest-mvp/learnings/` per
   the scope rule:
   - Tied to this project's stack or config → project-local.
   - Generalizable → user-global.
4. If a learning is similar to an existing one, update the existing
   one (bump `last_seen`, increment `hits`, add new evidence) rather
   than creating a duplicate.
5. Commit project-local learnings:

   ```
   [ship] docs: record learning — {title}
   ```

### Loading learnings (session start)

The bootstrap script handles this automatically. See
`scripts/load-learnings.js` — it:

1. Lists all `.learnings/*.md` in the project.
2. Lists `~/.claude/fastest-mvp/learnings/*.md` as candidates.
3. Parses front-matter.
4. For each candidate, computes a relevance score:

   ```
   score = confidence_weight * recency_weight * tag_match
   ```

   - `confidence_weight`: high=3, medium=2, low=1
   - `recency_weight`: decays linearly over 180 days
   - `tag_match`: intersection size with the project's inferred
     tags (detected from `package.json` / repo signals)

5. Returns the top 5.

6. Bootstrap appends them to the session's additional context
   under a "Prior learnings" header, sorted by score.

## Retrieval tools

For skill-driven retrieval (not just bootstrap), use the script:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/learnings/scripts/load-learnings.js \
  --tags "framework:nextjs,area:auth" --limit 3
```

Returns JSON: `[{title, summary, file, score, anti}, ...]`.

Use from:

- `planning`: pull learnings for the detected stack to inform task
  ordering.
- `subagent-development`: before dispatching an implementer for a
  task in a known-tricky area.
- `systematic-debugging` Phase 3: search for similar past root
  causes.

## Hard rules

1. **Keep learnings small.** One page max. If it needs more, it's
   an ADR.
2. **Keep learnings specific.** "Be careful with state" is useless.
   "Zustand v4 persist middleware silently drops non-serializable
   values including Maps — use serializeFn to convert" is useful.
3. **Prefer updating to adding.** Duplicates rot. Merge.
4. **Don't commit user-global learnings.** `~/.claude/fastest-mvp/`
   is outside the repo. Project-local `.learnings/` is in-repo.
5. **Decay ruthlessly.** Learnings with `last_seen` > 1 year old
   and `hits` < 2 are candidates for archival.
6. **Never auto-apply anti-learnings blindly.** They warn; the
   agent still reasons about whether the current situation matches.

## Decay & pruning

Monthly (or when a session starts and the learning count exceeds
100), prune:

- `last_seen` > 365 days and `hits` < 3 → move to
  `.learnings/archive/` (still grep-able, not loaded by default).
- Learnings contradicted by later evidence → update, don't delete.
  Add a "Superseded by: {file}" note.

Pruning runs by invoking:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/learnings/scripts/load-learnings.js \
  --prune
```

## Gotchas

- **Learnings can be wrong.** They're captured from one session;
  the universe may have been narrow. When a learning contradicts
  observed behavior now, update the learning; don't bend reality
  to fit it.
- **Tag sprawl.** Review tags every few months; merge synonyms
  (`nextjs` vs `next-js`).
- **Not every session needs a learning.** If nothing surprised
  you, don't invent lessons. Empty sessions are fine.

## References

- `scripts/load-learnings.js` — parse, rank, retrieve
