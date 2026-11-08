// lab/scenarios/lib/oracle.mjs: feed generated command streams to O-REPLAY and turn its answers into goldens.
//
// [EXP-W01] Why: golden means independent (BRIEF point of view). Every expected state comes from
// lab/oracles/replay (branch exp/O01-replay-oracle, unmodified), run as `python3 -I cli.py CASE`.
// Commands are partitioned by subject into small cases: every command touches one subject's world (bulk
// commands are split by entity), and no constraint or precondition reaches across subjects, so a subject's
// answers depend only on its own commands. That keeps O-REPLAY's linear scans (state.live() per command,
// scope_assertions per query) small. The partition is a stated assumption checked by assertPartitioned().
// Rejected: one case per scenario (O(assertions x queries) in O-REPLAY took minutes at 20k assertions);
// a JS replay (not independent of the harness).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonRow, digestRows, sha256, subjectEntities } from './gen.mjs';
import { REPO } from './triplex.mjs';

const TAG_CATEGORY = { CommandAlreadyCommittedError: 'command-already-committed', TransactionConflictError: 'transaction-conflict', InvalidTripleError: 'invalid-value', ConstraintViolationError: 'constraint-violation' };
export const ORACLE_CLI = path.join(REPO, 'lab/oracles/replay/cli.py');
export const ORACLE_FILES = fs.readdirSync(path.join(REPO, 'lab/oracles/replay')).filter(f => f.endsWith('.py') || f.endsWith('.md')).sort()
  .map(f => `lab/oracles/replay/${f}`);

const entityOf = id => id.slice(id.indexOf(':') + 1);
/** Subject id of an entity id `<kind>:<sid>`. */
export const subjectOfEntity = entityOf;

function assertPartitioned(command) {
  for (const op of command.operations) {
    if (op.op !== 'assert' || command.subject == null) continue;
    if (subjectOfEntity(op.entityId) !== command.subject) throw new Error(`command ${command.index} writes ${op.entityId} outside subject ${command.subject}`);
  }
}

/** Case operations of one command restricted to `subjects` (bulk commands are split by entity). */
function caseCommand(command, subjects, refsKept) {
  const operations = [];
  for (const op of command.operations) {
    if (op.op === 'assert') {
      if (!subjects.has(subjectOfEntity(op.entityId))) continue;
      refsKept.add(op.ref);
      operations.push(op);
    } else if (op.op === 'retract') {
      if (refsKept.has(op.target)) operations.push(op);
    } else if (op.op === 'erase') {
      // R-ERA-2 erasure by entity (and attribute): kept when the entity belongs to this chunk's subjects.
      if (op.entityId && subjects.has(subjectOfEntity(op.entityId))) operations.push(op);
    } else throw new Error(`unsupported op ${op.op} in command ${command.index}`);
  }
  const meta = { ...command.meta };
  if (meta.preconditions) meta.preconditions = meta.preconditions.filter(p => subjects.has(subjectOfEntity(p.entityId)));
  return { operations, meta, ...(command.tags?.race ? { race: command.tags.race } : {}) };
}

export function runOracle(caseJson, workDir) {
  const bytes = Buffer.from(JSON.stringify(caseJson));
  const digest = sha256(bytes);
  const file = path.join(workDir, `${digest.slice(0, 16)}.case.json`);
  fs.writeFileSync(file, bytes);
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-I', ORACLE_CLI, file], { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [], err = [];
    child.stdout.on('data', d => out.push(d)); child.stderr.on('data', d => err.push(d));
    child.on('close', code => {
      // Exit 2 with X-NOT-MODELED means the oracle declines to model the case (e.g. erasure before a later
      // oracle version): the expectation is "not modeled", never a case error (verifier note, O-REPLAY 0.3.1).
      if (code === 2 && /X-NOT-MODELED/.test(Buffer.concat(err).toString() + Buffer.concat(out).toString()))
        return resolve({ caseSha256: digest, notModeled: (Buffer.concat(err).toString().match(/X-NOT-MODELED[^\n]*/) ?? ['X-NOT-MODELED'])[0], exitCode: code });
      if (code === 2) return reject(new Error(`O-REPLAY refused case ${caseJson.caseId}: ${Buffer.concat(err).toString().slice(0, 2000)}`));
      try { resolve({ caseSha256: digest, result: JSON.parse(Buffer.concat(out).toString()), exitCode: code }); }
      catch (error) { reject(new Error(`O-REPLAY output for ${caseJson.caseId} is not JSON (exit ${code}): ${Buffer.concat(err).toString().slice(0, 2000)}`)); }
    });
  });
}

async function pool(items, width, fn) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, async () => { while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); } }));
  return results;
}

/**
 * Golden states. For every subject in `subjects`: the digest of its world (placement, worker, i9) at each
 * validAt in `validAts`, before any of its commands (`base`) and after each of its commands (`after[index]`).
 * A command O-REPLAY rejects keeps the previous digest and is listed in `outcomes`.
 * Returns { digests, outcomes, cases: [{caseId, caseSha256, verdict}], rows (for `keepRowsFor` subjects) }.
 */
export async function goldenStates({ caseIdPrefix, commands, subjects, validAts, chunkSize = 20, keepRowsFor = new Set(), workDir }) {
  fs.mkdirSync(workDir, { recursive: true });
  for (const c of commands) assertPartitioned(c);
  const touched = new Map(); // subject -> command indexes, in stream order
  const subjectsOfCommand = c => c.subject != null ? [c.subject] : [...new Set(c.operations.filter(op => op.op === "assert").map(op => subjectOfEntity(op.entityId)))];
  for (const c of commands) for (const s of subjectsOfCommand(c)) { if (!touched.has(s)) touched.set(s, []); touched.get(s).push(c.index); }
  const byIndex = new Map(commands.map(c => [c.index, c]));
  // Every touched subject is replayed (so every command gets an expected outcome); only `subjects` get digests.
  const digestSet = new Set(subjects);
  const ordered = [...digestSet].sort();
  const all = [...ordered, ...[...touched.keys()].filter(s => !digestSet.has(s)).sort()];
  const chunks = [];
  for (let i = 0; i < all.length; i += chunkSize) chunks.push(all.slice(i, i + chunkSize));
  const results = await pool(chunks, Math.max(1, Math.min(8, os.cpus().length - 1)), async (chunk, chunkIndex) => {
    const set = new Set(chunk);
    const refsKept = new Set();
    const caseCommands = [], origin = [];
    const indexes = [...new Set(chunk.flatMap(s => touched.get(s) ?? []))].sort((a, b) => a - b);
    for (const command of indexes.map(i => byIndex.get(i))) {
      caseCommands.push(caseCommand(command, set, refsKept)); origin.push(command.index);
    }
    const queries = [];
    const ask = (tag, local, sid, V) => { for (const entityId of subjectEntities(sid)) queries.push({ id: `${tag}|${sid}|${V}|${entityId}`, kind: 'entityTriples', entityId, cut: { position: local === null ? 0 : { afterCommand: local }, validAt: V } }); };
    for (const sid of chunk.filter(s => digestSet.has(s))) for (const V of validAts) ask('base', null, sid, V);
    caseCommands.forEach((cmd, local) => {
      const original = commands[origin[local]];
      const sids = original.subject != null ? [original.subject] : chunk.filter(sid => original.operations.some(op => op.op === 'assert' && subjectOfEntity(op.entityId) === sid));
      for (const sid of sids.filter(s => digestSet.has(s))) for (const V of validAts) ask(`after:${origin[local]}`, local, sid, V);
    });
    const caseJson = { format: 'triplex-db-2/o-replay-case/1', caseId: `${caseIdPrefix}/chunk-${String(chunkIndex).padStart(4, '0')}`, defaultScope: 's1',
      adapter: { schemaVersion: 1 }, rules: {}, schemas: [], enforcement: { mode: 'off' }, commands: caseCommands, queries };
    const { caseSha256, result, notModeled } = await runOracle(caseJson, workDir);
    return { chunk, origin, caseId: caseJson.caseId, caseSha256, result, notModeled };

  });
  const digests = {}, outcomes = {}, rows = {}, cases = [];
  const notModeled = [];
  for (const { chunk, origin, caseId, caseSha256, result, notModeled: nm } of results) {
    if (nm) { cases.push({ caseId, caseSha256, verdict: "NOT-MODELED", reason: nm }); notModeled.push({ caseId, subjects: chunk, reason: nm }); continue; }
    cases.push({ caseId, caseSha256, verdict: result.verdict });
    for (const o of result.commandOutcomes) {
      const index = origin[o.command];
      // O-REPLAY 0.2 reports the documented error tag and leaves category null where a tag exists.
      if (o.expected.outcome !== 'committed') outcomes[index] = { outcome: o.expected.outcome, category: o.expected.category ?? TAG_CATEGORY[o.expected.errorTag] ?? null, errorTag: o.expected.errorTag ?? null };
    }
    const grouped = new Map();
    for (const q of result.queries) {
      const [tag, sid, V] = q.id.split('|');
      const key = `${tag}|${sid}|${V}`;
      if (!grouped.has(key)) grouped.set(key, { tag, sid, V, rows: [], error: null });
      const g = grouped.get(key);
      if (q.error) g.error = q.error; else g.rows.push(...q.result.raw);
    }
    for (const { tag, sid, V, rows: raw, error } of grouped.values()) {
      const entry = digests[sid] ??= { base: {}, after: {} };
      // A cut after a command the oracle rejects has no position (0.1: unavailable-cut; 0.2: X-NO-POSITION).
      if (error) { if (!['unavailable-cut', 'X-NO-POSITION'].includes(error.error)) throw new Error(`O-REPLAY query error for ${sid}: ${JSON.stringify(error)}`); continue; }
      const canon = raw.map(r => canonRow(r));
      const d = digestRows(canon);
      if (tag === 'base') entry.base[V] = d;
      else (entry.after[tag.slice(6)] ??= {})[V] = d;
      if (keepRowsFor.has(sid)) (rows[sid] ??= {})[`${tag}@${V}`] = canon;
    }
  }
  // A rejected command keeps the previous digest: fill from the subject's preceding state.
  for (const sid of ordered) {
    const entry = digests[sid] ??= { base: {}, after: {} };
    let prev = entry.base;
    for (const c of (touched.get(sid) ?? []).map(i => byIndex.get(i))) {
      if (!entry.after[c.index]) entry.after[c.index] = { ...prev, rejected: true };
      prev = entry.after[c.index];
    }
  }
  cases.sort((a, b) => a.caseId < b.caseId ? -1 : 1);
  return { digests, outcomes, cases, rows, notModeled };
}
