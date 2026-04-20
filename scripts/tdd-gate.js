#!/usr/bin/env node
// preToolUse hook: TDD gate
//
// Fires before Write/Edit/Create tool calls. If the target is a source
// file (not a test, not docs/config), injects a TDD reminder into the
// agent's context. This is a mechanical enforcement layer — the agent
// sees the reminder every time it touches production code.
//
// Platforms:
//   Claude Code PreToolUse — stdin is JSON with tool_name + tool_input
//   Copilot CLI preToolUse — stdin is JSON with toolName + toolInput
//
// Output:
//   Claude Code: plain text to stdout (becomes additional context)
//   Copilot CLI: JSON { additionalContext: "..." } to stdout
//
// Never throws or exits non-zero — hooks must not fail the session.

const fs = require('fs');
const path = require('path');

function detectPlatform() {
  if (process.env.COPILOT_CLI) return 'copilot';
  return 'claude-code';
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

// Detect if a tool is a file-write operation
function isWriteTool(toolName) {
  if (!toolName) return false;
  const name = toolName.toLowerCase();
  const writePatterns = [
    'write', 'edit', 'create', 'file_write', 'file_edit',
    'file_create', 'updatefile', 'createfile', 'writefile',
  ];
  return writePatterns.some(p => name.includes(p));
}

// Check if a file path is a source file (not test, not config/docs)
function isSourceFile(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  const basename = path.basename(normalized);
  const ext = path.extname(normalized).toLowerCase();

  // Test files — do NOT gate these (writing tests is encouraged)
  const testPatterns = [
    /\.test\./i,
    /\.spec\./i,
    /\/__tests__\//i,
    /\/test\//i,
    /\/tests\//i,
    /\/e2e\//i,
    /\.stories\./i,
  ];
  if (testPatterns.some(p => p.test(normalized))) return false;

  // Non-source files — do NOT gate these
  const nonSourcePatterns = [
    /\.md$/i,
    /\.json$/i,
    /\.ya?ml$/i,
    /\.toml$/i,
    /\.env/i,
    /\.gitignore$/i,
    /\.eslintrc/i,
    /\.prettier/i,
    /\/docs\//i,
    /\/\.dashboard\//i,
    /\/\.board\//i,
    /\/skills\//i,
    /\/hooks\//i,
    /\/scripts\//i,
    /package\.json$/i,
    /package-lock\.json$/i,
    /tsconfig/i,
    /\.config\./i,
  ];
  if (nonSourcePatterns.some(p => p.test(normalized))) return false;

  // Source code extensions
  const sourceExts = [
    '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs',
    '.py', '.go', '.rs', '.java', '.rb', '.php',
    '.css', '.scss', '.less', '.html', '.vue', '.svelte',
  ];
  return sourceExts.includes(ext);
}

// Check if we're likely in Build phase
function isInBuildPhase() {
  const projectRoot = process.cwd();
  // Heuristic: plan.md exists (Design complete) and board.jsonl exists
  // (Build has started)
  const planExists = fs.existsSync(
    path.join(projectRoot, 'docs', 'plan.md'),
  );
  const boardExists = fs.existsSync(
    path.join(projectRoot, '.board', 'board.jsonl'),
  );
  return planExists && boardExists;
}

function getFilePath(input) {
  if (!input) return '';
  // Handle different tool input formats
  if (typeof input === 'string') {
    try { input = JSON.parse(input); } catch { return ''; }
  }
  return input.path || input.file_path || input.filePath ||
         input.filename || input.file || '';
}

function main() {
  const stdinData = parseStdinJson();
  const platform = detectPlatform();

  // Extract tool info (both platforms)
  const toolName = stdinData.tool_name || stdinData.toolName ||
                   process.env.TOOL_NAME || '';
  const toolInput = stdinData.tool_input || stdinData.toolInput ||
                    stdinData.input || {};

  // Only gate file-write tools
  if (!isWriteTool(toolName)) return;

  const filePath = getFilePath(toolInput);
  if (!isSourceFile(filePath)) return;

  // Only inject during Build phase
  if (!isInBuildPhase()) return;

  const basename = path.basename(filePath);
  const reminder = [
    '## TDD Gate — Source file write detected',
    '',
    `You are about to write to: \`${basename}\``,
    '',
    '**Before writing implementation code, confirm:**',
    '1. You have already written a failing test (RED step)',
    '2. You ran the test and confirmed it fails for the right reason',
    '3. You will include this evidence in your RED_EVIDENCE report',
    '',
    'If you are writing the test itself → proceed.',
    'If the test is already failing and you are making it pass (GREEN) → proceed.',
    'If you are refactoring with passing tests (IMPROVE) → proceed.',
    'If you have NOT written a failing test yet → STOP. Write the test FIRST.',
  ].join('\n');

  if (platform === 'copilot') {
    process.stdout.write(
      JSON.stringify({ additionalContext: reminder }) + '\n',
    );
  } else {
    process.stdout.write(reminder + '\n');
  }
}

try {
  main();
} catch (_) {
  // Never throw from a hook.
  process.exit(0);
}
