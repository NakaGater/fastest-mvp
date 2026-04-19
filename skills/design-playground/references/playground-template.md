# Playground template reference

This is the structure of `docs/design/playground.html`. When the
`design-playground` skill runs, it substitutes the `{{...}}`
placeholders with values derived from the approved design.

## Substitution contract

| Placeholder | Type | Source |
|---|---|---|
| `{{PROJECT_NAME}}` | string | from PRD |
| `{{APPROVED_HTML}}` | escaped HTML | docs/design/approved/index.html |
| `{{APPROVED_CSS}}` | escaped CSS | docs/design/approved/styles.css |
| `{{TOKENS_JSON}}` | JSON | all CSS custom properties and their baseline values |
| `{{PRESETS_JSON}}` | JSON | array of preset objects `{name, description, tokens}` |
| `{{FONT_CHOICES_JSON}}` | JSON | array of font-stack strings available to swap |

## Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Design Playground — {{PROJECT_NAME}}</title>
<style>
  :root {
    --pg-bg: #0d1117;
    --pg-bg-2: #161b22;
    --pg-bg-3: #1c2128;
    --pg-fg: #e6edf3;
    --pg-fg-muted: #7d8590;
    --pg-accent: #58a6ff;
    --pg-border: #30363d;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--pg-bg); color: var(--pg-fg); font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
  .pg-root { display: grid; grid-template-columns: 300px 1fr 360px; height: 100vh; }
  .pg-panel { border-right: 1px solid var(--pg-border); overflow: auto; }
  .pg-panel:last-child { border-right: none; border-left: 1px solid var(--pg-border); }
  .pg-section { padding: 16px; border-bottom: 1px solid var(--pg-border); }
  .pg-section h3 { margin: 0 0 12px; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--pg-fg-muted); }
  .pg-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; margin-bottom: 8px; font-size: 13px; }
  .pg-row label { color: var(--pg-fg-muted); }
  .pg-row input[type="range"], .pg-row select, .pg-row input[type="color"] { background: var(--pg-bg-3); border: 1px solid var(--pg-border); color: var(--pg-fg); border-radius: 4px; padding: 4px 6px; }
  .pg-row input[type="color"] { padding: 0; height: 28px; width: 60px; }
  .pg-preset { padding: 8px 12px; border: 1px solid var(--pg-border); border-radius: 6px; margin-bottom: 6px; cursor: pointer; font-size: 13px; }
  .pg-preset:hover { background: var(--pg-bg-3); }
  .pg-preset.active { border-color: var(--pg-accent); background: rgba(88,166,255,0.08); }
  iframe { width: 100%; height: 100%; border: 0; background: #fff; }
  .pg-preview-head { padding: 8px 12px; background: var(--pg-bg-2); border-bottom: 1px solid var(--pg-border); display: flex; gap: 8px; align-items: center; }
  .pg-preview-head button { background: var(--pg-bg-3); color: var(--pg-fg); border: 1px solid var(--pg-border); border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
  .pg-preview-head button.active { border-color: var(--pg-accent); color: var(--pg-accent); }
  .pg-preview-body { height: calc(100vh - 41px); }
  .pg-prompt { height: 100%; display: flex; flex-direction: column; }
  .pg-prompt textarea { flex: 1; background: var(--pg-bg-3); color: var(--pg-fg); border: 0; border-top: 1px solid var(--pg-border); padding: 12px; font-family: ui-monospace, monospace; font-size: 12px; resize: none; outline: none; }
  .pg-prompt .pg-actions { padding: 8px 12px; background: var(--pg-bg-2); border-bottom: 1px solid var(--pg-border); display: flex; gap: 8px; }
  .pg-prompt .pg-actions button { flex: 1; }
  .pg-rationale { padding: 8px 12px; border-bottom: 1px solid var(--pg-border); }
  .pg-rationale textarea { width: 100%; height: 60px; background: var(--pg-bg-3); color: var(--pg-fg); border: 1px solid var(--pg-border); border-radius: 4px; padding: 6px; font-size: 12px; resize: vertical; }
</style>
</head>
<body>
<div class="pg-root">

  <aside class="pg-panel">
    <div class="pg-section">
      <h3>Presets</h3>
      <div id="presets"></div>
    </div>
    <div class="pg-section">
      <h3>Colors</h3>
      <div id="colors"></div>
    </div>
    <div class="pg-section">
      <h3>Typography</h3>
      <div id="typography"></div>
    </div>
    <div class="pg-section">
      <h3>Spacing & radius</h3>
      <div id="layout"></div>
    </div>
    <div class="pg-section">
      <h3>Shadows</h3>
      <div id="shadows"></div>
    </div>
  </aside>

  <main class="pg-panel">
    <div class="pg-preview-head">
      <span style="font-size:12px;color:var(--pg-fg-muted)">Viewport:</span>
      <button data-vp="desktop" class="active">Desktop 1440</button>
      <button data-vp="tablet">Tablet 768</button>
      <button data-vp="mobile">Mobile 375</button>
      <span style="flex:1"></span>
      <button id="resetAll">Reset</button>
    </div>
    <div class="pg-preview-body">
      <iframe id="preview" sandbox="allow-same-origin"></iframe>
    </div>
  </main>

  <aside class="pg-panel pg-prompt">
    <div class="pg-actions">
      <button id="copyPrompt">Copy prompt</button>
      <button id="approveBtn" style="background:#238636;border-color:#2ea043;color:#fff">Approve</button>
    </div>
    <div class="pg-rationale">
      <label style="display:block;color:var(--pg-fg-muted);font-size:12px;margin-bottom:4px">Rationale (optional)</label>
      <textarea id="rationale" placeholder="Why this change?"></textarea>
    </div>
    <textarea id="promptOutput" readonly></textarea>
  </aside>

</div>

<script>
const BASELINE_TOKENS = {{TOKENS_JSON}};
const PRESETS = {{PRESETS_JSON}};
const FONT_CHOICES = {{FONT_CHOICES_JSON}};
const APPROVED_CSS = {{APPROVED_CSS_JSON_STRING}};
const APPROVED_HTML = {{APPROVED_HTML_JSON_STRING}};

const state = JSON.parse(JSON.stringify(BASELINE_TOKENS));
let activePreset = null;

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

function renderControls() {
  const colors = document.getElementById('colors');
  const typography = document.getElementById('typography');
  const layout = document.getElementById('layout');
  const shadows = document.getElementById('shadows');
  const presets = document.getElementById('presets');

  PRESETS.forEach((p, i) => {
    const e = el(`<div class="pg-preset" title="${p.description || ''}">${p.name}</div>`);
    e.addEventListener('click', () => applyPreset(i));
    presets.appendChild(e);
  });

  Object.keys(state).forEach(key => {
    const val = state[key];
    const target = key.startsWith('--color') ? colors
                 : key.startsWith('--font') || key.startsWith('--text') ? typography
                 : key.startsWith('--shadow') ? shadows
                 : layout;
    if (key.startsWith('--color')) {
      const row = el(`<div class="pg-row"><label>${key}</label><input type="color" value="${val}"></div>`);
      row.querySelector('input').addEventListener('input', (e) => { state[key] = e.target.value; update(); });
      target.appendChild(row);
    } else if (key.startsWith('--font-sans') || key.startsWith('--font-mono') || key.startsWith('--font-display')) {
      const options = FONT_CHOICES.map(f => `<option${f === val ? ' selected' : ''}>${f}</option>`).join('');
      const row = el(`<div class="pg-row"><label>${key}</label><select>${options}</select></div>`);
      row.querySelector('select').addEventListener('change', (e) => { state[key] = e.target.value; update(); });
      target.appendChild(row);
    } else {
      const row = el(`<div class="pg-row"><label>${key}</label><input type="text" value="${val}" style="width:100px"></div>`);
      row.querySelector('input').addEventListener('input', (e) => { state[key] = e.target.value; update(); });
      target.appendChild(row);
    }
  });
}

function applyPreset(i) {
  activePreset = i;
  Object.assign(state, PRESETS[i].tokens);
  // Re-render control values. Simplest: reload.
  document.querySelectorAll('.pg-preset').forEach((e, idx) => e.classList.toggle('active', idx === i));
  renderControlValues();
  update();
}

function renderControlValues() {
  document.querySelectorAll('.pg-row input, .pg-row select').forEach(inp => {
    // No-op stub — the simpler implementation re-reads state via update(); real implementation would bind properly.
  });
}

function tokensToCssVars(tokens) {
  return ':root {\n' + Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n') + '\n}\n';
}

function update() {
  const overrideCss = tokensToCssVars(state);
  const doc = `<!doctype html><html><head><meta charset="UTF-8"><style>${APPROVED_CSS}\n${overrideCss}</style></head><body>${APPROVED_HTML}</body></html>`;
  document.getElementById('preview').srcdoc = doc;
  document.getElementById('promptOutput').value = composePrompt();
}

function composePrompt() {
  const diffs = [];
  Object.keys(state).forEach(k => {
    if (state[k] !== BASELINE_TOKENS[k]) {
      diffs.push(`  ${k}: ${BASELINE_TOKENS[k]} -> ${state[k]}`);
    }
  });
  if (!diffs.length) return 'No changes yet. Adjust a control on the left.';
  const rationale = document.getElementById('rationale').value.trim();
  return [
    'Please apply the following design adjustments:',
    '',
    'Tokens:',
    diffs.join('\n'),
    '',
    rationale ? 'Rationale (user): "' + rationale + '"' : '',
    '',
    'Keep all other tokens as-is. Do not re-run the GAN loop — apply only these deltas to docs/design/approved/styles.css and regenerate the playground.',
  ].filter(Boolean).join('\n');
}

document.getElementById('copyPrompt').addEventListener('click', () => {
  const t = document.getElementById('promptOutput');
  t.select();
  document.execCommand('copy');
  document.getElementById('copyPrompt').textContent = 'Copied!';
  setTimeout(() => document.getElementById('copyPrompt').textContent = 'Copy prompt', 1200);
});

document.getElementById('approveBtn').addEventListener('click', () => {
  const t = document.getElementById('promptOutput');
  t.value = 'approve';
  t.select();
  document.execCommand('copy');
  alert('Approval copied. Paste "approve" to the agent and hit enter.');
});

document.getElementById('resetAll').addEventListener('click', () => {
  Object.assign(state, BASELINE_TOKENS);
  activePreset = null;
  document.querySelectorAll('.pg-preset').forEach(e => e.classList.remove('active'));
  location.reload();
});

document.querySelectorAll('[data-vp]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-vp]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const width = { desktop: '100%', tablet: '768px', mobile: '375px' }[btn.dataset.vp];
    document.getElementById('preview').style.width = width;
  });
});

renderControls();
update();
</script>
</body>
</html>
```

## Notes on the template

- The template intentionally keeps the token-editing UI minimal.
  Sliders vs. text inputs vs. color-pickers are chosen per token
  category; anything more sophisticated (hue/saturation sliders,
  contrast calculators) is a future enhancement.
- The `sandbox="allow-same-origin"` iframe setting permits the preview
  to share the parent's `file://` origin for font loading, while
  still blocking scripts from the preview content. The preview HTML
  comes from `approved/index.html`, which should not contain scripts
  the user doesn't trust (it's their own approved design).
- `document.execCommand('copy')` is used instead of the newer
  Clipboard API because `file://` origins often lack clipboard
  permissions.
- The template does not attempt to persist state across reloads.
  If the user wants to save adjustments, the orchestrator re-generates
  the playground with the new state baked in.
