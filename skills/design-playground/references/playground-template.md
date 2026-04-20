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

  /* Mode switcher */
  .pg-mode-bar { padding-bottom: 8px !important; }
  .pg-mode-btns { display: flex; gap: 4px; }
  .pg-mode-btn { flex: 1; padding: 6px 4px; background: var(--pg-bg-3); border: 1px solid var(--pg-border); color: var(--pg-fg-muted); border-radius: 4px; cursor: pointer; font-size: 11px; text-align: center; transition: all 0.15s; }
  .pg-mode-btn:hover { color: var(--pg-fg); background: var(--pg-bg-2); }
  .pg-mode-btn.active { border-color: var(--pg-accent); color: var(--pg-accent); background: rgba(88,166,255,0.08); }

  /* Text change items */
  .pg-text-change { padding: 6px 8px; border: 1px solid var(--pg-border); border-radius: 4px; margin-bottom: 4px; font-size: 12px; }
  .pg-text-change .pg-tc-selector { color: var(--pg-accent); font-family: ui-monospace, monospace; font-size: 11px; }
  .pg-text-change .pg-tc-diff { color: var(--pg-fg-muted); margin-top: 2px; word-break: break-all; }
  .pg-text-change .pg-tc-diff del { color: #f85149; text-decoration: line-through; }
  .pg-text-change .pg-tc-diff ins { color: #3fb950; text-decoration: none; }
  .pg-text-change button { float: right; background: none; border: none; color: var(--pg-fg-muted); cursor: pointer; font-size: 11px; padding: 0; }
  .pg-text-change button:hover { color: #f85149; }

  /* Annotation items */
  .pg-annot-item { padding: 6px 8px; border: 1px solid var(--pg-border); border-radius: 4px; margin-bottom: 4px; font-size: 12px; cursor: pointer; transition: border-color 0.15s; }
  .pg-annot-item:hover { border-color: var(--pg-accent); }
  .pg-annot-item.highlight { border-color: var(--pg-accent); background: rgba(88,166,255,0.06); }
  .pg-annot-item .pg-ai-head { display: flex; align-items: center; gap: 6px; }
  .pg-annot-item .pg-ai-num { background: var(--pg-accent); color: #000; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; flex-shrink: 0; }
  .pg-annot-item .pg-ai-hint { color: var(--pg-accent); font-family: ui-monospace, monospace; font-size: 11px; }
  .pg-annot-item .pg-ai-note { color: var(--pg-fg-muted); margin-top: 3px; line-height: 1.4; }
  .pg-annot-item button { float: right; background: none; border: none; color: var(--pg-fg-muted); cursor: pointer; font-size: 11px; padding: 0; }
  .pg-annot-item button:hover { color: #f85149; }

  /* Edit mode indicators in iframe */
  .pg-editable-hover { outline: 2px dashed var(--pg-accent, #58a6ff) !important; outline-offset: 2px; cursor: text !important; }
  .pg-editable-active { outline: 2px solid var(--pg-accent, #58a6ff) !important; outline-offset: 2px; background: rgba(88,166,255,0.05) !important; }
</style>
</head>
<body>
<div class="pg-root">

  <aside class="pg-panel">
    <div class="pg-section pg-mode-bar">
      <h3>Mode</h3>
      <div class="pg-mode-btns">
        <button class="pg-mode-btn active" data-mode="adjust">Adjust</button>
        <button class="pg-mode-btn" data-mode="edit">Edit</button>
        <button class="pg-mode-btn" data-mode="annotate">Annotate</button>
      </div>
    </div>

    <!-- Adjust mode panels -->
    <div class="pg-section pg-mode-panel" data-for="adjust">
      <h3>Presets</h3>
      <div id="presets"></div>
    </div>
    <div class="pg-section pg-mode-panel" data-for="adjust">
      <h3>Colors</h3>
      <div id="colors"></div>
    </div>
    <div class="pg-section pg-mode-panel" data-for="adjust">
      <h3>Typography</h3>
      <div id="typography"></div>
    </div>
    <div class="pg-section pg-mode-panel" data-for="adjust">
      <h3>Spacing &amp; radius</h3>
      <div id="layout"></div>
    </div>
    <div class="pg-section pg-mode-panel" data-for="adjust">
      <h3>Shadows</h3>
      <div id="shadows"></div>
    </div>

    <!-- Edit mode panels -->
    <div class="pg-section pg-mode-panel" data-for="edit" style="display:none">
      <h3>Text changes</h3>
      <p style="font-size:12px;color:var(--pg-fg-muted);margin:0 0 8px">Click any text in the preview to edit it.</p>
      <div id="textChangesList"></div>
      <p id="textChangesEmpty" style="font-size:12px;color:var(--pg-fg-muted);margin:4px 0">No changes yet.</p>
    </div>

    <!-- Annotate mode panels -->
    <div class="pg-section pg-mode-panel" data-for="annotate" style="display:none">
      <h3>Annotations</h3>
      <p style="font-size:12px;color:var(--pg-fg-muted);margin:0 0 8px">Draw a rectangle on the preview, then type your feedback.</p>
      <div id="annotationsList"></div>
      <p id="annotationsEmpty" style="font-size:12px;color:var(--pg-fg-muted);margin:4px 0">No annotations yet.</p>
    </div>
  </aside>

  <main class="pg-panel">
    <div class="pg-preview-head">
      <span style="font-size:12px;color:var(--pg-fg-muted)">Viewport:</span>
      <button data-vp="desktop" class="active">Desktop 1440</button>
      <button data-vp="tablet">Tablet 768</button>
      <button data-vp="mobile">Mobile 375</button>
      <span style="flex:1"></span>
      <span id="modeIndicator" style="font-size:11px;color:var(--pg-accent);display:none"></span>
      <button id="resetAll">Reset</button>
    </div>
    <div class="pg-preview-body" style="position:relative">
      <iframe id="preview" sandbox="allow-same-origin"></iframe>
      <svg id="annotationOverlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10"></svg>
      <!-- Annotation note popup -->
      <div id="annotPopup" style="display:none;position:absolute;z-index:20;background:var(--pg-bg-2);border:1px solid var(--pg-accent);border-radius:6px;padding:10px;width:260px;box-shadow:0 4px 12px rgba(0,0,0,0.4)">
        <label style="display:block;font-size:11px;color:var(--pg-fg-muted);margin-bottom:4px">What should change here?</label>
        <textarea id="annotNote" rows="3" style="width:100%;background:var(--pg-bg-3);color:var(--pg-fg);border:1px solid var(--pg-border);border-radius:4px;padding:6px;font-size:12px;resize:vertical"></textarea>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button id="annotSave" style="flex:1;background:#238636;border:1px solid #2ea043;color:#fff;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px">Save</button>
          <button id="annotCancel" style="flex:1;background:var(--pg-bg-3);border:1px solid var(--pg-border);color:var(--pg-fg);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px">Cancel</button>
        </div>
      </div>
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
let currentMode = 'adjust';

// --- Text editing state ---
const textChanges = []; // {selector, originalText, newText}
let editableElements = [];

// --- Annotation state ---
const annotations = []; // {id, xPct, yPct, wPct, hPct, note, elementHint}
let annotIdCounter = 0;
let isDrawing = false;
let drawStart = null;
let tempRect = null;

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

// ============================================================
// MODE SWITCHING
// ============================================================

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.pg-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.querySelectorAll('.pg-mode-panel').forEach(p => {
    p.style.display = p.dataset.for === mode ? '' : 'none';
  });
  const overlay = document.getElementById('annotationOverlay');
  overlay.style.pointerEvents = mode === 'annotate' ? 'auto' : 'none';
  const indicator = document.getElementById('modeIndicator');
  if (mode === 'adjust') { indicator.style.display = 'none'; }
  else { indicator.style.display = ''; indicator.textContent = mode === 'edit' ? '✎ Click text to edit' : '▢ Draw to annotate'; }
  // Toggle contentEditable on iframe text elements
  updateEditableState();
}

document.querySelectorAll('.pg-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// ============================================================
// TOKEN CONTROLS (existing, mostly unchanged)
// ============================================================

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
      row.querySelector('input').addEventListener('input', (e) => { state[key] = e.target.value; updatePreview(); });
      target.appendChild(row);
    } else if (key.startsWith('--font-sans') || key.startsWith('--font-mono') || key.startsWith('--font-display')) {
      const options = FONT_CHOICES.map(f => `<option${f === val ? ' selected' : ''}>${f}</option>`).join('');
      const row = el(`<div class="pg-row"><label>${key}</label><select>${options}</select></div>`);
      row.querySelector('select').addEventListener('change', (e) => { state[key] = e.target.value; updatePreview(); });
      target.appendChild(row);
    } else {
      const row = el(`<div class="pg-row"><label>${key}</label><input type="text" value="${val}" style="width:100px"></div>`);
      row.querySelector('input').addEventListener('input', (e) => { state[key] = e.target.value; updatePreview(); });
      target.appendChild(row);
    }
  });
}

function applyPreset(i) {
  activePreset = i;
  Object.assign(state, PRESETS[i].tokens);
  document.querySelectorAll('.pg-preset').forEach((e, idx) => e.classList.toggle('active', idx === i));
  updatePreview();
}

function tokensToCssVars(tokens) {
  return ':root {\n' + Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n') + '\n}\n';
}

function updatePreview() {
  const overrideCss = tokensToCssVars(state);
  const doc = `<!doctype html><html><head><meta charset="UTF-8"><style>${APPROVED_CSS}\n${overrideCss}</style></head><body>${APPROVED_HTML}</body></html>`;
  document.getElementById('preview').srcdoc = doc;
  document.getElementById('promptOutput').value = composePrompt();
  // Re-apply editable state after iframe reloads
  setTimeout(() => updateEditableState(), 100);
}

// ============================================================
// TEXT EDITING
// ============================================================

const TEXT_SELECTORS = 'h1,h2,h3,h4,h5,h6,p,span,li,a,button,label,td,th,figcaption,blockquote';

function getElementSelector(el) {
  if (el.id) return '#' + el.id;
  let sel = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') sel += '.' + el.className.trim().split(/\s+/).join('.');
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
    if (siblings.length > 1) sel += ':nth-child(' + (Array.from(parent.children).indexOf(el) + 1) + ')';
  }
  return sel;
}

function updateEditableState() {
  try {
    const iframe = document.getElementById('preview');
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;
    const elements = doc.querySelectorAll(TEXT_SELECTORS);
    if (currentMode === 'edit') {
      elements.forEach(el => {
        el.contentEditable = 'true';
        el.addEventListener('mouseenter', onEditHover);
        el.addEventListener('mouseleave', onEditUnhover);
        el.addEventListener('focus', onEditFocus);
        el.addEventListener('blur', onEditBlur);
      });
    } else {
      elements.forEach(el => {
        el.contentEditable = 'false';
        el.removeEventListener('mouseenter', onEditHover);
        el.removeEventListener('mouseleave', onEditUnhover);
        el.classList.remove('pg-editable-hover', 'pg-editable-active');
      });
    }
    // Inject helper classes into iframe
    if (!doc.getElementById('pg-edit-styles')) {
      const style = doc.createElement('style');
      style.id = 'pg-edit-styles';
      style.textContent = `.pg-editable-hover{outline:2px dashed #58a6ff!important;outline-offset:2px;cursor:text!important}.pg-editable-active{outline:2px solid #58a6ff!important;outline-offset:2px;background:rgba(88,166,255,0.05)!important}`;
      doc.head.appendChild(style);
    }
  } catch(e) { /* sandbox restriction — fall back to popup editor */ }
}

function onEditHover(e) { e.target.classList.add('pg-editable-hover'); }
function onEditUnhover(e) { e.target.classList.remove('pg-editable-hover'); }
function onEditFocus(e) {
  const el = e.target;
  el.classList.remove('pg-editable-hover');
  el.classList.add('pg-editable-active');
  if (!el._pgOriginal) el._pgOriginal = el.textContent;
}
function onEditBlur(e) {
  const el = e.target;
  el.classList.remove('pg-editable-active');
  if (el._pgOriginal && el.textContent !== el._pgOriginal) {
    const selector = getElementSelector(el);
    const existing = textChanges.findIndex(c => c.selector === selector);
    if (existing >= 0) {
      textChanges[existing].newText = el.textContent;
      if (textChanges[existing].originalText === el.textContent) textChanges.splice(existing, 1);
    } else {
      textChanges.push({ selector, originalText: el._pgOriginal, newText: el.textContent });
    }
    renderTextChangesList();
    document.getElementById('promptOutput').value = composePrompt();
  }
}

function renderTextChangesList() {
  const list = document.getElementById('textChangesList');
  const empty = document.getElementById('textChangesEmpty');
  list.innerHTML = '';
  empty.style.display = textChanges.length ? 'none' : '';
  textChanges.forEach((c, i) => {
    const item = el(`<div class="pg-text-change">
      <button title="Revert">&times;</button>
      <div class="pg-tc-selector">${c.selector}</div>
      <div class="pg-tc-diff"><del>${esc(c.originalText)}</del> → <ins>${esc(c.newText)}</ins></div>
    </div>`);
    item.querySelector('button').addEventListener('click', () => revertTextChange(i));
    list.appendChild(item);
  });
}

function revertTextChange(i) {
  const c = textChanges[i];
  try {
    const doc = document.getElementById('preview').contentDocument;
    const el = doc.querySelector(c.selector);
    if (el) { el.textContent = c.originalText; el._pgOriginal = c.originalText; }
  } catch(e) {}
  textChanges.splice(i, 1);
  renderTextChangesList();
  document.getElementById('promptOutput').value = composePrompt();
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ============================================================
// ANNOTATIONS
// ============================================================

const overlay = document.getElementById('annotationOverlay');

overlay.addEventListener('mousedown', (e) => {
  if (currentMode !== 'annotate') return;
  const rect = overlay.getBoundingClientRect();
  isDrawing = true;
  drawStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  tempRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  tempRect.setAttribute('fill', 'rgba(88,166,255,0.15)');
  tempRect.setAttribute('stroke', '#58a6ff');
  tempRect.setAttribute('stroke-width', '2');
  tempRect.setAttribute('rx', '3');
  tempRect.setAttribute('x', drawStart.x);
  tempRect.setAttribute('y', drawStart.y);
  tempRect.setAttribute('width', 0);
  tempRect.setAttribute('height', 0);
  overlay.appendChild(tempRect);
});

overlay.addEventListener('mousemove', (e) => {
  if (!isDrawing || !tempRect) return;
  const rect = overlay.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const rx = Math.min(drawStart.x, x), ry = Math.min(drawStart.y, y);
  const rw = Math.abs(x - drawStart.x), rh = Math.abs(y - drawStart.y);
  tempRect.setAttribute('x', rx);
  tempRect.setAttribute('y', ry);
  tempRect.setAttribute('width', rw);
  tempRect.setAttribute('height', rh);
});

overlay.addEventListener('mouseup', (e) => {
  if (!isDrawing || !tempRect) return;
  isDrawing = false;
  const rect = overlay.getBoundingClientRect();
  const x = parseFloat(tempRect.getAttribute('x'));
  const y = parseFloat(tempRect.getAttribute('y'));
  const w = parseFloat(tempRect.getAttribute('width'));
  const h = parseFloat(tempRect.getAttribute('height'));
  // Ignore tiny accidental clicks
  if (w < 10 || h < 10) { overlay.removeChild(tempRect); tempRect = null; return; }
  // Convert to percentages
  const xPct = (x / rect.width) * 100;
  const yPct = (y / rect.height) * 100;
  const wPct = (w / rect.width) * 100;
  const hPct = (h / rect.height) * 100;
  // Detect element under center of rectangle
  let elementHint = 'unknown area';
  try {
    const iframe = document.getElementById('preview');
    const iRect = iframe.getBoundingClientRect();
    const cx = x + w / 2, cy = y + h / 2;
    const iframeDoc = iframe.contentDocument;
    const target = iframeDoc.elementFromPoint(cx * (iframeDoc.documentElement.scrollWidth / rect.width), cy * (iframeDoc.documentElement.scrollHeight / rect.height));
    if (target) elementHint = getElementSelector(target);
  } catch(e) {}
  // Remove temp rect, show popup
  overlay.removeChild(tempRect);
  tempRect = null;
  showAnnotPopup(xPct, yPct, wPct, hPct, elementHint, x + w, y);
});

function showAnnotPopup(xPct, yPct, wPct, hPct, elementHint, posX, posY) {
  const popup = document.getElementById('annotPopup');
  const note = document.getElementById('annotNote');
  note.value = '';
  popup.style.left = Math.min(posX, window.innerWidth - 300) + 'px';
  popup.style.top = Math.min(posY, window.innerHeight - 200) + 'px';
  popup.style.display = '';
  note.focus();

  const save = () => {
    const text = note.value.trim();
    if (!text) { note.focus(); return; }
    popup.style.display = 'none';
    const id = ++annotIdCounter;
    annotations.push({ id, xPct, yPct, wPct, hPct, note: text, elementHint });
    renderAnnotations();
    document.getElementById('promptOutput').value = composePrompt();
    cleanup();
  };
  const cancel = () => {
    popup.style.display = 'none';
    cleanup();
  };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === 'Escape') cancel(); };
  const cleanup = () => {
    document.getElementById('annotSave').removeEventListener('click', save);
    document.getElementById('annotCancel').removeEventListener('click', cancel);
    note.removeEventListener('keydown', onKey);
  };
  document.getElementById('annotSave').addEventListener('click', save);
  document.getElementById('annotCancel').addEventListener('click', cancel);
  note.addEventListener('keydown', onKey);
}

function renderAnnotations() {
  // SVG
  overlay.innerHTML = '';
  annotations.forEach((a, i) => {
    const rect = overlay.getBoundingClientRect();
    const x = a.xPct * rect.width / 100;
    const y = a.yPct * rect.height / 100;
    const w = a.wPct * rect.width / 100;
    const h = a.hPct * rect.height / 100;
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', w); r.setAttribute('height', h);
    r.setAttribute('fill', 'rgba(88,166,255,0.12)');
    r.setAttribute('stroke', '#58a6ff'); r.setAttribute('stroke-width', '2');
    r.setAttribute('rx', '3');
    r.style.pointerEvents = 'none';
    overlay.appendChild(r);
    // Number label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x + 6); label.setAttribute('y', y + 16);
    label.setAttribute('fill', '#58a6ff'); label.setAttribute('font-size', '14');
    label.setAttribute('font-weight', 'bold'); label.setAttribute('font-family', 'system-ui');
    label.style.pointerEvents = 'none';
    label.textContent = String(i + 1);
    overlay.appendChild(label);
  });
  // List
  const list = document.getElementById('annotationsList');
  const empty = document.getElementById('annotationsEmpty');
  list.innerHTML = '';
  empty.style.display = annotations.length ? 'none' : '';
  annotations.forEach((a, i) => {
    const item = el(`<div class="pg-annot-item" data-annot-id="${a.id}">
      <button title="Delete">&times;</button>
      <div class="pg-ai-head"><span class="pg-ai-num">${i+1}</span> <span class="pg-ai-hint">${esc(a.elementHint)}</span></div>
      <div class="pg-ai-note">${esc(a.note)}</div>
    </div>`);
    item.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); deleteAnnotation(i); });
    item.addEventListener('click', () => highlightAnnotation(i));
    list.appendChild(item);
  });
}

function deleteAnnotation(i) {
  annotations.splice(i, 1);
  renderAnnotations();
  document.getElementById('promptOutput').value = composePrompt();
}

function highlightAnnotation(i) {
  document.querySelectorAll('.pg-annot-item').forEach((el, idx) => el.classList.toggle('highlight', idx === i));
  // Flash the SVG rect
  const rects = overlay.querySelectorAll('rect');
  if (rects[i]) {
    rects[i].setAttribute('fill', 'rgba(88,166,255,0.35)');
    setTimeout(() => rects[i].setAttribute('fill', 'rgba(88,166,255,0.12)'), 600);
  }
}

// ============================================================
// PROMPT COMPOSITION (expanded)
// ============================================================

function composePrompt() {
  const sections = [];

  // Token diffs
  const tokenDiffs = [];
  Object.keys(state).forEach(k => {
    if (state[k] !== BASELINE_TOKENS[k]) {
      tokenDiffs.push(`  ${k}: ${BASELINE_TOKENS[k]} -> ${state[k]}`);
    }
  });
  if (tokenDiffs.length) {
    sections.push('Tokens:\n' + tokenDiffs.join('\n'));
  }

  // Text changes
  if (textChanges.length) {
    const lines = textChanges.map((c, i) =>
      `  [${i+1}] ${c.selector}: "${c.originalText}" → "${c.newText}"`
    );
    sections.push('Text changes:\n' + lines.join('\n'));
  }

  // Annotations
  if (annotations.length) {
    const lines = annotations.map((a, i) =>
      `  [${i+1}] Area: ${a.elementHint}\n      → "${a.note}"`
    );
    sections.push('Annotations:\n' + lines.join('\n'));
  }

  if (!sections.length) return 'No changes yet. Adjust tokens, edit text, or annotate areas on the left.';

  const rationale = document.getElementById('rationale').value.trim();
  const parts = ['Please apply the following design adjustments:', '', ...sections];
  if (rationale) parts.push('', 'Rationale (user): "' + rationale + '"');
  parts.push('', 'Keep all other tokens and content as-is unless noted above.');
  if (annotations.length) {
    parts.push('Apply annotations as structural/visual changes to the relevant');
    parts.push('components. If an annotation requires layout changes, update the');
    parts.push('HTML structure accordingly.');
  }
  return parts.join('\n');
}

// ============================================================
// EXISTING CONTROLS (copy, approve, reset, viewport)
// ============================================================

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
  textChanges.length = 0;
  annotations.length = 0;
  annotIdCounter = 0;
  document.querySelectorAll('.pg-preset').forEach(e => e.classList.remove('active'));
  renderAnnotations();
  renderTextChangesList();
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
updatePreview();
</script>
</body>
</html>
```

## Notes on the template

- The template supports three interaction modes: token adjustment
  (sliders, pickers), direct text editing (contentEditable in the
  iframe), and area annotation (SVG overlay with rectangle drawing).
- The `sandbox="allow-same-origin"` iframe setting permits the parent
  to access the preview DOM for text editing and element detection.
  The preview HTML comes from `approved/index.html`, which should not
  contain scripts the user doesn't trust (it's their own approved
  design).
- Annotations use percentage coordinates so they remain valid when
  the viewport size changes (Desktop → Tablet → Mobile).
- `elementFromPoint()` auto-detects which element is under each
  annotation rectangle, providing a CSS selector hint for the prompt.
- `document.execCommand('copy')` is used instead of the newer
  Clipboard API because `file://` origins often lack clipboard
  permissions.
- The template does not attempt to persist state across reloads.
  If the user wants to save adjustments, the orchestrator re-generates
  the playground with the new state baked in.
- If `contentEditable` does not work in the sandbox (browser-specific),
  the implementation should fall back to a popup text editor rendered
  in the parent window near the clicked element.
