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

function loadLearnings(root) {
  // Best-effort: if the learnings script is missing or fails, we
  // return an empty string rather than blocking the session.
  const script = path.join(
    root,
    'skills',
    'learnings',
    'scripts',
    'load-learnings.js',
  );
  if (!fs.existsSync(script)) return '';
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync(
      process.execPath,
      [script, '--limit', '5', '--format', 'context'],
      { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 },
    );
    return out.toString().trim();
  } catch (_) {
    return '';
  }
}

function loadTddRules(root) {
  // Compact TDD rules injected at session start. This ensures TDD
  // discipline is always in context, not just when the implementer
  // reads the skill file.
  return [
    '## TDD Core Rules (always active)',
    '',
    'Every behavioral code change MUST follow RED → GREEN → IMPROVE:',
    '1. **RED**: Write a failing test FIRST. Run it. Confirm it fails',
    '   for the right reason (behavior missing, not syntax error).',
    '2. **GREEN**: Write the smallest code to make the test pass.',
    '3. **IMPROVE**: Refactor with tests green. No new features here.',
    '',
    'The implementer subagent MUST provide `RED_EVIDENCE` in every',
    'report: test file path, failing command, and failure output.',
    'Reports without valid RED_EVIDENCE are rejected by the orchestrator',
    'and both reviewers.',
    '',
    'Exceptions: non-behavioral changes (rename, config, docs) may skip',
    'TDD but must justify in RED_EVIDENCE.',
  ].join('\n');
}

function main() {
  const root = pluginRoot();
  const platform = detectPlatform();
  const metaSkill = readIfExists(
    path.join(root, 'skills', 'getting-started', 'SKILL.md'),
  );

  let content = metaSkill;

  // Inject TDD rules
  const tddRules = loadTddRules(root);
  if (tddRules) {
    content += '\n\n---\n\n' + tddRules;
  }

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

  const learnings = loadLearnings(root);
  if (learnings) {
    content += '\n\n---\n\n' + learnings;
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
