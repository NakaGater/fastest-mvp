#!/usr/bin/env node
// SessionStart bootstrap: injects the getting-started meta-skill into
// the session context. Detects platform (Claude Code vs Copilot CLI)
// and, for Copilot, appends the tool-mapping reference.
//
// Claude Code SessionStart hook: stdout is added to the session
// context as additional instructions.
// Copilot CLI sessionStart hook: prints a JSON object with an
// `additionalContext` field (v1.0.11+).
//
// We never throw — hook failures must not abort the session.

const fs = require('fs');
const path = require('path');

function pluginRoot() {
  return (
    process.env.CLAUDE_PLUGIN_ROOT ||
    process.env.COPILOT_PLUGIN_ROOT ||
    path.resolve(__dirname, '..')
  );
}

function readIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return '';
  }
}

function detectPlatform() {
  if (process.env.COPILOT_CLI) return 'copilot';
  if (process.env.CLAUDECODE || process.env.CLAUDE_PLUGIN_ROOT) return 'claude-code';
  return 'claude-code';
}

function ensureDashboardDir(root) {
  // The dashboard lives alongside the project, not the plugin.
  const projectRoot = process.cwd();
  const dir = path.join(projectRoot, '.dashboard');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const eventsPath = path.join(dir, 'events.jsonl');
    if (!fs.existsSync(eventsPath)) {
      fs.appendFileSync(
        eventsPath,
        JSON.stringify({
          ts: new Date().toISOString(),
          type: 'session-start',
          platform: detectPlatform(),
        }) + '\n',
      );
    }
  } catch (_) {
    // ignore — dashboard is observability only
  }
}

function main() {
  const root = pluginRoot();
  const platform = detectPlatform();
  const metaSkill = readIfExists(
    path.join(root, 'skills', 'getting-started', 'SKILL.md'),
  );

  let content = metaSkill;
  if (platform === 'copilot') {
    const mapping = readIfExists(
      path.join(
        root,
        'skills',
        'getting-started',
        'references',
        'copilot-tools.md',
      ),
    );
    if (mapping) {
      content += '\n\n---\n\n' + mapping;
    }
  }

  ensureDashboardDir(root);

  if (platform === 'copilot') {
    process.stdout.write(
      JSON.stringify({ additionalContext: content }) + '\n',
    );
  } else {
    // Claude Code: plain stdout.
    process.stdout.write(content + '\n');
  }
}

try {
  main();
} catch (err) {
  // Never throw from a hook.
  process.stderr.write('[bootstrap] error: ' + err.message + '\n');
  process.exit(0);
}
