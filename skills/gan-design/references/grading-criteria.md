# Grading criteria — 4-axis rubric (40 points total)

The Evaluator subagent scores each screen on four axes, 0-10 each.
Total = sum of all four. Pass threshold = 32/40 (80%). Minimum 3
iterations before PASS is accepted.

Each axis below lists what 0, 5, and 10 look like. Evaluators
interpolate. Evidence (screenshot region, HTML element) is mandatory
for any score below 7.

---

## Axis 1: Design quality (0-10)

> Does color, typography, layout, and imagery together form a
> coherent mood and identity?

- **0** — Looks like an AI default. Purple gradient, Inter font,
  three cards under a hero, dead-center alignment on everything.
  Anti-slop violations present.
- **5** — Competent but unremarkable. No obvious slop, but the
  identity is indistinct; could belong to any dashboard product.
- **10** — Mood from `design-system.md` section 1 comes through on
  first glance. A knowledgeable viewer could describe the
  personality in two adjectives without being told. Typography
  rhythm is intentional; color hierarchy guides the eye; spacing
  breathes but isn't lax.

**Deductions:**
- Any anti-slop violation: -2 minimum.
- Inter font when design system says otherwise: -2.
- Purple/pink gradient where design system forbids it: -3.
- More than 2 accent hues in use: -2.
- Inconsistent spacing (not on the scale): -2.

---

## Axis 2: Implementation quality (0-10)

> Does the code work correctly, respond to viewports, and handle
> edge cases?

- **0** — Broken layout on at least one viewport. Overflow,
  clipping, overlapping text. Unusable.
- **5** — Works on desktop. Mobile has obvious issues (text
  overflow, touch targets too small, off-canvas content).
- **10** — Pixel-solid on both 1440 and 375 viewports. No overflow,
  no scrollbar jitter, no horizontal scroll on mobile. Focus states
  visible on all interactive elements. Color contrast meets WCAG AA
  (4.5:1 body, 3:1 large). Empty/loading/error variants exist for
  list-like regions.

**Deductions:**
- Any horizontal scroll on mobile: -3.
- Missing focus states on interactive elements: -2.
- Contrast failure on body text: -3.
- Text in image/icon-only buttons without aria-label: -1.
- No empty state for a region that lists items: -1.

---

## Axis 3: Content quality (0-10)

> Is the text, data, and imagery realistic and persuasive for the
> PRD's persona?

- **0** — Lorem ipsum, placeholder names ("John Doe"),
  "Sample Product 1", generic stock art.
- **5** — Realistic but inconsistent — product name appears as
  "AppName" in one place and "MyApp" in another. Copy is grammatical
  but generic ("The best tool for the job").
- **10** — Realistic, specific copy rooted in the PRD persona.
  Product / feature / user names are consistent everywhere. Numbers
  look real, not rounded-placeholder ("137 submissions" not "1000+").
  Imagery matches the mood (if photos, correct subject; if
  illustrations, consistent style).

**Deductions:**
- Any lorem ipsum: -5.
- Inconsistent product name: -2.
- Generic hero copy ("Welcome to the future of ___"): -2.
- Placeholder gray boxes where real images should be: -1 per screen.

---

## Axis 4: UX quality (0-10)

> Are navigation, interaction flow, affordances, and feedback
> intuitive?

- **0** — Unclear what to do next on any screen. CTAs unlabeled or
  ambiguous. Navigation missing.
- **5** — Main flow discoverable, but secondary actions hide. Some
  buttons unclear whether they're primary or secondary. Back
  navigation missing from deep views.
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

---

## How the Evaluator composes a score

For each axis, start at 10, subtract for each deduction observed.
Never go below 0. If interpolation is ambiguous, pick the lower
value.

For multiple screens, score each separately and average (rounded to
1 decimal), then floor to nearest integer for the axis total.

---

## Score-to-action mapping

| Total | Action |
|---|---|
| 0-19 | Deep structural issues; Generator should re-approach the screen, not tweak. |
| 20-27 | Identifiable problems; list top 3 and make targeted fixes. |
| 28-31 | Close to pass; polish pass. |
| 32-36 | PASS (assuming MIN_ITERATIONS met). Note remaining nits. |
| 37-40 | Exceptional. PASS. |

The Evaluator must use this mapping to calibrate the feedback file's
"Prioritized list for next iteration" — 3 items for 20-31, 1-2 items
for 28-31, polish-only for 32+.
