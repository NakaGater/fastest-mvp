---
name: discovery-dialogue
description: >
  Use before any creative work — creating features, building components,
  adding functionality, starting a new project. Explores user intent
  through structured Socratic dialogue before any implementation,
  tech selection, or architecture decisions.
---

# discovery-dialogue

The user has described an intent to build something. Your job is to
surface the *unstated* assumptions through structured questioning,
before any implementation decisions are made.

## Goal

Produce a structured understanding of:
1. **Who** the user/customer is (not "developers" or "users" — specific)
2. **What problem** is being solved and what pain it causes
3. **What alternatives** exist today and why they are insufficient
4. **What success looks like** — measurable outcomes, not features
5. **What is explicitly out of scope** — equally important

## Behavior

### Rule 1: One question at a time

Do NOT batch 5 questions into one message. Ask one focused question,
wait for the answer, then ask the next. This mirrors how good product
discovery interviews work and prevents the user from skipping parts.

### Rule 2: Drill into keywords

When the user says something vague ("dashboard", "fast", "simple",
"modern"), ask what they mean. Example:

> User: "I want a dashboard for my users."
> You: "When you say dashboard — is this something customers log into to
> see their own data, or something *you* look at to see all customers?
> What's the single question they most want to answer when they open it?"

### Rule 3: Surface unstated features

Extract features the user *implies* but did not state. Present them back
for confirmation. Example:

> "You mentioned users will pay. Am I right that we need: account
> registration, a payment provider integration, and refund handling? Or
> is refund handling out of scope for v1?"

### Rule 4: Section-by-section approval

After enough signal on one dimension (e.g., users), produce a 200-300
word summary of that dimension and ask the user to confirm, correct, or
expand. Only move to the next dimension after approval.

### Rule 5: Capture, don't guess

Maintain running notes in `docs/discovery-notes.md`. After each approved
section, append it to the file. This becomes the input to
`ceo-challenge` and `prd-generation`.

## Question bank (suggested ordering)

Use these as starting points. Adapt based on the user's domain.

**Users & context**
- Who specifically is this for? Describe one person who would use it.
- What are they doing right before they open your product?
- What device and context (mobile / desktop / at work / at home)?
- Is this B2B, B2C, internal, or a side project?

**Problem & pain**
- What problem does this solve?
- How painful is that problem today, on a scale of 1-10?
- How often does the user hit this problem (daily, weekly, rarely)?

**Alternatives**
- How do they solve this today without your product?
- Why is that alternative insufficient?
- What would make them switch?

**Success**
- In 3 months, how do you know this worked? What metric changes?
- What would "failure" look like?
- What's the minimum version that proves the concept?

**Scope**
- What's *definitely in* v1?
- What's *definitely out* of v1?
- What's tempting to add but you'll resist?

**Constraints**
- What is your own technical background? (affects `tech-selection`)
- Do you have preferences for hosting, framework, language?
- What's your timeline and budget if any?
- Any compliance or data-residency requirements?

## Output format

Before handing off to the next skill, `docs/discovery-notes.md` should
contain these sections:

```markdown
# Discovery Notes — {project_name}

## 1. Target user
{200-300 words, human-approved}

## 2. Problem statement
{200-300 words, human-approved}

## 3. Current alternatives
{200-300 words, human-approved}

## 4. Success metrics
{bulleted, measurable}

## 5. In / out of scope
### In scope for v1
- ...
### Out of scope (explicitly deferred)
- ...

## 6. Constraints
- User technical level: {non-engineer | engineer | advanced}
- Framework preferences: {...}
- Hosting / budget: {...}
- Compliance: {...}
```

## Completion

When all sections above are captured and approved:

1. Write `docs/discovery-notes.md`.
2. Commit:

   ```
   [discovery] docs: add discovery notes for {project_name}
   ```

3. The meta-skill's phase chain will invoke `ceo-challenge` (v0.3+) or,
   if that skill is not installed, proceed directly to `prd-generation`.
