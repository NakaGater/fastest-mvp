#!/usr/bin/env node
// Single-purpose validators used by verify.sh. Each subcommand exits
// 0 on success, non-zero on failure, and prints a one-line reason.

const fs = require('fs');
const path = require('path');

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`invalid JSON in ${file}: ${e.message}`);
  }
}

// --- json-valid: parse a JSON file, exit non-zero on failure.
function jsonValid(file) {
  readJson(file);
  process.stdout.write(`OK ${file}\n`);
}

// --- plugin-manifest: required fields in .claude-plugin/plugin.json.
function pluginManifest(file) {
  const m = readJson(file);
  for (const k of ['name', 'version', 'description']) {
    if (!m[k]) fail(`plugin.json missing "${k}"`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) fail(`plugin.json version not semver: ${m.version}`);
  process.stdout.write(`OK plugin manifest fields present (v${m.version})\n`);
}

// --- hooks-claude: Claude Code hook shape.
function hooksClaude(file) {
  const m = readJson(file);
  if (!m.hooks) fail('hooks/claude: missing "hooks"');
  const required = ['SessionStart', 'PostToolUse', 'SubagentStop', 'Stop'];
  for (const k of required) {
    if (!Array.isArray(m.hooks[k]) || m.hooks[k].length === 0) {
      fail(`hooks/claude: missing or empty "${k}"`);
    }
  }
  process.stdout.write(`OK hooks/claude has all 4 required hooks\n`);
}

// --- hooks-copilot: Copilot CLI hook shape (version: 1).
function hooksCopilot(file) {
  const m = readJson(file);
  if (m.version !== 1) fail(`hooks/copilot: version must be 1 (got ${m.version})`);
  if (!m.hooks) fail('hooks/copilot: missing "hooks"');
  const required = ['sessionStart', 'postToolUse', 'subagentStop', 'sessionEnd'];
  for (const k of required) {
    if (!Array.isArray(m.hooks[k]) || m.hooks[k].length === 0) {
      fail(`hooks/copilot: missing or empty "${k}"`);
    }
    for (const entry of m.hooks[k]) {
      if (!entry.bash && !entry.powershell) {
        fail(`hooks/copilot ${k}: each hook needs "bash" or "powershell"`);
      }
    }
  }
  process.stdout.write(`OK hooks/copilot has all 4 required hooks\n`);
}

// --- front-matter: every SKILL.md has YAML front-matter with name + description.
function frontMatter(skillsDir) {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && entry.name === 'SKILL.md') files.push(p);
    }
  })(skillsDir);

  if (files.length === 0) fail(`no SKILL.md found under ${skillsDir}`);

  const problems = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    if (!text.startsWith('---')) {
      problems.push(`${f}: missing front-matter`);
      continue;
    }
    const end = text.indexOf('\n---', 3);
    if (end === -1) {
      problems.push(`${f}: unterminated front-matter`);
      continue;
    }
    const fm = text.slice(3, end);
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:/m);
    if (!nameMatch) { problems.push(`${f}: missing name:`); continue; }
    if (!descMatch) { problems.push(`${f}: missing description:`); continue; }

    const skillDir = path.basename(path.dirname(f));
    const declaredName = nameMatch[1].trim();
    if (declaredName !== skillDir) {
      problems.push(`${f}: name "${declaredName}" != dir "${skillDir}"`);
    }
  }

  if (problems.length) {
    problems.forEach((p) => process.stderr.write(p + '\n'));
    fail(`${problems.length} SKILL.md front-matter problems`);
  }
  process.stdout.write(`OK ${files.length} SKILL.md files valid\n`);
}

// --- agent-md: check agents/*.md has front-matter.
function agentMd(dir) {
  if (!fs.existsSync(dir)) { process.stdout.write(`SKIP agents/ missing\n`); return; }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const problems = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!text.startsWith('---')) { problems.push(`${f}: missing front-matter`); continue; }
    const end = text.indexOf('\n---', 3);
    if (end === -1) { problems.push(`${f}: unterminated front-matter`); continue; }
    const fm = text.slice(3, end);
    if (!/^name:/m.test(fm)) problems.push(`${f}: missing name:`);
    if (!/^description:/m.test(fm)) problems.push(`${f}: missing description:`);
  }
  if (problems.length) {
    problems.forEach((p) => process.stderr.write(p + '\n'));
    fail(`${problems.length} agent front-matter problems`);
  }
  process.stdout.write(`OK ${files.length} agent file(s) valid\n`);
}

// --- hook-refs: hooks.json commands reference existing scripts.
function hookRefs(hooksFile, pluginRoot) {
  const m = readJson(hooksFile);
  const cmds = JSON.stringify(m);
  const matches = [...cmds.matchAll(/\$\{(?:CLAUDE|COPILOT)_PLUGIN_ROOT\}\/([^"\s&|;)]+\.(?:js|sh|py))/g)];
  const missing = [];
  for (const m2 of matches) {
    const rel = m2[1];
    const abs = path.join(pluginRoot, rel);
    if (!fs.existsSync(abs)) missing.push(rel);
  }
  if (missing.length) fail(`hooks reference missing files: ${missing.join(', ')}`);
  process.stdout.write(`OK hooks in ${path.basename(hooksFile)} reference ${matches.length} existing script(s)\n`);
}

// --- dashboard-html: generated dashboard is self-contained.
function dashboardHtml(file) {
  if (!fs.existsSync(file)) fail(`dashboard not found: ${file}`);
  const html = fs.readFileSync(file, 'utf8');
  // No CDNs, no external hrefs (except data: URLs for inline assets)
  const badHref = html.match(/<(?:link|script)[^>]*(?:src|href)="https?:\/\/[^"]+"/);
  if (badHref) fail(`dashboard has external reference: ${badHref[0]}`);
  // Has data injection
  if (!html.includes('var __SUMMARY__ =')) fail(`dashboard missing data injection`);
  // Has the key sections
  for (const sec of ['Phases', 'Tasks', 'Tokens', 'Timeline', 'Commits']) {
    if (!html.includes(sec)) fail(`dashboard missing section: ${sec}`);
  }
  process.stdout.write(`OK dashboard HTML self-contained (${html.length} bytes)\n`);
}

// --- dispatch
const cmd = process.argv[2];
const args = process.argv.slice(3);
switch (cmd) {
  case 'json-valid':        jsonValid(args[0]); break;
  case 'plugin-manifest':   pluginManifest(args[0]); break;
  case 'hooks-claude':      hooksClaude(args[0]); break;
  case 'hooks-copilot':     hooksCopilot(args[0]); break;
  case 'front-matter':      frontMatter(args[0]); break;
  case 'agent-md':          agentMd(args[0]); break;
  case 'hook-refs':         hookRefs(args[0], args[1]); break;
  case 'dashboard-html':    dashboardHtml(args[0]); break;
  default: fail(`unknown check: ${cmd}`);
}
