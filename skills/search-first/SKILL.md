---
name: search-first
description: >
  Use before writing any new code, at the start of Phase 2 (Design).
  Researches existing solutions (libraries, frameworks, patterns,
  templates) that match the PRD's needs, and classifies each into
  Adopt / Extend / Compose / Build. Prevents reinventing wheels.
---

# search-first

Before any architecture decision, check whether the work has already
been done. Most web-app problems have multiple mature solutions; the
question is which (if any) to pull in rather than build from scratch.

## Inputs

- `docs/prd.md` (approved)
- `docs/user-stories.md`

## Output

- `docs/search-first.md` — one section per capability, with a
  decision and evidence

## The decision matrix

For each capability (auth, payments, forms, data grid, ...), classify
findings into one of four buckets:

| Match | Meaning | Action |
|---|---|---|
| **Adopt** | An existing solution fits the requirements closely. | Use it as-is. |
| **Extend** | A solution covers most of the need, with a known extension point. | Use it; plan to extend X. |
| **Compose** | Multiple partial solutions exist; combining 2-3 gives full coverage. | Plan the composition. |
| **Build** | Nothing adequate exists; build from scratch. | Scope the build. |

"Adequate" means: maintained in the last 12 months, >= 1k GitHub
stars OR clear corporate sponsor, permissive license or PRD-allowed
license, no known critical unpatched CVEs.

## Behavior

1. Read PRD and user stories. List every *reusable* capability the
   product needs (auth, email, payments, file uploads, charts, etc.).
   Bounded by the tech-constraints section of the PRD (e.g., if PRD
   forbids SaaS auth providers, omit Auth0).
2. For each capability, run 2-4 web searches using
   `WebSearch`/`WebFetch`. Log queries in the file for traceability.
3. For each search result that looks relevant, evaluate against the
   "adequate" criteria above, plus:
   - Does it integrate with the likely framework? (the tech-selection
     skill will decide the framework; search-first records
     compatibility notes)
   - Is its API shape a fit for the user stories?
   - Are there recent complaints in issues about breaking changes?
4. Classify into Adopt / Extend / Compose / Build.
5. Write `docs/search-first.md`.

## Output file structure

```markdown
# Search-first research — {project}

## Summary
- {N} capabilities researched
- Adopt: {count}, Extend: {count}, Compose: {count}, Build: {count}

## Capabilities

### Authentication
**Decision:** Adopt — `next-auth`
**Queries used:**
- "next.js authentication 2026 oauth email best library"
- "next-auth vs clerk vs supabase-auth"

**Candidates considered:**
1. `next-auth` (Auth.js) — {stars, last release, license, fit notes}
2. `clerk` — {...}
3. `supabase auth` — {...}

**Evidence for decision:**
- next-auth matches our requirements because ...
- Clerk would work but has per-MAU pricing that conflicts with our
  cost constraint (PRD §8).
- Build-your-own rejected: 2-3 weeks of work with no differentiation.

**Extensions needed:** none.
**Risks:** next-auth v5 migration is planned Q3 — note for architecture.

### Payments
... (same structure)

### ... (one per capability)
```

## Hard rules

1. **No framework decisions here.** This skill researches libraries
   and patterns; `tech-selection` picks the framework. Example:
   "we need an auth library that works with React" is fine;
   "we should use Next.js" is premature.
2. **No trust by marketing.** A slick landing page is not evidence.
   Actual usage, issue responsiveness, release cadence are.
3. **Cite sources.** Every candidate has 1+ URL for reference. The
   `tech-selection` and `architecture-design` skills read those.
4. **Prefer Adopt over Extend over Compose over Build.** Don't
   classify as Build if one usable tool exists. Don't classify as
   Compose if one usable tool exists.
5. **Note the 'Build' case honestly.** If you choose Build, explain
   why the existing solutions fail; future maintainers will ask.

## Tool availability

Claude Code: use `WebSearch` and `WebFetch` freely.

Copilot CLI: `WebSearch` is unavailable. Use `web_fetch` against
search engine URLs:

```
https://www.google.com/search?q={URL-encoded query}
https://duckduckgo.com/?q={URL-encoded query}
```

Then fetch the top 3-5 linked documents directly. Record the fallback
path in the output file so future maintainers understand the
evidence gap, if any.

## When search-first says "Build"

If a capability has no adequate existing solution, it gets a Build
classification. Note explicitly:

- What was searched and why nothing fit
- The rough scope of the build (person-days)
- Whether to defer (cut from v1 via the same reasoning as
  ceo-challenge) or accept the build cost

Flag any Build decision as a risk in the PRD §12.

## Escalation

If a core capability (auth, DB, payments) comes up as Build, and the
build scope is >2 person-weeks, escalate to the human:

> Search-first found no adequate library for {capability}. Building
> from scratch adds ~{N} person-weeks. Options: (a) accept the cost,
> (b) change the requirement so an existing tool fits, (c) cut the
> capability from v1.

## Completion

1. Save `docs/search-first.md`.
2. Commit:

   ```
   [design] docs: add search-first research ({N} capabilities)
   ```

3. Meta-skill chain advances to `tech-selection`.
