#!/usr/bin/env node
// lab/bin/claim.mjs admit   <claim.json> [--repo DIR] [--objects DIR] [--authority-ref main] [--json]
// lab/bin/claim.mjs qualify <claim.json> [--repo DIR] [--authority-ref main] [--work DIR] [--offline-sut] [--json]
//
// Claim admission (EXP-E01; contract 0.3.7 CLAIM_ADMISSION; RULINGS Q34d, Q37b, Q38a, Q38b, Q41d, Q42a, Q45a, Q45b, Q46b,
// Q47a to Q47d; Q55a and Q55e as the coordinator directs). Exit 0 for QUALIFIED, 2 for DIAGNOSTIC with every reason found, 1
// for usage errors. An evaluator exception is itself a DIAGNOSTIC (fail closed). Pending rulings (RULINGS-PENDING.md,
// authority "none", Q47d) are never cited as authority for admitting anything.
//
// Qualification is a run, not a document (Q55a). Two commands:
//   admit    judges a claim's documents: receipts and records a claimant supplies. Its verdict is always DIAGNOSTIC
//            (DOCUMENT-ONLY); documentVerdict says whether the documents would pass the checks below. Codex round 7 showed
//            that well-formed records can be invented (finding 1) and a candidate binary can be labelled as A0 (finding 2);
//            no check of a document can tell an invented record from a real one, so none can qualify.
//   qualify  runs the claim itself (qualifyClaim below): it builds the claimed tree and the registry's A0 from fresh git
//            archives, resolves every case and mode from the pinned manifests, computes every expected answer with the pinned
//            oracle on the pinned input, runs the system under test through the gate, applies the declared comparator, and
//            judges only the receipts it made. The claim's receipts, selections and case lists are ignored. Step 3 (the gate)
//            exists only as gate.mjs --dry-run, so qualify is DIAGNOSTIC (GATE-NOT-RUN) until an executing OBL gate exists.
//
// The document checks have two layers.
//   1. admitCore: the contract's reference model (lab/acceptance/build_contract.py admit_claim, evidence_ok, open_record,
//      case_verdict, workload_ok, refused_by, selected_pairs), ported function by function with the contract's names, record
//      schemas (EVIDENCE_SCHEMAS), workload identity (WORKLOAD_IDENTITY) and A0 registry (A0_REGISTRY), read from the contract
//      document. Q41d: the lab implements the reference as a minimum, so on any input this layer reaches the reference's
//      verdict; lab/bin/test/claim.test.mjs checks that on the contract's own admission fixtures.
//   2. admitClaim: the lab layer (the full VA rules, Q41d), which runs the core on what I/O finds and then requires more:
//      - the contract is read from the claimed commit, never the working tree, and equals the authority ref's (VA6);
//      - the claim's and the A0 registry's source labels are the clean labels of real commits;
//      - every receipt the claim carries verifies (not just one per prerequisite: rerun-until-green bundles, B11);
//      - a run ledger object binds the receipt's run fields (bindingOf) to the evidence list, counts, modes and fault
//        repetitions the run recorded, so a receipt edited after its run (composition, profile, run kind, contract, start,
//        deleted FAIL attempts, zeroed counts) no longer matches (red-team passes 1 and 2);
//      - a build-provenance object says where every executed module came from: tracked files must be the commit's blobs,
//        built modules must come from a build of a whole workspace package from all its tracked files, dependencies must be
//        third-party packages the lockfile lists (Codex round 4 finding 4; red-team passes 1 and 2);
//      - every resolved case of a pinned case manifest is covered (ACCEPTANCE 5.3, Q47c), the workload's trace is the frozen
//        one (VA15), the A0 composition has its own prerequisites (GATE-POSITION "A0 included"), profiles and run kinds fit
//        the role (VA16, B7), the verifier is not an author (VV1), images, endpoints, admission and counts are valid (VA4,
//        VA5, VA10, VA8), and pinned oracle and W0 files still hash to their pins (VA6).
//
// Threat model of the document checks: they defeat stale, partial, placeholder, relabelled and misassembled evidence, and any
// edit of a receipt or claim after its run. Writing new objects into runs/objects with a correct binding (the binding is
// computable from receipt fields) is forgery they cannot defeat (Codex round 7); that is why admit never qualifies.
//
// Rejected: reading pins, receipts or the contract from the working tree; accepting the first valid receipt among invalid
// ones; carrying receipts forward from ancestor commits (ACCEPTANCE 5.7); trusting any inline receipt field that no retained
// object repeats; extra fields in the contract's record schemas (Q47a fixes them exactly; proposals go to the next version);
// any verifier record a claim carries as independent verification (Q55a: only the contract's VERIFIER_REGISTRY counts).
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { OBJECTS, REPO, fail, main, parseArgs, sha256, sourceTreeIdOf } from './lib.mjs';

export const FORMATS = { claim: 'triplex-db-2/claim/1', receipt: 'triplex-db-2/receipt/2', ledger: 'run-ledger/1', provenance: 'build-provenance/1' };
export const PATHS = { contract: 'lab/acceptance/obligations.json', loadContract: 'lab/acceptance/load-contract.json', slots: 'lab/config/slots.json', lockfile: 'pnpm-lock.yaml' };
export const PREREQ = { position: 'G7.position.coordinates', identity: 'G10.composition.identity-bound', w0: 'W0.coverage-floors' };
const COMPOSITION_FIELDS = ['engine', 'imageDigest', 'configSha256', 'slot'];
const ACCEPTED_ORACLE_STATUS = ['EXISTS', 'COMPILED', 'ACCEPTED', 'BUILT-ACCEPTED'];
const SHA = /^[0-9a-f]{64}$/;
const COMMIT = /^([0-9a-f]{40}|[0-9a-f]{64})$/;

// ---------------------------------------------------------------- small pure helpers

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = v => typeof v === 'string' && v.length > 0;
const sha = v => typeof v === 'string' && SHA.test(v);
const strList = v => Array.isArray(v) && v.length > 0 && v.every(str);
const own = (o, k) => isObj(o) && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;
export const canon = v => Array.isArray(v) ? v.map(canon) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
export const canonText = v => JSON.stringify(canon(v));
const same = (a, b) => canonText(a) === canonText(b);
const sameKeys = (o, keys) => isObj(o) && same(Object.keys(o).sort(), [...keys].sort());
/** Python truthiness, as the reference's `not x` reads it. */
const pyFalsy = v => v == null || v === false || v === 0 || v === '' || (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length);
/** Hash of a file listing: sha256 over "<sha256>  <path>\n" lines in the given order (the gate.mjs hashDist convention). */
export const listingHash = rows => sha256(rows.map(([p, h]) => `${h}  ${p}\n`).join(''));
/** A path that is safe to hand to git and means one file: relative, no empty, "." or ".." segments, no control characters,
 * no pathspec magic (red-team pass 2: node_modules/./@x and node_modules//@x spelled a first-party package another way). */
const safePath = p => typeof p === 'string' && p.length > 0 && !p.startsWith(':') && !p.startsWith('-') && !/[\u0000-\u001f\u007f\\]/.test(p) && p.split('/').every(s => s !== '' && s !== '.' && s !== '..');
const agentKey = a => typeof a === 'string' ? a.trim().toLowerCase() : null; // red-team pass 2: "Agent-Candidate-Author"
/** Four assignments, each with string engine, imageDigest, configSha256 (a sha256) and slot (VA14; red-team pass 1: a slot
 * array or a missing field must not count as bound). */
const boundComposition = (c, assignments) => sameKeys(c, assignments) && assignments.every(k => sameKeys(c[k], COMPOSITION_FIELDS) && COMPOSITION_FIELDS.every(f => str(c[k][f])) && sha(c[k].configSha256));
/** VA4: every assignment runs the image lab/config/slots.json pins for its engine (the contract pins no images). */
const imageProblems = (c, slots, assignments) => assignments.flatMap(k => { const pin = slots?.lanes?.[c[k].engine]?.imageId; return !pin || c[k].imageDigest !== pin ? [`${k} image ${c[k].imageDigest} is not the pinned ${pin ?? '(no pin)'}`] : []; });
/** Every reason in order; more than three with the same code on one receipt are summarised with a count. */
function summarise(reasons) {
  const seen = new Map(), out = [];
  for (const r of reasons) {
    const k = `${r.code}\u0000${r.receipt ?? ''}`;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (n <= 3) out.push(r);
  }
  for (const [k, n] of seen) if (n > 3) { const [code, receipt] = k.split('\u0000'); out.push({ code, detail: `${n - 3} more ${code} reason${n === 4 ? '' : 's'} like the above`, ...(receipt ? { receipt } : {}) }); }
  return out;
}
/** Problems with pinned files at a commit: each file must hash to its pin; a key ending in "/" pins the listing hash of the
 * directory's tracked files (VA6). */
function pinnedFileProblems(git, commit, map) {
  const out = [];
  const files = Object.keys(map).filter(p => !p.endsWith('/'));
  const hashes = git.blobHashes(commit, files);
  for (const p of files) if (hashes.get(p) !== map[p]) out.push(`${p} hashes to ${hashes.get(p)}, pinned ${map[p]}`);
  for (const dir of Object.keys(map).filter(p => p.endsWith('/'))) {
    const listed = git.list(commit, [dir.replace(/\/$/, '')]) ?? [];
    const h = git.blobHashes(commit, listed);
    const actual = listed.length ? listingHash(listed.map(p => [p, h.get(p)])) : null;
    if (actual !== map[dir]) out.push(`directory ${dir} hashes to ${actual}, pinned ${map[dir]}`);
  }
  return out;
}

/**
 * Parse an answer that must be canonical JSON (red-team pass 2 finding 5): valid UTF-8, the exact bytes of its own key-sorted,
 * whitespace-free serialisation, only safe integers as numbers, at most 64 levels deep. Why: JSON.parse loses information
 * (2^53 + 1, 1e400, 12.30 versus 12.3, duplicate keys, invalid UTF-8), so two different answers could compare equal after
 * parsing. Exact values (decimals, doubles, big integers) are therefore typed strings. Returns { ok, value } or { ok: false }.
 */
export function canonicalAnswer(bytes) {
  let text, value;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); value = JSON.parse(text); } catch { return { ok: false }; }
  const fits = (v, depth) => depth <= 64 && (v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isSafeInteger(v) && !Object.is(v, -0))
    || (Array.isArray(v) && v.every(x => fits(x, depth + 1))) || (isObj(v) && Object.values(v).every(x => fits(x, depth + 1))));
  if (!fits(value, 0) || canonText(value) !== text) return { ok: false };
  return { ok: true, value };
}
/** Apply a contract comparator (COMPARATORS) to an expected answer and an observed result, both canonical JSON. PASS, FAIL or
 * UNCOMPARABLE (an unknown comparator, a non-canonical answer or the wrong shape never passes). */
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
      // The expected answer names a nonempty reason or reason list; [undefined].includes(undefined) never matches (red-team pass 2).
      const reasons = Array.isArray(e?.reasons) ? e.reasons : [e?.reason];
      if (!isObj(e) || !isObj(o) || !str(e._tag) || !reasons.length || !reasons.every(str)) return 'UNCOMPARABLE';
      return verdict(o._tag === e._tag && reasons.includes(o.reason) && o.cause != null && (o.rows === undefined || (Array.isArray(o.rows) && o.rows.length === 0)));
    }
    default: return 'UNCOMPARABLE';
  }
}

// ================================================================ layer 1: the contract's reference model

/**
 * JSON that keeps Python's int/float distinction: a number written with a fraction or exponent, or an integer beyond the
 * safe range, parses to a marker that no int, str or hex64 field accepts. Why: the reference's open_record types fields with
 * Python's isinstance(v, int), which rejects 0.0; plain JSON.parse would accept it and admit what the reference rejects.
 */
function parseJson(bytes) {
  const NOT_INT = { notAnInteger: true };
  return JSON.parse(bytes.toString('utf8'), (k, v, ctx) => typeof v === 'number' && (!/^-?\d+$/.test(ctx?.source ?? '') || !Number.isSafeInteger(v)) ? NOT_INT : v);
}
/** build_contract._typed */
function typed(v, t) {
  if (t === 'hex64') return sha(v);
  if (t === 'int') return Number.isSafeInteger(v);
  if (t === 'list') return Array.isArray(v) && v.length > 0;
  if (t === 'window') return Array.isArray(v) && v.length === 2 && v.every(x => typed(x, 'int')) && 0 <= v[0] && v[0] < v[1];
  if (t === 'str-or-null') return v === null || (typeof v === 'string' && v !== '');
  return typeof v === 'string' && v.trim() !== '';
}
const objOk = (h, store) => store.get(h).ok;
/** build_contract.open_record (Q47a): the retained object, validated against its record schema; null when absent or invalid. */
export function openRecord(h, store, schema, schemas) {
  const o = store.get(h);
  if (!o.ok) return null;
  let rec;
  try { rec = parseJson(o.bytes); } catch { return null; }
  const spec = schemas[schema]?.fields;
  if (!spec || !isObj(rec) || !sameKeys(rec, Object.keys(spec)) || rec.schema !== schema || !Object.entries(spec).every(([k, t]) => typed(rec[k], t))) return null;
  return rec;
}
/** build_contract.case_verdict (Q47a): recomputed from the retained raw result, never read from the receipt. */
export function caseVerdict(rec, store) {
  if (rec.oracleExit === 2 || rec.oracleCode === 'X-NOT-MODELED') return 'REFUSED';
  if (rec.oracleExit !== 0 || rec.oracleCode !== null || !objOk(rec.expectedSha256, store) || !objOk(rec.observedSha256, store)) return 'FAIL';
  return rec.expectedSha256 === rec.observedSha256 ? 'PASS' : 'FAIL';
}
/** build_contract.workload_ok (Q47b): every field present, typed and nonempty; the slot is the source assignment's. */
export function workloadOk(w, comp, fields) {
  return sameKeys(w, Object.keys(fields)) && Object.entries(fields).every(([k, t]) => typed(w[k], t)) && w.slot === own(own(comp, 'source'), 'slot');
}
/** build_contract.selected_pairs */
export function selectedPairs(o, caseSets) {
  const out = new Set();
  for (const c of o.cases) for (const t of c.select) {
    if (t === 'all') { for (const x of [...caseSets[c.set].requiredCases, ...caseSets[c.set].requiredTags]) out.add(`${c.set}\u0000${x}`); out.add(`${c.set}\u0000*`); }
    else out.add(`${c.set}\u0000${t}`);
  }
  return out;
}
/** build_contract.refused_by (Q45b, Q47c): a refused set, a refused case, or a set or tag through which an unsupported rule is
 * reached ("*" is any selection of that set). The same function drives the contract's oracle_scope. */
export function refusedBy(o, ref, caseSets) {
  const pairs = selectedPairs(o, caseSets);
  const sets = new Set([...pairs].map(p => p.split('\u0000')[0]));
  return [...sets].some(s => (ref.sets ?? []).includes(s)) || (ref.cases ?? []).some(([s, id]) => pairs.has(`${s}\u0000${id}`))
    || (ref.reachedThrough ?? []).some(([s, t]) => t === '*' ? sets.has(s) : pairs.has(`${s}\u0000${t}`));
}

/** The reference's context, read from a contract document (obligations.json). Pins, W0 and A0 may be overridden by fixtures. */
export function coreContext(contract, { pins, w0, a0 } = {}) {
  return {
    byId: new Map(contract.obligations.map(o => [o.id, o])), assignments: contract.composition.assignments, positionRequired: contract.positionRequiredCases,
    faultReps: contract.thresholds['T-FAULT-REPS'].value, schemas: contract.evidenceSchemas, workloadFields: contract.workloadIdentity.fields,
    pins: pins ?? contract.oraclePins, w0: w0 ?? contract.w0Pin, a0: a0 ?? contract.a0Registry.entries, byEngine: contract.a0Registry.byEngine,
    oracles: contract.oracles, refusals: contract.oracleRefusals, caseSets: contract.caseSets,
  };
}

/** build_contract.evidence_ok: one receipt as evidence for one obligation, tree, composition and commit. Returns the first reason it fails, or null. */
export function evidenceOk(r, o, tree, comp, commit, env, ctx) {
  const store = env.store;
  if (!isObj(r)) return 'not a receipt';
  if (r.obligation !== o.id || r.definitionSha256 !== o.definitionSha256) return `not ${o.id} at its current definition`;
  if (r.sourceTreeSha256 !== tree || !same(r.composition, comp)) return 'another source tree or composition';
  if (!sameKeys(comp, ctx.assignments) || ctx.assignments.some(k => !sameKeys(comp[k], COMPOSITION_FIELDS) || COMPOSITION_FIELDS.some(f => pyFalsy(comp[k][f])))) return 'composition unbound (VA14)';
  if (r.commit !== commit || !Number.isSafeInteger(r.producedAt) || r.producedAt <= (env.dependencyClosureChangedAt ?? 1e18)) return 'not fresh: another commit, or produced before the last change to its dependency closure (Q42a)';
  const man = openRecord(r.buildManifestSha256, store, 'build-manifest/1', ctx.schemas);
  if (!man || man.sourceTreeSha256 !== tree || man.binarySha256 !== r.executedBinarySha256 || !objOk(man.binarySha256, store)) return 'build manifest absent, invalid, for another tree or binary, or binary not retained (Q42a, Q47a)';
  if (!man.modules.every(x => sameKeys(x, ['path', 'sha256']) && typed(x.path, 'str') && objOk(x.sha256, store))) return 'an executed module is not a retained object (Q47a)';
  if (!Array.isArray(r.modes) || !o.closure.modes.every(m => r.modes.includes(m))) return 'modes missing';
  if (o.closure.rules.includes('CR-FAULT') && (typeof r.faultReps === 'number' ? r.faultReps : 0) < ctx.faultReps) return 'too few fault repetitions';
  const vr = openRecord(r.verifierObjectSha256, store, 'verifier-record/1', ctx.schemas);
  if (!vr || vr.obligation !== o.id || vr.definitionSha256 !== o.definitionSha256 || vr.verdict !== 'ACCEPT') return 'no valid verifier record (Q47a)';
  const need = o.id === PREREQ.position ? ctx.positionRequired : o.cases.flatMap(c => c.select);
  const got = new Set();
  for (const x of Array.isArray(r.caseResults) ? r.caseResults : []) {
    const rec = openRecord(own(x, 'objectSha256'), store, 'case-result/1', ctx.schemas);
    if (!rec || rec.obligation !== o.id || rec.case !== x.case || rec.selection !== x.selection || (o.oracles.length && !o.oracles.includes(rec.oracle))) return `case ${own(x, 'case')}: no valid case record for it (Q47a)`;
    const v = caseVerdict(rec, store);
    if (v !== 'PASS' || x.verdict !== 'PASS') return `case ${x.case}: recomputed ${v}, labelled ${x.verdict} (Q47a, Q47c)`;
    got.add(rec.selection);
  }
  const missing = need.filter(t => !got.has(t));
  return need.length && !missing.length ? null : `selection not covered: ${missing.slice(0, 5).join(', ')}`;
}

/**
 * build_contract.admit_claim. env = { store: {get(h) -> {ok, bytes}}, dependencyClosureChangedAt }. The verdict is the
 * reference's; every reason the reference would stop at is collected (it stops at the first).
 */
export function admitCore(claim, env, ctx) {
  const reasons = [];
  const why = (code, detail) => reasons.push({ code, detail });
  const done = () => ({ verdict: reasons.length ? 'DIAGNOSTIC' : 'QUALIFIED', reasons });
  const ids = Array.isArray(own(claim, 'obligations')) ? claim.obligations : [];
  if (!ids.length) { why('CLAIM-NO-OBLIGATIONS', 'the claim names no obligation'); return done(); }
  const unknown = ids.filter(i => typeof i !== 'string' || !ctx.byId.has(i));
  if (unknown.length) { why('UNKNOWN-OBLIGATION', `unknown obligation ids ${JSON.stringify(unknown)} are rejected, never dropped (RULINGS Q42a)`); return done(); }
  const claimed = ids.map(i => ctx.byId.get(i));
  const tree = claim.sourceTreeSha256, comp = isObj(claim.composition) ? claim.composition : {}, commit = claim.commit, rs = Array.isArray(claim.receipts) ? claim.receipts : [];
  const domain = claimed.some(o => o.oracles.includes('O-DOMAIN'));
  const prereq = [PREREQ.position, PREREQ.identity, ...(domain ? [PREREQ.w0] : [])];
  for (const pid of prereq) {
    const o = ctx.byId.get(pid);
    const tries = rs.filter(r => own(r, 'obligation') === pid).map(r => evidenceOk(r, o, tree, comp, commit, env, ctx));
    if (!tries.some(t => t === null)) why('PREREQ-MISSING', `no valid ${pid} receipt for the claim's tree and composition${tries.length ? `: ${[...new Set(tries)].join('; ')}` : ''} (RULINGS Q34d, Q38b, Q42a)`);
  }
  // Q46b, Q47b: the control's identity comes from A0_REGISTRY for the claim's source engine, never from the claim.
  const entry = own(ctx.a0, own(ctx.byEngine, own(own(comp, 'source'), 'engine')));
  if (!entry) why('A0-REGISTRY-NULL', `A0_REGISTRY has no entry for source engine ${own(own(comp, 'source'), 'engine')}; every comparison is a diagnostic until A0 is frozen (RULINGS Q46b, Q47b)`);
  for (const o of claimed) {
    const mine = rs.filter(r => own(r, 'role') === 'measurement' && own(r, 'obligation') === o.id);
    const ownOk = mine.filter(r => evidenceOk(r, o, tree, comp, commit, env, ctx) === null && workloadOk(r.workload, comp, ctx.workloadFields));
    if (!ownOk.length) { why('MEASUREMENT-MISSING', `no valid ${o.id} measurement with a validated workload identity${mine.length ? `: ${mine.map(r => evidenceOk(r, o, tree, comp, commit, env, ctx) ?? 'workload identity missing or invalid (Q47b)').join('; ')}` : ''} (RULINGS Q42a, Q47b)`); continue; }
    if (!entry) continue;
    const theirs = rs.filter(c => own(c, 'role') === 'control' && own(c, 'obligation') === o.id);
    const matched = theirs.filter(c => evidenceOk(c, o, entry.sourceTreeSha256, entry.composition, commit, env, ctx) === null && workloadOk(c.workload, entry.composition, ctx.workloadFields)
      && ownOk.some(m => same(c.workload, m.workload)));
    if (!matched.length) why('CONTROL-UNMATCHED', `no ${o.id} control on the registry's A0 tree and composition whose workload identity equals the measurement's${theirs.length ? `: ${theirs.map(c => evidenceOk(c, o, entry.sourceTreeSha256, entry.composition, commit, env, ctx) ?? 'workload identity missing, invalid or different (Q47b)').join('; ')}` : ''} (RULINGS Q42a, Q47b)`);
  }
  const w0 = ctx.w0;
  if (domain && (Object.values(w0.files ?? {}).some(v => v == null) || w0.reviewReceipt == null || w0.deltaCheck == null || w0.oDomainFingerprint == null)) why('W0-UNPINNED', 'W0 pin, review receipt, delta check or O-DOMAIN fingerprint is null (GATE-W0)');
  for (const x of new Set([...claimed, ...prereq.map(i => ctx.byId.get(i))].flatMap(o => o.oracles))) {
    const pin = own(ctx.pins, x);
    if (pin) {
      const h = pin.sha256;
      if (pin.acceptReceipt == null || h == null || (isObj(h) && Object.values(h).some(v => v == null))) why('ORACLE-UNPINNED', `oracle ${x} has no accepted pin (RULINGS Q37b, Q38b)`);
      else for (const o of claimed) if ((pin.excludes ?? []).includes(o.id)) why('ORACLE-EXCLUDED', `${o.id} is excluded from oracle ${x}'s pin (RULINGS Q45a)`);
    } else if (!ACCEPTED_ORACLE_STATUS.includes(ctx.oracles[x]?.status)) why('ORACLE-UNACCEPTED', `oracle ${x} is ${ctx.oracles[x]?.status ?? 'unknown'} and unpinned`);
  }
  for (const o of claimed) for (const x of o.oracles) for (const [name, ref] of Object.entries(own(ctx.refusals, x) ?? {}))
    if (refusedBy(o, ref, ctx.caseSets)) why('ORACLE-REFUSES', `${o.id} selects cases oracle ${x} refuses, directly or through a broader set (${name}; RULINGS Q45b, Q47c)`);
  return done();
}

// ================================================================ I/O: git and the object store

/** Read-only git access; blob hashes are sha256 of the blob bytes, cached per commit:path. Failures return null. */
export function gitSource(repo) {
  const run = (args, input) => execFileSync('git', ['--literal-pathspecs', ...args], { cwd: repo, input, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'pipe'] });
  const cache = new Map();
  const api = {
    resolve(rev) { if (!str(rev) || rev.startsWith('-')) return null; try { return run(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]).toString().trim() || null; } catch { return null; } },
    treeOf(commit) { return run(['rev-parse', `${commit}^{tree}`]).toString().trim(); },
    commitTime(commit) { return Number(run(['show', '-s', '--format=%ct', commit]).toString().trim()); },
    /** The commit's tracked tree as a tar stream (the fresh checkout qualify builds from; Q55a step 1). */
    archive(commit) { return COMMIT.test(commit) ? run(['archive', '--format=tar', commit]) : null; },
    blob(rev, file) {
      if (!safePath(file)) return null;
      const key = COMMIT.test(rev) ? `blob:${rev}:${file}` : null; // only full commit ids are immutable
      if (key && cache.has(key)) return cache.get(key);
      let bytes = null;
      try { bytes = run(['cat-file', 'blob', `${rev}:${file}`]); } catch { bytes = null; }
      if (key) cache.set(key, bytes);
      return bytes;
    },
    /** Tracked files (blobs) under the given roots (null: the whole tree), sorted; null when a root is unsafe or git fails. */
    list(commit, roots) { const e = api.entries(commit, roots); return e && e.map(x => x.path); },
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
  return api;
}

/** Content-addressed store reader: an object counts only if runs/objects/<sha> exists and its bytes hash to <sha>. */
export function objectStore(dir) {
  const memo = new Map();
  return storeFrom(h => { if (!memo.has(h)) { const file = path.join(dir, h); memo.set(h, fs.existsSync(file) ? fs.readFileSync(file) : null); } return memo.get(h); });
}
/** A store over any byte lookup (a directory, or the dict the contract's fixtures use). */
export function storeFrom(lookup) {
  const get = h => {
    if (!sha(h)) return { ok: false, why: `not a sha256: ${JSON.stringify(h)?.slice(0, 80)}` };
    const bytes = lookup(h);
    if (!bytes) return { ok: false, why: `object ${h} is not in the store` };
    const actual = sha256(bytes);
    return actual === h ? { ok: true, bytes } : { ok: false, why: `object ${h} hashes to ${actual}` };
  };
  return { get, json(h) { const o = get(h); if (!o.ok) return o; try { const v = parseJson(o.bytes); return isObj(v) ? { ok: true, value: v } : { ok: false, why: 'not a JSON object' }; } catch { return { ok: false, why: 'not JSON' }; } } };
}

// ================================================================ layer 2: the lab evaluator

/**
 * The run binding. The harness computes it when the run starts and writes it into the run ledger. Every inline receipt field
 * that decides a role or an eligibility is in it. verifierObjectSha256 is not: the verifier writes it after the run.
 */
export function bindingOf(r) {
  const pick = k => own(r, k);
  const pid = isObj(own(r, 'profileIdentity')) ? Object.fromEntries(Object.entries(r.profileIdentity).filter(([k]) => k !== 'buildProvenanceSha256')) : own(r, 'profileIdentity');
  return sha256(canonText({ ...Object.fromEntries(['receiptId', 'runKind', 'profile', 'role', 'obligation', 'definitionSha256', 'sourceTreeSha256', 'composition', 'commit',
    'producedAt', 'workload', 'contract', 'endpoint', 'admission', 'producer', 'buildManifestSha256', 'executedBinarySha256'].map(k => [k, pick(k)])), profileIdentity: pid }));
}

/**
 * Judge a claim's documents. env = { git: gitSource(repo), objects: objectStore(dir), authorityRef }.
 * Returns { verdict: 'DIAGNOSTIC', documentVerdict: 'QUALIFIED' | 'DIAGNOSTIC', reasons: [{code, detail, receipt?}] }.
 * The verdict is DIAGNOSTIC for every input (RULINGS Q55a: records a claimant supplies are diagnostic evidence only);
 * documentVerdict is what the document checks found, and is QUALIFIED only when none of them found a reason.
 */
export function admitClaim(claim, env) {
  const reasons = [];
  const why = (code, detail, receipt) => reasons.push(receipt ? { code, detail, receipt } : { code, detail });
  try { evaluate(claim, env, why); } catch (error) { why('EVALUATOR-ERROR', `evaluation stopped: ${error?.message ?? error} (fail closed)`); }
  return { verdict: 'DIAGNOSTIC', documentVerdict: reasons.length ? 'DIAGNOSTIC' : 'QUALIFIED',
    reasons: [{ code: 'DOCUMENT-ONLY', detail: 'a claim\'s supplied receipts and records are diagnostic evidence only; QUALIFIED comes only from claim.mjs qualify, a run the evaluator executes itself (RULINGS Q55a; Codex round 7 findings 1 and 2)' }, ...summarise(reasons)] };
}

function evaluate(claim, env, why) {
  const { git, objects } = env;
  const authorityRef = env.authorityRef ?? 'main';
  if (!isObj(claim) || claim.format !== FORMATS.claim) return why('CLAIM-FORMAT', `claim format must be ${FORMATS.claim}`);
  if (!['comparative', 'promotion'].includes(claim.kind)) why('CLAIM-KIND', 'kind must be comparative or promotion');
  const commit = str(claim.commit) && COMMIT.test(claim.commit) ? git.resolve(claim.commit) : null;
  if (!commit || commit !== claim.commit) return why('CLAIM-COMMIT', `commit ${JSON.stringify(claim.commit)} is not a full commit id in this repository`);
  const label = c => sourceTreeIdOf(git.treeOf(c));
  const claimLabel = label(commit);
  const closureTime = git.commitTime(commit); // dependencyClosureChangedAt: no file at the claimed commit changed after it was committed

  // -- the contract: from the claimed commit, byte-equal to the authority ref's (VA6). Why: pins, definitions, schemas and
  // the A0 registry decide admission; a branch or a working copy must not supply its own.
  const contractBytes = git.blob(commit, PATHS.contract), loadBytes = git.blob(commit, PATHS.loadContract);
  if (!contractBytes || !loadBytes) return why('CONTRACT-MISSING', `${PATHS.contract} or ${PATHS.loadContract} is missing at ${commit}`);
  const authority = git.resolve(authorityRef);
  if (!authority) why('CONTRACT-AUTHORITY', `authority ref ${authorityRef} does not resolve`);
  else for (const [file, bytes] of [[PATHS.contract, contractBytes], [PATHS.loadContract, loadBytes]]) {
    const theirs = git.blob(authority, file);
    if (!theirs || !theirs.equals(bytes)) why('CONTRACT-NOT-AUTHORITY', `${file} at the claimed commit differs from ${authorityRef} (VA6)`);
  }
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const loadContract = JSON.parse(loadBytes.toString('utf8'));
  const slots = (() => { const b = authority && git.blob(authority, PATHS.slots); try { return b ? JSON.parse(b.toString('utf8')) : null; } catch { return null; } })();
  const ctx = coreContext(contract);

  // -- layer 1: the reference model on what I/O found.
  const core = admitCore(claim, { store: objects, dependencyClosureChangedAt: closureTime }, ctx);
  for (const r of core.reasons) why(r.code, r.detail);

  // -- layer 2: the lab's VA rules.
  if (claim.sourceTreeSha256 !== claimLabel) why('CLAIM-SOURCE-LABEL', `sourceTreeSha256 ${claim.sourceTreeSha256} is not the clean label ${claimLabel} of ${commit} (a dirty-tree label can never be bound)`);
  const comp = claim.composition;
  const bound = c => boundComposition(c, ctx.assignments);
  if (!bound(comp)) why('COMPOSITION-UNBOUND', 'the claim composition must bind four assignments with string engine, imageDigest, configSha256 (sha256) and slot (VA14; red-team pass 1)');
  const entryId = own(ctx.byEngine, own(own(comp, 'source'), 'engine'));
  const entry = own(ctx.a0, entryId);
  let a0Commit = null;
  if (entry) {
    a0Commit = str(entry.commit) && COMMIT.test(entry.commit) ? git.resolve(entry.commit) : null;
    if (a0Commit !== entry.commit || label(a0Commit) !== entry.sourceTreeSha256) why('A0-REGISTRY', `${entryId}: commit ${entry.commit} does not resolve here or its clean label is not ${entry.sourceTreeSha256}`);
    if (!bound(entry.composition)) why('A0-REGISTRY', `${entryId} composition is not fully bound`);
    if (same(entry.composition, comp)) why('CONTROL-IS-CANDIDATE', 'the claimed composition is the A0 control itself');
  }
  // VA4: every assignment runs the pinned image (lab/config/slots.json at the authority ref; the contract pins no images).
  for (const [side, c] of [['claim', comp], ['A0', entry?.composition]]) if (bound(c)) for (const p of imageProblems(c, slots, ctx.assignments)) why('IMAGE-NOT-PINNED', `${side} ${p} (VA4)`);
  // VA6: pinned oracle and W0 files still hash to their pins at the claimed commit.
  const claimed = (Array.isArray(claim.obligations) ? claim.obligations : []).map(i => ctx.byId.get(i)).filter(Boolean);
  const domain = claimed.some(o => o.oracles.includes('O-DOMAIN'));
  const prereqIds = [PREREQ.position, PREREQ.identity, ...(domain ? [PREREQ.w0] : [])];
  const used = [...claimed, ...prereqIds.map(i => ctx.byId.get(i))];
  const checkPinnedFiles = (what, map, code) => { for (const p of pinnedFileProblems(git, commit, map)) why(code, `${what} at the claimed commit: ${p}`); };
  for (const x of new Set(used.flatMap(o => o.oracles))) {
    const pin = own(ctx.pins, x);
    if (pin?.acceptReceipt != null && pin.sha256 != null) checkPinnedFiles(`oracle ${x}`, isObj(pin.sha256) ? pin.sha256 : { [String(pin.files).replace(/\*+$/, '')]: pin.sha256 }, 'ORACLE-FILES');
  }
  if (domain && isObj(ctx.w0.files) && !Object.values(ctx.w0.files).some(v => v == null)) checkPinnedFiles('W0', ctx.w0.files, 'W0-FILES');

  // ACCEPTANCE 5.3, Q47c: every set a used obligation selects has a pinned manifest at the claimed commit; each select entry
  // resolves to the manifest's cases, and every resolved case must be covered by a case record of that selection.
  const manifests = new Map();
  for (const name of new Set(used.flatMap(o => o.cases.map(c => c.set)))) {
    const cs = contract.caseSets?.[name];
    if (!cs || !safePath(cs.manifest) || !sha(cs.manifestSha256)) { why('SELECTION-UNRESOLVED', `case set ${name} has no pinned manifest (manifestSha256 ${cs?.manifestSha256 ?? 'null'}; ACCEPTANCE 5.3)`); continue; }
    const bytes = git.blob(commit, cs.manifest);
    let m = null;
    try { m = bytes && sha256(bytes) === cs.manifestSha256 ? JSON.parse(bytes.toString('utf8')) : null; } catch { m = null; }
    if (!isObj(m) || m.set !== name || !Array.isArray(m.cases) || !m.cases.every(c => isObj(c) && str(c.id) && Array.isArray(c.tags) && c.tags.every(str)) || new Set(m.cases.map(c => c.id)).size !== m.cases.length
      || (cs.requiredCases ?? []).some(id => !m.cases.some(c => c.id === id))) { why('CASE-MANIFEST', `${cs.manifest} at the claimed commit is not the pinned, complete manifest of ${name}`); continue; }
    manifests.set(name, m);
  }
  const resolved = o => o.cases.flatMap(sel => sel.select.flatMap(t => {
    const m = manifests.get(sel.set);
    const hits = !m ? [] : m.cases.filter(c => t === 'all' || c.id === t || c.tags.includes(t));
    return (o.id === PREREQ.position || !hits.length ? [{ id: t, selection: t }] : hits.map(c => ({ id: c.id, selection: t })));
  }));

  // -- every receipt the claim carries must verify, in its role (the reference accepts the first valid one; B11).
  const receipts = Array.isArray(claim.receipts) ? claim.receipts : [];
  const sides = { candidate: { tree: claimLabel, comp, code: commit }, A0: entry ? { tree: entry.sourceTreeSha256, comp: entry.composition, code: a0Commit } : null };
  const ids = new Set();
  const roles = [];
  for (const [i, r] of receipts.entries()) {
    const rid = str(own(r, 'receiptId')) ? r.receiptId : `#${i}`;
    const bad = (code, detail) => why(code, detail, rid);
    if (!isObj(r) || r.format !== FORMATS.receipt) { bad('RECEIPT-FORMAT', `receipt format must be ${FORMATS.receipt}`); continue; }
    if (!str(r.receiptId) || ids.has(r.receiptId)) { bad('RECEIPT-ID', 'receiptId missing or repeated'); continue; }
    ids.add(r.receiptId);
    const o = ctx.byId.get(r.obligation);
    const side = sides.candidate && same(r.composition, sides.candidate.comp) && r.sourceTreeSha256 === sides.candidate.tree ? 'candidate'
      : sides.A0 && same(r.composition, sides.A0.comp) && r.sourceTreeSha256 === sides.A0.tree ? 'A0' : null;
    const role = !o || !side ? null : r.role === 'measurement' && side === 'candidate' && claimed.includes(o) ? 'measurement'
      : r.role === 'control' && side === 'A0' && claimed.includes(o) ? 'control' : (r.role === 'prerequisite' || r.role == null) && prereqIds.includes(o.id) && (o.id !== PREREQ.w0 || side === 'candidate') ? 'prerequisite' : null;
    if (!role) { bad('RECEIPT-UNUSED', `receipt for ${r.obligation} as ${r.role} on ${side ?? 'an unknown tree or composition'} is not evidence for this claim`); continue; }
    roles.push({ r, role, side });
    const s = sides[side];
    const e = evidenceOk(r, o, s.tree, s.comp, commit, { store: objects, dependencyClosureChangedAt: closureTime }, ctx);
    if (e) bad('RECEIPT-INVALID', `${o.id} ${role}: ${e}`);
    if ((role === 'measurement' || role === 'control') && !workloadOk(r.workload, s.comp, ctx.workloadFields)) bad('WORKLOAD-IDENTITY', 'workload identity missing, untyped or not the source slot (RULINGS Q47b)');
    verifyLab(r, o, role, s, bad);
  }
  // GATE-POSITION "A0 included" (Q38a): the A0 composition needs its own prerequisites (lab; the reference checks the claim's).
  if (entry) for (const pid of [PREREQ.position, PREREQ.identity]) if (!roles.some(x => x.role === 'prerequisite' && x.side === 'A0' && x.r.obligation === pid))
    why('PREREQ-MISSING', `no ${pid} receipt for the A0 composition (GATE-POSITION "A0 included", RULINGS Q38a)`);
  // Matched controls also share the profile (red-team pass 2 finding 6).
  for (const o of claimed) {
    const ms = roles.filter(x => x.role === 'measurement' && x.r.obligation === o.id), cs = roles.filter(x => x.role === 'control' && x.r.obligation === o.id);
    if (ms.length && cs.length && !ms.every(m => cs.some(c => same(c.r.workload, m.r.workload) && c.r.profile === m.r.profile))) why('CONTROL-UNMATCHED', `${o.id}: a measurement has no control with the same workload identity and profile (RULINGS Q47b)`);
  }

  // ---------------------------------------------------------------- the lab's checks of one receipt
  function verifyLab(r, o, role, s, bad) {
    const promo = claim.kind === 'promotion';
    // VA6 / CX-STALE-DEFINITION: produced under this contract.
    if (own(r.contract, 'version') !== contract.version || own(r.contract, 'transitiveSha256') !== contract.transitiveContractSha256) bad('RECEIPT-CONTRACT', `contract ${own(r.contract, 'version')} is not ${contract.version}/${contract.transitiveContractSha256} (VA6)`);
    // VA1, B7, B8, VA16: producer, run kind by role, a profile the obligation declares (screening only for comparisons).
    const prod = own(r, 'producer');
    if (!str(own(prod, 'tool')) || !prod.tool.startsWith('lab/bin/') || !str(own(prod, 'agentId')) || !strList(own(prod, 'authorsOfCodeUnderTest'))) bad('RECEIPT-PRODUCER', 'producer needs a lab/bin tool, an agentId and authorsOfCodeUnderTest (VA1, VV1)');
    const kinds = role === 'prerequisite' || promo ? ['acceptance'] : role === 'measurement' ? ['acceptance', 'candidate'] : ['acceptance', 'control'];
    if (!kinds.includes(r.runKind)) bad('RECEIPT-RUN-KIND', `runKind ${r.runKind} cannot serve as ${role} in a ${claim.kind} claim (allowed: ${kinds.join(', ')}; B7)`);
    const screening = (contract.screeningProfiles ?? []).includes(r.profile);
    if (!(o.profiles.includes(r.profile) || (screening && !promo && role !== 'prerequisite'))) bad(screening ? 'RECEIPT-SCREENING' : 'RECEIPT-PROFILE', `profile ${JSON.stringify(r.profile)} cannot serve ${o.id} as ${role} (declared ${o.profiles.join(', ')}; VA16, RULINGS Q34d)`);
    // VV1: the verifier named in the verifier record is not an author or the producer.
    const vr = objects.json(r.verifierObjectSha256);
    const authors = (own(prod, 'authorsOfCodeUnderTest') ?? []).map(agentKey);
    if (vr.ok && (authors.includes(agentKey(vr.value.verifier)) || agentKey(vr.value.verifier) === agentKey(own(prod, 'agentId')))) bad('VERIFIER-NOT-INDEPENDENT', `verifier ${vr.value.verifier} authored or produced this run (VV1)`);
    // VA5, VA10, VA8: endpoint, admission, counts.
    const forbidden = slots?.forbiddenPorts ?? [15442, 17019];
    const port = u => { try { const x = new URL(u); return Number(x.port || (x.protocol === 'https:' ? 443 : 80)); } catch { return null; } };
    if (!isObj(r.endpoint) || !strList(r.endpoint.contacted) || !same(r.endpoint.contacted, r.endpoint.expected) || r.endpoint.contacted.map(port).some(p => p == null || forbidden.includes(p))) bad('RECEIPT-ENDPOINT', `endpoint.contacted must equal endpoint.expected and avoid ports ${forbidden.join(', ')} (VA5)`);
    if (!isObj(r.admission) || !str(r.admission.reservationId) || r.admission.status !== 'ADMITTED') bad('RECEIPT-ADMISSION', 'admission must record a reservation with status ADMITTED (VA10)');
    const c = own(r, 'counts') ?? {};
    const caseResults = Array.isArray(r.caseResults) ? r.caseResults : [];
    if (c.executed !== caseResults.length || c.declared !== caseResults.length || ['skipped', 'unsupported', 'notImplemented', 'unexpectedErrors'].some(k => c[k] !== 0)) bad('RECEIPT-COUNTS', 'counts must show declared = executed = the case records, and zero skipped, unsupported, notImplemented and unexpectedErrors (VA8)');
    // The run ledger binds the run fields to what the run recorded (red-team passes 1 and 2).
    const led = objects.json(r.ledgerSha256);
    const L = led.ok ? led.value : null;
    const key = list => (Array.isArray(list) ? list : []).map(x => canonText(x)).sort();
    if (!L || L.schema !== FORMATS.ledger || L.binding !== bindingOf(r)) bad('LEDGER', `run ledger ${r.ledgerSha256} is missing or belongs to another run, or the receipt was edited after its run`);
    else if (!same(key(L.caseResults), key(caseResults)) || !same(L.counts, r.counts) || !same(L.modes, r.modes) || L.faultReps !== r.faultReps || !same([...(L.objects ?? [])].sort(), [...new Set([r.buildManifestSha256, r.executedBinarySha256, own(own(r, 'profileIdentity'), 'buildProvenanceSha256'), ...caseResults.map(x => own(x, 'objectSha256'))])].sort()))
      bad('LEDGER-MISMATCH', 'case records, counts, modes, fault repetitions or objects differ from what the run recorded in its ledger (evidence removed, added or edited after the run)');
    // VA15 (proposal): the workload's trace is the frozen one of load-contract.json.
    if (role === 'measurement' || role === 'control') {
      const frozen = loadContract.writerTrace?.generator?.frozen, w = own(r, 'workload');
      if (!isObj(frozen)) bad('TRACE-NOT-FROZEN', `${PATHS.loadContract} pins no frozen trace (writerTrace.generator.frozen {sha256, seed, offerScheduleSha256}); VA15 cannot hold`);
      else if (own(w, 'generatorSourceSha256') !== frozen.sha256 || own(w, 'seed') !== frozen.seed || own(w, 'offerScheduleSha256') !== frozen.offerScheduleSha256) bad('TRACE-NOT-FROZEN', 'the workload is not the frozen trace generator, seed and offer schedule (VA15, CX-NS-UNFROZEN-TRACE)');
    }
    // ACCEPTANCE 5.3, Q47c: every case the pinned manifest resolves is covered by a case record of its selection.
    const have = new Set(caseResults.map(x => `${own(x, 'case')}\u0000${own(x, 'selection')}`));
    const missing = resolved(o).filter(x => !have.has(`${x.id}\u0000${x.selection}`));
    if (missing.length) bad('CASES-MISSING', `${o.id} lacks case records for ${missing.length} resolved case(s): ${missing.slice(0, 5).map(x => `${x.selection}:${x.id}`).join(', ')} (ACCEPTANCE 5.3, Q47c)`);
    verifyProvenance(r, s, bad);
  }

  // The build provenance record (lab; proposed for the build-manifest/1 schema in 0.3.8): where each executed module came from.
  function verifyProvenance(r, s, bad) {
    const p = objects.json(own(own(r, 'profileIdentity'), 'buildProvenanceSha256'));
    const man = objects.json(r.buildManifestSha256);
    if (!p.ok || p.value.schema !== FORMATS.provenance || p.value.binding !== bindingOf(r) || p.value.manifestSha256 !== r.buildManifestSha256 || !man.ok) return bad('PROVENANCE', 'no build-provenance record of this run for its build manifest');
    const P = p.value, modules = Array.isArray(man.value.modules) ? man.value.modules : [];
    const origins = Array.isArray(P.origins) ? P.origins : [];
    if (!same(origins.map(x => own(x, 'path')).sort(), modules.map(x => own(x, 'path')).sort()) || !origins.every(x => isObj(x) && safePath(x.path))) return bad('PROVENANCE', 'provenance must give a safe origin for exactly the manifest\'s modules');
    const shaOf = new Map(modules.map(x => [x.path, x.sha256]));
    const codeCommit = s.code, harness = commit;
    const pkgFiles = (git.list(codeCommit, null) ?? []).filter(f => /(^|\/)package\.json$/.test(f) && !f.split('/').includes('node_modules'));
    const names = pkgFiles.map(f => { try { return JSON.parse(git.blob(codeCommit, f)?.toString('utf8') ?? '{}').name; } catch { return null; } }).filter(str).map(n => n.toLowerCase());
    const lockText = git.blob(codeCommit, PATHS.lockfile)?.toString('utf8') ?? '';
    const builds = Array.isArray(P.builds) ? P.builds.filter(isObj) : [];
    const codeHashes = git.blobHashes(codeCommit, [...origins.filter(x => x.origin === 'tree').map(x => x.path), ...builds.flatMap(b => (Array.isArray(b.inputs) ? b.inputs : []).map(x => own(x, 'path')))]);
    const harnessHashes = git.blobHashes(harness, origins.filter(x => x.origin === 'harness').map(x => x.path));
    for (const x of origins) {
      const h = shaOf.get(x.path);
      if (x.origin === 'tree') { if (codeHashes.get(x.path) !== h) bad('MODULE-STALE', `executed ${x.path} ${h} is not ${codeCommit}'s blob (${codeHashes.get(x.path)})`); }
      else if (x.origin === 'harness') { if (!x.path.startsWith('lab/') || harnessHashes.get(x.path) !== h) bad('MODULE-STALE', `harness module ${x.path} ${h} is not the claimed commit's lab file`); }
      else if (x.origin === 'build') { const b = builds.find(y => y.id === x.build); if (!b || !(Array.isArray(b.outputs) ? b.outputs : []).some(y => isObj(y) && y.path === x.path && y.sha256 === h)) bad('MODULE-NOT-BUILT', `executed ${x.path} is not an output of build ${x.build}`); }
      else if (x.origin === 'dependency') {
        // Third-party code only: the package after the last node_modules is listed in the lockfile and is not first-party
        // under any spelling (case-insensitive; pnpm's .pnpm/<scope+name>@version form included) (red-team passes 1 and 2).
        const seg = x.path.split('/'), at = seg.lastIndexOf('node_modules');
        const name = at >= 0 && seg[at + 1] ? (seg[at + 1].startsWith('@') ? `${seg[at + 1]}/${seg[at + 2] ?? ''}` : seg[at + 1]) : '';
        const firstParty = names.includes(name.toLowerCase()) || seg.some(q => names.some(n => q.toLowerCase().startsWith(`${n.replace('/', '+')}@`) || q.toLowerCase() === n.replace('/', '+')));
        const listed = str(name) && new RegExp(`^\\s+'?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@`, 'm').test(lockText);
        if (seg[0] !== 'node_modules' || firstParty || !listed) bad('DEPENDENCY-UNBOUND', `${x.path} is not a third-party package listed in ${codeCommit}'s lockfile`);
      } else bad('MODULE-ORIGIN', `${x.path} has origin ${JSON.stringify(x.origin)}; allowed: tree, harness, build, dependency`);
    }
    for (const b of builds) {
      // A build compiles one whole workspace package from all its tracked files and writes only under its dist/ (an omitted or
      // narrowed input set is how an older file slips into a "current" build).
      const pkg = b.package, inputs = Array.isArray(b.inputs) ? b.inputs : [];
      if (!safePath(pkg) || !pkgFiles.includes(`${pkg}/package.json`) || !same(b.sourceRoots, [pkg])) { bad('BUILD-ROOTS', `build ${b.id} must compile a whole workspace package (sourceRoots [package])`); continue; }
      const entries = git.entries(codeCommit, [pkg]) ?? [];
      const listed = entries.map(e => e.path), paths = inputs.map(x => own(x, 'path'));
      for (const e of entries) if (e.mode === '120000') bad('BUILD-INPUT-SYMLINK', `build ${b.id} input ${e.path} is a symlink; its target is not bound`);
      const miss = listed.filter(f => !paths.includes(f)), extra = paths.filter(f => !listed.includes(f));
      if (miss.length || extra.length) bad('BUILD-INPUTS-INCOMPLETE', `build ${b.id} inputs differ from the tracked files under ${pkg}: missing ${miss.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'}`);
      for (const x of inputs) if (listed.includes(own(x, 'path')) && codeHashes.get(x.path) !== x.sha256) bad('BUILD-INPUT-STALE', `build ${b.id} was built from ${x.path} ${x.sha256}, ${codeCommit} has ${codeHashes.get(x.path)} (a stale binary under the claim's source label)`);
      for (const y of Array.isArray(b.outputs) ? b.outputs : []) if (!isObj(y) || !safePath(y.path) || !y.path.startsWith(`${pkg}/dist/`)) bad('BUILD-OUTPUTS', `build ${b.id} output ${own(y, 'path')} is outside ${pkg}/dist/`);
    }
  }
}

// ================================================================ qualification: a run, not a document (RULINGS Q55a)

export const QUALIFY = { build: 'lab/config/build.json', gate: path.join(import.meta.dirname, 'gate.mjs') };
/** How an oracle is invoked when the contract does not say (contract 0.3.7 has no invocation field; proposed for 0.3.8 as
 * oracleRunners). {case} is the pinned input's path, {mode} the mode. O-REPLAY's CLI is lab/oracles/replay/cli.py. */
export const DEFAULT_ORACLE_RUNNERS = { 'O-REPLAY': { argv: ['python3', '-I', 'lab/oracles/replay/cli.py', '{case}'] } };
/** Reasons that only say the run was not on the gate; offlineVerdict is the verdict without them. */
const NOT_ON_GATE = new Set(['GATE-NOT-RUN', 'RUN-NOT-ON-GATE']);
/** Reasons admitCore gives from the contract alone (no receipt needed): kept from a core pass over no receipts. */
const STATIC_CORE = new Set(['A0-REGISTRY-NULL', 'W0-UNPINNED', 'ORACLE-UNPINNED', 'ORACLE-EXCLUDED', 'ORACLE-UNACCEPTED', 'ORACLE-REFUSES']);
const CLAIM_FIELDS = ['format', 'claimId', 'kind', 'obligations', 'commit', 'sourceTreeSha256', 'composition'];
/** A child process sees no user configuration and no credentials: only PATH, a HOME inside the work directory and a locale. */
const childEnv = home => ({ PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: home, LANG: 'C.UTF-8', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });
const trimNl = b => b.length && b[b.length - 1] === 10 ? b.subarray(0, b.length - 1) : b;
const fill = (argv, vars) => argv.map(a => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), a));

/** A content-addressed directory the evaluator writes its own records into; returns put(bytes | string | value) -> sha256. */
function writeStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return value => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    const h = sha256(bytes), file = path.join(dir, h);
    if (!fs.existsSync(file)) fs.writeFileSync(file, bytes);
    return h;
  };
}

/** Paths where a checkout differs from its commit's tree: every tracked blob must be present with its bytes (a symlink with its
 * target text) and nothing else may be there. Why: git archive applies the tree's own .gitattributes (export-ignore,
 * export-subst), so a candidate could make the archive it is built from differ from the tree its label names. */
function checkoutProblems(git, commit, dir) {
  const entries = git.entries(commit, null) ?? [];
  const want = git.blobHashes(commit, entries.map(e => e.path));
  const out = entries.filter(e => {
    const abs = path.join(dir, e.path);
    try { const st = fs.lstatSync(abs); return (st.isSymbolicLink() ? sha256(Buffer.from(fs.readlinkSync(abs))) : st.isFile() ? sha256(fs.readFileSync(abs)) : null) !== want.get(e.path); } catch { return true; }
  }).map(e => e.path);
  const tracked = new Set(entries.map(e => e.path));
  for (const d of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    const p = path.relative(dir, path.join(d.parentPath ?? d.path, d.name)).split(path.sep).join('/');
    if (!d.isDirectory() && !tracked.has(p)) out.push(p);
  }
  return out;
}
/** Built modules whose bytes no longer hash to the build manifest (an earlier process edited them). */
const tamperedModules = s => s.build.modules.filter(m => { try { return sha256(fs.readFileSync(path.join(s.dir, m.path))) !== m.sha256; } catch { return true; } }).map(m => m.path);

/** The offline stand-in for step 3: the evaluator-built system under test run locally with the build spec's run argv. Its
 * observations make the run DIAGNOSTIC (RUN-NOT-ON-GATE) whatever they show; it exists so steps 1, 2 and 4 are testable. */
export function localSut(spec) {
  return ({ dir, casePath, mode }) => {
    const r = spawnSync(...(a => [a[0], a.slice(1)])(fill(spec.run, { case: casePath, mode })), { cwd: dir, env: childEnv(dir), timeout: 120_000, maxBuffer: 1 << 28 });
    return { exit: r.status ?? -1, stdout: r.stdout ?? Buffer.alloc(0), stderr: r.stderr ?? Buffer.alloc(0) };
  };
}

/** Step 3 as far as it exists: gate.mjs OBL --dry-run checks the lane and the registered slot and echoes the plan. */
export function gateDryRun(workDir) {
  return plan => {
    const file = path.join(workDir, 'gate-plan.json');
    fs.writeFileSync(file, JSON.stringify(plan, null, 2) + '\n');
    const r = spawnSync(process.execPath, [QUALIFY.gate, 'OBL', '--lane', String(plan.lane), '--slot', String(plan.slot), '--dry-run', '--plan', file], { encoding: 'utf8', timeout: 60_000 });
    let out = null;
    try { out = JSON.parse(r.stdout); } catch { out = null; }
    return r.status === 0 && isObj(out) ? { ok: true, ...out } : { ok: false, error: `${r.stderr || r.stdout}`.trim().slice(0, 400) };
  };
}

/**
 * Qualify a claim by running it (RULINGS Q55a). env = { git: gitSource(repo), authorityRef, workDir, now (seconds),
 * sut?: localSut(spec) for an offline run, gate?: (plan) -> result (default gateDryRun) }.
 * Returns { verdict, offlineVerdict, reasons, run }: verdict is QUALIFIED only from a run whose system under test ran through
 * an executing gate, which does not exist yet, so it is DIAGNOSTIC today; offlineVerdict (offline runs only) is the verdict
 * the run would reach if the local observations had come from the gate. run records the builds, every case, the gate plan,
 * the evaluator's object store and the receipts it assembled.
 */
export function qualifyClaim(claim, env) {
  const reasons = [];
  const why = (code, detail, receipt) => reasons.push(receipt ? { code, detail, receipt } : { code, detail });
  const run = { offline: typeof env.sut === 'function', ignored: [], builds: {}, cases: [], gate: null, objects: null, receipts: null };
  try { runQualification(claim, env, why, run); } catch (error) { why('EVALUATOR-ERROR', `qualification stopped: ${error?.message ?? error} (fail closed)`); }
  const blocking = reasons.filter(r => !NOT_ON_GATE.has(r.code));
  return { verdict: reasons.length ? 'DIAGNOSTIC' : 'QUALIFIED', offlineVerdict: run.offline ? (blocking.length ? 'DIAGNOSTIC' : 'QUALIFIED') : null, reasons: summarise(reasons), run };
}

function runQualification(claim, env, why, run) {
  const { git } = env;
  const authorityRef = env.authorityRef ?? 'main';
  const now = Number.isSafeInteger(env.now) ? env.now : Math.floor(Date.now() / 1000);
  if (!isObj(claim) || claim.format !== FORMATS.claim) return why('CLAIM-FORMAT', `claim format must be ${FORMATS.claim}`);
  // Q55a: the claimant states only what to run. Receipts, records, selections, case lists, a control, a verifier record, a W0
  // pin or an O-DOMAIN fingerprint (Q55e) in the claim are never read; they are listed so nobody believes they counted.
  run.ignored = Object.keys(claim).filter(k => !CLAIM_FIELDS.includes(k));
  if (!['comparative', 'promotion'].includes(claim.kind)) why('CLAIM-KIND', 'kind must be comparative or promotion');
  const commit = str(claim.commit) && COMMIT.test(claim.commit) ? git.resolve(claim.commit) : null;
  if (!commit || commit !== claim.commit) return why('CLAIM-COMMIT', `commit ${JSON.stringify(claim.commit)} is not a full commit id in this repository`);

  // -- the contract, the build spec and the slots: the authority's reviewed versions, never the claimed commit's or the working
  // tree's (VA6). Q55a: the A0 and verifier registries are entries a reviewed contract version adds, so the authority (not the
  // candidate branch) holds them; the candidate's tree is only what is built and measured.
  const authority = git.resolve(authorityRef);
  if (!authority) return why('CONTRACT-AUTHORITY', `authority ref ${authorityRef} does not resolve`);
  const readJson = (c, f) => { const b = git.blob(c, f); try { return b ? JSON.parse(b.toString('utf8')) : null; } catch { return null; } };
  const contract = readJson(authority, PATHS.contract), loadContract = readJson(authority, PATHS.loadContract), slots = readJson(authority, PATHS.slots), spec = readJson(authority, QUALIFY.build);
  if (!isObj(contract) || !isObj(loadContract)) return why('CONTRACT-MISSING', `${PATHS.contract} or ${PATHS.loadContract} is missing or unreadable at ${authorityRef}`);
  const ctx = coreContext(contract);
  const ids = Array.isArray(claim.obligations) ? claim.obligations : [];
  if (!ids.length || ids.some(i => typeof i !== 'string' || !ctx.byId.has(i))) return why('UNKNOWN-OBLIGATION', `obligations ${JSON.stringify(claim.obligations)} must be a nonempty list of contract ids (RULINGS Q42a)`);
  const claimed = [...new Set(ids)].map(i => ctx.byId.get(i));
  const label = sourceTreeIdOf(git.treeOf(commit));
  if (claim.sourceTreeSha256 !== label) why('CLAIM-SOURCE-LABEL', `sourceTreeSha256 ${claim.sourceTreeSha256} is not the clean label ${label} of ${commit}`);
  const comp = claim.composition;
  if (!boundComposition(comp, ctx.assignments)) return why('COMPOSITION-UNBOUND', 'the claim composition must bind four assignments with string engine, imageDigest, configSha256 (sha256) and slot (VA14)');
  for (const p of imageProblems(comp, slots, ctx.assignments)) why('IMAGE-NOT-PINNED', `candidate ${p} (VA4)`);

  // -- the control: A0 from the registry entry for the claim's source engine, built from its own commit (Q46b, Q47b, Q55a step 1).
  const entryId = own(ctx.byEngine, comp.source.engine), entry = own(ctx.a0, entryId);
  const sides = [{ side: 'candidate', commit, label, comp, role: 'measurement', prereqs: null }];
  if (!entry) why('A0-REGISTRY-NULL', `A0_REGISTRY has no entry for source engine ${comp.source.engine}; every comparison is a diagnostic until A0 is frozen (RULINGS Q46b, Q47b)`);
  else {
    const a0Commit = str(entry.commit) && COMMIT.test(entry.commit) ? git.resolve(entry.commit) : null;
    if (a0Commit !== entry.commit || sourceTreeIdOf(git.treeOf(a0Commit)) !== entry.sourceTreeSha256) why('A0-REGISTRY', `${entryId}: commit ${entry.commit} does not resolve here or its clean label is not ${entry.sourceTreeSha256}`);
    else if (!boundComposition(entry.composition, ctx.assignments)) why('A0-REGISTRY', `${entryId} composition is not fully bound`);
    else if (same(entry.composition, comp)) why('CONTROL-IS-CANDIDATE', 'the claimed composition is the A0 control itself');
    else {
      for (const p of imageProblems(entry.composition, slots, ctx.assignments)) why('IMAGE-NOT-PINNED', `A0 ${p} (VA4)`);
      sides.push({ side: 'A0', commit: a0Commit, label: entry.sourceTreeSha256, comp: entry.composition, role: 'control', verifier: `${entryId} (${entry.measuredBy})` });
    }
  }
  // -- independent verification (Q55a step 5): only a VERIFIER_REGISTRY entry of the authority's contract for this commit counts.
  const vreg = own(own(contract, 'verifierRegistry'), 'entries');
  const ventry = Array.isArray(vreg) ? vreg.find(v => isObj(v) && v.commit === commit && v.verdict === 'ACCEPT' && str(v.verifier) && sha(v.briefSha256) && str(v.branch)) : null;
  if (!Array.isArray(vreg)) why('VERIFIER-REGISTRY-ABSENT', `${PATHS.contract} at ${authorityRef} has no verifierRegistry.entries; no verification can count (RULINGS Q55a; proposed for contract 0.3.8)`);
  else if (!ventry) why('VERIFIER-UNREGISTERED', `no VERIFIER_REGISTRY entry (verifier, briefSha256, branch, commit, verdict ACCEPT) for ${commit} (RULINGS Q55a)`);
  sides[0].verifier = ventry?.verifier ?? null;

  // -- the obligations each side runs: the claimed ones, and the prerequisites (GATE-POSITION covers A0 too, Q38a).
  const domain = claimed.some(o => o.oracles.includes('O-DOMAIN'));
  const prereqIds = [PREREQ.position, PREREQ.identity, ...(domain ? [PREREQ.w0] : [])];
  sides[0].prereqs = prereqIds;
  if (sides[1]) sides[1].prereqs = [PREREQ.position, PREREQ.identity];

  // -- step 1: build every side from a fresh archive of its commit with the authority's build spec; record our own hashes.
  if (!isObj(spec) || !strList(spec.argv) || !Array.isArray(spec.outputs) || !spec.outputs.length || !spec.outputs.every(safePath) || !strList(spec.run))
    return why('BUILD-SPEC', `${QUALIFY.build} at ${authorityRef} must give argv, outputs (relative paths) and run (the system under test's argv); proposed for the contract in 0.3.8`);
  fs.mkdirSync(env.workDir, { recursive: true });
  const objectsDir = path.join(env.workDir, 'objects');
  const put = writeStore(objectsDir);
  run.objects = objectsDir;
  for (const s of sides) {
    s.dir = path.join(env.workDir, 'checkouts', `${s.side}-${s.commit.slice(0, 12)}`);
    fs.rmSync(s.dir, { recursive: true, force: true });
    fs.mkdirSync(s.dir, { recursive: true });
    execFileSync('tar', ['-x', '-f', '-', '-C', s.dir], { input: git.archive(s.commit), maxBuffer: 1 << 30 });
    const differ = checkoutProblems(git, s.commit, s.dir);
    if (differ.length) { why('CHECKOUT-MISMATCH', `${s.side} ${s.commit}: the archive differs from the tree at ${differ.slice(0, 5).join(', ')} (export-ignore or export-subst attributes?)`); s.build = null; continue; }
    const b = spawnSync(spec.argv[0], spec.argv.slice(1), { cwd: s.dir, env: childEnv(s.dir), timeout: 900_000, maxBuffer: 1 << 28, encoding: 'utf8' });
    if (b.status !== 0) { why('BUILD-FAILED', `${s.side} ${s.commit}: ${spec.argv.join(' ')} exited ${b.status ?? b.signal}: ${`${b.stderr}`.trim().slice(-300)}`); s.build = null; continue; }
    const files = [];
    for (const out of spec.outputs) {
      const abs = path.join(s.dir, out);
      if (!fs.existsSync(abs)) { why('BUILD-OUTPUTS', `${s.side}: build output ${out} was not produced`); continue; }
      for (const e of fs.statSync(abs).isDirectory() ? fs.readdirSync(abs, { recursive: true, withFileTypes: true }).map(d => path.join(d.parentPath ?? d.path, d.name)) : [abs]) {
        const st = fs.lstatSync(e);
        if (st.isSymbolicLink()) why('BUILD-OUTPUTS', `${s.side}: build output ${path.relative(s.dir, e)} is a symlink`);
        else if (st.isFile()) files.push(path.relative(s.dir, e).split(path.sep).join('/'));
      }
    }
    const modules = [...new Set(files)].sort().map(p => ({ path: p, sha256: put(fs.readFileSync(path.join(s.dir, p))) }));
    if (!modules.length) { why('BUILD-OUTPUTS', `${s.side}: the build produced no files under ${spec.outputs.join(', ')}`); s.build = null; continue; }
    const binary = put(modules.map(x => `${x.sha256}  ${x.path}\n`).join(''));
    s.build = { binary, modules, manifest: put({ schema: 'build-manifest/1', sourceTreeSha256: s.label, binarySha256: binary, modules }) };
    run.builds[s.side] = { commit: s.commit, sourceTreeSha256: s.label, buildManifestSha256: s.build.manifest, executedBinarySha256: binary, modules: modules.length, checkout: s.dir };
  }

  // -- step 2: cases from the pinned manifests at the claimed commit: every case each select entry resolves to, in every mode the
  // obligation's closure lists, a fault point T-FAULT-REPS times (ACCEPTANCE 5.3, Q47c, Q42a). The claimant chooses none of it.
  const comparators = Object.keys(contract.comparators ?? {});
  const manifests = new Map();
  const manifestOf = name => {
    if (manifests.has(name)) return manifests.get(name);
    const cs = contract.caseSets?.[name];
    let m = null;
    if (!cs || !safePath(cs.manifest) || !sha(cs.manifestSha256)) why('SELECTION-UNRESOLVED', `case set ${name} has no pinned manifest (manifestSha256 ${cs?.manifestSha256 ?? 'null'}; ACCEPTANCE 5.3)`);
    else {
      const bytes = git.blob(commit, cs.manifest);
      try { m = bytes && sha256(bytes) === cs.manifestSha256 ? JSON.parse(bytes.toString('utf8')) : null; } catch { m = null; }
      const runnable = c => isObj(c) && str(c.id) && Array.isArray(c.tags) && c.tags.every(str) && safePath(c.input) && sha(c.contentSha256) && comparators.includes(c.comparator) && (c.oracle === undefined || str(c.oracle)) && (c.faultPoint === undefined || typeof c.faultPoint === 'boolean');
      if (!isObj(m) || m.set !== name || !Array.isArray(m.cases) || !m.cases.every(runnable) || new Set(m.cases.map(c => c.id)).size !== m.cases.length || (cs.requiredCases ?? []).some(id => !m.cases.some(c => c.id === id))) {
        why('CASE-MANIFEST', `${cs.manifest} at ${commit} is not the pinned, complete manifest of ${name}, or a case lacks input, contentSha256, a contract comparator or a valid oracle (Q55a step 2)`);
        m = null;
      }
    }
    manifests.set(name, m);
    return m;
  };
  const inputs = new Map();
  const inputPath = c => {
    if (inputs.has(c.input)) return inputs.get(c.input);
    const bytes = git.blob(commit, c.input);
    let p = null;
    if (!bytes || sha256(bytes) !== c.contentSha256) why('CASE-INPUT', `case ${c.id} input ${c.input} at ${commit} does not hash to the manifest's ${c.contentSha256}`);
    else { p = path.join(env.workDir, 'inputs', `${c.contentSha256}.json`); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, bytes); }
    inputs.set(c.input, p);
    return p;
  };
  const plans = new Map(); // obligation id -> [{ id, selection, mode, rep, casePath, oracle, comparator }]
  const planOf = o => {
    if (plans.has(o.id)) return plans.get(o.id);
    const items = [];
    for (const sel of o.cases) for (const t of sel.select) {
      const m = manifestOf(sel.set);
      if (!m) continue;
      const hits = m.cases.filter(c => t === 'all' || c.id === t || c.tags.includes(t));
      if (!hits.length) why('SELECTION-UNRESOLVED', `${o.id}: ${sel.set} selection ${t} resolves to no case of the pinned manifest`);
      for (const c of hits) {
        const oracle = c.oracle ?? o.oracles[0];
        if (!str(oracle) || (o.oracles.length && !o.oracles.includes(oracle))) { why('CASE-ORACLE', `${o.id} ${c.id}: no oracle among ${JSON.stringify(o.oracles)} computes its expected answer (Q55a step 4)`); continue; }
        const casePath = inputPath(c);
        if (!casePath) continue;
        for (const mode of o.closure.modes) for (let rep = 1; rep <= (c.faultPoint ? ctx.faultReps : 1); rep++) items.push({ id: c.id, selection: t, mode, rep, casePath, oracle, comparator: c.comparator });
      }
    }
    plans.set(o.id, items);
    return items;
  };

  // -- step 4: expected answers from the pinned oracle files only, materialised alone into the work directory (the claimed
  // commit's copies are used only after they hash to the pin). An unpinned oracle the contract lists as accepted runs the
  // authority's copy of the files its runner names. The expected answer never comes from the candidate's code.
  const oracleRoots = new Map();
  const oracleRoot = x => {
    if (oracleRoots.has(x)) return oracleRoots.get(x);
    const pin = own(ctx.pins, x), runner = own(contract.oracleRunners, x) ?? DEFAULT_ORACLE_RUNNERS[x];
    let files = null, from = null;
    if (!isObj(runner) || !strList(runner.argv)) why('ORACLE-NO-RUNNER', `the contract does not say how to invoke ${x} (oracleRunners; proposed for 0.3.8)`);
    else if (pin) {
      if (pin.acceptReceipt == null || !isObj(pin.sha256) || !Object.values(pin.sha256).every(sha) || Object.keys(pin.sha256).some(p => p.endsWith('/') || !safePath(p))) why('ORACLE-UNPINNED', `${x} has no accepted per-file pin, so its expected answers cannot be computed from pinned code (RULINGS Q37b, Q55a step 4)`);
      else { const problems = pinnedFileProblems(git, commit, pin.sha256); for (const p of problems) why('ORACLE-FILES', `${x} at ${commit}: ${p} (VA6)`); if (!problems.length) { files = Object.keys(pin.sha256); from = commit; } }
    } else if (ACCEPTED_ORACLE_STATUS.includes(ctx.oracles[x]?.status) && strList(runner.files) && runner.files.every(safePath)) { files = runner.files; from = authority; }
    else why('ORACLE-UNPINNED', `${x} is ${ctx.oracles[x]?.status ?? 'unknown'}, unpinned, and names no files to run from ${authorityRef}`);
    let root = null;
    if (files) {
      root = path.join(env.workDir, 'oracles', x);
      fs.rmSync(root, { recursive: true, force: true });
      for (const f of files) { const b = git.blob(from, f); if (!b) { why('ORACLE-FILES', `${x}: ${f} is missing at ${from}`); root = null; break; } fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), b); }
    }
    const out = root ? { root, argv: runner.argv } : null;
    oracleRoots.set(x, out);
    return out;
  };
  const answers = new Map();
  const expectedFor = item => {
    const key = `${item.oracle}\u0000${item.casePath}\u0000${item.mode}`;
    if (answers.has(key)) return answers.get(key);
    const o = oracleRoot(item.oracle);
    let a = null;
    if (o) {
      const r = spawnSync(...(v => [v[0], v.slice(1)])(fill(o.argv, { case: item.casePath, mode: item.mode })), { cwd: o.root, env: childEnv(o.root), timeout: 120_000, maxBuffer: 1 << 28 });
      const exit = r.status ?? -1, stderr = r.stderr ?? Buffer.alloc(0), stdout = r.stdout ?? Buffer.alloc(0);
      // Q45b, Q47a: exit 2 or X-NOT-MODELED is a refusal, never an answer; any other failure is an oracle error, never a PASS.
      const refused = exit === 2 || stderr.includes('X-NOT-MODELED') || stdout.includes('X-NOT-MODELED');
      a = refused ? { oracleExit: exit, oracleCode: 'X-NOT-MODELED', bytes: stderr } : exit !== 0 ? { oracleExit: exit, oracleCode: 'X-ORACLE-ERROR', bytes: stderr } : { oracleExit: 0, oracleCode: null, bytes: trimNl(stdout) };
    }
    answers.set(key, a);
    return a;
  };
  const used = [...new Map([...sides.flatMap(s => [...s.prereqs, ...claimed.map(o => o.id)])].map(i => [i, ctx.byId.get(i)])).values()];
  for (const o of used) for (const item of planOf(o)) expectedFor(item);

  // -- step 3: the system under test through the gate on a registered slot. gate.mjs OBL is plan-only (--dry-run), so no run is
  // on the gate; an offline run (env.sut) observes the locally built system instead and stays DIAGNOSTIC.
  const gatePlan = { claimId: claim.claimId ?? null, commit, lane: comp.source.engine, slot: comp.source.slot, obligations: used.map(o => o.id),
    sides: sides.map(s => ({ side: s.side, commit: s.commit, sourceTreeSha256: s.label, composition: s.comp, buildManifestSha256: s.build?.manifest ?? null, obligations: [...s.prereqs, ...claimed.map(o => o.id)] })),
    cases: sides.reduce((n, s) => n + [...s.prereqs, ...claimed.map(o => o.id)].reduce((k, i) => k + planOf(ctx.byId.get(i)).length, 0), 0) };
  run.gate = (env.gate ?? gateDryRun(env.workDir))(gatePlan);
  if (!run.gate.ok) why('GATE-SLOT', `gate.mjs refused the plan (lane ${gatePlan.lane}, slot ${gatePlan.slot}): ${run.gate.error}`);
  why('GATE-NOT-RUN', 'step 3: gate.mjs OBL is plan-only (--dry-run); no executing gate runs pinned case manifests on a registered slot yet, so no run is QUALIFIED (RULINGS Q55a)');
  if (run.offline) why('RUN-NOT-ON-GATE', 'the system under test ran locally from the evaluator\'s own build (offline stand-in for step 3), not through the gate on a registered slot');

  // -- comparison: apply the declared comparator to the oracle's answer and the observation; write case-result/1 records.
  const frozen = loadContract.writerTrace?.generator?.frozen;
  const windows = loadContract.windows ?? {};
  const win = claim.kind === 'promotion' ? windows.acceptance : windows.screening;
  const workload = isObj(frozen) && sha(frozen.sha256) && Number.isSafeInteger(frozen.seed) && sha(frozen.offerScheduleSha256) && Number.isSafeInteger(win?.warmupS) && Number.isSafeInteger(win?.perLadderLevelS)
    ? s => ({ generatorSourceSha256: frozen.sha256, seed: frozen.seed, offerScheduleSha256: frozen.offerScheduleSha256, window: [win.warmupS, win.warmupS + win.perLadderLevelS], slot: s.comp.source.slot }) : null;
  if (!workload) why('TRACE-NOT-FROZEN', `${PATHS.loadContract} pins no frozen trace (writerTrace.generator.frozen {sha256, seed, offerScheduleSha256}) and window, so no comparison has a workload identity (VA15, RULINGS Q47b)`);
  const receipts = [];
  // Offline runs are not sandboxed (the gate's containers are the isolation): the candidate runs first, so before each side runs
  // its built modules are re-hashed, and a side whose code an earlier process edited is not run.
  for (const s of sides) {
    if (run.offline && s.build) { const t = tamperedModules(s); if (t.length) { why('BUILD-TAMPERED', `${s.side}: ${t.slice(0, 5).join(', ')} changed after the evaluator built them`); s.build = null; } }
    for (const oid of [...s.prereqs, ...claimed.map(o => o.id)]) {
      const o = ctx.byId.get(oid), role = s.prereqs.includes(oid) ? 'prerequisite' : s.role, rid = `${s.side}:${oid}`;
      const caseResults = [];
      for (const item of planOf(o)) {
        const a = expectedFor(item);
        const entry = { side: s.side, obligation: oid, case: item.id, selection: item.selection, mode: item.mode, rep: item.rep, oracle: item.oracle, oracleExit: a?.oracleExit ?? null, oracleCode: a?.oracleCode ?? null, verdict: null };
        run.cases.push(entry);
        if (!a || !run.offline || !s.build) continue;
        const seen = env.sut({ side: s.side, dir: s.dir, casePath: item.casePath, mode: item.mode });
        const observed = seen.exit === 0 ? trimNl(seen.stdout) : Buffer.concat([Buffer.from(`X-SUT-EXIT ${seen.exit}\n`), seen.stderr]);
        const expectedSha256 = put(a.bytes), observedSha256 = put(observed);
        const v = a.oracleCode === 'X-NOT-MODELED' ? 'REFUSED' : a.oracleExit !== 0 ? 'FAIL' : recompute(item.comparator, a.bytes, observed);
        // case-result/1 (0.3.7) judges by hash equality and has no comparator field, so a comparator PASS on different bytes cannot
        // be recorded as a PASS that the reference would recompute; it fails closed (proposed for 0.3.8).
        const recorded = v === 'PASS' && expectedSha256 !== observedSha256 ? 'FAIL' : v;
        if (recorded !== v) why('CASE-RECORD-INEXPRESSIBLE', `${item.id}: ${item.comparator} passes on different bytes, which case-result/1 cannot record`, rid);
        entry.verdict = recorded;
        if (recorded !== 'PASS') why(recorded === 'REFUSED' ? 'CASE-REFUSED' : recorded === 'UNCOMPARABLE' ? 'CASE-UNCOMPARABLE' : 'CASE-FAIL', `${s.side} ${oid} ${item.selection}:${item.id} mode ${item.mode}${item.rep > 1 ? ` rep ${item.rep}` : ''}: ${recorded} (oracle ${item.oracle} exit ${a.oracleExit}${a.oracleCode ? ` ${a.oracleCode}` : ''}; RULINGS Q45b, Q47a, Q55a)`, rid);
        const rec = { schema: 'case-result/1', obligation: oid, case: item.id, selection: item.selection, oracle: item.oracle, oracleExit: a.oracleExit, oracleCode: a.oracleCode, expectedSha256, observedSha256 };
        caseResults.push({ case: item.id, selection: item.selection, verdict: recorded, objectSha256: put(rec) });
      }
      if (!run.offline || !s.build) continue;
      const r = { obligation: oid, definitionSha256: o.definitionSha256, sourceTreeSha256: s.label, composition: s.comp, role, commit, producedAt: now, buildManifestSha256: s.build.manifest,
        executedBinarySha256: s.build.binary, modes: o.closure.modes, faultReps: ctx.faultReps, caseResults };
      if (s.verifier) r.verifierObjectSha256 = put({ schema: 'verifier-record/1', obligation: oid, definitionSha256: o.definitionSha256, verifier: s.verifier, verdict: 'ACCEPT' });
      if (role !== 'prerequisite' && workload) r.workload = workload(s);
      receipts.push(r);
    }
  }

  // -- consistency: the contract's reference model over the receipts this run made. Contract-level blockers (A0, W0, pins,
  // excludes, refusals) are reported for every run; evidence reasons only when there were observations to judge.
  const coreClaim = { obligations: claimed.map(o => o.id), commit, sourceTreeSha256: label, composition: comp, receipts };
  const coreEnv = { store: objectStore(objectsDir), dependencyClosureChangedAt: git.commitTime(commit) };
  for (const r of admitCore({ ...coreClaim, receipts: [] }, coreEnv, ctx).reasons) if (STATIC_CORE.has(r.code)) why(r.code, r.detail);
  if (run.offline) {
    run.receipts = receipts;
    for (const r of admitCore(coreClaim, coreEnv, ctx).reasons) if (!STATIC_CORE.has(r.code)) why(r.code, `evaluator-made receipts: ${r.detail}`);
  }
}

// ================================================================ CLI

export function admitFile(file, { repo = REPO, objects = OBJECTS, authorityRef = 'main' } = {}) {
  let claim;
  // parseJson keeps Python's int/float distinction, so a workload seed of 1.0 is refused here as the reference refuses it.
  try { claim = parseJson(fs.readFileSync(file)); } catch (error) { return { verdict: 'DIAGNOSTIC', documentVerdict: 'DIAGNOSTIC', reasons: [{ code: 'CLAIM-FORMAT', detail: `cannot read ${file}: ${error.message}` }] }; }
  return admitClaim(claim, { git: gitSource(repo), objects: objectStore(objects), authorityRef });
}

const USAGE = 'usage: claim.mjs admit <claim.json> [--repo DIR] [--objects DIR] [--authority-ref main] [--json]\n       claim.mjs qualify <claim.json> [--repo DIR] [--authority-ref main] [--work DIR] [--offline-sut] [--json]';
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main(async () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, file] = positional;
  if (!['admit', 'qualify'].includes(command) || !file) fail('USAGE', USAGE);
  const repo = path.resolve(options.repo ?? REPO);
  const authorityRef = options['authority-ref'] ?? 'main';
  let result;
  if (command === 'admit') result = admitFile(path.resolve(file), { repo, objects: path.resolve(options.objects ?? path.join(repo, 'runs/objects')), authorityRef });
  else {
    let claim = null;
    try { claim = parseJson(fs.readFileSync(path.resolve(file))); } catch (error) { fail('USAGE', `cannot read ${file}: ${error.message}`); }
    const git = gitSource(repo);
    const workDir = path.resolve(options.work ?? path.join(repo, 'runs/qualify', `${String(claim?.claimId ?? 'claim').replace(/[^A-Za-z0-9._-]/g, '_')}-${new Date().toISOString().replace(/[:.]/g, '-')}`));
    let sut = null;
    if (options['offline-sut']) { const b = git.resolve(authorityRef) && git.blob(git.resolve(authorityRef), QUALIFY.build); try { sut = b ? localSut(JSON.parse(b.toString('utf8'))) : null; } catch { sut = null; } }
    result = qualifyClaim(claim, { git, authorityRef, workDir, ...(sut ? { sut } : {}) });
  }
  if (options.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else {
    console.log(result.verdict + (result.documentVerdict ? ` (documents: ${result.documentVerdict})` : '') + (result.offlineVerdict ? ` (offline run: ${result.offlineVerdict})` : ''));
    for (const r of result.reasons) console.log(`  ${r.code}${r.receipt ? ` [${r.receipt}]` : ''}: ${r.detail}`);
    if (result.run) console.log(`  run: ${Object.keys(result.run.builds).length} build(s), ${result.run.cases.length} case executions, objects in ${result.run.objects}`);
  }
  process.exitCode = result.verdict === 'QUALIFIED' ? 0 : 2;
});
