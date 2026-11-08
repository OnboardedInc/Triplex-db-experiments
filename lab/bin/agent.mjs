#!/usr/bin/env node
// lab/bin/agent.mjs: the only way the triplex-db-2 loop launches Codex agents.
//
// [PROTOCOL 2026-11-08] Why: Sam's instruction of 2026-11-08 fixes the roles and effort levels: Codex gpt-6.1-sol at medium
// effort writes code ("builder"), Codex gpt-6.1-sol at high effort reviews adversarially ("reviewer"), Opus 5.5 at high effort
// plans and thinks (launched through the Agent tool, not here), and nothing runs above high. ~/.codex/config.toml defaults to
// effort "max" and danger-full-access, so this tool always passes the model, the effort and the sandbox explicitly and refuses any
// other combination. Rejected: calling `codex exec` by hand per dispatch (the default effort would leak in on one forgotten flag).
//
// Usage:
//   node lab/bin/agent.mjs launch --role builder|reviewer --id <ID> --prompt <file> [--cwd <dir>]
//        [--worktree <path> --branch <name> [--base <ref>]] [--add-dir <dir>]...
//   node lab/bin/agent.mjs resume --id <ID> --prompt <file>        (continues the agent's Codex session, same role and effort)
//   node lab/bin/agent.mjs list
// Run launch/resume from the orchestrator with run_in_background, so the orchestrator is notified when the agent exits.
// Logs, prompts and last messages live in /Users/sam/Claude/Projects/triplex-db-2/agents/<ID>/ (durable, outside the repo);
// the ledger is lab/agents/ledger.jsonl (one JSON object per event).

import { spawn, execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEDGER = join(REPO, 'lab', 'agents', 'ledger.jsonl');
const DURABLE = '/Users/sam/Claude/Projects/triplex-db-2/agents';
const MODEL = 'gpt-6.1-sol';
const EFFORT = { builder: 'medium', reviewer: 'high' }; // the only allowed pairs; nothing above high
const ALWAYS_WRITABLE = [join(REPO, '.pnpm-store'), '/Users/sam/Claude/Projects/triplex-db-2'];

function fail(msg) { process.stderr.write(`agent.mjs: ${msg}\n`); process.exit(2); }
function now() { return new Date().toISOString(); }
function ledger(ev) { mkdirSync(dirname(LEDGER), { recursive: true }); appendFileSync(LEDGER, JSON.stringify({ t: now(), ...ev }) + '\n'); }
function events() { return existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; }

function parse(argv) {
  const out = { _: [], addDir: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith('--')) fail(`--${key} needs a value`);
    i++;
    if (key === 'add-dir') out.addDir.push(resolve(val)); else out[key] = val;
  }
  return out;
}

function run(role, id, promptFile, cwd, addDirs, resumeSession) { // promptFile is reassigned to the composed copy below
  const effort = EFFORT[role];
  if (!effort) fail(`role must be builder or reviewer (got ${role}); planners and thinkers are Opus via the Agent tool`);
  if (!existsSync(promptFile)) fail(`prompt file ${promptFile} does not exist`);
  const dir = join(DURABLE, id);
  mkdirSync(dir, { recursive: true });
  const stamp = now().replace(/[:.]/g, '-');
  const promptCopy = join(dir, `prompt-${stamp}.md`);
  // [PROTOCOL 2026-11-08] Why: the lab rules travel with every prompt, so no Codex agent can miss them (lab/PROTOCOL.md 1).
  const preamble = readFileSync(join(REPO, 'lab', 'agents', 'CODEX-PREAMBLE.md'), 'utf8');
  const roleText = role === 'builder'
    ? `\n## Your role: code builder (Codex ${MODEL}, ${effort} effort), id ${id}\nImplement the task in your worktree, run its gates, commit, report. A separate reviewer will try to break your work.\n`
    : `\n## Your role: adversarial reviewer (Codex ${MODEL}, ${effort} effort), id ${id}\nTry to break the claim; do not fix the code under review. Your own tools and results go under lab/verify/ on your branch. Verdict: ACCEPT, FIX-FIRST or REJECT, with findings (severity, file:line, reproduction, proposed fix).\n`;
  writeFileSync(promptCopy, `${preamble}${roleText}\n## Your task\n\n${readFileSync(promptFile, 'utf8')}`);
  promptFile = promptCopy;
  const last = join(dir, `last-${stamp}.md`);
  const logPath = join(dir, `codex-${stamp}.log`);
  const writable = [...new Set([...ALWAYS_WRITABLE, ...addDirs])];
  const base = ['-m', MODEL, '-c', `model_reasoning_effort="${effort}"`, '-s', 'workspace-write',
    '-c', 'sandbox_workspace_write.network_access=true', '-o', last];
  for (const d of writable) base.push('--add-dir', d);
  const args = resumeSession
    ? ['exec', 'resume', resumeSession, ...base, '-']
    : ['exec', '-C', cwd, ...base, '-'];
  ledger({ event: resumeSession ? 'resume' : 'launch', id, role, model: MODEL, effort, cwd, prompt: promptCopy, log: logPath, last });
  const log = createWriteStream(logPath);
  const child = spawn('codex', args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, DOCKER_HOST: 'unix:///Users/sam/.colima/triplex2/docker.sock' } });
  let session = resumeSession ?? null;
  const sniff = (buf) => {
    log.write(buf);
    if (!session) { const m = /session id:\s*([0-9a-f-]{36})/i.exec(buf.toString()); if (m) { session = m[1]; ledger({ event: 'session', id, session }); } }
  };
  child.stdout.on('data', sniff);
  child.stderr.on('data', sniff);
  child.stdin.end(readFileSync(promptFile));
  child.on('close', (code) => {
    log.end();
    ledger({ event: 'exit', id, role, effort, code, session, last });
    process.stdout.write(`${id} (${role}, ${MODEL} ${effort}) exited ${code}; last message: ${last}\n`);
    if (existsSync(last)) process.stdout.write(readFileSync(last, 'utf8').slice(-4000) + '\n');
    process.exit(code ?? 1);
  });
}

const [cmd, ...rest] = process.argv.slice(2);
const o = parse(rest);
if (cmd === 'launch') {
  for (const k of ['role', 'id', 'prompt']) if (!o[k]) fail(`launch needs --${k}`);
  if (events().some((e) => e.id === o.id && e.event === 'launch')) fail(`id ${o.id} already launched; use resume or a new id`);
  let cwd = o.cwd ? resolve(o.cwd) : REPO;
  if (o.worktree) {
    if (!o.branch) fail('--worktree needs --branch');
    const wt = resolve(o.worktree);
    if (!existsSync(wt)) execFileSync('git', ['-C', REPO, 'worktree', 'add', wt, '-b', o.branch, o.base ?? 'main'], { stdio: 'inherit' });
    cwd = wt;
  }
  run(o.role, o.id, resolve(o.prompt), cwd, o.addDir, null);
} else if (cmd === 'resume') {
  for (const k of ['id', 'prompt']) if (!o[k]) fail(`resume needs --${k}`);
  const evs = events().filter((e) => e.id === o.id);
  const launch = evs.find((e) => e.event === 'launch');
  const sess = [...evs].reverse().find((e) => e.session)?.session;
  if (!launch || !sess) fail(`no launched session recorded for ${o.id}`);
  run(launch.role, o.id, resolve(o.prompt), launch.cwd, o.addDir, sess);
} else if (cmd === 'list') {
  const by = new Map();
  for (const e of events()) by.set(e.id, { ...(by.get(e.id) ?? {}), ...e });
  for (const [id, e] of by) process.stdout.write(`${id}\t${e.role}\t${e.effort}\t${e.event}${e.code !== undefined ? ' ' + e.code : ''}\t${e.t}\t${e.cwd}\n`);
} else {
  fail('usage: agent.mjs launch|resume|list (see the header)');
}
