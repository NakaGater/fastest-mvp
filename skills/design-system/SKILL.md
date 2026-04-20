---
name: design-system
description: >
  Use after architecture-design (or after PRD when architecture-design
  is unavailable) and before gan-design. Produces design tokens and
  visual conventions that gan-design and implementation will both
  consume. Prevents "AI slop" aesthetics by fixing identity early.
---

# design-system

Fix the visual identity BEFORE generating any UI. Without this step,
generated designs drift toward the "Claude default": Inter font,
purple gradients, same card layout on every page. A documented design
system is the anchor the evaluator uses to detect drift.

## Inputs

- `docs/prd.md` (required) — user personas, brand tone if any
- `docs/discovery-notes.md` — user preferences captured during discovery
- `docs/architecture.md` (if present) — target platform (web/mobile)

## Output: `docs/design-system.md`

Produce these sections, in order:

### 1. Mood & identity

One paragraph (50-100 words) describing the product's visual mood.
Pick 3-5 adjectives (e.g., "utilitarian, confident, quiet, technical")
and expand on what they mean concretely. Name 1-2 reference products
with a similar feel.

### 2. Color tokens

```
--color-bg         {hex}
--color-bg-elev    {hex}
--color-fg         {hex}
--color-fg-muted   {hex}
--color-accent     {hex}
--color-accent-hv  {hex}
--color-success    {hex}
--color-warning    {hex}
--color-danger     {hex}
--color-border     {hex}
```

Plus light/dark variants if the product supports theme switching.

Guidelines:

- Derive accent from 1-2 hues total across the whole system. Multiple
  accent hues = AI slop.
- Contrast ratios: fg/bg must be >= 4.5:1 (WCAG AA body) or 3:1
  (>=18pt). Record the ratios next to each combo.
- Do NOT default to a purple gradient. If the user did not ask for
  one, pick something else.

### 3. Typography

```
--font-sans        {stack, first entry preferred}
--font-mono        {stack}
--font-display     {optional, for hero copy}

--text-xs          {size/line-height}
--text-sm          ...
--text-base        ...
--text-lg          ...
--text-xl          ...
--text-2xl         ...
--text-3xl         ...
```

Guidelines:

- Default sans should NOT be Inter unless the user asked for it
  (Inter is the AI slop default). Consider Geist, IBM Plex Sans,
  Source Sans, system-ui, or a category-appropriate choice.
- Pair at most 2 families (sans + mono, or sans + display).
- Scale uses a consistent ratio (1.125 / 1.25 / 1.333 / golden).

### 4. Spacing & layout

```
--space-1 .. --space-12   {scale, e.g. 4/8/12/16/24/32/48/64/96}
--radius-sm, --radius-md, --radius-lg, --radius-full
--shadow-sm, --shadow-md, --shadow-lg
--container-sm, --container-md, --container-lg, --container-xl
```

Guidelines:

- Spacing uses one scale, not ad-hoc pixel values.
- Shadows should be subtle. Stacked-card designs with heavy shadows
  on every element = AI slop.

### 5. Components

List the reusable components that will appear across pages, with their
visual rules:

- Buttons: primary / secondary / ghost / destructive. Sizes. States.
- Inputs: text / select / checkbox / radio / toggle. Error state.
- Cards: elevation levels, when to use each.
- Nav: top bar / sidebar / tabs. Breakpoints.
- Modals / toasts / tooltips.
- Tables / lists / empty states.

For each component, specify:
- Which tokens it uses
- How it changes at `--breakpoint-sm`, `--md`, `--lg`

### 6. Iconography & imagery

- Icon family (e.g., Lucide, Heroicons, Tabler). Stroke width.
- Image style (photography / illustration / abstract). Aspect ratios.
- Placeholder style when images are missing.

### 7. Motion

- Default transition: `{duration} {easing}`
- Reduced-motion: which animations are disabled

### 8. Anti-slop rules (explicit)

A short list of the patterns this product will NOT use:

- e.g., "No purple-to-pink gradients on CTAs."
- e.g., "No centered hero with 3 feature cards below it."
- e.g., "No glassmorphism."
- e.g., "No Inter font (see section 3 for the actual choice)."

This section matters. The gan-design evaluator uses it as a
deny-list.

## Behavior

1. Read inputs.
2. Draft each section above.
3. Verify contrast ratios and write them into the file.
4. Write `docs/design-system.md`.
5. Save a minimal HTML preview at `docs/design/tokens-preview.html`
   showing the palette, type scale, and sample components. This lets
   the user eyeball the tokens before GAN iteration begins.
6. Present the preview path to the user.

## Completion

1. Save `docs/design-system.md` and `docs/design/tokens-preview.html`.
2. Commit:

   ```
   [design] feat: add design system tokens and conventions
   ```

3. **Next skill: `planning`.** Invoke `planning` now. After `planning`
   completes, `gan-design` and `design-playground` still remain — do
   NOT skip them.

## Anti-patterns

- **Generic identity.** "Modern, clean, minimal" describes nothing.
  Force specificity: minimal *like Stripe*, confident *like Linear*.
- **Too many tokens.** If there are 15 accent colors and 7 font
  families, they are not a system — they are a pile. Trim.
- **Conflict with PRD tone.** A playful kids' app should not have a
  system scraped from Linear. Reread the PRD persona.
- **Skipping anti-slop rules.** Without explicit denials, the
  generator will regress to defaults.
