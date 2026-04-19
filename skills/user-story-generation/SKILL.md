---
name: user-story-generation
description: >
  Use after ceo-challenge approves the scope and before prd-generation.
  Produces structured user stories with acceptance criteria and RICE
  priority scores from the approved scope. Output feeds prd-generation
  and downstream planning.
---

# user-story-generation

Convert the approved scope into a story map that downstream skills can
plan and test against. Each story must be independently demoable,
testable, and commit-sized (~2-5 tasks).

## Inputs

- `docs/discovery-notes.md`
- `docs/scope-decisions.md` (v1-revised scope + deferred items)

## Story format

```markdown
### US-{N}: {short imperative title}

**As a** {specific persona from scope}
**I want to** {capability}
**so that** {outcome}

**Acceptance criteria**
- Given {context}, when {action}, then {observable result}
- Given {context}, when {action}, then {observable result}

**RICE**
- Reach:      {count of affected users per period, 1-10 normalized}
- Impact:     {0.25 minimal | 0.5 low | 1 medium | 2 high | 3 massive}
- Confidence: {10%|20%|50%|80%|100% — how sure are we of Reach/Impact?}
- Effort:     {person-weeks, 0.25 min, 1 default}
- Score:      (Reach * Impact * Confidence) / Effort

**Depends on** {US-ids or "none"}
**Out of scope for this story** {bulleted — prevents creep}
```

## RICE calibration

Use shared anchors so scores are comparable across stories:

**Reach (per month, normalized 1-10)**
- 1: <1% of target users hit this path
- 3: 10%
- 5: 30%
- 7: 60%
- 10: ~100% (core flow)

**Impact**
- 0.25: cosmetic / minor convenience
- 0.5:  small improvement
- 1:    meaningful improvement
- 2:    blocks adoption without it
- 3:    moat-class, defines the product

**Confidence**
- 100%: we've watched users do this
- 80%:  strong signal in discovery
- 50%:  reasonable inference
- 20%:  speculative

**Effort**
- 0.25: an afternoon
- 1:    a person-week
- 2:    two person-weeks
- 4:    a month

## Behavior

1. Read scope-decisions.md, pulling in the revised v1 scope.
2. Draft one story per in-scope capability. Keep stories small —
   if a story has >5 acceptance criteria, split it.
3. For each story, infer Reach/Impact/Confidence from discovery
   notes; Effort is your estimate, flag uncertainty in a comment.
4. Build the dependency graph (referenced in `Depends on`). It must
   be a DAG.
5. Group stories into milestones M1 / M2 / ... such that M1 is the
   highest-RICE cluster with no external deps.
6. Write `docs/user-stories.md`.
7. Present the story map summary to the user (titles + scores +
   milestones). Soft checkpoint; default "proceed in 30s".

## Output file structure

```markdown
# User stories — {project}

## Story map (summary)

| ID | Title | Persona | RICE | Milestone |
|----|-------|---------|------|-----------|
| US-1 | ... | ... | 12.0 | M1 |
| US-2 | ... | ... | 8.0 | M1 |
| ... | ... | ... | ... | M2 |

## Dependency graph
US-1 -> (none)
US-2 -> US-1
US-3 -> US-1, US-2
...

## Milestones

### M1 — wedge
Goal: {1 sentence outcome the milestone proves}
Stories: US-1, US-2, ...

### M2 — ...

## Stories

### US-1: ...
{full story as per format above}

### US-2: ...
...
```

## Hard rules

1. **Persona is specific.** "As a user" is banned. Use the persona
   name from scope-decisions.md.
2. **Acceptance criteria are observable.** Not "looks good on
   mobile" — "on a 375px viewport, no horizontal scroll and CTA
   remains above the fold."
3. **One verb per title.** "Create and edit a note" is two stories.
4. **RICE scores use the anchors above.** Ad-hoc scoring is not
   comparable and wastes the ranking.
5. **Every story has a commit-sized implementation.** If M1 has 15
   stories, M1 is not a wedge. Split into M1a / M1b or cut.

## Common mistakes

- **"As a user, I want a button."** Story is a UI widget, not a
  capability. Reframe around outcome.
- **"I want the system to be fast."** Non-functional requirement,
  belongs in PRD §7, not a story.
- **Acceptance criteria that restate the capability.** "Can create
  a note." — give the given/when/then with observable specifics.
- **RICE scores all 10/3/100%/0.25.** You're not ranking, you're
  justifying everything. Calibrate against the anchors.

## Completion

1. Save `docs/user-stories.md`.
2. Commit:

   ```
   [discovery] docs: add user stories and RICE scores
   ```

3. Meta-skill chain advances to `prd-generation`.
