# Grading criteria — 4-axis rubric (40 points total)

The Evaluator subagent scores each screen on four axes, 0-10 each.
Total = sum of all four.

## Pass conditions (ALL must be met)

1. **Total score >= 36/40** (90%)
2. **Every axis >= 8/10** (no weak axis can hide behind strong ones)
3. **Iteration >= MIN_ITERATIONS (5)**
4. **Zero critical failures** (see below)

If any condition is unmet, the result is FAIL regardless of total.

## Critical failure conditions (instant FAIL)

Any of the following triggers an automatic FAIL, no matter the score:

- **Anti-slop violation:** Any pattern from design-system.md §8 is
  present (e.g., purple gradient, Inter font when forbidden, generic
  hero layout). Score the axis but mark `CRITICAL_FAIL: true`.
- **Lorem ipsum:** Any placeholder text ("Lorem ipsum", "John Doe",
  "Sample Product 1") in user-facing copy.
- **Broken layout:** Horizontal scroll on mobile viewport, text
  clipping, or overlapping elements that make content unreadable.
- **Contrast failure:** Body text fails WCAG AA (< 4.5:1 contrast
  ratio).

When a critical failure is present, the Evaluator MUST return
`STATUS: FAIL` even if the total score would otherwise pass.

---

## Scoring method: evidence-based, starting from baseline

**Start each axis at 5 (baseline = "competent but unremarkable").**

- To score **above 5**, cite specific evidence of quality that goes
  beyond competent. Each +1 above 5 requires a concrete, named reason.
- To score **below 5**, cite specific evidence of a deficiency. Each
  -1 below 5 requires a concrete finding.
- A score of **9-10** means genuinely exceptional work with multiple
  pieces of evidence. Do not award 9+ without naming at least 3
  specific strengths for that axis.
- A score of **8** means strong quality with minor polish items only.

**If in doubt between two scores, always choose the lower one.**
The Generator benefits from honest, strict feedback — inflated
scores waste iterations on false confidence.

---

## Axis 1: Design quality (0-10)

> Does color, typography, layout, and imagery together form a
> coherent mood and identity?

- **0** — Looks like an AI default. Purple gradient, Inter font,
  three cards under a hero, dead-center alignment on everything.
  Anti-slop violations present.
- **3** — Some attempt at identity but inconsistent. Tokens partially
  applied; default patterns still dominate.
- **5** — Competent but unremarkable. No obvious slop, but the
  identity is indistinct; could belong to any dashboard product.
- **7** — Identity is present and consistent. Design system tokens
  are faithfully applied. A viewer could guess the product category.
- **8** — Strong identity. Typography rhythm is intentional; color
  hierarchy guides the eye. Minor polish needed.
- **10** — Mood from `design-system.md` section 1 comes through on
  first glance. A knowledgeable viewer could describe the
  personality in two adjectives without being told. Typography
  rhythm is intentional; color hierarchy guides the eye; spacing
  breathes but isn't lax.

**Deductions (from current score):**
- Any anti-slop violation: **CRITICAL FAIL** (see above).
- Inter font when design system says otherwise: -3.
- More than 2 accent hues in use: -2.
- Inconsistent spacing (not on the scale): -2.
- Generic layout indistinguishable from a template: -2.

**To score above baseline (+1 each, evidence required):**
- Mood adjectives from design-system §1 are identifiable without prompting.
- Color hierarchy guides the eye through the intended flow.
- Typography scale creates clear visual rhythm.
- Spacing system is consistent and intentional across all screens.
- Unique layout choices that serve the content (not decorative).

---

## Axis 2: Implementation quality (0-10)

> Does the code work correctly, respond to viewports, and handle
> edge cases?

- **0** — Broken layout on at least one viewport. Overflow,
  clipping, overlapping text. Unusable.
- **3** — Desktop works partially; mobile is broken or missing.
- **5** — Works on desktop. Mobile has obvious issues (text
  overflow, touch targets too small, off-canvas content).
- **7** — Both viewports work. Minor issues remain (inconsistent
  spacing at breakpoint, one focus state missing).
- **8** — Solid on both viewports. Focus states, contrast, and
  semantic HTML are correct. Minor polish only.
- **10** — Pixel-solid on both 1440 and 375 viewports. No overflow,
  no scrollbar jitter, no horizontal scroll on mobile. Focus states
  visible on all interactive elements. Color contrast meets WCAG AA
  (4.5:1 body, 3:1 large). Empty/loading/error variants exist for
  list-like regions.

**Deductions:**
- Any horizontal scroll on mobile: **CRITICAL FAIL**.
- Missing focus states on interactive elements: -2.
- Contrast failure on body text: **CRITICAL FAIL**.
- Text in image/icon-only buttons without aria-label: -1.
- No empty state for a region that lists items: -1.
- Inline styles instead of using CSS custom properties: -1.

**To score above baseline (+1 each):**
- Clean responsive behavior at both viewports with no compromises.
- All interactive elements have visible focus, hover, and active states.
- Semantic HTML used throughout (no div-soup).
- Empty, loading, and error states are implemented.
- CSS uses only design-system tokens (no magic numbers).

---

## Axis 3: Content quality (0-10)

> Is the text, data, and imagery realistic and persuasive for the
> PRD's persona?

- **0** — Lorem ipsum, placeholder names ("John Doe"),
  "Sample Product 1", generic stock art.
- **3** — Some real text, but mixed with placeholders or obviously
  fake data ("1000+ users", "Company Inc").
- **5** — Realistic but inconsistent — product name appears as
  "AppName" in one place and "MyApp" in another. Copy is grammatical
  but generic ("The best tool for the job").
- **7** — Consistent naming and realistic data. Copy is specific to
  the domain but doesn't yet feel persuasive or persona-rooted.
- **8** — Copy is persona-rooted, consistent, and specific. Data
  looks realistic. Minor tone inconsistencies only.
- **10** — Realistic, specific copy rooted in the PRD persona.
  Product / feature / user names are consistent everywhere. Numbers
  look real, not rounded-placeholder ("137 submissions" not "1000+").
  Imagery matches the mood (if photos, correct subject; if
  illustrations, consistent style).

**Deductions:**
- Any lorem ipsum: **CRITICAL FAIL**.
- Inconsistent product name: -2.
- Generic hero copy ("Welcome to the future of ___"): -2.
- Placeholder gray boxes where real images should be: -1 per screen.
- Numbers that are obviously fake ("10,000 users" with no context): -1.

**To score above baseline (+1 each):**
- Product name consistent on every screen.
- Copy speaks in the persona's language (not developer language).
- Data looks realistic and contextually appropriate.
- Imagery/icons match the mood described in design-system §1.
- Microcopy (button labels, tooltips, empty states) is thoughtful.

---

## Axis 4: UX quality (0-10)

> Are navigation, interaction flow, affordances, and feedback
> intuitive?

- **0** — Unclear what to do next on any screen. CTAs unlabeled or
  ambiguous. Navigation missing.
- **3** — Primary flow exists but secondary navigation is absent or
  confusing. Multiple ambiguous CTAs.
- **5** — Main flow discoverable, but secondary actions hide. Some
  buttons unclear whether they're primary or secondary. Back
  navigation missing from deep views.
- **7** — Clear primary/secondary action hierarchy. Navigation
  present on all views. Minor affordance issues remain.
- **8** — Action hierarchy is clear, navigation is complete, forms
  indicate required fields. Minor polish on edge cases only.
- **10** — Hierarchy of actions is unambiguous: a user can glance
  and know the intended next step. Primary actions are visually
  primary. Secondary actions are visually secondary. Every screen
  provides a way back and forward. Empty/error states offer an
  action to recover. Forms indicate required fields and error
  states. Touch targets meet 44x44.

**Deductions:**
- Two visually-equal "primary" buttons on one view: -2.
- No way back from a detail page: -2.
- Destructive action with no distinction: -2.
- No hover/active feedback on interactive elements: -1.
- Forms without required-field indication: -1.

**To score above baseline (+1 each):**
- Unambiguous action hierarchy visible at a glance.
- Every screen has back/forward navigation.
- Empty and error states offer recovery actions.
- Form validation states are clear and helpful.
- Touch targets meet 44x44 on mobile.

---

## How the Evaluator composes a score

For each axis, start at 5 (baseline). Add points for evidenced
strengths, subtract for evidenced weaknesses. Never go below 0 or
above 10.

**Strict rules:**
- Every score above 7 requires at least 2 named strengths.
- Every score of 9-10 requires at least 3 named strengths AND zero
  unresolved findings for that axis.
- Every score below 5 requires at least 1 named finding.
- If in doubt between two adjacent scores, **pick the lower one**.

For multiple screens, score each separately and average (rounded to
1 decimal), then floor to nearest integer for the axis total.

---

## Score-to-action mapping

| Total | Action |
|---|---|
| 0-19 | Deep structural issues; Generator should re-approach the screen, not tweak. |
| 20-27 | Significant problems; list top 5 and make structural fixes. |
| 28-31 | Identifiable problems; list top 3 and make targeted fixes. |
| 32-35 | Close to pass; focused polish on remaining weak points. 2-3 items max. |
| 36-38 | **PASS** (if all axes >= 8 and MIN_ITERATIONS met). Note remaining polish items. |
| 39-40 | **Exceptional PASS.** Congratulate briefly but still note any micro-polish. |

The Evaluator must use this mapping to calibrate the feedback file's
"Prioritized list for next iteration":
- Total 0-27: 5 items, structural.
- Total 28-31: 3 items, targeted.
- Total 32-35: 2 items, polish-focused.
- Total 36+: 1 item or none.
