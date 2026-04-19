#!/usr/bin/env node
// Persistent task queue backend for subagent-development.
// Inspired by Heartbeat's board.jsonl — an append-only log of task
// state transitions. In-memory TodoWrite lives only for the current
// turn; the board survives across turns, resumptions, and worktrees.
//
// Usage:
//   board.js init --from docs/plan.md
//   board.js list [--status pending|in_progress|done|blocked]
//   board.js next                          # next actionable task (JSON)
//   board.js claim <task-id> --agent <name>
//   board.js complete <task-id> --status DONE --sha <sha>
//   board.js block <task-id> --reason "..."
//   board.js note <task-id> --text "..."
//   board.js stats                         # summary JSON
//
// All mutations are appended to .board/board.jsonl as events; the
// current state is derived by replaying the log. This guarantees a
// full audit trail of every state change, and makes conflict-free
// resume trivial — just replay.

const fs = require('fs');
const path = require('path');

function boardDir() {
  const dir = path.join(process.cwd(), '.board');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function boardPath() {
  return path.join(boardDir(), 'board.jsonl');
}

function now() {
  return new Date().toISOString();
}

function readEvents() {
  const p = boardPath();
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, 'utf8');
  return text.split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch (_) { return null; }
  }).filter(Boolean);
}

function appendEvent(evt) {
  fs.appendFileSync(boardPath(), JSON.stringify(evt) + '\n');
}

function deriveState() {
  // Replay the event log to derive current task state.
  const tasks = new Map();
  for (const e of readEvents()) {
    switch (e.type) {
      case 'task-added': {
        tasks.set(e.id, {
          id: e.id,
          title: e.title,
          dependsOn: e.dependsOn || [],
          verify: e.verify || [],
          status: 'pending',
          agent: null,
          attempts: 0,
          history: [],
        });
        break;
      }
      case 'claimed': {
        const t = tasks.get(e.id);
        if (t) { t.status = 'in_progress'; t.agent = e.agent; t.attempts += 1; t.history.push(e); }
        break;
      }
      case 'completed': {
        const t = tasks.get(e.id);
        if (t) { t.status = e.status === 'BLOCKED' ? 'blocked' : 'done'; t.sha = e.sha; t.result = e.status; t.history.push(e); }
        break;
      }
      case 'blocked': {
        const t = tasks.get(e.id);
        if (t) { t.status = 'blocked'; t.reason = e.reason; t.history.push(e); }
        break;
      }
      case 'unblocked': {
        const t = tasks.get(e.id);
        if (t) { t.status = 'pending'; t.reason = null; t.history.push(e); }
        break;
      }
      case 'note': {
        const t = tasks.get(e.id);
        if (t) t.history.push(e);
        break;
      }
      default:
        break;
    }
  }
  return tasks;
}

// ---- Commands ----

function cmdInit(args) {
  const planPath = args.from || 'docs/plan.md';
  if (!fs.existsSync(planPath)) {
    process.stderr.write(`[board] plan not found: ${planPath}\n`);
    process.exit(1);
  }
  const md = fs.readFileSync(planPath, 'utf8');

  // Parse tasks under "### Task N: Title" headings.
  const taskRegex = /^###\s+Task\s+(\d+):\s+(.+)$/gm;
  const matches = [...md.matchAll(taskRegex)];
  if (!matches.length) {
    process.stderr.write('[board] no tasks found in plan\n');
    process.exit(1);
  }

  const existing = deriveState();
  let added = 0;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const id = `T${m[1]}`;
    const title = m[2].trim();
    if (existing.has(id)) continue;

    const start = m.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length;
    const section = md.slice(start, end);

    const depsMatch = section.match(/\*\*Depends on\*\*\s*\n((?:\s*[-*].*\n?)*)/);
    const dependsOn = depsMatch
      ? [...depsMatch[1].matchAll(/Task\s+(\d+)/g)].map((x) => `T${x[1]}`)
      : [];

    const verifyMatch = section.match(/\*\*Verify\*\*\s*\n((?:\s*[-*].*\n?)*)/);
    const verify = verifyMatch
      ? [...verifyMatch[1].matchAll(/^\s*[-*]\s+`([^`]+)`/gm)].map((x) => x[1])
      : [];

    appendEvent({
      ts: now(),
      type: 'task-added',
      id,
      title,
      dependsOn,
      verify,
    });
    added += 1;
  }

  process.stdout.write(JSON.stringify({ added, total: matches.length }, null, 2) + '\n');
}

function cmdList(args) {
  const tasks = [...deriveState().values()];
  const filtered = args.status
    ? tasks.filter((t) => t.status === args.status)
    : tasks;
  process.stdout.write(JSON.stringify(filtered.map(({ history, ...rest }) => rest), null, 2) + '\n');
}

function cmdNext() {
  const tasks = [...deriveState().values()];
  const doneIds = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.id));
  const actionable = tasks.find(
    (t) =>
      t.status === 'pending' &&
      (t.dependsOn || []).every((d) => doneIds.has(d)),
  );
  if (!actionable) {
    process.stdout.write('null\n');
    return;
  }
  process.stdout.write(JSON.stringify(actionable, null, 2) + '\n');
}

function cmdClaim(args) {
  if (!args.id) { process.stderr.write('[board] id required\n'); process.exit(1); }
  appendEvent({ ts: now(), type: 'claimed', id: args.id, agent: args.agent || 'unknown' });
  process.stdout.write(JSON.stringify({ ok: true, id: args.id }) + '\n');
}

function cmdComplete(args) {
  if (!args.id) { process.stderr.write('[board] id required\n'); process.exit(1); }
  appendEvent({
    ts: now(),
    type: 'completed',
    id: args.id,
    status: args.status || 'DONE',
    sha: args.sha || null,
  });
  process.stdout.write(JSON.stringify({ ok: true, id: args.id }) + '\n');
}

function cmdBlock(args) {
  appendEvent({ ts: now(), type: 'blocked', id: args.id, reason: args.reason || 'unspecified' });
  process.stdout.write(JSON.stringify({ ok: true, id: args.id }) + '\n');
}

function cmdUnblock(args) {
  appendEvent({ ts: now(), type: 'unblocked', id: args.id });
  process.stdout.write(JSON.stringify({ ok: true, id: args.id }) + '\n');
}

function cmdNote(args) {
  appendEvent({ ts: now(), type: 'note', id: args.id, text: args.text || '' });
  process.stdout.write(JSON.stringify({ ok: true, id: args.id }) + '\n');
}

function cmdStats() {
  const tasks = [...deriveState().values()];
  const by = { pending: 0, in_progress: 0, done: 0, blocked: 0 };
  for (const t of tasks) by[t.status] = (by[t.status] || 0) + 1;
  const blocked = tasks.filter((t) => t.status === 'blocked').map((t) => ({ id: t.id, reason: t.reason }));
  const nextUp = tasks.find((t) => t.status === 'pending' && (t.dependsOn || []).every((d) => tasks.find((x) => x.id === d && x.status === 'done')));
  process.stdout.write(JSON.stringify({ total: tasks.length, by, blocked, nextUp: nextUp ? nextUp.id : null }, null, 2) + '\n');
}

// ---- Dispatch ----

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith('--')) { args[key] = val; i++; } else { args[key] = true; }
    } else {
      positional.push(a);
    }
  }
  if (positional[0]) args.id = positional[0];
  return args;
}

function main() {
  const cmd = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  switch (cmd) {
    case 'init': return cmdInit(args);
    case 'list': return cmdList(args);
    case 'next': return cmdNext();
    case 'claim': return cmdClaim(args);
    case 'complete': return cmdComplete(args);
    case 'block': return cmdBlock(args);
    case 'unblock': return cmdUnblock(args);
    case 'note': return cmdNote(args);
    case 'stats': return cmdStats();
    default:
      process.stderr.write(`[board] unknown command: ${cmd}\n`);
      process.stderr.write('Usage: board.js {init|list|next|claim|complete|block|unblock|note|stats}\n');
      process.exit(1);
  }
}

try {
  main();
} catch (err) {
  process.stderr.write('[board] error: ' + err.message + '\n');
  process.exit(1);
}
