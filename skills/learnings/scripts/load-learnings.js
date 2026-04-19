#!/usr/bin/env node
// Parses learning files from both project-local (.learnings/) and
// user-global (~/.claude/fastest-mvp/learnings/) directories,
// ranks by relevance, and returns the top matches as JSON.
//
// Usage:
//   load-learnings.js                          # top 5 for current project
//   load-learnings.js --tags tag1,tag2         # filter by tags
//   load-learnings.js --limit 10
//   load-learnings.js --format context         # markdown for injection
//   load-learnings.js --prune                  # archive stale learnings
//   load-learnings.js --project-root <path>
//
// Never throws. Prints [] on any error.

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_LIMIT = 5;
const DECAY_DAYS = 180;
const ARCHIVE_AFTER_DAYS = 365;
const ARCHIVE_MIN_HITS = 3;

const CONFIDENCE_WEIGHT = { high: 3, medium: 2, low: 1 };

function parseArgs(argv) {
  const out = { limit: DEFAULT_LIMIT, tags: [], format: 'json', prune: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') out.limit = Number(argv[++i]) || DEFAULT_LIMIT;
    else if (a === '--tags') out.tags = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--format') out.format = argv[++i] || 'json';
    else if (a === '--prune') out.prune = true;
    else if (a === '--project-root') out.projectRoot = argv[++i];
  }
  return out;
}

function projectRoot(explicit) {
  if (explicit) return path.resolve(explicit);
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function userLearningsDir() {
  return path.join(os.homedir(), '.claude', 'fastest-mvp', 'learnings');
}

function projectLearningsDir(root) {
  return path.join(root, '.learnings');
}

function listLearningFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => path.join(dir, f));
}

function parseFrontMatter(text) {
  if (!text.startsWith('---')) return { front: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { front: {}, body: text };
  const raw = text.slice(3, end).trim();
  const body = text.slice(end + 4).trimStart();
  const front = {};
  raw.split('\n').forEach((line) => {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (/^\d+$/.test(val)) val = Number(val);
    else val = val.replace(/^"|"$/g, '');
    front[key] = val;
  });
  return { front, body };
}

function inferProjectTags(root) {
  const tags = new Set();
  const pkgPath = path.join(root, 'package.json');
  try {
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
      if (deps.next) tags.add('framework:nextjs');
      if (deps['@remix-run/node'] || deps['@remix-run/react']) tags.add('framework:remix');
      if (deps.astro) tags.add('framework:astro');
      if (deps.hono) tags.add('framework:hono');
      if (deps['@prisma/client'] || deps.prisma) tags.add('tool:prisma');
      if (deps['drizzle-orm']) tags.add('tool:drizzle');
      if (deps.playwright || deps['@playwright/test']) tags.add('tool:playwright');
      if (deps.tailwindcss) tags.add('tool:tailwind');
      tags.add('ecosystem-js');
    }
  } catch (_) {}
  if (fs.existsSync(path.join(root, 'pyproject.toml')) || fs.existsSync(path.join(root, 'requirements.txt'))) {
    tags.add('ecosystem-py');
  }
  if (fs.existsSync(path.join(root, 'Gemfile'))) tags.add('ecosystem-ruby');
  if (fs.existsSync(path.join(root, 'go.mod'))) tags.add('ecosystem-go');
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) tags.add('ecosystem-rust');
  return Array.from(tags);
}

function score(learning, queryTags, now = Date.now()) {
  const conf = CONFIDENCE_WEIGHT[(learning.front.confidence || 'medium').toLowerCase()] || 2;
  const lastSeen = learning.front.last_seen || learning.front.created_at || '1970-01-01';
  const daysOld = Math.max(0, (now - Date.parse(lastSeen)) / 86_400_000);
  const recency = Math.max(0.1, 1 - daysOld / DECAY_DAYS);
  const lTags = Array.isArray(learning.front.tags) ? learning.front.tags : [];
  const match = queryTags.length === 0
    ? 1
    : lTags.filter((t) => queryTags.includes(t)).length + 0.1;
  return conf * recency * match;
}

function loadAll(root) {
  const learnings = [];
  for (const dir of [projectLearningsDir(root), userLearningsDir()]) {
    for (const file of listLearningFiles(dir)) {
      try {
        const text = fs.readFileSync(file, 'utf8');
        const { front, body } = parseFrontMatter(text);
        learnings.push({
          file,
          scope: dir === userLearningsDir() ? 'user-global' : 'project',
          front,
          body,
        });
      } catch (_) {}
    }
  }
  return learnings;
}

function summarize(body) {
  // Grab the first non-empty paragraph after the H1.
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].startsWith('# ')) i++;
  while (i < lines.length && (lines[i].startsWith('#') || lines[i].trim() === '' || lines[i].startsWith('## '))) i++;
  const paragraph = [];
  while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#')) {
    paragraph.push(lines[i].trim());
    i++;
  }
  return paragraph.join(' ').slice(0, 400);
}

function rank(learnings, tags, limit) {
  const queryTags = tags.length ? tags : [];
  return learnings
    .map((l) => ({ ...l, score: score(l, queryTags) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function pruneStale(root) {
  const now = Date.now();
  const results = { archived: [] };
  for (const dir of [projectLearningsDir(root), userLearningsDir()]) {
    const archiveDir = path.join(dir, 'archive');
    for (const file of listLearningFiles(dir)) {
      try {
        const text = fs.readFileSync(file, 'utf8');
        const { front } = parseFrontMatter(text);
        const lastSeen = front.last_seen || front.created_at || '1970-01-01';
        const daysOld = (now - Date.parse(lastSeen)) / 86_400_000;
        const hits = Number(front.hits || 0);
        if (daysOld > ARCHIVE_AFTER_DAYS && hits < ARCHIVE_MIN_HITS) {
          if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
          const dest = path.join(archiveDir, path.basename(file));
          fs.renameSync(file, dest);
          results.archived.push(dest);
        }
      } catch (_) {}
    }
  }
  return results;
}

function formatContext(items) {
  if (!items.length) return '';
  const lines = ['## Prior learnings (from previous sessions)', ''];
  items.forEach((it, i) => {
    const tags = Array.isArray(it.front.tags) ? it.front.tags.join(', ') : '';
    const prefix = it.front.anti ? 'AVOID' : 'TIP';
    lines.push(
      `${i + 1}. **[${prefix}] ${it.front.title || path.basename(it.file, '.md')}** (${tags})`,
    );
    lines.push(`   ${summarize(it.body)}`);
    lines.push(`   — *${it.scope}, confidence: ${it.front.confidence || 'medium'}*`);
    lines.push('');
  });
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = projectRoot(args.projectRoot);

  if (args.prune) {
    const res = pruneStale(root);
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
    return;
  }

  const all = loadAll(root);
  const projectTags = inferProjectTags(root);
  const queryTags = args.tags.length ? args.tags : projectTags;
  const top = rank(all, queryTags, args.limit);

  if (args.format === 'context') {
    process.stdout.write(formatContext(top) + '\n');
  } else {
    process.stdout.write(
      JSON.stringify(
        top.map((l) => ({
          title: l.front.title || path.basename(l.file, '.md'),
          summary: summarize(l.body),
          file: l.file,
          scope: l.scope,
          tags: l.front.tags || [],
          confidence: l.front.confidence || 'medium',
          anti: !!l.front.anti,
          score: l.score,
        })),
        null,
        2,
      ) + '\n',
    );
  }
}

try {
  main();
} catch (_) {
  process.stdout.write('[]\n');
}
