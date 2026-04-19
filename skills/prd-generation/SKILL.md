---
name: prd-generation
description: >
  Use after discovery-dialogue (and ceo-challenge and
  user-story-generation if available) have produced approved notes.
  Produces a formal 15-section PRD with quality self-scoring. This is
  Gate 1 — the human must approve the PRD before design begins.
---

# prd-generation

Produce `docs/prd.md`: a formal Product Requirements Document based on
the discovery artifacts. The PRD is the contract for everything
downstream — architecture, planning, implementation, and QA are all
traceable to sections in this file.

## Inputs

- `docs/discovery-notes.md` (required)
- `docs/user-stories.md` (if user-story-generation ran)
- `docs/scope-decisions.md` (if ceo-challenge ran)

If the required input is missing, invoke `discovery-dialogue` first.

## Output: 15 sections

Produce `docs/prd.md` with exactly these sections, in this order:

1. **Overview** — 1 paragraph: what this product is, for whom.
2. **Goals** — bulleted. Outcome-oriented, not feature-oriented.
3. **Non-goals** — what we are explicitly NOT building in v1.
4. **Target users / personas** — named personas with context.
5. **User stories** — "As a ___, I want ___, so that ___."
6. **Functional requirements** — numbered FR-1, FR-2, ... each with
   acceptance criteria.
7. **Non-functional requirements** — performance, availability,
   security, accessibility, i18n. Each measurable.
8. **Technical constraints** — must-use / must-not-use decisions from
   the user. No framework recommendations yet (that's `tech-selection`).
9. **Data model sketch** — entities, key relationships. Not SQL.
10. **External integrations** — auth provider, payment, analytics, etc.
11. **Milestones** — M1, M2, M3 with target scope per milestone.
12. **Risks & mitigations** — top 3-5 risks.
13. **Success metrics** — from discovery, reframed as KPIs.
14. **Open questions** — things the user could not answer yet.
15. **Appendix** — links to discovery notes, scope decisions, etc.

## Quality self-scoring (60 points)

Before presenting the PRD, score it yourself against these 12 criteria
(each 0-5). Present the score with the PRD.

| # | Criterion | 0-5 |
|---|-----------|-----|
| 1 | Target user is specific (not "users") | |
| 2 | Problem is stated in user language, not feature language | |
| 3 | Goals are outcomes, not features | |
| 4 | Non-goals are explicit and defended | |
| 5 | Each FR has acceptance criteria | |
| 6 | NFRs are measurable (numbers, not adjectives) | |
| 7 | Tech constraints reflect user's actual expertise | |
| 8 | Data model covers the user stories | |
| 9 | Milestones are shippable independently | |
| 10 | Risks include product risk, not just technical | |
| 11 | Success metrics match the goals | |
| 12 | Open questions are surfaced, not hidden | |

Target score: **>= 48/60** before presenting to the user. If below,
iterate internally (revise and re-score) before showing.

## Behavior

1. Read all available discovery inputs.
2. Draft the 15 sections.
3. Self-score. If < 48, revise the weakest sections and re-score.
4. Write `docs/prd.md`.
5. Present the score summary and the PRD to the user.
6. Ask explicitly: "Approve this PRD and proceed to design?
   (approve / revise / reject)".

## ★ Gate 1: Human approval required

Do NOT invoke `search-first`, `tech-selection`, or any Phase 2 skill
until the user has explicitly approved the PRD. This is the most
important gate in the workflow — it determines *what* you build.

If the user says "revise", ask which sections and re-generate those
only. Do not rewrite approved sections without permission.

## Completion

On approval:

1. Ensure `docs/prd.md` is saved with a "## Status: Approved ({date})"
   header at top.
2. Commit:

   ```
   [discovery] docs: add approved PRD for {project_name}
   ```

3. The meta-skill chain will now advance to Phase 2 (Design). If
   `tech-selection` is installed, it runs next. Otherwise, proceed to
   `planning` directly.

## Anti-patterns

- Do not write "the system shall ..." for every requirement. Use plain
  English.
- Do not invent user personas. If discovery said "small teams of 2-5",
  the persona is "a lead at a small team of 2-5", not "Sarah, a VP of
  Engineering at a Fortune 500".
- Do not specify frameworks in the PRD. Framework choice belongs in
  `tech-selection`.
- Do not include UI copy or colors. That belongs in `design-system`.
