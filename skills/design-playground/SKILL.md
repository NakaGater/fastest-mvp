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

## Interaction modes

The playground offers three modes, toggled from the left-panel toolbar:

| Mode | Purpose | Controls |
|------|---------|----------|
| **Adjust** (default) | Tune CSS design tokens | Sliders, color-pickers, dropdowns, presets |
| **Edit** | Change text content in-place | Click any text element in preview to edit |
| **Annotate** | Mark areas and attach feedback | Drag to draw a rectangle, then type a note |

All three modes' changes accumulate and appear together in the
prompt-output panel on the right.

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

   > Playground open at `docs/design/playground.html`.
   >
   > - **Adjust** (default): tune tokens with sliders on the left.
   > - **Edit**: click any text in the preview to rewrite it.
   > - **Annotate**: draw a rectangle on the preview and type feedback.
   >
   > When done, click **"Copy prompt"** and paste it here, or type
   > **"approve"** if the design is ready.

7. Wait for either:
   - A pasted prompt (token deltas + text changes + annotations) —
     apply changes to the source files, save as a new iteration
     under `docs/design/playground-v{N}/`, and ask again whether to
     approve.
   - "approve" — copy current state to `docs/design/approved/`,
     record the gate approval, and proceed.

### Text editing behavior

When the user activates Edit mode:

1. The parent JS sets `contentEditable="true"` on all text-containing
   elements inside the iframe (h1-h6, p, span, li, a, button, label).
   This works because `sandbox="allow-same-origin"` permits parent
   DOM access.
2. Editable elements show a subtle dashed border on hover/focus.
3. On each change, the parent captures `{selector, originalText,
   newText}` and stores it in a `textChanges[]` array.
4. The left panel shows a list of text changes with per-item "Revert"
   buttons.
5. If `contentEditable` fails in the sandbox, fall back to a popup
   text-input positioned near the clicked element (rendered in the
   parent, not the iframe).

### Annotation behavior

When the user activates Annotate mode:

1. A transparent SVG overlay appears on top of the iframe
   (`pointer-events: auto`; in other modes it is `none`).
2. The user draws a rectangle via click-drag (mousedown → mousemove →
   mouseup).
3. On mouseup a small popup appears near the rectangle with a textarea
   for the note and a "Save" button.
4. The annotation is stored as `{id, x%, y%, w%, h%, note,
   elementHint}`:
   - Coordinates use percentages for viewport independence.
   - `elementHint` is auto-detected via
     `iframe.contentDocument.elementFromPoint()` at the rectangle's
     center (e.g., `section.hero`, `nav.main-nav`).
5. Saved annotations render as semi-transparent blue rectangles with
   numbered labels on the SVG overlay.
6. The left panel shows an annotation list: number, note preview,
   click-to-highlight, and a delete button.

## The 3-panel layout (see template reference)

```
+--------------+-----------------------+------------------+
| Mode toolbar |                       |                  |
| [Adjust]     |   SVG annotation      |  Prompt output   |
| [Edit]       |   overlay (top layer) |                  |
| [Annotate]   |                       |  Tokens:         |
|              |   Live preview        |  Text changes:   |
| Adjust mode: |   (iframe / srcdoc)   |  Annotations:    |
|  Tokens      |                       |                  |
|  Presets      |   Rendered app        |  [Copy]          |
|  Components  |                       |  [Approve]       |
|              +-----------------------+                  |
| Edit mode:   |  Viewport: [D][T][M]  |  Rationale box   |
|  Change list |  [Reset]              |                  |
|              +-----------------------+                  |
| Annotate:    |                       |                  |
|  Note list   |                       |                  |
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

The right panel auto-generates a prompt containing ALL accumulated
changes across the three modes. Only non-default values appear.

### Example

```
Please apply the following design adjustments:

Tokens:
  --color-accent: #4c9aff -> #2d7fe8
  --font-sans: "Geist Sans" stack -> "IBM Plex Sans" stack

Text changes:
  [1] .hero h1: "Welcome to App" → "Welcome to MyApp"
  [2] .cta-button: "Get Started" → "無料で始める"

Annotations:
  [1] Area: nav.main-nav (top navigation)
      → "ロゴをもう少し大きくして左に余白を追加"
  [2] Area: section.hero (hero section, center)
      → "背景をもっと暗くしてテキストの視認性を上げる"

Rationale (user): "日本語対応とブランド調整"

Keep all other tokens and content as-is unless noted above.
Apply annotations as structural/visual changes to the relevant
components. If an annotation requires layout changes, update the
HTML structure accordingly.
```

The "Rationale (user)" line appears only if the user typed one into
the optional textbox. Sections with no changes are omitted.

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

**Minor structural changes** (move an element, resize a section, add
a divider) can now be expressed via annotations. The agent applies
them directly without returning to the GAN loop.

**Major structural changes** (redesign the entire page layout, add a
new page, fundamentally change the navigation pattern) still require
the GAN loop. Respond:

> That change requires a major structural redesign. Should I return to
> gan-design with this feedback for another iteration? (y/n)

On yes, append the feedback (including any annotations) to
`docs/design/approved/human-feedback.md` and re-invoke `gan-design`
with `MIN_ITERATIONS=1, MAX_ITERATIONS=3`.

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
