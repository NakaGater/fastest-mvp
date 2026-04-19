#!/usr/bin/env bash
# End-to-end verification for the fastest-mvp plugin.
#
# Three layers:
#   1. Static      — JSON valid, SKILL.md front-matter valid, hook refs resolve
#   2. Scripts     — each Node script runs with expected input/output
#   3. Simulation  — a scripted session exercises board, dashboard, learnings
#
# Run:  bash tests/verify.sh
# Exit: 0 on full pass, non-zero with a summary of failures.

set -u

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHECK="node ${PLUGIN_ROOT}/tests/lib/check.js"
TMP="$(mktemp -d -t fastest-mvp-verify.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0
FAILURES=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

section() {
  printf "\n${BOLD}== %s ==${NC}\n" "$1"
}

run() {
  # run <label> <command...>
  local label="$1"; shift
  local output
  if output="$("$@" 2>&1)"; then
    PASS=$((PASS+1))
    printf "  ${GREEN}PASS${NC}  %s\n" "$label"
    [ -n "$output" ] && printf "        %s\n" "$(echo "$output" | head -1)"
  else
    FAIL=$((FAIL+1))
    FAILURES+=("$label")
    printf "  ${RED}FAIL${NC}  %s\n" "$label"
    [ -n "$output" ] && printf "        %s\n" "$output"
  fi
}

# =====================================================================
# Layer 1: Static validation
# =====================================================================
section "Layer 1 — static validation"

run "plugin.json parses"             $CHECK json-valid      "${PLUGIN_ROOT}/.claude-plugin/plugin.json"
run "plugin.json fields + semver"    $CHECK plugin-manifest "${PLUGIN_ROOT}/.claude-plugin/plugin.json"
run "marketplace.json parses"        $CHECK json-valid      "${PLUGIN_ROOT}/.claude-plugin/marketplace.json"
run "hooks/claude valid"             $CHECK hooks-claude    "${PLUGIN_ROOT}/hooks/claude/hooks.json"
run "hooks/copilot valid (v1)"       $CHECK hooks-copilot   "${PLUGIN_ROOT}/hooks/copilot/hooks.json"
run "hooks/claude refs resolve"      $CHECK hook-refs       "${PLUGIN_ROOT}/hooks/claude/hooks.json" "$PLUGIN_ROOT"
run "hooks/copilot refs resolve"     $CHECK hook-refs       "${PLUGIN_ROOT}/hooks/copilot/hooks.json" "$PLUGIN_ROOT"
run "all SKILL.md front-matter"      $CHECK front-matter    "${PLUGIN_ROOT}/skills"
run "all agents/*.md front-matter"   $CHECK agent-md        "${PLUGIN_ROOT}/agents"

# =====================================================================
# Layer 2: Script unit tests
# =====================================================================
section "Layer 2 — script unit tests"

# bootstrap: emits meta-skill content
run "bootstrap.js emits meta-skill" \
  bash -c "cd '$TMP' && CLAUDE_PLUGIN_ROOT='$PLUGIN_ROOT' node '$PLUGIN_ROOT/scripts/bootstrap.js' | grep -q 'getting-started'"

# bootstrap: Copilot mode emits additionalContext JSON
run "bootstrap.js emits JSON under COPILOT_CLI" \
  bash -c "cd '$TMP' && COPILOT_CLI=1 COPILOT_PLUGIN_ROOT='$PLUGIN_ROOT' node '$PLUGIN_ROOT/scripts/bootstrap.js' | node -e 'const s=require(\"fs\").readFileSync(0,\"utf8\");const j=JSON.parse(s);if(!j.additionalContext)process.exit(1);'"

# record-event: CLI modes
run "record-event.js phase-start" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/scripts/record-event.js' phase-start --phase discovery && grep -q 'phase-start' '$TMP/.dashboard/events.jsonl'"

run "record-event.js gate-approved" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/scripts/record-event.js' gate-approved --gate prd --by human && grep -q 'gate-approved' '$TMP/.dashboard/events.jsonl'"

run "record-event.js gan-iteration" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/scripts/record-event.js' gan-iteration --iteration 2 --score 27 && grep -q 'gan-iteration' '$TMP/.dashboard/events.jsonl'"

# record-event: stdin JSON modes
run "record-event.js tool-use from stdin" \
  bash -c "cd '$TMP' && echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"},\"tokens\":{\"input_tokens\":100,\"output_tokens\":50}}' | node '$PLUGIN_ROOT/scripts/record-event.js' tool-use && grep -q '\"tool-use\"' '$TMP/.dashboard/events.jsonl'"

# collect-metrics: aggregates replays
run "collect-metrics.js replays events" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/skills/progress-dashboard/scripts/collect-metrics.js' '$TMP/.dashboard/events.jsonl' | node -e 'const s=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));if(s.phases.discovery.status!==\"in_progress\")process.exit(1);if(!s.gates.prd)process.exit(1);if(s.gan_iterations.length!==1)process.exit(1);'"

# generate-dashboard: writes HTML
run "generate-dashboard.js writes HTML" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/skills/progress-dashboard/scripts/generate-dashboard.js' 2>&1 >/dev/null && test -f '$TMP/.dashboard/progress.html'"

run "dashboard HTML self-contained" \
  $CHECK dashboard-html "$TMP/.dashboard/progress.html"

# load-learnings: empty case
run "load-learnings.js empty => []" \
  bash -c "out=\$(cd '$TMP' && node '$PLUGIN_ROOT/skills/learnings/scripts/load-learnings.js' 2>/dev/null); test \"\$out\" = '[]'"

# load-learnings: with a fixture
run "load-learnings.js loads project-local fixture" \
  bash -c "mkdir -p '$TMP/.learnings' && cp '$PLUGIN_ROOT/tests/fixtures/learning.md' '$TMP/.learnings/' && cd '$TMP' && node '$PLUGIN_ROOT/skills/learnings/scripts/load-learnings.js' --limit 5 | node -e 'const a=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));if(a.length!==1)process.exit(1);if(a[0].scope!==\"project\")process.exit(1);if(!a[0].tags.includes(\"tool:prisma\"))process.exit(1);'"

run "load-learnings.js context format" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/skills/learnings/scripts/load-learnings.js' --format context | grep -q 'Prior learnings'"

# board: init from a plan, walk lifecycle
run "board.js init from plan" \
  bash -c "mkdir -p '$TMP/docs' && cp '$PLUGIN_ROOT/tests/fixtures/plan.md' '$TMP/docs/' && cd '$TMP' && node '$PLUGIN_ROOT/skills/subagent-development/scripts/board.js' init --from docs/plan.md | grep -q '\"added\": 3'"

run "board.js next returns T1 (no deps)" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/skills/subagent-development/scripts/board.js' next | grep -q '\"id\": \"T1\"'"

run "board.js claim + complete T1" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/skills/subagent-development/scripts/board.js' claim T1 --agent implementer >/dev/null && node '$PLUGIN_ROOT/skills/subagent-development/scripts/board.js' complete T1 --status DONE --sha abc1234 >/dev/null"

run "board.js next returns T2 (unblocked)" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/skills/subagent-development/scripts/board.js' next | grep -q '\"id\": \"T2\"'"

run "board.js block + stats" \
  bash -c "cd '$TMP' && node '$PLUGIN_ROOT/skills/subagent-development/scripts/board.js' block T3 --reason 'ambiguous' >/dev/null && node '$PLUGIN_ROOT/skills/subagent-development/scripts/board.js' stats | node -e 'const s=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));if(s.by.done!==1||s.by.blocked!==1||s.blocked[0].reason!==\"ambiguous\")process.exit(1);'"

# =====================================================================
# Layer 3: Session simulation
# =====================================================================
section "Layer 3 — session simulation"

SIM="$TMP/sim"
mkdir -p "$SIM/docs"
cp "$PLUGIN_ROOT/tests/fixtures/plan.md" "$SIM/docs/"

# Replay a realistic event sequence
simulate() {
  cd "$SIM" || return 1
  node "$PLUGIN_ROOT/scripts/record-event.js" session-start
  node "$PLUGIN_ROOT/scripts/record-event.js" phase-start --phase discovery
  echo '{"tool_name":"Write","tokens":{"input_tokens":1200,"output_tokens":900}}' \
    | node "$PLUGIN_ROOT/scripts/record-event.js" tool-use
  node "$PLUGIN_ROOT/scripts/record-event.js" gate-approved --gate prd --by human
  node "$PLUGIN_ROOT/scripts/record-event.js" phase-complete --phase discovery
  node "$PLUGIN_ROOT/scripts/record-event.js" phase-start --phase design
  node "$PLUGIN_ROOT/scripts/record-event.js" gan-iteration --iteration 1 --score 18
  node "$PLUGIN_ROOT/scripts/record-event.js" gan-iteration --iteration 2 --score 25
  node "$PLUGIN_ROOT/scripts/record-event.js" gan-iteration --iteration 3 --score 33
  node "$PLUGIN_ROOT/scripts/record-event.js" gate-approved --gate design --by human
  node "$PLUGIN_ROOT/scripts/record-event.js" phase-complete --phase design
  node "$PLUGIN_ROOT/scripts/record-event.js" phase-start --phase build

  node "$PLUGIN_ROOT/skills/subagent-development/scripts/board.js" init --from docs/plan.md >/dev/null

  # Task 1
  node "$PLUGIN_ROOT/skills/subagent-development/scripts/board.js" claim T1 --agent implementer >/dev/null
  echo '{"tool_name":"Edit","tokens":{"input_tokens":2000,"output_tokens":1500}}' \
    | node "$PLUGIN_ROOT/scripts/record-event.js" tool-use
  echo '{"subagent_task":"T1","status":"DONE","tokens":{"input":2500,"output":2000}}' \
    | node "$PLUGIN_ROOT/scripts/record-event.js" task-complete
  node "$PLUGIN_ROOT/skills/subagent-development/scripts/board.js" complete T1 --status DONE --sha abc1234 >/dev/null

  # Task 2 (escalates)
  node "$PLUGIN_ROOT/skills/subagent-development/scripts/board.js" claim T2 --agent implementer >/dev/null
  node "$PLUGIN_ROOT/scripts/record-event.js" escalation --task "T2" --reason "BLOCKED: needs clarification"
  node "$PLUGIN_ROOT/skills/subagent-development/scripts/board.js" block T2 --reason "needs clarification" >/dev/null
}

run "simulate: event sequence replays cleanly" simulate

run "simulate: dashboard regenerates without errors" \
  bash -c "cd '$SIM' && node '$PLUGIN_ROOT/skills/progress-dashboard/scripts/generate-dashboard.js' 2>&1 | grep -q 'wrote'"

run "simulate: dashboard contains escalation, 3 GAN iters, task data" \
  bash -c "html=\$(cat '$SIM/.dashboard/progress.html'); echo \"\$html\" | grep -q 'escalation' && echo \"\$html\" | grep -q 'gan-iteration\\|GAN' && echo \"\$html\" | grep -q 'T1'"

run "simulate: dashboard score trajectory 18/25/33" \
  bash -c "node '$PLUGIN_ROOT/skills/progress-dashboard/scripts/collect-metrics.js' '$SIM/.dashboard/events.jsonl' | node -e 'const s=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));const scores=s.gan_iterations.map(g=>g.score);if(scores.join(\",\")!==\"18,25,33\")process.exit(1);'"

run "simulate: board has T1=done, T2=blocked, T3=pending" \
  bash -c "cd '$SIM' && node '$PLUGIN_ROOT/skills/subagent-development/scripts/board.js' stats | node -e 'const s=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));if(s.by.done!==1||s.by.blocked!==1||s.by.pending!==1)process.exit(1);'"

run "simulate: aggregate tokens correctly attributed to phases" \
  bash -c "node '$PLUGIN_ROOT/skills/progress-dashboard/scripts/collect-metrics.js' '$SIM/.dashboard/events.jsonl' | node -e 'const s=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));const disc=s.phases.discovery.tokens;const build=s.phases.build.tokens;if(disc.input<1200)process.exit(1);if(build.input<2000)process.exit(1);'"

run "simulate: learning round-trip (write -> load)" \
  bash -c "mkdir -p '$SIM/.learnings' && cp '$PLUGIN_ROOT/tests/fixtures/learning.md' '$SIM/.learnings/' && cd '$SIM' && node '$PLUGIN_ROOT/skills/learnings/scripts/load-learnings.js' --tags tool:prisma --limit 5 | grep -q Prisma"

# =====================================================================
# Summary
# =====================================================================
section "Summary"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  printf "${GREEN}${BOLD}All %d checks passed.${NC}\n" "$TOTAL"
  exit 0
else
  printf "${RED}${BOLD}%d of %d checks failed:${NC}\n" "$FAIL" "$TOTAL"
  for f in "${FAILURES[@]}"; do printf "  - %s\n" "$f"; done
  exit 1
fi
