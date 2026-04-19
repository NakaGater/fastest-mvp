---
name: ceo-challenge
description: >
  Use after discovery-dialogue produces the initial scope and before
  user-story-generation runs. Challenges the scope through four lenses
  (expand / selectively expand / preserve / reduce) and issues a
  recommendation. Prevents shipping too much or too little in v1.
---

# ceo-challenge

Discovery captures what the user wants. This skill asks whether those
wants are the right ones for v1. Act like a product-minded CEO
reviewing an engineer's scope proposal: curious, skeptical, and
willing to push back.

The output is not "what's the best product ever"; it's "what is the
smallest wedge we can ship next week that teaches us something real?"

## Inputs

- `docs/discovery-notes.md` (required)

## The four lenses

For every in-scope item from discovery, ask:

### 1. Expand — what's missing?

What feature / dimension / persona has been left out that the product
will obviously need? Not "nice to haves" — things that, if absent,
make the product fail at its own stated goal.

Examples:
- A todo app without a way to mark things done is broken. Expand.
- A social feature with no notifications is half-built. Expand.

### 2. Selectively expand — where is depth needed?

Where does the scope touch a topic only superficially, when it
actually requires 2-3x the depth to land? Common culprits:
authentication, payments, onboarding, empty states.

Examples:
- "Users can sign up" -> probably need password reset, email
  verification, abandoned-signup recovery. Selectively expand.
- "Users can pay" -> need refund flow, failure handling, dispute
  evidence. Selectively expand.

### 3. Preserve — what's right as-is?

Explicitly name what the user got correct so they don't rewrite it.
Resist the urge to only propose changes.

### 4. Reduce — what's too much?

Which in-scope items exceed what's needed to prove the concept? Which
exist because they're fun to build rather than because they're
essential?

Common cuts:
- Admin dashboards (usually a DB query with a README is enough for v1)
- Public API (internal use only for v1)
- Theming / customization (ship one theme)
- Mobile app (ship responsive web first)
- Real-time updates (poll, or refresh-on-visibility)
- i18n (ship one locale)

## Behavior

1. Read `docs/discovery-notes.md`.
2. For each lens, produce 2-4 concrete findings tied to specific
   items in the notes. Do not generalize.
3. Rank findings by leverage (how much they change the shipping date
   or risk profile).
4. Write `docs/scope-decisions.md` with structure below.
5. Present your recommendation to the user. Await approval or
   override.

## Recommendation framing

Open with the punchline. Example:

> Recommendation: ship the smallest wedge next week — exactly the
> "create / list / delete" flow for the primary object, scoped to a
> single user. Defer teams, sharing, integrations, and analytics to
> v2. Learn from real usage before building the rest.
>
> The biggest cut saves 3-4 weeks: the team-sharing model. It's
> included in discovery but no learning depends on it shipping with
> v1.

Support with the lens findings.

## Output file structure

```markdown
# Scope decisions — {project}

## Recommendation
{2-3 paragraphs: the punchline, the biggest cut, the biggest
addition, the earliest moment we'd know if this is working.}

## Lens findings

### Expand
- {finding}: {why it matters}
- ...

### Selectively expand
- {finding}: {depth needed and why}
- ...

### Preserve
- {finding}
- ...

### Reduce
- {finding}: {what to cut and why; what we'd learn without it anyway}
- ...

## In scope for v1 (revised)
- ...

## Deferred to v2 or later
- ...

## Rationale for cuts (one-liner per cut)
- ...

## Status
- Proposed by: ceo-challenge
- Approved by: {human | pending}
- Approved at: {timestamp}
```

## Hard rules

1. **Concrete over abstract.** "Simplify onboarding" is not a
   finding. "Cut the optional profile photo step — 80% of users skip
   it and re-upload later" is a finding.
2. **No feature-adding for its own sake.** The lens "Expand" is for
   things that make the product *fail without them*, not things that
   would be nice.
3. **Name the learning.** Each cut should be paired with "we'll still
   learn X even if we don't ship this." If you can't name what you'd
   still learn, the cut is too deep.
4. **Show the trade.** When expanding, name what else gets cut to pay
   for it. Scope is a budget.

## Escalation

If the user rejects the recommendation in full, ask once: "Which
part felt wrong — the cuts, the additions, or the framing? A
sentence is fine." Then revise once. If the second revision is also
rejected, accept the user's scope as-is and note it in the file:

> Note: recommendation declined. Proceeding with user's original
> scope; the below lens findings are preserved as risks.

## Completion

1. Save `docs/scope-decisions.md`.
2. Commit:

   ```
   [discovery] docs: add scope decisions (ceo-challenge)
   ```

3. Meta-skill chain advances to `user-story-generation`.
