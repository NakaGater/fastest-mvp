#!/usr/bin/env node
// Writes one JSON line to .dashboard/events.jsonl for each event that
// hooks or skills want to record. Usage:
//
//   Hook modes (stdin = JSON from Claude Code / Copilot CLI):
//     record-event.js tool-use
//     record-event.js task-complete
//     record-event.js turn-complete
//
//   CLI mode (args):
//     record-event.js phase-start --phase design
//     record-event.js phase-complete --phase design
//     record-event.js gate-approved --gate prd --by human
//     record-event.js gan-iteration --iteration 3 --score 27 [--max 40]
//     record-event.js escalation --task "Task 4" --reason BLOCKED
//
// Never throws or exits non-zero — hooks must not fail the session.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PHASE_PREFIX_RE = /^\[(\w+)\]/;

function dashboardDir() {
  const dir = path.join(process.cwd(), '.dashboard');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function append(event) {
  const file = path.join(dashboardDir(), 'events.jsonl');
  fs.appendFileSync(file, JSON.stringify(event) + '\n');
}

function now() {
  return new Date().toISOString();
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (_) {
    return '';
  }
}

function parseStdinJson() {
  const raw = readStdin();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function parseCliArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith('--')) {
        out[key] = val;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

// ---- Hook modes ----

function handleToolUse() {
  const input = parseStdinJson();
  const tool = input.tool_name || input.toolName || 'unknown';
  const tokens = input.tokens || input.usage || {};

  append({
    ts: now(),
    type: 'tool-use',
    tool,
    tokens: {
      input: tokens.input_tokens || tokens.input || 0,
      output: tokens.output_tokens || tokens.output || 0,
      cache:
        tokens.cache_read_input_tokens ||
        tokens.cache ||
        0,
    },
  });

  // Bash + git commit detection.
  const command =
    (input.tool_input && input.tool_input.command) ||
    (input.toolInput && input.toolInput.command) ||
    '';
  if (tool === 'Bash' || tool === 'bash') {
    if (typeof command === 'string' && /\bgit\s+commit\b/.test(command)) {
      recordCommit();
    }
  }
}

function recordCommit() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const message = execSync('git log -1 --pretty=%s', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const filesRaw = execSync('git diff-tree --no-commit-id --name-only -r HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const files = filesRaw ? filesRaw.split('\n') : [];
    const phaseMatch = message.match(PHASE_PREFIX_RE);
    const phase = phaseMatch ? phaseMatch[1] : 'unknown';

    append({
      ts: now(),
      type: 'commit',
      sha,
      message,
      phase,
      files,
    });
  } catch (_) {
    // Not a git repo, or commit failed — ignore.
  }
}

function handleTaskComplete() {
  const input = parseStdinJson();
  append({
    ts: now(),
    type: 'task-complete',
    task:
      input.subagent_task ||
      input.task ||
      input.description ||
      'unknown-task',
    status: input.status || 'DONE',
    tokens: input.tokens || {},
    agent: input.subagent_type || input.agent_type || null,
  });
}

function handleTurnComplete() {
  const input = parseStdinJson();
  append({
    ts: now(),
    type: 'turn-complete',
    tokens_so_far: input.tokens_so_far || input.usage || {},
  });
}

function handlePhaseStart(args) {
  append({ ts: now(), type: 'phase-start', phase: args.phase || 'unknown' });
}

function handlePhaseComplete(args) {
  append({ ts: now(), type: 'phase-complete', phase: args.phase || 'unknown' });
}

function handleGateApproved(args) {
  append({
    ts: now(),
    type: 'gate-approved',
    gate: args.gate || 'unknown',
    by: args.by || 'human',
  });
}

function handleGanIteration(args) {
  append({
    ts: now(),
    type: 'gan-iteration',
    iteration: Number(args.iteration) || 0,
    score: Number(args.score) || 0,
    max: Number(args.max) || 40,
  });
}

function handleEscalation(args) {
  append({
    ts: now(),
    type: 'escalation',
    task: args.task || null,
    reason: args.reason || 'unknown',
  });
}

function handleSessionStart() {
  append({
    ts: now(),
    type: 'session-start',
    platform: process.env.COPILOT_CLI ? 'copilot' : 'claude-code',
  });
}

function handleCommitCheck() {
  // Same as tool-use, but guaranteed to only record a commit if the
  // most recent `git commit` was just issued. Used by a dedicated hook
  // matcher in some setups.
  const input = parseStdinJson();
  const command =
    (input.tool_input && input.tool_input.command) ||
    (input.toolInput && input.toolInput.command) ||
    '';
  if (typeof command === 'string' && /\bgit\s+commit\b/.test(command)) {
    recordCommit();
  }
}

// ---- Dispatch ----

function main() {
  const mode = process.argv[2];
  const args = parseCliArgs(process.argv.slice(3));

  switch (mode) {
    case 'session-start': return handleSessionStart();
    case 'tool-use': return handleToolUse();
    case 'commit-check': return handleCommitCheck();
    case 'task-complete': return handleTaskComplete();
    case 'turn-complete': return handleTurnComplete();
    case 'phase-start': return handlePhaseStart(args);
    case 'phase-complete': return handlePhaseComplete(args);
    case 'gate-approved': return handleGateApproved(args);
    case 'gan-iteration': return handleGanIteration(args);
    case 'escalation': return handleEscalation(args);
    default:
      process.stderr.write('[record-event] unknown mode: ' + mode + '\n');
  }
}

try {
  main();
} catch (err) {
  process.stderr.write('[record-event] error: ' + err.message + '\n');
}
process.exit(0);
