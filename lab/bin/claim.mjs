#!/usr/bin/env node
// lab/bin/claim.mjs admit <claim.json> [--repo DIR] [--objects DIR] [--authority-ref main] [--json]
//
// Claim admission from evidence (EXP-E01; RULINGS Q34d, Q37b, Q38a, Q38b, Q45a, Q45b; held Q46b, Q47a to Q47c; pending Q41d,
// Q42a). Prints QUALIFIED (exit 0) only when every piece of evidence the claim depends on exists, verifies, is fresh and is
// bound to the source tree it claims; otherwise DIAGNOSTIC (exit 2) with every reason found. Usage errors exit 1. Any
// evaluator exception is itself a DIAGNOSTIC (fail closed), never a crash that a caller might read as "no objection".
//
// [EXP-E01] Why: Codex rounds 4 to 6 qualified claims through the generator's structural reference model: all-zero object
// hashes and a stale binary under the claim's source label (round 4 finding 4), prerequisites with no measurement (round 5
// finding 11), and with the real accepted pins, no retained binary, a verifier object {"notAVerifierRecord":true}, case
// objects with oracleExit 2 / X-NOT-MODELED labelled PASS, a control with neither trace nor window (None == None) and an
// indirect oracle refusal through CS-MIGRATION (round 6 findings 1, 5, 6). This evaluator opens the whole object graph:
//   - every object exists in runs/objects, hashes to its name, matches its record schema and is bound to its run;
//   - every receipt's run binding (bindingOf: id, kind, profile, obligation, contract, composition, commit, start, endpoint,
//     admission, producer, identity) is repeated in every object the run wrote, and a run ledger object fixes the evidence
//     list, counts and end time, so a receipt edited after the run (a relabelled composition, profile, contract or run
//     kind; a deleted FAIL attempt or ns-run; zeroed counts) no longer matches its own evidence (red-team passes 1 and 2);
//   - executed modules are retained objects bound to the home commit's tree through a build/import manifest (Q47a);
//   - selections are resolved through pinned case manifests and every case verdict is recomputed from the retained oracle
//     run, expected answer and raw result; any refusal rejects the claim (Q45b, Q47a, Q47c);
//   - the A0 control's identity (commit, tree, composition) comes from the frozen A0 registry the contract pins, never from
//     the claim, and matched controls compare validated, nonempty workload identities (Q46b, Q47b);
//   - every receipt has independent verifier evidence (the 0.3.6 reference requires a verifier object on every receipt).
//
// Threat model, stated so nobody over-reads a QUALIFIED: this defeats stale, partial, placeholder, relabelled and
// misassembled evidence, and any edit of a receipt or claim after its run. The binding is computable from receipt fields,
// so writing new objects into runs/objects with a correct binding (a forged ledger, a forged case result, a build manifest
// lying about which inputs produced which outputs) is deliberate forgery and is not defeated here; independent verifier
// reruns are for that. Comparators are recomputed on the canonical JSON forms the harness retains (exact values as typed
// strings); the closure-rule evaluators (CR-*) own the typed comparison and every threshold.
//
// Rejected: reading pins, receipts or the contract from the working tree (an uncommitted edit could qualify a claim);
// accepting the first valid receipt among invalid ones (every receipt a claim carries is evidence it depends on; this also
// blocks rerun-until-green bundles, B11); carrying receipts forward from ancestor commits (ACCEPTANCE 5.7); trusting any
// inline receipt field that no retained object repeats.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { OBJECTS, REPO, fail, main, parseArgs, sha256, sourceTreeIdOf } from './lib.mjs';

export const FORMATS = {
  claim: 'triplex-db-2/claim/1',
  receipt: 'triplex-db-2/receipt/2', // ACCEPTANCE 5.1 receiptSchema.format
  manifest: 'triplex-db-2/build-manifest/1',
  caseManifest: 'triplex-db-2/case-manifest/1',
  caseResult: 'triplex-db-2/case-result/1',
  oracleRun: 'triplex-db-2/oracle-run/1',
  faultWitness: 'triplex-db-2/fault-witness/1',
  nsRun: 'triplex-db-2/ns-run/1',
  verifierRecord: 'triplex-db-2/verifier-record/1',
  recomputedVerdicts: 'triplex-db-2/recomputed-verdicts/1',
  a0Registry: 'triplex-db-2/a0-registry/1',
  runLedger: 'triplex-db-2/run-ledger/1',
};
export const PATHS = { contract: 'lab/acceptance/obligations.json', loadContract: 'lab/acceptance/load-contract.json', slots: 'lab/config/slots.json', lockfile: 'pnpm-lock.yaml' };
export const PREREQ = { position: 'G7.position.coordinates', identity: 'G10.composition.identity-bound', w0: 'W0.coverage-floors' };
const COMPOSITION_FIELDS = ['engine', 'imageDigest', 'configSha256', 'slot'];
const ACCEPTED_ORACLE_STATUS = ['EXISTS', 'COMPILED', 'ACCEPTED', 'BUILT-ACCEPTED']; // the 0.3.6 reference's list
const SHA = /^[0-9a-f]{64}$/;
const COMMIT = /^([0-9a-f]{40}|[0-9a-f]{64})$/;

// ---------------------------------------------------------------- small pure helpers

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = v => typeof v === 'string' && v.length > 0;
const sha = v => typeof v === 'string' && SHA.test(v);
const strList = v => Array.isArray(v) && v.length > 0 && v.every(str);
const own = (o, k) => isObj(o) && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; // never reads __proto__ chains
export const canon = v => Array.isArray(v) ? v.map(canon) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
export const canonText = v => JSON.stringify(canon(v));
const same = (a, b) => canonText(a) === canonText(b);
/** Hash of a file listing: sha256 over "<sha256>  <path>\n" lines in the given order (the gate.mjs hashDist convention). */
export const listingHash = rows => sha256(rows.map(([p, h]) => `${h}  ${p}\n`).join(''));
/**
 * A path that is safe to hand to git and means one file: relative, no traversal, no empty or "." segments (red-team v2:
 * node_modules/./@x and node_modules//@x named a first-party package under another spelling), no control characters, no
 * pathspec magic.
 */
const safePath = p => typeof p === 'string' && p.length > 0 && !p.startsWith(':') && !p.startsWith('-') && !/[\u0000-\u001f\u007f\\]/.test(p) && p.split('/').every(s => s !== '' && s !== '.' && s !== '..');
/** Agent ids compare case- and space-insensitively (red-team v2: "Agent-Candidate-Author" passed as independent). */
const agentKey = a => typeof a === 'string' ? a.trim().toLowerCase() : null;

/**
 * The run binding (red-team findings 1, 3 and v2 finding 4). The harness computes it when the run starts and writes it into
 * every object the run produces (case results, oracle runs, fault witnesses, ns-runs, verifier records, the build manifest
 * and the run ledger). Every inline receipt field that decides a role or an eligibility is in it; the values only known at
 * the end (timing.end, counts, the evidence list) are fixed by the run ledger object instead.
 */
export function bindingOf(r) {
  const pid = own(r, 'profileIdentity') ?? {};
  return sha256(canonText({
    receiptId: own(r, 'receiptId'), runKind: own(r, 'runKind'), profile: own(r, 'profile'), obligations: own(r, 'obligations'),
    contract: own(r, 'contract'), composition: own(r, 'composition'), git: own(r, 'git'), start: own(own(r, 'timing'), 'start'),
    endpoint: own(r, 'endpoint'), admission: own(r, 'admission'), producer: own(r, 'producer'),
    identity: { sourceTreeSha256: own(pid, 'sourceTreeSha256'), lockfileSha256: own(pid, 'lockfileSha256'), node: own(pid, 'node'), pnpm: own(pid, 'pnpm') },
  }));
}

/**
 * Parse a retained answer that must be in canonical JSON (Q47a; red-team v2 finding 5): valid UTF-8, the exact bytes of its
 * own key-sorted, whitespace-free serialisation, only safe integers as numbers, at most 64 levels deep. Why: JSON.parse loses
 * information (2^53 + 1, 1e400, 12.30 versus 12.3, duplicate keys, invalid UTF-8), so two different answers could compare
 * equal after parsing. Exact values (decimals, doubles, big integers) are therefore typed strings in the canonical form.
 * Returns { ok, value } or { ok: false }.
 */
export function canonicalAnswer(bytes) {
  let text, value;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); value = JSON.parse(text); } catch { return { ok: false }; }
  const fits = (v, depth) => depth <= 64 && (v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0))
    || (Array.isArray(v) && v.every(x => fits(x, depth + 1))) || (isObj(v) && Object.values(v).every(x => fits(x, depth + 1))));
  if (!fits(value, 0) || canonText(value) !== text) return { ok: false };
  return { ok: true, value };
}

/**
 * Recompute a case verdict from the retained expected answer and observed result (Q47a), both in canonical JSON (above).
 * Returns PASS, FAIL or UNCOMPARABLE (an unknown comparator, a non-canonical answer or the wrong shape).
 */
export function recompute(comparator, expectedBytes, observedBytes) {
  const pe = canonicalAnswer(expectedBytes), po = canonicalAnswer(observedBytes);
  if (!pe.ok || !po.ok) return 'UNCOMPARABLE';
  const e = pe.value, o = po.value;
  const rows = x => Array.isArray(x) ? x.map(canonText) : null;
  const verdict = ok => ok ? 'PASS' : 'FAIL';
  switch (comparator) {
    case 'CMP-EXACT-VALUE': return verdict(expectedBytes.equals(observedBytes));
    case 'CMP-ORDERED-ROWS': case 'CMP-PAGES': { const a = rows(e), b = rows(o); return a && b ? verdict(same(a, b)) : 'UNCOMPARABLE'; }
    case 'CMP-BAG-ROWS': { const a = rows(e), b = rows(o); return a && b ? verdict(same(a.sort(), b.sort())) : 'UNCOMPARABLE'; }
    case 'CMP-SET-ROWS': case 'CMP-DIAGNOSTICS': { const a = rows(e), b = rows(o); return a && b ? verdict(same([...new Set(a)].sort(), [...new Set(b)].sort())) : 'UNCOMPARABLE'; }
    case 'CMP-ERROR': {
      // The expected answer names a nonempty reason or reason list; [undefined].includes(undefined) never matches (red-team v2).
      const reasons = Array.isArray(e?.reasons) ? e.reasons : [e?.reason];
      if (!isObj(e) || !isObj(o) || !str(e._tag) || !reasons.length || !reasons.every(str)) return 'UNCOMPARABLE';
      return verdict(o._tag === e._tag && reasons.includes(o.reason) && o.cause != null && (o.rows === undefined || (Array.isArray(o.rows) && o.rows.length === 0)));
    }
    default: return 'UNCOMPARABLE';
  }
}

// ---------------------------------------------------------------- I/O: git and the object store

/** Read-only git access; blob hashes are sha256 of the blob bytes, cached per commit:path. Failures return null. */
export function gitSource(repo) {
  const run = (args, input) => execFileSync('git', ['--literal-pathspecs', ...args], { cwd: repo, input, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'pipe'] });
  const cache = new Map();
  return {
    resolve(rev) { if (!str(rev) || rev.startsWith('-')) return null; try { return run(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]).toString().trim() || null; } catch { return null; } },
    treeOf(commit) { return run(['rev-parse', `${commit}^{tree}`]).toString().trim(); },
    commitTime(commit) { return Number(run(['show', '-s', '--format=%ct', commit]).toString().trim()); },
    blob(rev, file) {
      if (!safePath(file)) return null;
      const key = COMMIT.test(rev) ? `blob:${rev}:${file}` : null; // only full commit ids are immutable
      if (key && cache.has(key)) return cache.get(key);
      let bytes = null;
      try { bytes = run(['cat-file', 'blob', `${rev}:${file}`]); } catch { bytes = null; }
      if (key) cache.set(key, bytes);
      return bytes;
    },
    /** Tracked files (blobs) under the given roots at the commit, sorted; null when a root is unsafe or git fails. */
    list(commit, roots) { const e = this.entries(commit, roots); return e && e.map(x => x.path); },
    /** As list, with each blob's mode (120000 is a symlink, whose bytes are the link text, not the file a build reads). */
    entries(commit, roots) {
      if (roots !== null && (!Array.isArray(roots) || !roots.length || !roots.every(safePath))) return null;
      const key = COMMIT.test(commit) ? `list:${commit}:${JSON.stringify(roots)}` : null;
      if (key && cache.has(key)) return cache.get(key);
      let result;
      try {
        const out = run(['ls-tree', '-r', '-z', commit, ...(roots ? ['--', ...roots] : [])]).toString('utf8');
        result = out.split('\0').filter(Boolean).map(line => { const tab = line.indexOf('\t'); const [mode, type] = line.slice(0, tab).split(' '); return { mode, type, path: line.slice(tab + 1) }; })
          .filter(e => e.type === 'blob').map(({ mode, path: p }) => ({ mode, path: p })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
      } catch { result = null; }
      if (key) cache.set(key, result);
      return result;
    },
    /** Map path -> sha256 of the blob at commit; null when absent, not a file or unsafe (one cat-file --batch call). */
    blobHashes(commit, files) {
      const list = (Array.isArray(files) ? files : []).filter(f => typeof f === 'string');
      const want = [...new Set(list)].filter(f => !cache.has(`${commit}:${f}`));
      for (const f of want.filter(f => !safePath(f))) cache.set(`${commit}:${f}`, null);
      const ok = want.filter(safePath);
      if (ok.length) {
        let out;
        try { out = run(['cat-file', '--batch'], ok.map(f => `${commit}:${f}\n`).join('')); } catch { out = null; }
        let at = 0;
        for (const f of ok) {
          if (!out) { cache.set(`${commit}:${f}`, null); continue; }
          const nl = out.indexOf(10, at);
          const header = out.subarray(at, nl).toString('utf8');
          at = nl + 1;
          // A found object's header is exactly "<oid> <type> <size>"; anything else ("<name> missing", "ambiguous") has no body.
          const m = /^([0-9a-f]{40}|[0-9a-f]{64}) (\w+) (\d+)$/.exec(header);
          if (!m) { cache.set(`${commit}:${f}`, null); continue; }
          const size = Number(m[3]);
          cache.set(`${commit}:${f}`, m[2] === 'blob' ? sha256(out.subarray(at, at + size)) : null);
          at += size + 1;
        }
      }
      return new Map(list.map(f => [f, cache.get(`${commit}:${f}`) ?? null]));
    },
  };
}

/** Content-addressed store reader: an object counts only if runs/objects/<sha> exists and its bytes hash to <sha>. */
export function objectStore(dir) {
  const memo = new Map();
  const get = h => {
    if (memo.has(h)) return memo.get(h);
    let result;
    if (!sha(h)) result = { ok: false, why: `not a sha256: ${JSON.stringify(h)?.slice(0, 80)}` };
    else {
      const file = path.join(dir, h);
      if (!fs.existsSync(file)) result = { ok: false, why: `object ${h} is not in the store` };
      else {
        const bytes = fs.readFileSync(file);
        const actual = sha256(bytes);
        result = actual === h ? { ok: true, bytes } : { ok: false, why: `object ${h} hashes to ${actual}` };
      }
    }
    memo.set(h, result);
    return result;
  };
  return {
    get,
    /** A JSON object record (never null, an array or a scalar). */
    record(h) {
      const o = get(h);
      if (!o.ok) return o;
      let v;
      try { v = JSON.parse(o.bytes.toString('utf8')); } catch { return { ok: false, why: `object ${h} is not JSON` }; }
      return isObj(v) ? { ok: true, value: v } : { ok: false, why: `object ${h} is not a JSON object` };
    },
  };
}

// ---------------------------------------------------------------- contract helpers

/** The ns-run measurement an NS or GS obligation's evidence must carry (CR-GS params.scenario; CX-GS-WRONG-SCENARIO). */
export function expectedMeasurement(obligation) {
  const p = obligation.closure?.params ?? {};
  if (p.evidenceMeasurement) return p.evidenceMeasurement;
  const m = /^NS\.(P[1-5])$/.exec(obligation.id);
  return m ? m[1] : obligation.id.startsWith('NS.SEC.') ? 'secondary' : null;
}
const isMeasured = o => (o.closure?.rules ?? []).some(r => r === 'CR-NS' || r === 'CR-GS');

/**
 * ACCEPTANCE 5.3 selection, resolved through pinned case manifests (Q47c): the selected cases are those carrying any listed tag
 * ('all' selects every case) plus named ids. Returns { cases: [{set, id, contentSha256, comparator, faultPoint}], problems }.
 * A set whose manifest is not pinned resolves to nothing and reports why: it cannot support any claim.
 */
export function resolveSelection(contract, obligation, manifests) {
  const problems = [], cases = new Map();
  for (const sel of obligation.cases) {
    const set = contract.caseSets?.[sel.set];
    const m = manifests.get(sel.set);
    if (!set) { problems.push(`case set ${sel.set} is not in the contract`); continue; }
    if (!m) { if (!problems.some(p => p.startsWith(`case set ${sel.set} `))) problems.push(`case set ${sel.set} has no pinned manifest (manifestSha256 ${set.manifestSha256 ?? 'null'}; ACCEPTANCE 5.3)`); continue; }
    const byId = new Map(m.cases.map(c => [c.id, c]));
    for (const id of set.requiredCases ?? []) if (!byId.has(id)) problems.push(`${sel.set} manifest lacks required case ${id}`);
    let hit = 0;
    for (const t of sel.select) {
      if (!(set.requiredTags ?? []).includes(t) && !(set.requiredCases ?? []).includes(t)) problems.push(`${sel.set} select entry ${t} is neither a required tag nor a required case`);
      const picked = t === 'all' ? m.cases : m.cases.filter(c => c.id === t || c.tags.includes(t));
      for (const c of picked) { cases.set(`${sel.set}\u0000${c.id}`, { set: sel.set, ...c }); hit++; }
    }
    if (!hit) problems.push(`${obligation.id} selects nothing from ${sel.set}`);
  }
  return { cases: [...cases.values()], problems };
}

// ---------------------------------------------------------------- the evaluator

/**
 * Admit a claim. env = { git: gitSource(repo), objects: objectStore(dir), authorityRef }.
 * Returns { verdict: 'QUALIFIED' | 'DIAGNOSTIC', reasons: [{code, detail, receipt?}] }.
 */
export function admitClaim(claim, env) {
  const reasons = [];
  const why = (code, detail, receipt) => reasons.push(receipt ? { code, detail, receipt } : { code, detail });
  try { evaluate(claim, env, why); } catch (error) { why('EVALUATOR-ERROR', `evaluation stopped: ${error?.message ?? error} (fail closed)`); }
  // Every reason is kept in order; more than three with the same code on one receipt are summarised with a count.
  const seen = new Map(), out = [];
  for (const r of reasons) {
    const k = `${r.code}\u0000${r.receipt ?? ''}`;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (n <= 3) out.push(r);
  }
  for (const [k, n] of seen) if (n > 3) { const [code, receipt] = k.split('\u0000'); out.push({ code, detail: `${n - 3} more ${code} reason${n === 4 ? '' : 's'} like the above`, ...(receipt ? { receipt } : {}) }); }
  return { verdict: reasons.length ? 'DIAGNOSTIC' : 'QUALIFIED', reasons: out };
}

function evaluate(claim, env, why) {
  const { git, objects } = env;
  const authorityRef = env.authorityRef ?? 'main';

  // -- the claim itself. Q38b / CX-CLAIM-SUPPLIED-NAMES: supplied case names and Booleans (positionCasesClosed,
  // compositionBound, positionsDense) and any control composition the claim offers carry no authority and are never read.
  if (!isObj(claim) || claim.format !== FORMATS.claim) return why('CLAIM-FORMAT', `claim format must be ${FORMATS.claim}`);
  if (!['comparative', 'promotion'].includes(claim.kind)) why('CLAIM-KIND', 'kind must be comparative or promotion');
  const commit = str(claim.commit) && COMMIT.test(claim.commit) ? git.resolve(claim.commit) : null;
  if (!commit || commit !== claim.commit) return why('CLAIM-COMMIT', `commit ${JSON.stringify(claim.commit)} is not a full commit id in this repository`);
  const home = c => { const tree = git.treeOf(c); return { commit: c, tree, label: sourceTreeIdOf(tree), time: git.commitTime(c) }; };
  const candidateHome = home(commit);

  // -- the contract: read from the claimed commit, never the working tree, and byte-equal to the authority ref's.
  // Why: pins, definitions, manifests and the A0 registry decide admission (Q37b, VA6, Q46b); a branch must not pin its own.
  const contractBytes = git.blob(commit, PATHS.contract), loadBytes = git.blob(commit, PATHS.loadContract);
  if (!contractBytes || !loadBytes) return why('CONTRACT-MISSING', `${PATHS.contract} or ${PATHS.loadContract} is missing at ${commit}`);
  const authority = git.resolve(authorityRef);
  if (!authority) why('CONTRACT-AUTHORITY', `authority ref ${authorityRef} does not resolve`);
  else for (const [file, bytes] of [[PATHS.contract, contractBytes], [PATHS.loadContract, loadBytes]]) {
    const theirs = git.blob(authority, file);
    if (!theirs || !theirs.equals(bytes)) why('CONTRACT-NOT-AUTHORITY', `${file} at the claimed commit differs from ${authorityRef} (VA6: receipts are judged against the pinned contract)`);
  }
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const loadContract = JSON.parse(loadBytes.toString('utf8'));
  const slots = (() => { const b = authority && git.blob(authority, PATHS.slots); try { return b ? JSON.parse(b.toString('utf8')) : null; } catch { return null; } })();
  const byId = new Map(contract.obligations.map(o => [o.id, o]));
  const assignments = contract.composition.assignments;
  const reps = contract.thresholds?.['T-FAULT-REPS']?.value ?? 3;

  if (claim.sourceTreeSha256 !== candidateHome.label) why('CLAIM-SOURCE-LABEL', `sourceTreeSha256 ${claim.sourceTreeSha256} is not the clean label ${candidateHome.label} of ${commit} (a dirty-tree label can never be bound)`);

  // -- obligations. Q42a (round 5 finding 11): unknown ids are rejected, never dropped.
  const claimedIds = Array.isArray(claim.obligations) ? claim.obligations : [];
  if (!claimedIds.length) why('CLAIM-NO-OBLIGATIONS', 'the claim names no obligation');
  for (const id of claimedIds) if (typeof id !== 'string' || !byId.has(id)) why('UNKNOWN-OBLIGATION', `obligation ${JSON.stringify(id)} is not in contract ${contract.version} (RULINGS Q42a)`);
  for (const id of claimedIds) if (Object.values(PREREQ).includes(id)) why('CLAIM-PREREQ-AS-CLAIM', `${id} is a prerequisite, not a comparative claim`);
  const claimed = claimedIds.filter(id => typeof id === 'string' && byId.has(id)).map(id => byId.get(id));
  const domain = claimed.some(o => o.oracles.includes('O-DOMAIN'));
  const prereqIds = [PREREQ.position, PREREQ.identity, ...(domain ? [PREREQ.w0] : [])];
  const usedObligations = [...claimed, ...prereqIds.map(id => byId.get(id)).filter(Boolean)];

  // -- compositions. VA14 / CX-COMPOSITION-UNBOUND: four assignments, each exactly the four fields, every value a nonempty
  // string (red-team finding 2b: arrays passed the old check), configuration hashes in sha256 form.
  const bound = comp => isObj(comp) && same(Object.keys(comp).sort(), [...assignments].sort()) && assignments.every(k => isObj(comp[k])
    && same(Object.keys(comp[k]).sort(), [...COMPOSITION_FIELDS].sort()) && COMPOSITION_FIELDS.every(f => str(comp[k][f])) && sha(comp[k].configSha256));
  if (!bound(claim.composition)) why('COMPOSITION-UNBOUND', 'claim composition must bind source, current, history and analytics with engine, imageDigest, configSha256 (sha256) and slot (VA14, RULINGS Q28)');

  // -- the A0 control comes from the frozen registry the contract pins (Q46b, Q47b), never from the claim. Until the contract
  // pins one, every comparison is a diagnostic. Every claimed obligation needs a control receipt (the 0.3.6 reference model).
  let a0 = null, a0Home = null;
  const regPin = contract.a0Registry;
  const controlId = own(claim.control, 'id');
  if (!isObj(regPin) || !safePath(regPin.path) || !sha(regPin.sha256)) why('A0-REGISTRY-UNPINNED', 'the contract pins no A0 registry (a0Registry {path, sha256}); every comparison is a diagnostic until it does (RULINGS Q46b, Q47b)');
  else {
    const bytes = git.blob(commit, regPin.path);
    let reg = null;
    try { reg = bytes && sha256(bytes) === regPin.sha256 ? JSON.parse(bytes.toString('utf8')) : null; } catch { reg = null; }
    const entry = reg?.format === FORMATS.a0Registry ? own(reg.controls, controlId) : undefined;
    if (!reg) why('A0-REGISTRY', `${regPin.path} at the claimed commit does not hash to the pinned ${regPin.sha256}`);
    else if (!str(controlId) || !own(contract.a0Controls, controlId)) why('CONTROL-NOT-A0', `control ${JSON.stringify(controlId)} is not an A0 control (${Object.keys(contract.a0Controls ?? {}).join(', ')})`);
    else if (!isObj(entry) || !bound(entry.composition) || !str(entry.commit) || git.resolve(entry.commit) !== entry.commit) why('A0-REGISTRY', `registry entry ${controlId} lacks a resolvable commit or a bound composition`);
    else if (entry.composition.source.engine !== contract.a0Controls[controlId].source) why('A0-REGISTRY', `registry ${controlId} source engine ${entry.composition.source.engine} is not ${contract.a0Controls[controlId].source}`);
    else {
      a0Home = home(entry.commit);
      if (entry.tree !== a0Home.tree) why('A0-REGISTRY', `registry ${controlId} tree ${entry.tree} is not ${entry.commit}'s ${a0Home.tree}`);
      a0 = entry.composition;
      if (same(a0, claim.composition)) why('CONTROL-IS-CANDIDATE', 'the claimed composition is the A0 control itself');
    }
  }
  // VA4: every assignment runs the pinned image. The contract pins no images, so the pin is lab/config/slots.json at the
  // authority ref (a branch cannot move its own pin).
  for (const [label, comp] of [['claim', claim.composition], ['control', a0]]) {
    if (!bound(comp)) continue;
    for (const k of assignments) {
      const pin = slots?.lanes?.[comp[k].engine]?.imageId;
      if (!pin || comp[k].imageDigest !== pin) why('IMAGE-NOT-PINNED', `${label} ${k} image ${comp[k].imageDigest} is not the pinned ${pin ?? '(no pin)'} (VA4)`);
    }
  }

  // -- case manifests (Q47c, ACCEPTANCE 5.3): every set a used obligation selects must have a pinned manifest at the claimed
  // commit; its case entries carry the content hash, comparator and fault-point flag the evidence is checked against.
  const manifests = new Map();
  for (const name of new Set(usedObligations.flatMap(o => o.cases.map(c => c.set)))) {
    const cs = contract.caseSets?.[name];
    if (!cs || !safePath(cs.manifest) || !sha(cs.manifestSha256)) continue; // resolveSelection reports it
    const bytes = git.blob(commit, cs.manifest);
    let m = null;
    try { m = bytes && sha256(bytes) === cs.manifestSha256 ? JSON.parse(bytes.toString('utf8')) : null; } catch { m = null; }
    const okCase = c => isObj(c) && str(c.id) && Array.isArray(c.tags) && c.tags.every(str) && sha(c.contentSha256) && str(c.comparator) && (c.faultPoint === undefined || typeof c.faultPoint === 'boolean');
    if (!m || m.format !== FORMATS.caseManifest || m.set !== name || !Array.isArray(m.cases) || !m.cases.every(okCase) || new Set(m.cases.map(c => c.id)).size !== m.cases.length)
      why('CASE-MANIFEST', `${cs.manifest} at the claimed commit is not the pinned, well-formed ${FORMATS.caseManifest} for ${name}`);
    else manifests.set(name, m);
  }
  const selection = new Map();
  for (const o of usedObligations) {
    const s = resolveSelection(contract, o, manifests);
    for (const p of s.problems) why('SELECTION-UNRESOLVED', `${o.id}: ${p}`);
    if (o.id === PREREQ.position) for (const id of contract.positionRequiredCases ?? []) if (!s.cases.some(c => c.set === 'CS-POSITION' && c.id === id)) why('SELECTION-UNRESOLVED', `${o.id} must select ${id} (RULINGS Q38a)`);
    selection.set(o.id, s.cases);
  }

  // -- oracle pins (Q37b, Q38b, Q45a, Q45b; GATE-ORACLE-PIN): every oracle the claim or its prerequisites use needs a nonempty,
  // accepted pin whose files still hash to it at the claimed commit (lab, VA6); an obligation in the pin's excludes, or one
  // selecting a case or set the contract lists as refused, fails closed. The list is advisory (Q47c): each case's retained
  // oracle run is re-judged below as well.
  for (const x of [...new Set(usedObligations.flatMap(o => o.oracles))].sort()) {
    const pin = own(contract.oraclePins, x);
    if (pin) {
      const h = pin.sha256;
      if (pin.acceptReceipt == null || h == null || (isObj(h) && (!Object.keys(h).length || Object.values(h).some(v => v == null)))) { why('ORACLE-UNPINNED', `oracle ${x} has no accepted pin (RULINGS Q37b, Q38b: every claim is a diagnostic until it does)`); continue; }
      checkPinnedFiles(`oracle ${x}`, isObj(h) ? h : { [String(pin.files).replace(/\*+$/, '')]: h }, 'ORACLE-FILES');
      for (const o of usedObligations.filter(u => u.oracles.includes(x))) if ((pin.excludes ?? []).includes(o.id)) why('ORACLE-EXCLUDED', `${o.id} is excluded from oracle ${x}'s pin (RULINGS Q45a)`);
    } else if (!ACCEPTED_ORACLE_STATUS.includes(contract.oracles?.[x]?.status)) why('ORACLE-UNACCEPTED', `oracle ${x} is ${contract.oracles?.[x]?.status ?? 'unknown'} and unpinned`);
    for (const [name, ref] of Object.entries(own(contract.oracleRefusals, x) ?? {})) for (const o of usedObligations.filter(u => u.oracles.includes(x))) {
      const pairs = new Set([...o.cases.flatMap(c => c.select.map(t => `${c.set}\u0000${t}`)), ...(selection.get(o.id) ?? []).map(c => `${c.set}\u0000${c.id}`)]);
      if (o.cases.some(c => (ref.sets ?? []).includes(c.set)) || (ref.cases ?? []).some(([s, id]) => pairs.has(`${s}\u0000${id}`))) why('ORACLE-REFUSES', `${o.id} selects cases oracle ${x} refuses (${name}; RULINGS Q45b)`);
    }
  }
  // GATE-W0 (Q31i, Q34d, Q44a): a domain-dependent claim needs every W0 pin, the review receipt, the delta check and the
  // O-DOMAIN fingerprint (the 0.3.6 reference's fields).
  if (domain) {
    const w0 = contract.w0Pin;
    if (!w0 || w0.reviewReceipt == null || !isObj(w0.files) || !Object.keys(w0.files).length || Object.values(w0.files).some(v => v == null) || ('deltaCheck' in w0 && w0.deltaCheck == null) || ('oDomainFingerprint' in w0 && w0.oDomainFingerprint == null))
      why('W0-UNPINNED', 'W0 pin, review receipt, delta check or O-DOMAIN fingerprint is null (GATE-W0)');
    else checkPinnedFiles('W0', w0.files, 'W0-FILES');
  }
  function checkPinnedFiles(label, map, code) {
    const files = Object.keys(map).filter(p => !p.endsWith('/'));
    const hashes = git.blobHashes(commit, files);
    for (const p of files) if (hashes.get(p) !== map[p]) why(code, `${label}: ${p} at the claimed commit hashes to ${hashes.get(p)}, pinned ${map[p]}`);
    for (const dir of Object.keys(map).filter(p => p.endsWith('/'))) {
      const listed = git.list(commit, [dir.replace(/\/$/, '')]) ?? [];
      const h = git.blobHashes(commit, listed);
      const actual = listed.length ? listingHash(listed.map(p => [p, h.get(p)])) : null;
      if (actual !== map[dir]) why(code, `${label}: directory ${dir} at the claimed commit hashes to ${actual}, pinned ${map[dir]}`);
    }
  }

  // -- receipts: assign each one a role and a home (where it must have run), then verify it completely.
  const receipts = Array.isArray(claim.receipts) ? claim.receipts : [];
  const comps = [['candidate', claim.composition, candidateHome], ...(a0 ? [['A0', a0, a0Home]] : [])];
  const homeOf = comp => comps.find(([, c]) => same(c, comp));
  const seenIds = new Set();
  const roles = [];
  for (const [i, r] of receipts.entries()) {
    const label = str(own(r, 'receiptId')) ? r.receiptId : `#${i}`;
    if (!isObj(r) || r.format !== FORMATS.receipt) { why('RECEIPT-FORMAT', `receipt format must be ${FORMATS.receipt}`, label); continue; }
    if (!str(r.receiptId) || seenIds.has(r.receiptId)) { why('RECEIPT-ID', 'receiptId missing or repeated', label); continue; }
    seenIds.add(r.receiptId);
    // One obligation per claim receipt, so every evidence object belongs to exactly one obligation.
    const ob = Array.isArray(r.obligations) && r.obligations.length === 1 && isObj(r.obligations[0]) ? r.obligations[0] : null;
    if (!ob || !str(ob.id)) { why('RECEIPT-OBLIGATIONS', 'a claim receipt names exactly one obligation {id, definitionSha256}', label); continue; }
    const obligation = byId.get(ob.id);
    if (!obligation) { why('UNKNOWN-OBLIGATION', `receipt obligation ${JSON.stringify(ob.id)} is not in the contract (RULINGS Q42a)`, label); continue; }
    const at = homeOf(r.composition);
    let role = null;
    if (!at) role = null;
    else if (r.runKind === 'verifier') role = claimedIds.includes(ob.id) || prereqIds.includes(ob.id) ? 'verifier' : null;
    else if (prereqIds.includes(ob.id)) role = ob.id === PREREQ.w0 && at[0] !== 'candidate' ? null : 'prereq';
    else if (claimedIds.includes(ob.id)) role = at[0] === 'candidate' ? 'measurement' : 'control';
    if (!role) { why('RECEIPT-UNUSED', `receipt for ${ob.id} on ${at ? at[0] : 'an unknown'} composition is not evidence for this claim`, label); continue; }
    const entry = { r, role, obligation, side: at[0], home: at[2], binding: bindingOf(r), ok: true, cases: new Map(), nsRuns: [] };
    roles.push(entry);
    verifyReceipt(entry, label);
  }

  // -- prerequisites (Q34d, Q38b, GATE-POSITION "A0 included"): per compared composition, from receipts only.
  for (const [side, comp] of comps) for (const pid of prereqIds) {
    if (pid === PREREQ.w0 && side !== 'candidate') continue;
    if (!roles.some(x => x.role === 'prereq' && x.obligation.id === pid && x.side === side))
      why('PREREQ-MISSING', `no ${pid} receipt for the ${side} composition (RULINGS Q34d, Q38b${pid === PREREQ.position ? ', Q38a' : ''})`);
  }

  // -- the claim's own evidence and its matched control (Q42a, Q47b): measurement and control receipts for every claimed
  // obligation; for NS and GS every candidate run has a control run with the same validated workload identity.
  for (const o of claimed) {
    const mine = roles.filter(x => x.role === 'measurement' && x.obligation.id === o.id);
    const theirs = roles.filter(x => x.role === 'control' && x.obligation.id === o.id);
    if (!mine.length) why('MEASUREMENT-MISSING', `no ${o.id} measurement receipt for the claimed composition; prerequisites alone never qualify (RULINGS Q42a)`);
    if (!theirs.length) why('CONTROL-MISSING', `no ${o.id} receipt for the registry's A0 control (RULINGS Q42a, Q47b)`);
    if (!mine.length || !theirs.length || !isMeasured(o)) continue;
    const controlKeys = new Set(theirs.flatMap(x => x.nsRuns.map(v => v.key)));
    for (const x of mine) for (const v of x.nsRuns) if (!controlKeys.has(v.key))
      why('CONTROL-UNMATCHED', `${o.id} run (slot ${v.run.slot?.name}, seed ${v.run.trace?.seed}) has no A0 run with the same trace generator, seed, offer schedule, windows and slot (RULINGS Q42a, Q47b)`, x.r.receiptId);
  }

  // -- verifier evidence on every receipt (Q42a; VV1 to VV4; the 0.3.6 reference requires it on every receipt).
  for (const x of roles.filter(x => x.role !== 'verifier')) {
    const covering = roles.filter(v => v.role === 'verifier' && v.ok && v.record && v.obligation.id === x.obligation.id && v.side === x.side
      && v.record.verifies.some(e => e.receiptId === x.r.receiptId && e.binding === x.binding));
    if (!covering.length) { why('VERIFIER-MISSING', `${x.r.receiptId} has no independent verifier record covering its run binding (VV1 to VV4)`); continue; }
    for (const v of covering) {
      // VV2: the same profile and composition; VV1: a different agent from every author of the code under test.
      if (v.r.profile !== x.r.profile) why('VERIFIER-PROFILE', `verifier ran ${v.r.profile}, ${x.r.receiptId} ran ${x.r.profile} (VV2)`, v.r.receiptId);
      const authors = own(x.r.producer, 'authorsOfCodeUnderTest'), agent = own(v.r.producer, 'agentId');
      if (!str(agent) || !Array.isArray(authors) || authors.map(agentKey).includes(agentKey(agent)) || agentKey(own(x.r.producer, 'agentId')) === agentKey(agent)) why('VERIFIER-NOT-INDEPENDENT', `verifier agent ${agent} authored or produced ${x.r.receiptId}, or authorship is unrecorded (VV1)`, v.r.receiptId);
      // VV4: the verifier recomputed every case verdict of the verified run, and agrees with the recomputation here.
      const theirs = new Map(v.verdicts.filter(e => e.receiptId === x.r.receiptId).map(e => [`${e.caseSet}\u0000${e.caseId}\u0000${e.mode}`, e.verdict]));
      for (const [k, verdict] of x.cases) if (theirs.get(k) !== verdict) why('VERIFIER-DISAGREES', `verifier recomputed ${x.r.receiptId} ${k.replaceAll('\u0000', '/')} as ${theirs.get(k) ?? 'nothing'}, the evaluator ${verdict} (VV4)`, v.r.receiptId);
    }
  }

  // ---------------------------------------------------------------- one receipt
  function verifyReceipt(entry, label) {
    const { r, role, obligation, home: h } = entry;
    const bad = (code, detail) => { entry.ok = false; why(code, detail, label); };
    const promo = claim.kind === 'promotion';
    // VA6 / CX-STALE-DEFINITION: judged against this contract and this definition.
    if (own(r.contract, 'version') !== contract.version || own(r.contract, 'transitiveSha256') !== contract.transitiveContractSha256) bad('RECEIPT-CONTRACT', `contract ${own(r.contract, 'version')}/${own(r.contract, 'transitiveSha256')} is not ${contract.version}/${contract.transitiveContractSha256} (VA6)`);
    if (r.obligations[0].definitionSha256 !== obligation.definitionSha256) bad('RECEIPT-DEFINITION', `${obligation.id} definition hash differs from the contract (VA6, CX-STALE-DEFINITION)`);
    // VA1 / B8: produced by lab/bin, by a named agent, naming the authors of the code under test (red-team finding 4: a
    // missing author list made every verifier look independent).
    const prod = own(r, 'producer');
    if (!str(own(prod, 'tool')) || !prod.tool.startsWith('lab/bin/')) bad('RECEIPT-PRODUCER', 'producer.tool must be a lab/bin script (VA1, B8)');
    if (!str(own(prod, 'agentId'))) bad('RECEIPT-PRODUCER', 'producer.agentId is missing');
    if (role !== 'verifier' && !strList(own(prod, 'authorsOfCodeUnderTest'))) bad('RECEIPT-PRODUCER', 'producer.authorsOfCodeUnderTest must list the authors of the code under test (VV1 needs it)');
    // B7: run kinds that never count.
    // Run kind follows the role (red-team v2 finding 8): a candidate run never stands in as the control, nor the reverse.
    const kinds = role === 'verifier' ? ['verifier'] : role === 'prereq' || promo ? ['acceptance'] : role === 'measurement' ? ['acceptance', 'candidate'] : ['acceptance', 'control'];
    if (!kinds.includes(r.runKind)) bad('RECEIPT-RUN-KIND', `runKind ${r.runKind} cannot support a ${claim.kind} claim as ${role} (allowed: ${kinds.join(', ')}; B7)`);
    // Profiles (red-team finding 3): exactly one of the obligation's declared profiles; a screening profile only for the
    // measurement and control of a comparative claim (VA16, ACCEPTANCE 5.7). Verifiers inherit the verified profile (VV2).
    const screening = (contract.screeningProfiles ?? []).includes(r.profile);
    const declared = obligation.profiles.includes(r.profile);
    if (role !== 'verifier' && !(declared || (screening && !promo && (role === 'measurement' || role === 'control'))))
      bad(screening ? 'RECEIPT-SCREENING' : 'RECEIPT-PROFILE', `profile ${JSON.stringify(r.profile)} cannot serve ${obligation.id} as ${role} in a ${claim.kind} claim (declared: ${obligation.profiles.join(', ')}; VA16, RULINGS Q34d)`);
    if (!bound(r.composition)) bad('COMPOSITION-UNBOUND', 'receipt composition is not fully bound (VA14, CX-COMPOSITION-UNBOUND)');
    // Freshness (Q42a): produced at its home commit (the claim's, or the registry's for A0), on that commit's clean tree,
    // after the commit existed. Codex round 5 used a falsifier receipt from an earlier commit; a stale binary kept the claim's
    // source label; a start time before the commit is a relabelled receipt.
    const g = own(r, 'git');
    if (own(g, 'commit') !== h.commit || own(g, 'tree') !== h.tree) bad('RECEIPT-NOT-FRESH', `produced at ${own(g, 'commit') ?? '?'}, not its home commit ${h.commit} (RULINGS Q42a)`);
    const pid = own(r, 'profileIdentity') ?? {};
    if (pid.sourceTreeSha256 !== h.label) bad('RECEIPT-SOURCE-LABEL', `source label ${pid.sourceTreeSha256} is not the clean label of ${h.commit} (RULINGS Q38b)`);
    const start = Date.parse(own(own(r, 'timing'), 'start')), end = Date.parse(own(own(r, 'timing'), 'end'));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) bad('RECEIPT-TIMING', 'timing.start and timing.end must be ISO times, end after start');
    else if (start < h.time * 1000) bad('RECEIPT-NOT-FRESH', `started ${r.timing.start}, before ${h.commit} existed (RULINGS Q42a)`);
    // VA2: identity complete; the lockfile is the home commit's.
    for (const f of ['sourceTreeSha256', 'buildManifestSha256', 'executedBinarySha256', 'lockfileSha256', 'node', 'pnpm']) if (!str(pid[f])) bad('RECEIPT-IDENTITY', `profileIdentity.${f} is missing (VA2)`);
    const lock = git.blobHashes(h.commit, [PATHS.lockfile]).get(PATHS.lockfile);
    if (pid.lockfileSha256 !== lock) bad('RECEIPT-LOCKFILE', `lockfile ${pid.lockfileSha256} is not ${PATHS.lockfile} at ${h.commit} (${lock}) (VA2, B4)`);
    // VA5: the endpoint contacted is the one expected, never a homebase port. VA10: admitted, not BLOCKED_CAPACITY.
    const forbidden = slots?.forbiddenPorts ?? [15442, 17019];
    if (!isObj(r.endpoint) || !strList(r.endpoint.contacted) || !same(r.endpoint.contacted, r.endpoint.expected)) bad('RECEIPT-ENDPOINT', 'endpoint.contacted must be a nonempty list equal to endpoint.expected (VA5)');
    else {
      // Ports are read as the URL parser reads them (red-team v2: ":015442" is port 15442).
      const port = u => { try { const x = new URL(u); return Number(x.port || (x.protocol === 'https:' ? 443 : 80)); } catch { return null; } };
      const ports = r.endpoint.contacted.map(port);
      if (ports.some(p => p == null || forbidden.includes(p))) bad('RECEIPT-ENDPOINT', `contacted a forbidden port ${forbidden.join(' or ')} or an unparseable endpoint (VA5)`);
    }
    if (!isObj(r.admission) || !str(r.admission.reservationId) || r.admission.status !== 'ADMITTED') bad('RECEIPT-ADMISSION', 'admission must record a reservation with status ADMITTED (VA10)');

    verifyManifest(entry, pid, bad);

    // Every evidence object: exists, hashes to its name, is the declared record, and carries this run's binding.
    const evidence = Array.isArray(r.evidence) ? r.evidence : [];
    if (!evidence.length) bad('EVIDENCE-MISSING', 'receipt carries no evidence');
    // The run ledger (red-team v2 findings 2 and 3): written when the run ends, it lists every evidence object the run wrote,
    // its counts and its end time. Why: without it a FAIL attempt, an unmatched ns-run or a nonzero skip count could be
    // deleted from the receipt and the rest would still verify (rerun-until-green inside one run, B11).
    const ledger = objects.record(own(r, 'ledgerSha256'));
    const evKey = list => (Array.isArray(list) ? list : []).map(e => `${own(e, 'kind')} ${own(e, 'objectSha256')}`).sort();
    if (!ledger.ok || ledger.value.format !== FORMATS.runLedger || ledger.value.binding !== entry.binding) bad('LEDGER', `run ledger ${own(r, 'ledgerSha256')} is not a ${FORMATS.runLedger} record of this run`);
    else if (!same(evKey(ledger.value.evidence), evKey(evidence)) || !same(ledger.value.counts, own(r, 'counts')) || ledger.value.end !== own(own(r, 'timing'), 'end'))
      bad('LEDGER-MISMATCH', 'the receipt\'s evidence, counts or end time differ from what the run recorded in its ledger (evidence removed, added or edited after the run)');
    const record = (h0, format, what) => {
      const o = objects.record(h0);
      if (!o.ok) { bad('OBJECT', `${what}: ${o.why} (VA1)`); return null; }
      if (o.value.format !== format) { bad('OBJECT-SCHEMA', `${what}: object ${h0} is not a ${format} record (Q47a)`); return null; }
      if (o.value.binding !== entry.binding) { bad('OBJECT-NOT-THIS-RUN', `${what}: object ${h0} was written by another run, or this receipt was edited after its run (binding mismatch)`); return null; }
      return o.value;
    };
    const blob = (h0, what) => { const o = objects.get(h0); if (!o.ok) bad('OBJECT', `${what}: ${o.why} (VA1)`); return o.ok ? o.bytes : null; };
    const selected = new Map((selection.get(obligation.id) ?? []).map(c => [`${c.set}\u0000${c.id}`, c]));
    const faults = new Map();
    let caseEntries = 0;
    for (const e of evidence) {
      if (!isObj(e) || !str(e.kind)) { bad('EVIDENCE-FORMAT', 'evidence entries need kind and objectSha256'); continue; }
      if (e.kind === 'case-result') {
        caseEntries++;
        const what = `case ${e.caseSet}/${e.caseId}/${e.mode}`;
        const v = record(e.objectSha256, FORMATS.caseResult, what);
        if (!v) continue;
        if (v.caseSet !== e.caseSet || v.caseId !== e.caseId || v.mode !== e.mode || v.verdict !== e.verdict) { bad('OBJECT-NOT-THIS-CASE', `${what}: object says ${v.caseSet}/${v.caseId}/${v.mode} ${v.verdict}`); continue; }
        const c = selected.get(`${v.caseSet}\u0000${v.caseId}`);
        if (!c) { bad('CASE-NOT-SELECTED', `${what} is not in ${obligation.id}'s resolved selection`); continue; }
        if (v.caseSha256 !== c.contentSha256 || !blob(v.caseSha256, `${what} case content`)) { bad('CASE-CONTENT', `${what} ran content ${v.caseSha256}, the pinned manifest has ${c.contentSha256} (Q47c)`); continue; }
        if (v.comparator !== c.comparator) { bad('CASE-COMPARATOR', `${what} compared with ${v.comparator}, the manifest says ${c.comparator}`); continue; }
        // Q45b, Q47a, Q47c: re-judge the oracle on this case. A run that exited non-zero or refused (X-NOT-MODELED) can never
        // count as PASS, whatever the case object says, and whether the case was selected directly or through a broader set.
        const run = record(v.oracleRunObject, FORMATS.oracleRun, `${what} oracle run`);
        if (!run) continue;
        if (!obligation.oracles.includes(run.oracleId) || run.caseSet !== v.caseSet || run.caseId !== v.caseId || run.caseSha256 !== v.caseSha256) { bad('ORACLE-RUN', `${what}: oracle run ${run.oracleId}/${run.caseSet}/${run.caseId} is not this case's run by one of ${obligation.oracles.join(', ')}`); continue; }
        if (run.exit !== 0 || run.refusal != null) { bad('ORACLE-REFUSED', `${what}: oracle ${run.oracleId} exited ${run.exit}${run.refusal ? ` with ${run.refusal}` : ''}; a refused case never passes (RULINGS Q45b, Q47c)`); entry.cases.set(`${v.caseSet}\u0000${v.caseId}\u0000${v.mode}`, 'REFUSED'); continue; }
        const expected = blob(run.expectedObject, `${what} expected answer`), observed = blob(v.rawResultObject, `${what} raw result`);
        if (!expected || !observed) continue;
        const verdict = recompute(v.comparator, expected, observed);
        entry.cases.set(`${v.caseSet}\u0000${v.caseId}\u0000${v.mode}`, verdict);
        if (verdict !== v.verdict) bad('VERDICT-MISMATCH', `${what} is labelled ${v.verdict}, recomputed ${verdict} from the retained answer and result (Q47a)`);
        else if (verdict !== 'PASS') bad('CASE-NOT-PASS', `${what} is ${verdict} (any non-PASS case fails the receipt, B11)`);
      } else if (e.kind === 'fault-witness') {
        const v = record(e.objectSha256, FORMATS.faultWitness, 'fault witness');
        if (!v) continue;
        const inj = Array.isArray(v.injections) ? v.injections : [];
        const distinct = new Set(inj.map(i => own(i, 'durableEvidenceObject')).filter(x => blob(x, `fault ${v.caseId} injection`)));
        if (!str(v.caseSet) || !str(v.caseId) || distinct.size !== inj.length) bad('FAULT-WITNESS', `fault witness ${v.caseSet}/${v.caseId}: injections must each retain distinct durable evidence`);
        faults.set(`${v.caseSet}\u0000${v.caseId}`, Math.max(faults.get(`${v.caseSet}\u0000${v.caseId}`) ?? 0, distinct.size));
      } else if (e.kind === 'ns-run') {
        const v = record(e.objectSha256, FORMATS.nsRun, 'ns-run');
        if (v) checkNsRun(entry, v, bad);
      } else if (e.kind === 'verifier-record') {
        const v = record(e.objectSha256, FORMATS.verifierRecord, 'verifier record');
        if (v) checkVerifierRecord(entry, v, bad, blob);
      } else blob(e.objectSha256, `${e.kind} evidence`);
    }
    const modes = obligation.closure?.modes ?? [];
    if (role === 'verifier') {
      if (!entry.record) return bad('VERIFIER-RECORD-SCHEMA', 'verifier receipt carries no valid verifier-record object (Q47a)');
      // VV3 (red-team v2 finding 7): the verifier shows its own work. In rerun mode its own retained case results cover the full
      // selection in every mode; in re-evaluate-and-spot mode at least one selected case is rerun in every mode. Those results are
      // judged here exactly like a measurement's (oracle run, expected answer, raw result).
      const full = [...selected.values()].every(c => modes.every(m => entry.cases.get(`${c.set}\u0000${c.id}\u0000${m}`) === 'PASS'));
      const spot = [...selected.values()].some(c => modes.every(m => entry.cases.get(`${c.set}\u0000${c.id}\u0000${m}`) === 'PASS'));
      if (entry.record.mode === 'rerun' ? !full : !spot) bad('VERIFIER-NO-RERUN', `verifier in ${entry.record.mode} mode carries no ${entry.record.mode === 'rerun' ? 'full rerun' : 'spot rerun'} of ${obligation.id} with recomputed PASS verdicts (VV3)`);
      const ids = new Set(receipts.filter(isObj).map(x => x.receiptId));
      if (entry.record.spotRerunReceiptIds.some(s => s !== r.receiptId && !ids.has(s))) bad('VERIFIER-RECORD-SCHEMA', 'spotRerunReceiptIds name receipts this claim does not carry (VV3)');
      return;
    }
    // VA8 and Q42a "modes required by the obligation": every resolved case PASSes in every declared mode.
    if (!modes.length) bad('CASES-MISSING', `${obligation.id} declares no mode (CX-ZERO-MODES)`);
    const missing = [...selected.values()].flatMap(c => modes.filter(m => entry.cases.get(`${c.set}\u0000${c.id}\u0000${m}`) !== 'PASS').map(m => `${c.set}/${c.id}/${m}`));
    if (missing.length) bad('CASES-MISSING', `${obligation.id} lacks a recomputed PASS for ${missing.length} resolved case x mode pair(s): ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ', ...' : ''} (VA8, Q47c)`);
    const c = own(r, 'counts') ?? {};
    if (c.executed !== caseEntries || c.declared !== selected.size * modes.length || ['skipped', 'unsupported', 'notImplemented', 'unexpectedErrors'].some(k => c[k] !== 0))
      bad('RECEIPT-COUNTS', `counts must show declared = ${selected.size * modes.length} (selection x modes), executed = ${caseEntries} case results and zero skipped, unsupported, notImplemented and unexpectedErrors (VA8)`);
    // Q42a "fault repetitions": every fault-point case the selection resolves has a witness injected T-FAULT-REPS times.
    if ((obligation.closure?.rules ?? []).includes('CR-FAULT')) {
      const points = [...selected.values()].filter(x => x.faultPoint);
      if (!points.length) bad('FAULT-WITNESS-MISSING', `${obligation.id} closes by CR-FAULT but its manifest marks no fault point`);
      for (const p of points) if ((faults.get(`${p.set}\u0000${p.id}`) ?? 0) < reps) bad('FAULT-REPS-SHORT', `fault point ${p.set}/${p.id} has ${faults.get(`${p.set}\u0000${p.id}`) ?? 0} distinct injections, T-FAULT-REPS is ${reps} (CX-FAULT-REPS-SHORT)`);
    }
    if (isMeasured(obligation) && !entry.nsRuns.length) bad('NS-RUN-MISSING', `${obligation.id} carries no valid ns-run evidence`);
  }

  // Q47b: validated, nonempty workload identity; VA15: the frozen trace generator, seed and offer schedule.
  function checkNsRun(entry, v, bad) {
    const want = expectedMeasurement(entry.obligation);
    const t = own(v, 'trace'), slot = own(v, 'slot'), windows = own(v, 'windows');
    const okWindows = Array.isArray(windows) && windows.length > 0 && windows.every(w => isObj(w) && Number.isFinite(w.from) && Number.isFinite(w.to) && w.from >= 0 && w.to > w.from && str(w.burstPhase));
    const okTrace = isObj(t) && safePath(t.generatorPath) && sha(t.generatorSourceSha256) && Number.isSafeInteger(t.seed) && sha(t.offerScheduleSha256);
    const okSlot = isObj(slot) && str(slot.name) && str(slot.host) && slot.name === entry.r.composition?.source?.slot;
    if (!okWindows || !okTrace || !okSlot) return bad('NS-RUN-SCHEMA', 'ns-run needs trace {generatorPath, generatorSourceSha256, seed, offerScheduleSha256}, windows [{from, to > from, burstPhase}] and slot {name = the source slot, host}; a missing field never matches a missing field (RULINGS Q47b)');
    if (v.measurement !== want) return bad('NS-RUN-WRONG-MEASUREMENT', `ns-run measures ${v.measurement}, ${entry.obligation.id} needs ${want} (CX-GS-WRONG-SCENARIO)`);
    if (!objects.get(v.rawEventsObject).ok || !objects.get(t.offerScheduleSha256).ok) return bad('OBJECT', 'ns-run raw events or offer schedule is not a retained object (VA1)');
    if (git.blobHashes(entry.home.commit, [t.generatorPath]).get(t.generatorPath) !== t.generatorSourceSha256) return bad('TRACE-UNBOUND', `trace generator ${t.generatorPath} at ${entry.home.commit} does not hash to ${t.generatorSourceSha256}`);
    const frozen = loadContract.writerTrace?.generator?.frozen;
    if (!isObj(frozen)) return bad('TRACE-NOT-FROZEN', `${PATHS.loadContract} pins no frozen trace (writerTrace.generator.frozen {path, sha256, seed, offerScheduleSha256}); VA15 cannot hold`);
    if (t.generatorPath !== frozen.path || t.generatorSourceSha256 !== frozen.sha256 || t.seed !== frozen.seed || t.offerScheduleSha256 !== frozen.offerScheduleSha256)
      return bad('TRACE-NOT-FROZEN', `trace ${t.generatorPath}@${t.generatorSourceSha256}/seed ${t.seed} is not the frozen trace (VA15, CX-NS-UNFROZEN-TRACE)`);
    // The match key includes the profile (red-team v2 finding 6: a P-SCREEN measurement matched a P-NS control).
    entry.nsRuns.push({ run: v, key: canonText({ g: t.generatorSourceSha256, seed: t.seed, schedule: t.offerScheduleSha256, windows: windows.map(w => [w.from, w.to, w.burstPhase]), slot: [slot.name, slot.host], profile: entry.r.profile }) });
  }

  // Q47a: a verifier record must be the verifier-record schema (5.2), not any object that hashes (Codex: {"notAVerifierRecord":true}).
  function checkVerifierRecord(entry, v, bad, blob) {
    const okVerifies = Array.isArray(v.verifies) && v.verifies.length > 0 && v.verifies.every(e => isObj(e) && str(e.receiptId) && sha(e.binding));
    if (!okVerifies || v.mode !== entry.obligation.verifierMode || !Array.isArray(v.mismatches) || !Array.isArray(v.spotRerunReceiptIds) || (v.mode === 're-evaluate-and-spot' && !strList(v.spotRerunReceiptIds)))
      return bad('VERIFIER-RECORD-SCHEMA', `verifier record must list verifies [{receiptId, binding}], mode ${entry.obligation.verifierMode}, mismatches [] and spotRerunReceiptIds (Q47a)`);
    if (v.mismatches.length) return bad('VERIFIER-MISMATCH', `verifier reports mismatches: ${JSON.stringify(v.mismatches).slice(0, 200)}`);
    const rv = objects.record(v.recomputedVerdictsObject);
    const okRv = rv.ok && rv.value.format === FORMATS.recomputedVerdicts && rv.value.binding === entry.binding && Array.isArray(rv.value.verdicts)
      && rv.value.verdicts.every(e => isObj(e) && str(e.receiptId) && str(e.caseSet) && str(e.caseId) && str(e.mode) && str(e.verdict));
    if (!okRv) return bad('VERIFIER-RECORD-SCHEMA', `recomputed verdicts ${v.recomputedVerdictsObject} are not a ${FORMATS.recomputedVerdicts} record of this run (Q47a, VV4)`);
    entry.record = v;
    entry.verdicts = rv.value.verdicts;
  }

  // Q42a, Q47a: the executed binary and modules are retained objects bound to the home commit's tree through a build/import
  // manifest that is itself an object. Closes Codex round 4 finding 4 and round 6 finding 1.
  function verifyManifest(entry, pid, bad) {
    const { r, home: h } = entry;
    const o = objects.record(pid.buildManifestSha256);
    if (!o.ok) return bad('MANIFEST', `build manifest: ${o.why} (VA1)`);
    const m = o.value;
    if (m.format !== FORMATS.manifest) return bad('MANIFEST', `build manifest format must be ${FORMATS.manifest}`);
    // VA3 "build first": the manifest belongs to this run, so an old build cannot be reused under a new receipt.
    if (m.binding !== entry.binding) bad('MANIFEST-NOT-THIS-RUN', 'manifest was written by another run, or the receipt was edited after its run (VA3)');
    if (m.commit !== h.commit || m.tree !== h.tree || m.sourceTreeSha256 !== h.label) bad('MANIFEST-NOT-FRESH', `manifest records ${m.commit}/${m.tree}, not ${h.commit} (RULINGS Q42a)`);
    const modules = Array.isArray(m.modules) ? m.modules : [];
    const builds = Array.isArray(m.builds) ? m.builds.filter(isObj) : [];
    if (!strList(m.entrypoints) || !modules.length || !modules.every(x => isObj(x) && safePath(x.path) && sha(x.sha256) && str(x.origin))) return bad('MANIFEST', 'manifest must list entry points and executed modules {path, sha256, origin}');
    if (m.binarySha256 !== listingHash(modules.map(x => [x.path, x.sha256])) || pid.executedBinarySha256 !== m.binarySha256) bad('MANIFEST-BINARY', 'executedBinarySha256 must equal the manifest\'s binarySha256, the listing hash of its executed modules');
    for (const ep of m.entrypoints) if (!modules.some(x => x.path === ep)) bad('MANIFEST', `entry point ${ep} is not among the executed modules`);
    // First-party package names at the home commit: every tracked package.json outside node_modules, wherever the workspace
    // puts it (red-team v2: test/* and examples/* packages were missed when only packages/* was read).
    const pkgFiles = (git.list(h.commit, null) ?? []).filter(p => /(^|\/)package\.json$/.test(p) && !p.split('/').includes('node_modules'));
    const names = pkgFiles.map(p => { try { return JSON.parse(git.blob(h.commit, p)?.toString('utf8') ?? '{}').name; } catch { return null; } }).filter(str).map(n => n.toLowerCase());
    const lockText = git.blob(h.commit, PATHS.lockfile)?.toString('utf8') ?? '';
    const buildInputs = builds.flatMap(b => Array.isArray(b.inputs) ? b.inputs.filter(isObj).map(x => x.path) : []);
    const hashes = git.blobHashes(h.commit, [...modules.filter(x => x.origin === 'tree').map(x => x.path), ...buildInputs, PATHS.lockfile]);
    for (const x of modules) {
      // Q47a: the bytes that executed are retained, so a verifier can reopen them.
      if (!objects.get(x.sha256).ok) bad('MODULE-NOT-RETAINED', `executed ${x.path} ${x.sha256} is not a retained object (Q47a)`);
      if (x.origin === 'tree') {
        if (hashes.get(x.path) !== x.sha256) bad('MODULE-STALE', `executed ${x.path} ${x.sha256} is not ${h.commit}'s (${hashes.get(x.path)})`);
      } else if (x.origin === 'build') {
        const b = builds.find(y => y.id === x.build);
        if (!b || !(Array.isArray(b.outputs) ? b.outputs : []).some(y => isObj(y) && y.path === x.path && y.sha256 === x.sha256)) bad('MODULE-NOT-BUILT', `executed ${x.path} is not an output of build ${x.build} in this manifest`);
      } else if (x.origin === 'dependency') {
        // Third-party code is bound only through the lockfile: the package the path names (after its last node_modules) must be
        // listed in the home commit's lockfile and must not be a first-party package under any spelling (case-insensitive,
        // pnpm's .pnpm/<name+scope>@version form included). Why: a stale first-party build under node_modules, or an
        // unlisted "dependency", would otherwise run unbound (red-team v2 finding 1).
        const seg = x.path.split('/');
        const at = seg.lastIndexOf('node_modules');
        const pkgName = at >= 0 && seg[at + 1] ? (seg[at + 1].startsWith('@') ? `${seg[at + 1]}/${seg[at + 2] ?? ''}` : seg[at + 1]) : '';
        const lower = seg.map(s => s.toLowerCase());
        const firstParty = names.includes(pkgName.toLowerCase()) || lower.some(s => names.some(n => s.startsWith(`${n.replace('/', '+')}@`) || s === n.replace('/', '+')));
        const listed = str(pkgName) && new RegExp(`^\\s+'?${pkgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@`, 'm').test(lockText);
        if (seg[0] !== 'node_modules' || firstParty || !listed || m.lockfileSha256 !== hashes.get(PATHS.lockfile)) bad('DEPENDENCY-UNBOUND', `${x.path} is not a third-party package listed in ${h.commit}'s lockfile`);
      } else bad('MODULE-ORIGIN', `${x.path} has origin ${JSON.stringify(x.origin)}; allowed: tree, build, dependency`);
    }
    for (const b of builds) {
      // A build compiles one workspace package from all of its tracked files, and only writes under its dist/. Why: an
      // omitted or narrowed input set is how an older file slips into a "current" build (red-team: narrowed sourceRoots).
      const pkg = b.package;
      const inputs = Array.isArray(b.inputs) ? b.inputs : [];
      if (!safePath(pkg) || !pkgFiles.includes(`${pkg}/package.json`) || !same(b.sourceRoots, [pkg])) { bad('BUILD-ROOTS', `build ${b.id} must compile a whole workspace package: sourceRoots [package], package a directory with package.json at ${h.commit}`); continue; }
      const entries = git.entries(h.commit, [pkg]) ?? [];
      const listed = entries.map(e => e.path);
      // Lab-only: a tracked symlink hashes as its link text, not as the file the build reads.
      for (const e of entries) if (e.mode === '120000') bad('BUILD-INPUT-SYMLINK', `build ${b.id} input ${e.path} is a symlink; its target is not bound`);
      const paths = inputs.map(x => own(x, 'path'));
      const missing = listed.filter(p => !paths.includes(p)), extra = paths.filter(p => !listed.includes(p));
      if (missing.length || extra.length) bad('BUILD-INPUTS-INCOMPLETE', `build ${b.id} inputs differ from the tracked files under ${pkg}: missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'}`);
      for (const x of inputs) if (listed.includes(own(x, 'path')) && hashes.get(x.path) !== x.sha256) bad('BUILD-INPUT-STALE', `build ${b.id} was built from ${x.path} ${x.sha256}, ${h.commit} has ${hashes.get(x.path)} (stale binary under the claim's source label)`);
      for (const y of Array.isArray(b.outputs) ? b.outputs : []) if (!isObj(y) || !safePath(y.path) || !y.path.startsWith(`${pkg}/dist/`)) bad('BUILD-OUTPUTS', `build ${b.id} output ${own(y, 'path')} is outside ${pkg}/dist/`);
    }
  }
}

// ---------------------------------------------------------------- CLI

export function admitFile(file, { repo = REPO, objects = OBJECTS, authorityRef = 'main' } = {}) {
  let claim;
  try { claim = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { return { verdict: 'DIAGNOSTIC', reasons: [{ code: 'CLAIM-FORMAT', detail: `cannot read ${file}: ${error.message}` }] }; }
  return admitClaim(claim, { git: gitSource(repo), objects: objectStore(objects), authorityRef });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main(async () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  if (positional[0] !== 'admit' || !positional[1]) fail('USAGE', 'usage: claim.mjs admit <claim.json> [--repo DIR] [--objects DIR] [--authority-ref main] [--json]');
  const repo = path.resolve(options.repo ?? REPO);
  const result = admitFile(path.resolve(positional[1]), { repo, objects: path.resolve(options.objects ?? path.join(repo, 'runs/objects')), authorityRef: options['authority-ref'] ?? 'main' });
  if (options.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else {
    console.log(result.verdict);
    for (const r of result.reasons) console.log(`  ${r.code}${r.receipt ? ` [${r.receipt}]` : ''}: ${r.detail}`);
  }
  process.exitCode = result.verdict === 'QUALIFIED' ? 0 : 2;
});
