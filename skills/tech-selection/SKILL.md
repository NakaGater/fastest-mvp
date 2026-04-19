---
name: tech-selection
description: >
  Use after search-first and before architecture-design. Selects the
  web-app stack (framework, data layer, deployment target) based on
  PRD requirements, search-first evidence, and the user's technical
  level. For engineers, presents a comparison table and waits for
  approval (Gate 2). For non-engineers, auto-adopts the recommendation.
---

# tech-selection

The framework choice locks in a lot of downstream decisions. Picking
it without tracing to requirements is how teams end up with a React
SPA for a static blog or a serverless-function mess for a CRUD app.
This skill makes the trace explicit and records the decision.

## Inputs

- `docs/prd.md` (technical constraints, non-functional requirements)
- `docs/search-first.md` (library compatibility implies framework
  compatibility)
- `docs/discovery-notes.md` §6 Constraints (user's technical level)
- `references/stack-catalog.md` (reference only; search-first results
  override the catalog)

## Three evaluation axes

### 1. Requirements fit
- Does it support SSR / SSG / CSR / ISR as the PRD demands?
- Does it support realtime (websocket) if needed?
- Mobile / PWA / offline requirements?
- Is it primarily API-centric or UI-centric?
- Are there admin-panel / CMS-like requirements?

### 2. Ecosystem
- Do the Adopt-candidates from search-first integrate cleanly?
- How abundant are templates, examples, docs?
- Is the community active (recent releases, responsive issues)?

### 3. Operability
- Can the user (given their technical level) run this in production?
- What is the deployment target? Costs?
- Is there a managed host (Vercel, Fly, Cloudflare) that fits?
- What does the on-call story look like?

## User technical level (from discovery)

| Level | Meaning | Behavior |
|---|---|---|
| `non-engineer` | Has never deployed production software. | **Auto-adopt** the recommendation. Do not prompt. Prefer stacks with turnkey deployment. Skip Gate 2. |
| `engineer` | Has shipped at least one web app. | **Prompt** with the comparison table. Gate 2 — wait for explicit approval. |
| `advanced` | Opinionated, experienced. | **Prompt**, but include their stated preferences as a candidate even if your recommendation differs. Gate 2. |

## Behavior

1. Read inputs.
2. From PRD NFRs, extract a list of hard technical constraints.
   Example: "SEO matters" -> SSR/SSG required. "Realtime chat" ->
   websocket or server-sent events required.
3. From search-first, note which libraries are already Adopted /
   Extended. Those constrain the framework (e.g., `next-auth`
   strongly implies Next.js).
4. Narrow to 2-3 candidate stacks. Consult
   `references/stack-catalog.md` for common starting combos, but
   override freely based on search-first.
5. Produce a comparison table. One row per evaluation criterion, one
   column per candidate.
6. Pick a recommendation with a 2-3 sentence rationale.
7. Branch on user technical level:
   - **non-engineer:** adopt the recommendation, write
     `docs/tech-selection.md`, skip Gate 2, emit `gate-approved
     --gate tech-stack --by auto`.
   - **engineer / advanced:** present the table + recommendation to
     the user. Wait for explicit approval or override. On
     override, record the chosen stack and note that the
     recommendation was overridden.
8. Commit and proceed.

## Output file structure

```markdown
# Tech selection — {project}

## Recommendation
Stack: {framework} + {data layer} + {deploy target}
{2-3 sentence rationale}

## Constraints extracted from PRD
- NFR X.Y -> {technical implication}
- ...

## Implied compatibility from search-first
- Adopted library "X" works best with {framework}
- ...

## Candidates considered

|                          | Candidate A | Candidate B | Candidate C |
|--------------------------|-------------|-------------|-------------|
| SSR / SSG                |             |             |             |
| Realtime                 |             |             |             |
| Templates / examples     |             |             |             |
| Library ecosystem fit    |             |             |             |
| Learning curve for user  |             |             |             |
| Deployment target        |             |             |             |
| Cost at {N} users        |             |             |             |
| **Fit score**            |             |             |             |

## Decision
- Chosen: {...}
- Rationale: ...
- Overridden by human? {yes/no}
- Notes:

## Recorded by
- date: {...}
- mode: {auto | human-approved | human-overridden}
```

## Comparison table rules

- Use concrete values, not check-marks alone. `"SSR: native"` vs
  `"SSR: requires adapter"` is more useful than `✅ vs ⚠️`.
- "Fit score" is the sum of axis scores, not a vibes check. Show the
  math.
- If you can't fill a cell, write "unknown — see search-first" and
  link the relevant capability.

## Hard rules

1. **No pet choices.** If the user has no preference and the
   requirements can be met by 2+ stacks, prefer the one with the
   larger template ecosystem — learning curve matters more than
   elegance for a v1.
2. **Respect explicit user preferences.** If discovery §6 says "I
   know Rails", Rails is a candidate even if Next.js would score
   higher on paper. Fight only if there's a hard constraint
   mismatch.
3. **Watch for hidden costs.** A "free" framework that requires a
   paid SaaS layer at scale is not free. Include managed-service
   costs.
4. **One source of truth.** Do not duplicate stack info in other
   docs; architecture-design reads from here.

## Engineer-mode prompt

When the user is `engineer` or `advanced`, post the comparison table
and ask:

> Tech-stack recommendation: **{stack}**. Rationale: {one line}.
>
> Comparison table: {render}.
>
> Approve this stack, or name an alternative? (approve / `{stack-name}` / explain)

On approve -> record gate-approved and proceed.
On alternative -> record override, update the file.
On explain -> answer and re-prompt.

## Non-engineer auto-adopt

For non-engineers, skip the prompt. Announce the choice:

> Selected stack: **{stack}**. Chosen because: {one line}. This will
> be set up automatically; you don't need to know the details. The
> dashboard will show progress.

Record `gate-approved --gate tech-stack --by auto` so the dashboard
reflects that Gate 2 was auto-passed.

## Completion

1. Save `docs/tech-selection.md`.
2. Record gate approval (auto or human).
3. Commit:

   ```
   [design] docs: add tech-selection ({framework} + {data} + {host})
   ```

4. Meta-skill chain advances to `architecture-design`.

## References

- `references/stack-catalog.md` — common stack combos. Reference
  only; search-first evidence overrides.
