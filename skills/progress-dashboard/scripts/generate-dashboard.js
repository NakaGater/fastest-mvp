#!/usr/bin/env node
// Generates .dashboard/progress.html from .dashboard/events.jsonl.
// Self-contained output: no CDN, no external assets.

const fs = require('fs');
const path = require('path');
const { collect } = require('./collect-metrics');

function resolveProjectRoot() {
  // Walk up from cwd looking for a .git directory or package.json; fall
  // back to cwd. Intentionally simple — we don't require a git repo.
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (
      fs.existsSync(path.join(dir, '.git')) ||
      fs.existsSync(path.join(dir, '.claude-plugin'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function ensureDashboardDir(root) {
  const dir = path.join(root, '.dashboard');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generate({ root = resolveProjectRoot() } = {}) {
  const dashDir = ensureDashboardDir(root);
  const eventsPath = path.join(dashDir, 'events.jsonl');
  const templatePath = path.join(__dirname, 'template.html');
  const outPath = path.join(dashDir, 'progress.html');

  const summary = collect(eventsPath);
  const template = fs.readFileSync(templatePath, 'utf8');
  const injected = template.replace(
    /var __SUMMARY__ = \/\*__SUMMARY__\*\/ null;/,
    'var __SUMMARY__ = ' + JSON.stringify(summary) + ';',
  );

  fs.writeFileSync(outPath, injected);
  return { outPath, summary };
}

if (require.main === module) {
  try {
    const { outPath, summary } = generate();
    const phases = Object.entries(summary.phases)
      .map(([k, v]) => k + ':' + v.status)
      .join(' ');
    console.error('[progress-dashboard] wrote ' + outPath);
    console.error('[progress-dashboard] ' + phases);
  } catch (err) {
    console.error('[progress-dashboard] error: ' + err.message);
    process.exit(0); // non-blocking — hooks should not fail the session
  }
}

module.exports = { generate };
