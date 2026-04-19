---
name: design-playground
description: >
  Use after gan-design produces an approved iteration. Generates a
  self-contained 3-panel interactive HTML playground so the human
  can tune tokens with sliders and dropdowns, see live preview, and
  copy an auto-generated implementation prompt back to the agent.
  This is Gate 3 — human-approved design before implementation.
---

# design-playground

GAN produces a design that satisfies the rubric; this skill lets the
human nudge it to match personal taste. Text feedback ("make the blue
slightly less saturated") is slower than a slider. Live preview plus
a diff-only prompt output keeps the loop tight.

## Inputs

- `docs/design/approved/` — the GAN-approved design (HTML + CSS)
- `docs/design-system.md` — token definitions
- `docs/prd.md` — persona for preset labels

## Output

- `docs/design/playground.html` — one self-contained HTML file
- `docs/design/playground-state.json` — last saved adjustment state
  (optional; only if the user hits "Save")

## Behavior

1. Read the approved design's HTML + CSS.
2. Auto-detect tunable parameters:
   - Every CSS custom property in `:root` or `[data-theme]`
   - Fonts (swap between 3-5 candidates)
   - Border radius scale (rounded vs squared)
   - Spacing scale multiplier
   - Shadow intensity (none / subtle / medium / strong)
   - Primary accent hue (with hue/saturation/lightness sliders)
3. Generate 3-5 named presets derived from the design system's mood
   (e.g., "minimal", "bold", "editorial", "technical", "warm").
4. Generate `docs/design/playground.html` using the template in
   `references/playground-template.md`. The file must be fully
   self-contained — no CDN, no external JS or CSS. Inline the
   approved design as the preview.
5. Run `${FILE_OPEN_COMMAND}` (xdg-open / open / start) on the
   playground HTML so it opens in the user's default browser.
6. Tell the user:

   > Playground open at `docs/design/playground.html`. Adjust tokens
   > with the left panel. When you like what you see, click
   > **"Copy prompt"** on the right panel and paste it back here. Or
   > type **"approve"** if the defaults are fine.

7. Wait for either:
   - A pasted prompt (token deltas) — apply to the source CSS, save
     as a new iteration under `docs/design/playground-v{N}/`, and ask
     again whether to approve.
   - "approve" — copy current state to `docs/design/approved/`,
     record the gate approval, and proceed.

## The 3-panel layout (see template reference)

```
+--------------+-----------------------+------------------+
|              |                       |                  |
|  Controls    |   Live preview        |  Prompt output   |
|              |                       |                  |
|  Tokens      |   Rendered app        |  Only the deltas |
|  Presets     |   (iframe / srcdoc)   |  from defaults   |
|  Components  |                       |                  |
|              |                       |  [Copy]          |
+--------------+-----------------------+------------------+
```

Constraints:
- Dark theme default.
- No external fonts/CDN — playground itself uses `system-ui`.
- Live preview updates instantly on any control change.
- Prompt output shows ONLY changed values (diff from the approved
  baseline), not all values. This keeps the prompt short and
  readable.

## Prompt output format

When the user changes `--color-accent` from `#4c9aff` to `#2d7fe8`
and font from default to "IBM Plex Sans", the prompt output panel
shows:

```
Please apply the following design adjustments:

Tokens:
  --color-accent: #4c9aff -> #2d7fe8
  --font-sans: "Geist Sans" stack -> "IBM Plex Sans" stack

Rationale (user): "saturated blue competes with body text"

Keep all other tokens as-is. Do not re-run the GAN loop — apply only
these deltas to docs/design/approved/styles.css, re-run the
design-system token preview, and regenerate the playground so I can
review again.
```

The "Rationale (user)" line appears only if the user typed one into
an optional textbox.

## Preset behavior

Presets are shortcuts that set a bundle of tokens at once. Example
preset definitions (the orchestrator generates these based on the
design system):

- **Minimal:** lowest shadow, high-contrast fg, no accent on backgrounds
- **Bold:** thick borders, saturated accent, larger heading scale
- **Editorial:** serif display font, generous line-height
- **Technical:** monospace emphasis, dense grid, muted palette
- **Warm:** shifted toward warm hues (if design system allows)

Clicking a preset does NOT commit changes; it only sets the controls
so the user can further tweak.

## Iteration loop

```
open playground.html
  |
  v
user adjusts tokens
  |
  v
user clicks "Copy prompt" and pastes to agent
  |
  v
agent applies deltas, regenerates playground
  |
  v
browser refresh shows the new baseline
  |
  v
repeat until user types "approve"
  |
  v
[GATE 3: design approved]
```

## Escalation

If the user asks for a change that would require a non-token edit
(e.g., "move the hero image below the fold", "make the nav
horizontal") — that's a structural change that the GAN loop should
handle, not the Playground. Respond:

> That change is structural, not a token tweak. Should I return to
> gan-design with this feedback for another iteration? (y/n)

On yes, append the feedback to `docs/design/approved/human-feedback.md`
and re-invoke `gan-design` with `MIN_ITERATIONS=1, MAX_ITERATIONS=3`.

## Completion

On "approve":

1. If adjustments were applied in the Playground, copy the adjusted
   files to `docs/design/approved/`.
2. Record gate approval:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/record-event.js gate-approved \
     --gate design --by human
   node ${CLAUDE_PLUGIN_ROOT}/scripts/record-event.js phase-complete \
     --phase design
   node ${CLAUDE_PLUGIN_ROOT}/scripts/record-event.js phase-start \
     --phase build
   ```

3. Commit:

   ```
   [design] feat: apply playground adjustments and finalize UI
   ```

4. Meta-skill chain advances to Phase 3 (`subagent-development`).

## References

- `references/playground-template.md` — the 3-panel HTML template
  with all controls and the prompt-diff logic
