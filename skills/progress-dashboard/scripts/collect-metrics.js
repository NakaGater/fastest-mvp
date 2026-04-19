#!/usr/bin/env node
// Aggregates .dashboard/events.jsonl into a summary object used by
// generate-dashboard.js. Pure function over the event stream; no side
// effects besides reading the file.

const fs = require('fs');
const path = require('path');

const PHASES = ['discovery', 'design', 'build', 'verify', 'ship'];

function readEvents(eventsPath) {
  if (!fs.existsSync(eventsPath)) return [];
  const text = fs.readFileSync(eventsPath, 'utf8');
  const lines = text.split('\n').filter(Boolean);
  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch (_) {
      // Skip malformed lines rather than abort.
    }
  }
  return events;
}

function blankSummary() {
  const phaseInit = () => ({
    status: 'pending',
    started_at: null,
    completed_at: null,
    tokens: { input: 0, output: 0, cache: 0 },
    commits: [],
  });
  return {
    session: {
      started_at: null,
      last_event_at: null,
      platform: 'unknown',
    },
    phases: Object.fromEntries(PHASES.map((p) => [p, phaseInit()])),
    gates: {
      prd: null,
      'tech-stack': null,
      design: null,
    },
    tasks: [], // { id, title, status, agent, tokens, started_at, completed_at, reviews: {spec,quality} }
    gan_iterations: [], // { iteration, score, max, ts }
    commits: [], // { sha, message, phase, files[], ts }
    escalations: [], // { task, reason, ts }
    totals: {
      tokens: { input: 0, output: 0, cache: 0 },
      tool_calls: 0,
    },
  };
}

function estimateCost(tokens) {
  // Rough Opus 4.7 pricing as of this skill's authoring — NOT
  // authoritative. Used only for order-of-magnitude display.
  const INPUT_PER_MTOK = 15;
  const OUTPUT_PER_MTOK = 75;
  const CACHE_PER_MTOK = 1.5;
  const inCost = (tokens.input / 1_000_000) * INPUT_PER_MTOK;
  const outCost = (tokens.output / 1_000_000) * OUTPUT_PER_MTOK;
  const cacheCost = (tokens.cache / 1_000_000) * CACHE_PER_MTOK;
  return inCost + outCost + cacheCost;
}

function findOrCreateTask(summary, id, patch = {}) {
  let task = summary.tasks.find((t) => t.id === id);
  if (!task) {
    task = {
      id,
      title: id,
      status: 'pending',
      agent: null,
      tokens: { input: 0, output: 0, cache: 0 },
      started_at: null,
      completed_at: null,
      reviews: { spec: null, quality: null },
    };
    summary.tasks.push(task);
  }
  Object.assign(task, patch);
  return task;
}

function applyEvent(summary, evt) {
  summary.session.last_event_at = evt.ts;

  switch (evt.type) {
    case 'session-start':
      summary.session.started_at = evt.ts;
      summary.session.platform = evt.platform || 'unknown';
      break;

    case 'phase-start': {
      const p = summary.phases[evt.phase];
      if (p) {
        p.status = 'in_progress';
        p.started_at = evt.ts;
      }
      break;
    }

    case 'phase-complete': {
      const p = summary.phases[evt.phase];
      if (p) {
        p.status = 'complete';
        p.completed_at = evt.ts;
      }
      break;
    }

    case 'gate-approved':
      summary.gates[evt.gate] = { by: evt.by || 'human', at: evt.ts };
      break;

    case 'tool-use': {
      summary.totals.tool_calls += 1;
      const t = evt.tokens || {};
      summary.totals.tokens.input += t.input || 0;
      summary.totals.tokens.output += t.output || 0;
      summary.totals.tokens.cache += t.cache || 0;
      // Attribute to current in-progress phase.
      const active = PHASES.find(
        (p) => summary.phases[p].status === 'in_progress',
      );
      if (active) {
        summary.phases[active].tokens.input += t.input || 0;
        summary.phases[active].tokens.output += t.output || 0;
        summary.phases[active].tokens.cache += t.cache || 0;
      }
      break;
    }

    case 'task-start':
      findOrCreateTask(summary, evt.task, {
        title: evt.task,
        status: 'in_progress',
        agent: evt.agent || null,
        started_at: evt.ts,
      });
      break;

    case 'task-complete': {
      const task = findOrCreateTask(summary, evt.task, {
        status: evt.status || 'DONE',
        completed_at: evt.ts,
      });
      if (evt.tokens) {
        if (typeof evt.tokens === 'number') {
          task.tokens.output += evt.tokens;
        } else {
          task.tokens.input += evt.tokens.input || 0;
          task.tokens.output += evt.tokens.output || 0;
          task.tokens.cache += evt.tokens.cache || 0;
        }
      }
      break;
    }

    case 'review-complete': {
      const task = findOrCreateTask(summary, evt.task);
      if (evt.reviewer === 'spec' || evt.reviewer === 'quality') {
        task.reviews[evt.reviewer] = evt.result || 'pass';
      }
      break;
    }

    case 'gan-iteration':
      summary.gan_iterations.push({
        iteration: evt.iteration,
        score: evt.score,
        max: evt.max || 40,
        ts: evt.ts,
      });
      break;

    case 'commit': {
      const entry = {
        sha: evt.sha,
        message: evt.message,
        phase: evt.phase || 'unknown',
        files: Array.isArray(evt.files) ? evt.files : [],
        ts: evt.ts,
      };
      summary.commits.push(entry);
      if (summary.phases[entry.phase]) {
        summary.phases[entry.phase].commits.push(entry);
      }
      break;
    }

    case 'escalation':
      summary.escalations.push({
        task: evt.task || null,
        reason: evt.reason || 'unknown',
        ts: evt.ts,
      });
      break;

    default:
      // Unknown event type — ignore.
      break;
  }
}

function collect(eventsPath) {
  const events = readEvents(eventsPath);
  const summary = blankSummary();
  for (const evt of events) {
    applyEvent(summary, evt);
  }
  summary.totals.estimated_cost_usd = estimateCost(summary.totals.tokens);
  summary.generated_at = new Date().toISOString();
  return summary;
}

if (require.main === module) {
  const eventsPath = process.argv[2] || path.join(process.cwd(), '.dashboard', 'events.jsonl');
  const summary = collect(eventsPath);
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

module.exports = { collect, blankSummary, applyEvent, readEvents, estimateCost };
