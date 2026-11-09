#!/usr/bin/env node
// lab/bin/claim.mjs admit   <claim.json> [--repo DIR] [--objects DIR] [--authority-ref main] [--json]
// lab/bin/claim.mjs qualify <claim.json> [--repo DIR] [--authority-ref main] [--work DIR] [--offline-sut] [--json]
//
// Claim admission (EXP-E01; contract 0.3.9 QUALIFICATION_RUN and CLAIM_ADMISSION; RULINGS Q34d, Q37b, Q38a, Q38b, Q41d,
// Q42a, Q45a, Q45b, Q46b, Q47a to Q47d, Q55a, Q55b, Q55e; Q61a and Q61b as ruled; Q67b, Q67e, Q67i and Q67j, pending, for Codex
// round 8 findings 2, 6, 10 and 11, each only making a run stricter). Exit 0 for QUALIFIED, 2 for DIAGNOSTIC with
// the reasons found, 1 for usage errors. An evaluator exception is itself a DIAGNOSTIC (fail closed). Pending rulings
// (RULINGS-PENDING.md, authority "none", Q47d) are never cited as authority for admitting anything.
//
// Qualification is a run, not a document (Q55a). Two commands:
//   qualify  runs the claim (qualifyClaim). admitCore below is the contract's reference model, build_contract.py admit_claim
//            and qualification_run, ported function by function; it decides the verdict and takes an executor `ev` (build,
//            manifest, oracle, sut, compare, workload, measure, slots). labExecutor is the lab's executor: a fresh git-archive
//            checkout per build instance verified against the tree, identified by its execution identity (Q67b), the
//            authority's build spec, manifests from the claimed commit checked against the contract's pins, the pinned oracle
//            files alone in a read-only copy re-hashed before every invocation (Q67e), the declared comparator (Q67i), the
//            evaluator's own workload, and the gate. Step 3 uses the engine-managed container executor (EXP-G03); unpinned prerequisites, missing isolation
//            or missing actual case executions stay DIAGNOSTIC. Offline requests always stay DIAGNOSTIC.
//   admit    judges a claim's documents: receipts and records a claimant supplies. Its verdict is always DIAGNOSTIC
//            (DOCUMENT-ONLY), as the reference's admit_claim is without an executor (ev None); documentVerdict says whether
//            the documents pass the document checks below. Codex round 7 showed well-formed records can be invented (finding 1)
//            and a candidate binary labelled as A0 (finding 2); no check of a document can tell those from real ones.
//
// Both commands read the contract from the authority ref (main), never from the claimed commit or the working tree (VA6,
// RULINGS Q61a): the A0 and verifier registries are entries a later reviewed contract version adds, so a claimed commit's own
// contract can never hold its verification.
//
// The document checks (admit) have two layers.
//   1. documentCore: contract 0.3.7's admit_claim and evidence_ok over supplied receipts (0.3.8 removed evidence_ok when
//      admission became a run), kept as the document check and updated to read 0.3.9's fields: composition_ok with the
//      source variant (Q55b), the A0 registry's binarySha256 (a control's executed binary must be it), and VERIFIER_REGISTRY
//      acceptance of oracle pins, the W0 pin and the claimed obligation at the claimed commit (Q55a, Q61b).
//   2. evaluate: the lab layer (the full VA rules, Q41d), which runs documentCore on what I/O finds and then requires more:
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
import { authorityPolicy, bindStore, pairLayout } from './box-policy.mjs';
import { BoxExecutor, isolationProfile } from './box.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OBJECTS, REPO, fail, main, parseArgs, sha256, sourceTreeIdOf } from './lib.mjs';

export const FORMATS = { claim: 'triplex-db-2/claim/1', receipt: 'triplex-db-2/receipt/2', ledger: 'run-ledger/1', provenance: 'build-provenance/1' };
export const PATHS = { contract: 'lab/acceptance/obligations.json', loadContract: 'lab/acceptance/load-contract.json', slots: 'lab/config/slots.json', lockfile: 'pnpm-lock.yaml' };
export const PREREQ = { position: 'G7.position.coordinates', identity: 'G10.composition.identity-bound', w0: 'W0.coverage-floors' };
/** Claim kinds a run may qualify: the reference's "comparison" and "screening", and the claim format's "comparative" (Q67j, Q75i). */
const ADMITTED_KINDS = ['comparison', 'screening', 'comparative'];
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
/** composition_ok (0.3.8, the source variant included), and the lab's stricter typing: string engine, imageDigest, configSha256
 * (a sha256) and slot (VA14; red-team pass 1: a slot array or a missing field must not count as bound). */
const boundComposition = (c, ctx) => compositionOk(c, ctx) && ctx.assignments.every(k => COMPOSITION_FIELDS.every(f => str(c[k][f])) && sha(c[k].configSha256));
/** VA4: every assignment runs the image the contract's IMAGE_PINS pins for its engine (imagePins, RULINGS Q61i). */
const imageProblems = (c, imagePins, assignments) => assignments.flatMap(k => { const pin = imagePins?.[c[k].engine]?.imageId; return !pin || c[k].imageDigest !== pin ? [`${k} image ${c[k].imageDigest} is not the pinned ${pin ?? '(no pin)'}`] : []; });
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
      // Q67h (compiled errorRepresentation), Q75h (V-E01 F6): cause is optional; when present it is a structured object with a
      // _tag or a message, never any non-null value.
      const causeOk = !has(o, 'cause') || (isObj(o.cause) && (str(o.cause._tag) || str(o.cause.message)));
      return verdict(o._tag === e._tag && reasons.includes(o.reason) && causeOk && (o.rows === undefined || (Array.isArray(o.rows) && o.rows.length === 0)));
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
  if (t === 'bool') return typeof v === 'boolean';
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
/** build_contract.case_verdict (0.3.10; Q47a, Q67i, Q71c): recomputed from the retained raw result, never read from the receipt.
 * case-result/2 uses its declared comparator on the retained raw objects; case-result/1 carries no comparator and keeps hash
 * equality. */
export function caseVerdict(rec, store) {
  if (rec.oracleExit === 2 || rec.oracleCode === 'X-NOT-MODELED') return 'REFUSED';
  if (rec.oracleExit !== 0 || rec.oracleCode !== null || !objOk(rec.expectedSha256, store) || !objOk(rec.observedSha256, store)) return 'FAIL';
  if (rec.schema === 'case-result/2') return recompute(rec.comparator, store.get(rec.expectedSha256).bytes, store.get(rec.observedSha256).bytes) === 'PASS' ? 'PASS' : 'FAIL';
  return rec.expectedSha256 === rec.observedSha256 ? 'PASS' : 'FAIL';
}
/** build_contract.workload_ok (0.3.10; Q47b, Q67g): every field present, typed and nonempty. The slot is no longer part of the
 * shared workload identity: each arm's placement {slot, cpuset, cpus} is in the paired measurement (workloadIdentity.placement). */
export function workloadOk(w, comp, fields) {
  return sameKeys(w, Object.keys(fields)) && Object.entries(fields).every(([k, t]) => typed(w[k], t));
}
/** build_contract._cpuset: "0-1,4" -> the set of cpus, or null when unparsable or empty. */
function cpuset(s) {
  if (typeof s !== 'string') return null;
  // Python's str.partition("-") and int(): surrounding whitespace, a sign and digit-group underscores are accepted.
  const pyInt = t => /^\s*[+-]?\d+(?:_\d+)*\s*$/.test(t) ? Number(t.replace(/[\s_+]/g, '')) : NaN;
  const out = new Set();
  for (const part of s.split(',')) {
    const i = part.indexOf('-'), a = i < 0 ? part : part.slice(0, i), b = i < 0 ? '' : part.slice(i + 1);
    const x = pyInt(a), y = pyInt(b || a);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    for (let k = x; k <= y; k++) out.add(k);
  }
  return out.size ? out : null;
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

/** The reference's context, read from the contract documents (obligations.json and load-contract.json at the authority ref).
 * Pins, W0, A0, the verifier registry, the manifest pins and the configuration (buildSpec, frozenTrace, imagePins,
 * oracleRunners) may be overridden, exactly as admit_claim's parameters allow (the contract's own fixtures use that).
 * onRun is lab instrumentation only (it lets the executor label its records with the obligation); it makes no executor call. */
export function coreContext(contract, { pins, w0, a0, verifiers, pinned, overrides, onRun } = {}, loadContract = null) {
  return {
    byId: new Map(contract.obligations.map(o => [o.id, o])), assignments: contract.composition.assignments, positionRequired: contract.positionRequiredCases,
    faultReps: contract.thresholds['T-FAULT-REPS'].value, schemas: contract.evidenceSchemas, workloadFields: contract.workloadIdentity.fields,
    pins: pins ?? contract.oraclePins, w0: w0 ?? contract.w0Pin, a0: a0 ?? contract.a0Registry.entries, byEngine: contract.a0Registry.byEngine,
    verifiers: verifiers ?? contract.verifierRegistry?.entries ?? {},
    pinned: pinned ?? Object.fromEntries(Object.entries(contract.caseSets).map(([k, v]) => [k, v.manifestSha256 ?? null])),
    comparators: Object.keys(contract.comparators ?? {}), sourceVariantFields: contract.sourceVariantFields ?? {}, logFields: contract.logFields ?? {},
    caseManifest: contract.caseManifest ?? { required: ['id', 'tags', 'input', 'contentSha256', 'comparator'] }, answerMembers: contract.answerMembers ?? {},
    cfg: { buildSpec: contract.buildSpec ?? null, frozenTrace: loadContract?.writerTrace?.generator?.frozen ?? null, imagePins: contract.imagePins ?? {}, oracleRunners: contract.oracleRunners ?? {}, ...(overrides ?? {}) },
    pair0: loadContract?.measurementProtocol ?? null, goldenScenarioPolicy: contract.goldenScenarioPolicy ?? null,
    oracles: contract.oracles, refusals: contract.oracleRefusals, caseSets: contract.caseSets, onRun,
  };
}
const cmpStr = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const has = (o, k) => isObj(o) && Object.prototype.hasOwnProperty.call(o, k);

/** build_contract.composition_ok (Q28, Q55b): four bound assignments; the source declares its protocol variant
 * (SOURCE_VARIANT_FIELDS) and, for log-source, its log identity and durability configuration (LOG_FIELDS). */
export function compositionOk(comp, ctx) {
  if (!isObj(comp) || !sameKeys(comp, ctx.assignments)) return false;
  for (const [k, a] of Object.entries(comp)) {
    if (!isObj(a)) return false;
    let extra = [];
    if (k === 'source') {
      const v = own(a, 'variant');
      if (typeof v !== 'string' || !Object.prototype.hasOwnProperty.call(ctx.sourceVariantFields, v)) return false;
      extra = ['variant', ...ctx.sourceVariantFields[v]];
    }
    if (!sameKeys(a, [...new Set([...COMPOSITION_FIELDS, ...extra])]) || COMPOSITION_FIELDS.some(f => pyFalsy(a[f]))) return false;
    if (extra.includes('log') && !(isObj(a.log) && sameKeys(a.log, Object.keys(ctx.logFields)) && Object.entries(ctx.logFields).every(([f, t]) => typed(a.log[f], t)))) return false;
  }
  return true;
}

/** build_contract.resolve_cases (Q55a): cases from the pinned manifests only, deduplicated by (set, id) and sorted; null when any
 * selection is unresolvable. ev.manifest(set) returns the manifest bytes the evaluator found. */
export function resolveCases(o, ev, pinned, note = () => {}) {
  const out = new Map();
  for (const c of o.cases) {
    const want = own(pinned, c.set);
    const raw = pyFalsy(want) ? null : ev.manifest(c.set);
    if (pyFalsy(want) || !Buffer.isBuffer(raw) || sha256(raw) !== want) { note(`${o.id}: case set ${c.set} has no pinned manifest, or the manifest found does not hash to the pin`); return null; }
    let cases;
    try { cases = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)).cases; } catch { cases = undefined; }
    if (!Array.isArray(cases)) { note(`${o.id}: ${c.set} manifest has no case list`); return null; }
    for (const t of c.select) {
      const hit = cases.filter(x => isObj(x) && (t === 'all' || own(x, 'id') === t || (Array.isArray(own(x, 'tags')) && x.tags.includes(t))));
      if (!hit.length) { note(`${o.id}: ${c.set} selection ${t} resolves to no case of the pinned manifest`); return null; }
      for (const x of hit) out.set(JSON.stringify([c.set, x.id]), [c.set, x.id, x]);
    }
  }
  return [...out.values()].sort((a, b) => cmpStr(a[0], b[0]) || cmpStr(a[1], b[1])).map(k => k[2]);
}

/** build_contract.case_entry_ok (Q61d): a pinned manifest case lists its required fields, and its input (read through
 * ev.input) hashes to contentSha256. Returns the input bytes, or null. */
export function caseEntryOk(x, ev, ctx) {
  if (!isObj(x) || !ctx.caseManifest.required.every(k => has(x, k)) || !typed(own(x, 'id'), 'str') || !Array.isArray(own(x, 'tags')) || !x.tags.every(t => typeof t === 'string')) return null;
  if (!typed(own(x, 'input'), 'str') || !typed(own(x, 'contentSha256'), 'hex64') || !ctx.comparators.includes(own(x, 'comparator')) || (has(x, 'faultPoint') && typeof x.faultPoint !== 'boolean') || (has(x, 'oracle') && !typed(x.oracle, 'str'))) return null;
  const raw = typeof ev.input === 'function' ? ev.input(x.input) : null;
  return Buffer.isBuffer(raw) && sha256(raw) === x.contentSha256 ? raw : null;
}

/** build_contract.fault_witness_ok (Q61j): one retained fault-witness/1 per injection. */
export function faultWitnessOk(w, o, x, mode, rep, ctx) {
  const f = ctx.schemas['fault-witness/1']?.fields ?? {};
  return isObj(w) && Object.keys(f).length > 0 && sameKeys(w, Object.keys(f)) && Object.entries(f).every(([k, t]) => typed(w[k], t)) && w.schema === 'fault-witness/1'
    && w.obligation === o.id && w.case === x.id && w.mode === mode && w.rep === rep && w.faultPointId === x.id;
}

/** build_contract.qualification_run (0.3.9; Q55a, Q61c, Q61d, Q61j): every resolved case (its entry and input checked), the
 * pinned oracle's answer on the input bytes (exit 0, no code; the oracle must have a runner), and the declared comparator on
 * the system's observation in every mode; a faultPoint case of a CR-FAULT obligation T-FAULT-REPS times, each with a
 * fault-witness/1. null on any failure. */
export function qualificationRun(o, binary, comp, ev, ctx, pins = ctx.pins, pinned = ctx.pinned, runners = ctx.cfg.oracleRunners, note = () => {}) {
  ctx.onRun?.(o, binary);
  const cases = resolveCases(o, ev, pinned, note);
  if (!cases || !cases.length) { if (cases) note(`${o.id}: no case resolved`); return null; }
  const fault = o.closure.rules.includes('CR-FAULT');
  for (const x of cases) {
    const raw = caseEntryOk(x, ev, ctx);
    if (raw === null) { note(`${o.id} ${own(x, 'id')}: the manifest entry lacks a required field, or its input does not hash to contentSha256 (RULINGS Q61d)`); return null; }
    const orc = !pyFalsy(own(x, 'oracle')) ? x.oracle : (o.oracles.length ? o.oracles[0] : null);
    if (!o.oracles.includes(orc) || !has(runners, orc)) { note(`${o.id} ${x.id}: oracle ${orc} is not the obligation's, or the contract gives no runner for it (ORACLE_RUNNERS, RULINGS Q61c)`); return null; }
    const pin = own(pins, orc);
    const expected = ev.oracle(orc, own(pyFalsy(pin) ? {} : pin, 'commit') ?? null, raw);
    // Q45b, Q47a: a refusal (exit 2, X-NOT-MODELED) or any oracle failure fails the obligation closed.
    if (!isObj(expected) || expected.exit !== 0 || (own(expected, 'code') ?? null) !== null) { note(`${o.id} ${x.id}: oracle ${orc} gave no answer (exit ${own(expected, 'exit')}, code ${own(expected, 'code')})`); return null; }
    const reps = fault && own(x, 'faultPoint') === true ? ctx.faultReps : 1;
    for (const mode of o.closure.modes) for (let rep = 0; rep < reps; rep++) {
      if (pyFalsy(ev.compare(x.comparator, own(expected, 'output') ?? null, ev.sut(binary, comp, x, mode)))) { note(`${o.id} ${x.id} mode ${mode}${reps > 1 ? ` repetition ${rep}` : ''}: ${x.comparator} rejects the observation`); return null; }
      if (reps > 1 && !faultWitnessOk(typeof ev.witness === 'function' ? ev.witness(o.id, binary, comp, x, mode, rep) : null, o, x, mode, rep, ctx)) { note(`${o.id} ${x.id} mode ${mode} repetition ${rep}: no valid fault-witness/1 for the injection (RULINGS Q61j)`); return null; }
    }
  }
  return { obligation: o.id, cases: cases.map(x => x.id), modes: [...o.closure.modes] };
}

/** build_contract.paired_ok (0.3.10; Q60a, Q60c, Q67f, Q67g): paired rounds under PAIR_0 (load-contract measurementProtocol): a
 * registered look's number of rounds, retained per-round histograms and signals, a GREEN window with all-offered accounting, and
 * each arm's placement {slot, cpuset, cpus} (cpus = the cpuset's size; a duet on separate slots with equal capacity and disjoint
 * cpusets), each arm's regime a cpuset with no quota equal to its placement, the two regimes equal. */
export function pairedOk(m, wl, pair0) {
  const d = pair0?.design;
  if (!isObj(d) || !isObj(m) || own(m, 'mode') !== 'paired-rounds' || !(d.designs ?? []).includes(own(m, 'design')) || !same(own(m, 'workload') ?? null, wl)) return false;
  if (!(typed(own(m, 'rounds'), 'int') && (d.looks ?? []).includes(m.rounds))) return false;
  const per = own(m, 'perRound');
  if (!Array.isArray(per) || per.length !== m.rounds || !per.every(r => isObj(r) && isObj(own(r, 'histograms')) && sameKeys(r.histograms, ['candidate', 'A0']) && isObj(own(r, 'signals')))) return false;
  if (own(m, 'window') !== 'GREEN' || own(m, 'accounting') !== 'all-offered') return false;
  const pl = own(m, 'placement');
  if (!isObj(pl) || !sameKeys(pl, ['candidate', 'A0']) || !Object.values(pl).every(p => isObj(p) && typed(own(p, 'slot'), 'str') && typed(own(p, 'cpus'), 'int') && cpuset(own(p, 'cpuset')))) return false;
  if (Object.values(pl).some(p => cpuset(p.cpuset).size !== p.cpus)) return false;
  if (m.design === 'duet' && (pl.candidate.cpus !== pl.A0.cpus || [...cpuset(pl.candidate.cpuset)].some(c => cpuset(pl.A0.cpuset).has(c)) || pl.candidate.slot === pl.A0.slot)) return false;
  const regs = own(m, 'slotRegimes');
  if (!isObj(regs) || !sameKeys(regs, ['candidate', 'A0']) || !Object.values(regs).every(r => isObj(r) && sameKeys(r, pair0.slotRegime.receiptFields))) return false;
  if (['candidate', 'A0'].some(k => regs[k].cpuMax !== 'max' || !typed(regs[k].cpuWeight, 'int') || !same(regs[k].cpuset, pl[k].cpuset))) return false;
  return same(regs.candidate.cpuMax, regs.A0.cpuMax) && same(regs.candidate.cpuWeight, regs.A0.cpuWeight);
}

/** build_contract.registered_acceptance (Q55a): a VERIFIER_REGISTRY entry accepting exactly this subject at this commit. */
export function registeredAcceptance(entryId, kind, subjectId, commit, registry) {
  const e = typeof entryId === 'string' ? own(registry, entryId) : undefined;
  if (pyFalsy(e) || !isObj(e) || typeof own(e, 'verdict') !== 'string' || !e.verdict.startsWith('ACCEPT')) return false;
  const s = own(e, 'subject');
  return isObj(s) && same(s, { ...s, kind, id: subjectId, commit: commit ?? null });
}

/** admit_claim's contract-level conditions, in its order (no executor call): W0 accepted and fingerprinted (GATE-W0, Q55e),
 * every oracle pinned and accepted through VERIFIER_REGISTRY, or unpinned and COMPILED into the contract (Q37b, Q55a, Q59e),
 * excludes (Q45a), refusals reached directly or through a broader set (Q45b, Q47c). All are returned; admit_claim stops at the first. */
// [EXP-A01-R3] Why: match build_contract.runner_pinned for both accepted and COMPILED oracles. Rejected: a valid entrypoint hash standing in for missing imported runner files (Q75c).
function oracleRunnerPinned(id, ctx) {
  const runner = own(ctx.cfg.oracleRunners, id);
  if (!isObj(runner) || !strList(runner.argv)) return false;
  const pinHashes = own(own(ctx.pins, id) ?? {}, 'sha256');
  const hashes = pyFalsy(pinHashes) ? own(runner, 'sha256') : pinHashes;
  if (!isObj(hashes) || !Object.keys(hashes).length || !Object.values(hashes).every(sha) || !strList(runner.files)) return false;
  return runner.files.every(file => has(hashes, file)) && runner.argv.filter(arg => arg.startsWith('lab/')).every(file => has(hashes, file));
}

export function contractBlockers(claimed, prereq, domain, ctx) {
  const out = [];
  const w0 = ctx.w0 ?? {};
  if (domain && (Object.values(own(w0, 'files') ?? {}).some(v => v == null) || !registeredAcceptance(own(w0, 'verifierEntry'), 'world', 'W0', own(w0, 'commit'), ctx.verifiers) || own(w0, 'deltaCheck') == null || own(w0, 'oDomainFingerprint') == null))
    out.push({ code: 'W0-UNPINNED', detail: 'a W0 file hash, the W0 pin\'s VERIFIER_REGISTRY acceptance, the delta check or the O-DOMAIN fingerprint is missing; the fingerprint comes only from a reviewed contract version (GATE-W0, RULINGS Q55a, Q55e)' });
  for (const x of new Set([...claimed, ...prereq].flatMap(o => o.oracles))) {
    if (!oracleRunnerPinned(x, ctx)) out.push({ code: 'ORACLE-RUNNER-UNPINNED', detail: `oracle ${x} lacks a SHA-256 for every declared runner file or argv file (Q75c)` });
    if (has(ctx.pins, x)) {
      const pin = isObj(ctx.pins[x]) ? ctx.pins[x] : {}, h = own(pin, 'sha256');
      // [EXP-A01-0312] Why: V-O05 accepted screening only; acceptance needs verifier recollection. Rejected: treating a pinned parser as production collection proof.
      if (own(pin, 'acceptanceLevel') === 'screening') out.push({ code: 'ORACLE-SCREENING-ONLY', detail: `oracle ${x} is accepted for screening only; verifier recollection is required (Q82c)` });
      if (own(pin, 'acceptReceipt') == null || h == null || (isObj(h) && Object.values(h).some(v => v == null)) || !registeredAcceptance(own(pin, 'verifierEntry'), 'oracle', x, own(pin, 'commit'), ctx.verifiers))
        out.push({ code: 'ORACLE-UNPINNED', detail: `oracle ${x} has no pin accepted through VERIFIER_REGISTRY at its commit (RULINGS Q37b, Q55a)` });
      else for (const o of claimed) if ((own(pin, 'excludes') ?? []).includes(o.id)) out.push({ code: 'ORACLE-EXCLUDED', detail: `${o.id} is excluded from oracle ${x}'s pin (RULINGS Q45a)` });
    } else if (ctx.oracles[x]?.status !== 'COMPILED') out.push({ code: 'ORACLE-UNACCEPTED', detail: `oracle ${x} is ${ctx.oracles[x]?.status ?? 'unknown'} and unpinned; only an oracle compiled into the contract may be unpinned (RULINGS Q59e)` });
  }
  for (const o of claimed) for (const x of o.oracles) for (const [name, ref] of Object.entries(own(ctx.refusals, x) ?? {}))
    if (refusedBy(o, ref, ctx.caseSets)) out.push({ code: 'ORACLE-REFUSES', detail: `${o.id} selects cases oracle ${x} refuses, directly or through a broader set (${name}; RULINGS Q45b, Q47c)` });
  return out;
}
const NS_RULES = ['CR-NS', 'CR-GS'];
/** WORKLOAD_IDENTITY applies to CR-NS and CR-GS obligations only (workloadIdentity.appliesTo, RULINGS Q61g). */
export const measured = o => o.closure.rules.some(r => NS_RULES.includes(r));

/**
 * build_contract.admit_claim (0.3.9; Q38b, Q42a, Q47, Q55a, Q59e, Q60, Q61). claim = {obligations, commit, sourceTreeSha256,
 * composition}; any other field is ignored. ev is the evaluator's executor (labExecutor, or the recorded calls of the contract's
 * fixtures); with no executor the verdict is DIAGNOSTIC. Same checks, order and executor calls as the reference, stopping at the
 * first failure; returns { verdict, reasons } with that one reason and the executor's notes on it.
 */
export function admitCore(claim, ev, ctx) {
  const notes = [];
  const note = d => notes.push(d);
  const stop = (code, detail) => ({ verdict: 'DIAGNOSTIC', reasons: [{ code, detail: [detail, ...notes].join('; ') }] });
  if (ev == null) return stop('NO-RUN', 'no evaluator run; supplied records are diagnostic evidence only (RULINGS Q55a)');
  const cfg = ctx.cfg;
  if (!isObj(cfg.buildSpec) || ['argv', 'outputs', 'run'].some(k => own(cfg.buildSpec, k) == null)) return stop('BUILD-SPEC-NULL', 'the contract\'s buildSpec (argv, outputs, run) is not specified, so no run qualifies (RULINGS Q55a step 1, Q61f)');
  const ids = Array.isArray(own(claim, 'obligations')) ? claim.obligations : [];
  if (!ids.length) return stop('CLAIM-NO-OBLIGATIONS', 'the claim names no obligation');
  if (ids.some(i => typeof i !== 'string' || !ctx.byId.has(i))) return stop('UNKNOWN-OBLIGATION', `unknown obligation ids in ${JSON.stringify(ids)} are rejected, never dropped (RULINGS Q42a)`);
  const claimed = ids.map(i => ctx.byId.get(i));
  // [EXP-A01-0313] Why: Q94e makes every pre-0.4.0 GS receipt diagnostic, including comparisons. Rejected: allowing complete pins to override the GS hold.
  if (ctx.goldenScenarioPolicy?.before040 === 'DIAGNOSTIC' && claimed.some(o => o.id.startsWith('GS.'))) return stop('GS-DIAGNOSTIC', 'GS evidence cannot close obligations or enter comparisons before contract 0.4.0 (Q94e)');
  const tree = own(claim, 'sourceTreeSha256') ?? null, comp = pyFalsy(own(claim, 'composition')) ? {} : claim.composition, commit = own(claim, 'commit') ?? null;
  // 0.3.10 (Q67j, Q75i): a promotion is rejected explicitly until its prerequisites are enforced mechanically. The reference admits
  // kinds "comparison" and "screening" (a missing kind is "comparison"); the claim format and CLAIM_ADMISSION say "comparative", so
  // that is admitted too (an intentional divergence, reported until a contract version names one vocabulary).
  const kind = has(claim, 'kind') ? claim.kind : 'comparison';
  if (!ADMITTED_KINDS.includes(kind)) return stop(kind === 'promotion' ? 'PROMOTION-UNSUPPORTED' : 'CLAIM-KIND', `claim kind ${JSON.stringify(kind)} is not qualified: promotion prerequisites (GATE-BROKER-HARDENING and the others) are not enforced mechanically yet (RULINGS Q67j, Q75i)`);
  const slots = [...(ev.slots ?? [])];
  if (!compositionOk(comp, ctx)) return stop('COMPOSITION-UNBOUND', 'the composition must bind four assignments (engine, imageDigest, configSha256, slot), the source declaring its protocol variant and, for log-source, its log (RULINGS Q28, Q55b)');
  if (Object.keys(comp).some(k => !slots.includes(comp[k].slot))) return stop('SLOT-UNREGISTERED', `an assignment's slot is not a registered slot (${slots.join(', ')}) (RULINGS Q55a)`);
  if (Object.keys(comp).some(k => comp[k].imageDigest !== own(own(cfg.imagePins, comp[k].engine) ?? {}, 'imageId'))) return stop('IMAGE-NOT-PINNED', 'an assignment\'s image is not the contract\'s IMAGE_PINS image for its engine (RULINGS Q61i)');
  const binary = ev.build(tree, commit);
  if (!typed(binary, 'hex64')) return stop('BUILD-FAILED', `the evaluator could not build tree ${tree} at ${commit} (RULINGS Q55a step 1)`);
  const domain = claimed.some(o => o.oracles.includes('O-DOMAIN'));
  const prereq = [PREREQ.position, PREREQ.identity, ...(domain ? [PREREQ.w0] : [])].map(i => ctx.byId.get(i));
  for (const o of prereq) if (qualificationRun(o, binary, comp, ev, ctx, ctx.pins, ctx.pinned, cfg.oracleRunners, note) === null) return stop('PREREQ-FAILED', `the evaluator's ${o.id} run did not pass (RULINGS Q34d, Q38b, Q55a)`);
  const a0key = own(ctx.byEngine, comp.source.engine), entry = own(ctx.a0, a0key);
  if (pyFalsy(entry)) return stop('A0-REGISTRY-NULL', `A0_REGISTRY has no entry for source engine ${comp.source.engine}; every comparison is a diagnostic until A0 is frozen (RULINGS Q46b, Q47b)`);
  if (!compositionOk(own(entry, 'composition'), ctx)) return stop('A0-REGISTRY', 'the A0 registry entry\'s composition is not bound (RULINGS Q55b)');
  // Q55a, Codex round 7 finding 2: the control's binary is the evaluator's rebuild of the registry tree, never a manifest label.
  const rebuilt = ev.build(own(entry, 'sourceTreeSha256') ?? null, own(entry, 'commit') ?? null);
  if (!typed(own(entry, 'binarySha256'), 'hex64') || rebuilt !== entry.binarySha256) return stop('A0-REBUILD-MISMATCH', `rebuilding A0 (${own(entry, 'commit')}) gave ${rebuilt}, the registry says ${own(entry, 'binarySha256')} (RULINGS Q55a)`);
  if (!registeredAcceptance(own(entry, 'measuredBy'), 'a0', a0key, entry.commit, ctx.verifiers)) return stop('A0-UNVERIFIED', `the A0 entry's measuredBy ${own(entry, 'measuredBy')} is not a VERIFIER_REGISTRY entry accepting ${a0key} at ${entry.commit} (RULINGS Q61k)`);
  const frozen = cfg.frozenTrace;
  for (const o of claimed) {
    if (qualificationRun(o, binary, comp, ev, ctx, ctx.pins, ctx.pinned, cfg.oracleRunners, note) === null) return stop('MEASUREMENT-RUN-FAILED', `the evaluator's ${o.id} run did not pass (RULINGS Q55a)`);
    if (measured(o)) {
      const wl = ev.workload(o);
      if (!workloadOk(wl, comp, ctx.workloadFields) || !workloadOk(wl, entry.composition, ctx.workloadFields)) return stop('WORKLOAD-IDENTITY', `the evaluator's workload for ${o.id} is missing, untyped or has other fields than WORKLOAD_IDENTITY (RULINGS Q47b, Q67g)`);
      if (!isObj(frozen) || ['sha256', 'seed', 'offerScheduleSha256'].some(k => own(frozen, k) == null)) return stop('TRACE-NOT-FROZEN', 'load-contract.json writerTrace.generator.frozen (sha256, seed, offerScheduleSha256) is null, so no CR-NS or CR-GS comparison has a workload identity (RULINGS Q61h)');
      if (wl.generatorSourceSha256 !== frozen.sha256 || wl.seed !== frozen.seed || wl.offerScheduleSha256 !== frozen.offerScheduleSha256) return stop('TRACE-NOT-FROZEN', `${o.id}: the workload is not the frozen trace (VA15, RULINGS Q61h)`);
      const mp = ev.measure_pair(binary, comp, entry.binarySha256, entry.composition, wl);
      if (!pairedOk(mp, wl, ctx.pair0) || mp.placement.candidate.slot !== comp.source.slot || mp.placement.A0.slot !== entry.composition.source.slot) return stop('CONTROL-UNMATCHED', `${o.id}: no paired-rounds measurement of the candidate against A0 under PAIR_0 on the evaluator's workload, each arm on its own composition's source slot (RULINGS Q47b, Q60, Q61g, Q67f, Q67g)`);
    }
    if (!Object.keys(ctx.verifiers ?? {}).some(v => registeredAcceptance(v, 'obligation', o.id, commit, ctx.verifiers))) return stop('VERIFIER-UNREGISTERED', `no VERIFIER_REGISTRY entry accepts ${o.id} at ${commit} (RULINGS Q55a)`);
  }
  const blocked = contractBlockers(claimed, prereq, domain, ctx);
  if (blocked.length) return stop(blocked[0].code, blocked[0].detail);
  return { verdict: 'QUALIFIED', reasons: [] };
}

/** Contract 0.3.7's evidence_ok, kept as the document check: one supplied receipt as evidence for one obligation, tree,
 * composition and commit (0.3.8's composition_ok included). Returns the first reason it fails, or null. */
export function evidenceOk(r, o, tree, comp, commit, env, ctx) {
  const store = env.store;
  if (!isObj(r)) return 'not a receipt';
  if (r.obligation !== o.id || r.definitionSha256 !== o.definitionSha256) return `not ${o.id} at its current definition`;
  if (r.sourceTreeSha256 !== tree || !same(r.composition, comp)) return 'another source tree or composition';
  if (!compositionOk(comp, ctx)) return 'composition unbound, or the source declares no protocol variant (VA14, RULINGS Q55b)';
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
 * The document check (contract 0.3.7's admit_claim over supplied receipts, with 0.3.9's fields): env = { store,
 * dependencyClosureChangedAt }. Every reason is collected. Additions since 0.3.7: the A0 entry's measuredBy is accepted in
 * VERIFIER_REGISTRY (kind a0, Q61k), workload and control apply to CR-NS and CR-GS only (Q61g), and the control's executed binary must be the A0
 * registry's binarySha256 (Codex round 7 finding 2), the claimed obligation must be accepted in VERIFIER_REGISTRY at the
 * claimed commit, and oracle and W0 acceptance goes through VERIFIER_REGISTRY (contractBlockers).
 */
export function documentCore(claim, env, ctx) {
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
  const a0key = own(ctx.byEngine, own(own(comp, 'source'), 'engine')), entry = own(ctx.a0, a0key);
  if (!entry) why('A0-REGISTRY-NULL', `A0_REGISTRY has no entry for source engine ${own(own(comp, 'source'), 'engine')}; every comparison is a diagnostic until A0 is frozen (RULINGS Q46b, Q47b)`);
  else if (!compositionOk(entry.composition, ctx) || !sha(entry.binarySha256)) why('A0-REGISTRY', 'the A0 registry entry has no bound composition or no binarySha256 (RULINGS Q55a, Q55b)');
  else if (!registeredAcceptance(entry.measuredBy, 'a0', a0key, entry.commit, ctx.verifiers)) why('A0-UNVERIFIED', `the A0 entry's measuredBy ${entry.measuredBy} is not a VERIFIER_REGISTRY entry accepting ${a0key} at ${entry.commit} (RULINGS Q61k)`);
  for (const o of claimed) {
    // WORKLOAD_IDENTITY and the A0 control apply to CR-NS and CR-GS obligations only (workloadIdentity.appliesTo, RULINGS Q61g).
    const wlOk = (w, c) => !measured(o) || workloadOk(w, c, ctx.workloadFields);
    const mine = rs.filter(r => own(r, 'role') === 'measurement' && own(r, 'obligation') === o.id);
    const ownOk = mine.filter(r => evidenceOk(r, o, tree, comp, commit, env, ctx) === null && wlOk(r.workload, comp));
    if (!ownOk.length) why('MEASUREMENT-MISSING', `no valid ${o.id} measurement${measured(o) ? ' with a validated workload identity' : ''}${mine.length ? `: ${mine.map(r => evidenceOk(r, o, tree, comp, commit, env, ctx) ?? 'workload identity missing or invalid (Q47b)').join('; ')}` : ''} (RULINGS Q42a, Q47b)`);
    if (!Object.keys(ctx.verifiers ?? {}).some(v => registeredAcceptance(v, 'obligation', o.id, commit, ctx.verifiers))) why('VERIFIER-UNREGISTERED', `no VERIFIER_REGISTRY entry accepts ${o.id} at ${commit}; a verifier record in the claim counts for nothing (RULINGS Q55a)`);
    if (!ownOk.length || !entry || !measured(o)) continue;
    const theirs = rs.filter(c => own(c, 'role') === 'control' && own(c, 'obligation') === o.id);
    const matched = theirs.filter(c => evidenceOk(c, o, entry.sourceTreeSha256, entry.composition, commit, env, ctx) === null && c.executedBinarySha256 === entry.binarySha256
      && workloadOk(c.workload, entry.composition, ctx.workloadFields) && ownOk.some(m => same(c.workload, m.workload)));
    if (!matched.length) why('CONTROL-UNMATCHED', `no ${o.id} control that executed the registry's A0 binary on its tree and composition with the measurement's workload identity${theirs.length ? `: ${theirs.map(c => evidenceOk(c, o, entry.sourceTreeSha256, entry.composition, commit, env, ctx) ?? (c.executedBinarySha256 !== entry.binarySha256 ? `executed binary ${c.executedBinarySha256} is not the registry's ${entry.binarySha256} (Codex round 7 finding 2)` : 'workload identity missing, invalid or different (Q47b)')).join('; ')}` : ''} (RULINGS Q42a, Q47b, Q55a)`);
  }
  for (const b of contractBlockers(claimed, prereq.map(i => ctx.byId.get(i)), domain, ctx)) why(b.code, b.detail);
  return done();
}

// ================================================================ I/O: git and the object store

/** The git object id of a blob's bytes, in a sha1 or a sha256 repository. */
const blobOid = (bytes, oidLength) => createHash(oidLength === 40 ? 'sha1' : 'sha256').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

/**
 * Read-only git access; blob hashes are sha256 of the blob bytes, cached per commit:path. Failures return null. Replace refs are
 * ignored and user and system configuration is not read, and every object read is checked against the object id it was asked for
 * or its tree entry names, so a `git replace` or a rewritten object file never supplies bytes (RULINGS Q75a, Q75b; V-E01 F2).
 */
export function gitSource(repo) {
  // [EXP-E01] Why: inherited Git overrides must not select another object store or user configuration. Rejected: spreading GIT_* from the caller.
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))), GIT_NO_REPLACE_OBJECTS: '1', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' };
  const run = (args, input) => execFileSync('git', ['--no-replace-objects', '--literal-pathspecs', ...args], { cwd: repo, env, input, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'pipe'] });
  const cache = new Map();
  /** cat-file --batch over the given object names: one { oid, type, bytes } per name (null when missing), each blob verified. */
  const batch = names => {
    if (!names.length) return [];
    let out;
    try { out = run(['cat-file', '--batch'], names.map(n => `${n}\n`).join('')); } catch { return names.map(() => null); }
    let at = 0;
    return names.map(() => {
      const nl = out.indexOf(10, at);
      if (nl < 0) return null;
      const header = out.subarray(at, nl).toString('utf8');
      at = nl + 1;
      // A found object's header is exactly "<oid> <type> <size>"; anything else ("<name> missing", "ambiguous") has no body.
      const m = /^([0-9a-f]{40}|[0-9a-f]{64}) (\w+) (\d+)$/.exec(header);
      if (!m) return null;
      const size = Number(m[3]), bytes = out.subarray(at, at + size);
      at += size + 1;
      if (m[2] === 'blob' && blobOid(bytes, m[1].length) !== m[1]) return null;
      return { oid: m[1], type: m[2], bytes: Buffer.from(bytes) };
    });
  };
  const api = {
    repo: path.resolve(repo),
    resolve(rev) { if (!str(rev) || rev.startsWith('-')) return null; try { return run(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]).toString().trim() || null; } catch { return null; } },
    treeOf(commit) { return run(['rev-parse', `${commit}^{tree}`]).toString().trim(); },
    commitTime(commit) { return Number(run(['show', '-s', '--format=%ct', commit]).toString().trim()); },
    commonDir() { try { return fs.realpathSync(path.resolve(repo, run(['rev-parse', '--git-common-dir']).toString().trim())); } catch { return null; } },
    gitDir() { try { return run(['rev-parse', '--absolute-git-dir']).toString().trim() || null; } catch { return null; } },
    blob(rev, file) {
      if (!safePath(file)) return null;
      const key = COMMIT.test(rev) ? `blob:${rev}:${file}` : null; // only full commit ids are immutable
      if (key && cache.has(key)) return cache.get(key);
      // [EXP-E01] Why: bind bytes to the tree entry, not a separately resolved name. Rejected: trusting cat-file's header alone (substitution).
      const commit = api.resolve(rev), entry = commit && api.tree(commit)?.find(e => e.path === file && e.type === 'blob');
      const o = entry ? batch([entry.oid])[0] : null;
      const bytes = o && o.type === 'blob' && o.oid === entry.oid ? o.bytes : null;
      if (key) cache.set(key, bytes);
      return bytes;
    },
    /** Every entry of a commit's tree, recursively: { mode, type, oid, path }, sorted by path; null when git fails. */
    tree(commit) {
      if (!COMMIT.test(commit)) return null;
      if (cache.has(`tree:${commit}`)) return cache.get(`tree:${commit}`);
      try {
        const tree = run(['ls-tree', '-r', '-z', '--full-tree', commit]).toString('utf8').split('\0').filter(Boolean).map(line => {
          const tab = line.indexOf('\t'); const [mode, type, oid] = line.slice(0, tab).split(' '); return { mode, type, oid, path: line.slice(tab + 1) };
        }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
        cache.set(`tree:${commit}`, tree);
        return tree;
      } catch { return null; }
    },
    /** Map oid -> blob bytes for the given object ids, each verified against its id; cache is shared between calls. */
    objects(oids, shared = new Map()) {
      const want = [...new Set(oids)].filter(o => !shared.has(o) && /^([0-9a-f]{40}|[0-9a-f]{64})$/.test(o));
      batch(want).forEach((o, i) => shared.set(want[i], o && o.type === 'blob' && o.oid === want[i] ? o.bytes : null));
      return new Map(oids.map(o => [o, shared.get(o) ?? null]));
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
      const at = api.resolve(commit), tree = at ? api.tree(at) : null;
      const entries = new Map((tree ?? []).filter(e => e.type === 'blob').map(e => [e.path, e.oid]));
      const objects = api.objects(ok.map(f => entries.get(f)).filter(Boolean));
      for (const f of ok) { const b = objects.get(entries.get(f)); cache.set(`${commit}:${f}`, b ? sha256(b) : null); }
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
  // Q67j (Codex round 8 finding 11): as in qualify, a promotion is rejected until its prerequisites are enforced mechanically.
  if (claim.kind === 'promotion') why('PROMOTION-UNSUPPORTED', 'promotion prerequisites (GATE-BROKER-HARDENING and the others a promotion needs) are not enforced mechanically yet, so promotion admission is rejected (RULINGS Q62b, Q67j)');
  const commit = str(claim.commit) && COMMIT.test(claim.commit) ? git.resolve(claim.commit) : null;
  if (!commit || commit !== claim.commit) return why('CLAIM-COMMIT', `commit ${JSON.stringify(claim.commit)} is not a full commit id in this repository`);
  const label = c => sourceTreeIdOf(git.treeOf(c));
  const claimLabel = label(commit);
  const closureTime = git.commitTime(commit); // dependencyClosureChangedAt: no file at the claimed commit changed after it was committed

  // -- the contract: the authority ref's, never the claimed commit's or the working tree's (VA6, RULINGS Q61a). Why: pins,
  // definitions, schemas and the A0 and verifier registries decide admission; a branch or a working copy must not supply its
  // own, and a claimed commit's own contract can never hold the registry entry that verifies it.
  const authority = git.resolve(authorityRef);
  if (!authority) return why('CONTRACT-AUTHORITY', `authority ref ${authorityRef} does not resolve`);
  const contractBytes = git.blob(authority, PATHS.contract), loadBytes = git.blob(authority, PATHS.loadContract);
  if (!contractBytes || !loadBytes) return why('CONTRACT-MISSING', `${PATHS.contract} or ${PATHS.loadContract} is missing at ${authorityRef}`);
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const loadContract = JSON.parse(loadBytes.toString('utf8'));
  const slots = (() => { const b = git.blob(authority, PATHS.slots); try { return b ? JSON.parse(b.toString('utf8')) : null; } catch { return null; } })();
  const ctx = coreContext(contract, {}, loadContract);

  // -- layer 1: the document check on what I/O found.
  const core = documentCore(claim, { store: objects, dependencyClosureChangedAt: closureTime }, ctx);
  for (const r of core.reasons) why(r.code, r.detail);

  // -- layer 2: the lab's VA rules.
  if (claim.sourceTreeSha256 !== claimLabel) why('CLAIM-SOURCE-LABEL', `sourceTreeSha256 ${claim.sourceTreeSha256} is not the clean label ${claimLabel} of ${commit} (a dirty-tree label can never be bound)`);
  const comp = claim.composition;
  const bound = c => boundComposition(c, ctx);
  if (!bound(comp)) why('COMPOSITION-UNBOUND', 'the claim composition must bind four assignments with string engine, imageDigest, configSha256 (sha256) and slot, and the source its protocol variant (VA14, RULINGS Q55b; red-team pass 1)');
  const entryId = own(ctx.byEngine, own(own(comp, 'source'), 'engine'));
  const entry = own(ctx.a0, entryId);
  let a0Commit = null;
  if (entry) {
    a0Commit = str(entry.commit) && COMMIT.test(entry.commit) ? git.resolve(entry.commit) : null;
    if (a0Commit !== entry.commit || label(a0Commit) !== entry.sourceTreeSha256) why('A0-REGISTRY', `${entryId}: commit ${entry.commit} does not resolve here or its clean label is not ${entry.sourceTreeSha256}`);
    if (!bound(entry.composition) || !sha(entry.binarySha256)) why('A0-REGISTRY', `${entryId} composition is not fully bound or it records no binarySha256 (RULINGS Q55a, Q55b)`);
    if (same(entry.composition, comp)) why('CONTROL-IS-CANDIDATE', 'the claimed composition is the A0 control itself');
  }
  // VA4: every assignment runs the pinned image (lab/config/slots.json at the authority ref; the contract pins no images).
  for (const [side, c] of [['claim', comp], ['A0', entry?.composition]]) if (bound(c)) for (const p of imageProblems(c, contract.imagePins, ctx.assignments)) why('IMAGE-NOT-PINNED', `${side} ${p} (VA4, RULINGS Q61i)`);
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
    if ((role === 'measurement' || role === 'control') && measured(o) && !workloadOk(r.workload, s.comp, ctx.workloadFields)) bad('WORKLOAD-IDENTITY', 'workload identity missing, untyped or not the source slot (RULINGS Q47b)');
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
    // VA15, RULINGS Q61h: the workload's trace is the frozen one of load-contract.json (CR-NS and CR-GS only, Q61g).
    if ((role === 'measurement' || role === 'control') && measured(o)) {
      const frozen = loadContract.writerTrace?.generator?.frozen, w = own(r, 'workload');
      if (!isObj(frozen) || frozen.sha256 == null || frozen.seed == null || frozen.offerScheduleSha256 == null) bad('TRACE-NOT-FROZEN', `${PATHS.loadContract} pins no frozen trace (writerTrace.generator.frozen {sha256, seed, offerScheduleSha256}); VA15 cannot hold`);
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

// The run reads contract 0.3.10's fields by their compiled names: buildSpec (Q61f; null fields fail closed; buildSpecSha256 by
// specSha256Rule, Q65b; installMetadataExclusions, Q71a), oracleRunners (decodedInputArgv for O-DOMAIN) and oracleAnswerRule with
// answerMembers (Q61c), caseManifest (Q61d), imagePins (Q61i), qualificationRun.executionIdentity (Q67b, Q71b), the evidence
// schemas build-manifest/2, case-result/2, oracle-invocation/1 and fault-witness/1 (Q61e, Q61f, Q61j, Q71b), and load-contract.json
// writerTrace.generator.frozen (Q61h) and measurementProtocol (PAIR_0, Q67f, Q67g).
export const QUALIFY = { gate: path.join(import.meta.dirname, 'gate.mjs') };
/** Reasons that only say the run was not on the gate; offlineVerdict is the verdict without them. */
const NOT_ON_GATE = new Set(['GATE-NOT-RUN', 'RUN-NOT-ON-GATE']);
const CLAIM_FIELDS = ['format', 'claimId', 'kind', 'obligations', 'commit', 'sourceTreeSha256', 'composition'];
const trimNl = b => b.length && b[b.length - 1] === 10 ? b.subarray(0, b.length - 1) : b;
const fill = (argv, vars) => argv.map(a => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), a));
const SANDBOX_EXEC = '/usr/bin/sandbox-exec';
/** System directories a child may run tools from besides the recorded toolchain (root-owned on macOS and Linux). */
const SYSTEM_PATH = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];
const TOOLS = ['node', 'pnpm', 'python3'];
const isInside = (root, p) => { const r = path.relative(root, p); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
/** Make a directory tree read-only (files 0444, directories 0555) or writable again (for clean-up). */
function setReadOnly(dir, readOnly) {
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true }).map(d => path.join(d.parentPath ?? d.path, d.name));
  for (const p of readOnly ? entries.reverse().concat([dir]) : [dir, ...entries]) {
    const st = fs.lstatSync(p);
    if (!st.isSymbolicLink()) fs.chmodSync(p, st.isDirectory() ? (readOnly ? 0o555 : 0o755) : (readOnly ? 0o444 : 0o644));
  }
}
const removeDir = d => { try { if (fs.existsSync(d)) { fs.chmodSync(d, 0o755); setReadOnly(d, false); } fs.rmSync(d, { recursive: true, force: true }); } catch { /* left for the OS to collect */ } };

// ---------------------------------------------------------------- the evaluator's own files (RULINGS Q75a)

/** The files a run executes from the evaluator's working tree (claim.mjs, its import lib.mjs, gate.mjs for the plan) and the
 * reference model, each compared with its blob at the evaluator's commit (RULINGS Q75a). */
// [EXP-E01] Why: gate imports execute too. Rejected: pinning only direct entrypoints (transitive code could be poisoned).
// [EXP-G03-R6] Why: main's engine imports the Datomic context verifier even for box commands; the protected clone must bind that dependency too. Rejected: running engine from a different unverified checkout.
export const EVALUATOR_FILES = ['lab/bin/datomic-context.mjs', 'lab/bin/ns-policy.mjs', 'lab/bin/claim.mjs', 'lab/bin/box.mjs', 'lab/bin/box-policy.mjs', 'lab/experiments/EXP-G03/round2/window.mjs', 'lab/bin/box-engine.mjs', 'lab/config/box/Dockerfile', 'lab/config/slots.json', 'lab/bin/lib.mjs', 'lab/bin/gate.mjs', 'lab/bin/engine.mjs', 'lab/bin/heavy-lock.mjs', 'lab/bin/receipt.mjs', 'lab/acceptance/build_contract.py'];
const EVALUATOR_ROOT = path.resolve(import.meta.dirname, '../..');
const POISON_MARKER = 'triplex-evaluator-poisoned.json';
const evaluatorBytes = () => Object.fromEntries(EVALUATOR_FILES.map(f => { try { return [f, sha256(fs.readFileSync(path.join(EVALUATOR_ROOT, f)))]; } catch { return [f, null]; } }));

/**
 * RULINGS Q75a (V-E01 F1): at the start of every run, each evaluator file must be byte-identical to its blob at the evaluator's
 * commit (git read with replace refs ignored, each blob checked against its tree entry's object id), and no earlier run may have
 * marked this checkout poisoned. repo is the repository whose commit vouches for the files (default: the one they live in).
 * Returns { repo, commit, files, marker, problems }.
 */
export function evaluatorIntegrity({ repo = EVALUATOR_ROOT, rev = 'HEAD' } = {}) {
  const git = gitSource(repo);
  const commit = git.resolve(rev), problems = [];
  const files = evaluatorBytes();
  if (!commit) problems.push(`the evaluator's repository ${repo} has no commit ${rev}`);
  else {
    const want = git.blobHashes(commit, EVALUATOR_FILES);
    for (const f of EVALUATOR_FILES) if (files[f] === null || want.get(f) !== files[f]) problems.push(`${f} (${files[f] ?? 'unreadable'}) is not its blob at ${commit} (${want.get(f) ?? 'absent'})`);
  }
  const gitDir = git.gitDir(), marker = gitDir ? path.join(gitDir, POISON_MARKER) : null;
  if (marker && fs.existsSync(marker)) problems.push(`an earlier run marked this evaluator checkout poisoned (${marker}); restore it from git with claim.mjs restore-evaluator`);
  return { repo, commit, files, marker, problems };
}
function poison(integrity, detail) {
  if (!integrity?.marker) return;
  try { fs.writeFileSync(integrity.marker, JSON.stringify({ at: new Date().toISOString(), detail }, null, 2) + '\n'); } catch { /* the reason is reported either way */ }
}
/** Restore every evaluator file from its blob at the evaluator's commit and clear the poison marker once all of them match. */
export function restoreEvaluator({ repo = EVALUATOR_ROOT, rev = 'HEAD' } = {}) {
  const git = gitSource(repo), commit = git.resolve(rev);
  if (!commit) return { ok: false, problems: [`no commit ${rev} in ${repo}`] };
  for (const f of EVALUATOR_FILES) { const b = git.blob(commit, f); if (b) fs.writeFileSync(path.join(EVALUATOR_ROOT, f), b); }
  const marker = git.gitDir() ? path.join(git.gitDir(), POISON_MARKER) : null;
  const before = marker && fs.existsSync(marker);
  if (before) fs.rmSync(marker);
  const after = evaluatorIntegrity({ repo, rev });
  if (after.problems.length && before) poison(after, 'restore did not make every evaluator file match its blob');
  return { ok: !after.problems.length, commit, problems: after.problems };
}

// ---------------------------------------------------------------- the toolchain children run (RULINGS Q71b, Q75d)

function resolveTool(name, pathEnv) {
  for (const d of pathEnv.split(':').filter(x => path.isAbsolute(x))) {
    const found = path.join(d, name);
    try {
      fs.accessSync(found, fs.constants.X_OK);
      if (!fs.statSync(found).isFile()) continue;
      const real = fs.realpathSync(found);
      return { found, path: real, sha256: sha256(fs.readFileSync(real)), version: null };
    } catch { /* not here */ }
  }
  return null;
}
/**
 * The tools a run's children may execute, resolved once from the evaluator's PATH before any candidate process runs (RULINGS Q75b,
 * Q75d): for node, pnpm and python3 the first executable on PATH, its real path, the sha256 of that file and its --version. Children
 * get a PATH of one directory linking each name to its real path, then the system directories.
 */
export function resolveToolchain(pathEnv = process.env.PATH ?? '') {
  const tools = Object.fromEntries(TOOLS.map(n => [n, resolveTool(n, pathEnv)]));
  for (const t of Object.values(tools)) if (t) {
    // [EXP-E01] Why: version probes are children too. Rejected: a shared temporary HOME (cross-child state).
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-version-'));
    try {
      const r = spawnSync(t.path, ['--version'], { encoding: 'utf8', env: { PATH: [...(tools.node ? [path.dirname(tools.node.path)] : []), ...SYSTEM_PATH].join(':'), HOME: home, TMPDIR: home }, timeout: 60_000 });
      t.version = r.status === 0 ? `${r.stdout}${r.stderr}`.trim().split('\n')[0] : null;
    } finally { removeDir(home); }
  }
  return tools;
}
const usesPnpm = spec => [...(spec?.argv ?? []), ...(spec?.run ?? [])].some(a => typeof a === 'string' && /\bpnpm\b/.test(a));
const toolRecord = t => t ? { path: t.path, sha256: t.sha256, version: t.version } : null;
/** The toolchain part of an execution identity (qualificationRun.executionIdentity.toolchain, Q71b, Q75d): node, platform and
 * arch, and pnpm when the build or run calls it, each by path, sha256 and version. Python is recorded per oracle invocation. */
export const toolchainIdentity = (tools, spec) => ({ node: toolRecord(tools.node), pnpm: usesPnpm(spec) ? toolRecord(tools.pnpm) : null, platform: process.platform, arch: process.arch });
/** buildSpecSha256 (Q65b specSha256Rule): sha256 of the canonical JSON of {format, argv, outputs, run}. */
export const buildSpecSha256 = spec => sha256(canonText(Object.fromEntries(['format', 'argv', 'outputs', 'run'].map(k => [k, own(spec, k) ?? null]))));

// ---------------------------------------------------------------- children: one fresh HOME each, a process group, a write sandbox

let sandboxProbe;
/** macOS sandbox-exec, if it can run a profile here (it can be missing, or refused inside another sandbox). */
function sandboxWorks() {
  if (sandboxProbe === undefined) sandboxProbe = process.platform === 'darwin' && fs.existsSync(SANDBOX_EXEC) && spawnSync(SANDBOX_EXEC, ['-p', '(version 1)(allow default)', '/usr/bin/true'], { timeout: 30_000 }).status === 0;
  return sandboxProbe;
}
const sbpl = p => `"${p.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
/** A child may write only its own directories (its checkout for a build or a system under test, and its fresh HOME); it has no
 * network (unix sockets included), no mach-lookup (so it cannot ask launchd to start a process outside the sandbox), and may
 * signal only processes in the same sandbox. Every descendant inherits the profile, a setsid helper included. */
const sandboxProfile = writable => `(version 1)(allow default)(deny file-write*)(allow file-write* ${writable.map(p => `(subpath ${sbpl(fs.realpathSync(p))})`).join(' ')} (literal "/dev/null") (literal "/dev/zero") (literal "/dev/dtracehelper") (regex #"^/dev/tty"))(deny network*)(deny mach-lookup)(deny signal)(allow signal (target same-sandbox))`;

/**
 * runChild(argv, { cwd, writable, timeout, input, label }) for one run (RULINGS Q67e, Q75d, Q75f). Each child gets a fresh HOME and
 * TMPDIR of its own (removed after it exits), PATH pinned to the run's toolchain directory and the system directories, no user
 * configuration, and its own process group, killed as soon as it exits; with sandbox-exec, writes only inside `writable` and its
 * HOME. Output goes to files, so a helper left running cannot keep the evaluator waiting on a pipe.
 */
function childRunner({ iso, toolchainDir, toolchain, sandbox }) {
  return (argv, { cwd, writable = [], timeout = 120_000, input = null, label = 'child' } = {}) => {
    const home = iso(`home-${label}`), io = iso(`io-${label}`);
    const out = path.join(io, 'stdout'), err = path.join(io, 'stderr'), inp = path.join(io, 'stdin');
    if (input) fs.writeFileSync(inp, input);
    const fds = [input ? fs.openSync(inp, 'r') : 'ignore', fs.openSync(out, 'w'), fs.openSync(err, 'w')];
    const env = { PATH: [toolchainDir, ...SYSTEM_PATH].join(':'), HOME: home, TMPDIR: home, LANG: 'C.UTF-8', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1', PYTHONDONTWRITEBYTECODE: '1' };
    // [EXP-E01] Why: refuse changed tools before each invocation. Rejected: end-only hashing (poisoned tools could run first).
    if (TOOLS.includes(argv[0]) && (!toolchain[argv[0]] || !toolchain[argv[0]].version)) throw new Error(`unresolved toolchain: ${argv[0]}`);
    for (const [name, t] of Object.entries(toolchain)) if (t && (fs.realpathSync(path.join(toolchainDir, name)) !== t.path || sha256(fs.readFileSync(t.path)) !== t.sha256)) throw new Error(`toolchain changed: ${name}`);
    const command = toolchain[argv[0]] ? [toolchain[argv[0]].path, ...argv.slice(1)] : argv;
    const full = sandbox ? [SANDBOX_EXEC, '-p', sandboxProfile([...writable, home]), ...command] : command;
    let r;
    try { r = spawnSync(full[0], full.slice(1), { cwd, env, timeout, detached: true, stdio: fds }); }
    finally { for (const fd of fds) if (typeof fd === 'number') fs.closeSync(fd); }
    if (r.pid) { try { process.kill(-r.pid, 'SIGKILL'); } catch { /* the group is already gone */ } }
    const result = { status: r.status, signal: r.signal, error: r.error, stdout: fs.readFileSync(out), stderr: fs.readFileSync(err) };
    removeDir(io);
    removeDir(home);
    return result;
  };
}

// ---------------------------------------------------------------- the evaluator's records

/** A content-addressed directory the evaluator writes its own records into; put(bytes | string | value) -> sha256. Each object is
 * made read-only once written, and put.written holds every hash this run wrote, so a deleted object is noticed (RULINGS Q75i). */
function writeStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const written = new Set();
  const put = value => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    const h = sha256(bytes), file = path.join(dir, h);
    if (!fs.existsSync(file)) { fs.writeFileSync(file, bytes); fs.chmodSync(file, 0o444); }
    written.add(h);
    return h;
  };
  put.written = written;
  put.dir = dir;
  return put;
}

/**
 * Every entry under root except directories, sorted: [path, kind, sha256, mode] with kind f (file bytes), l (symlink text) or x
 * (anything else), mode the permission bits (RULINGS Q75e). It uses lstat and never descends into a symlinked directory; outside
 * lists every symlink whose target resolves outside root, lexically or through the filesystem (V-E01 F3, F10). Paths in exclude
 * (BUILD_SPEC.installMetadataExclusions, Q71a) are left out.
 */
// [EXP-G03] Why: fixture oracle-copy checks need the exact trusted listing used by the re-hash guard. Rejected: a parallel test walker.
export function walkTree(root, exclude = []) {
  const real = fs.realpathSync(root), entries = [], outside = [], skip = new Set(exclude);
  const visit = rel => {
    for (const d of fs.readdirSync(path.join(real, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${d.name}` : d.name, abs = path.join(real, r);
      if (skip.has(r)) continue;
      const st = fs.lstatSync(abs);
      if (st.isSymbolicLink()) {
        const text = fs.readlinkSync(abs, { encoding: 'buffer' });
        entries.push([r, 'l', sha256(text), (st.mode & 0o7777).toString(8)]);
        let resolved = null;
        try { resolved = fs.realpathSync(abs); } catch { resolved = null; }
        if (!isInside(real, path.resolve(path.dirname(abs), text.toString())) || (resolved !== null && !isInside(real, resolved))) outside.push(r);
      } else if (st.isDirectory()) { entries.push([r, 'd', sha256(''), (st.mode & 0o7777).toString(8)]); visit(r); }
      else entries.push([r, st.isFile() ? 'f' : 'x', st.isFile() ? sha256(fs.readFileSync(abs)) : sha256(Buffer.from(String(st.mode))), (st.mode & 0o7777).toString(8)]);
    }
  };
  visit('');
  return { entries: entries.sort((a, b) => cmpStr(a[0], b[0])), outside: outside.sort() };
}
export const runtimeListing = entries => entries.map(([p, k, h, m]) => `${h}  ${k} ${m} ${p}\n`).join('');

/**
 * The execution identity of one build instance (qualificationRun.executionIdentity, RULINGS Q67b, Q71a, Q71b, Q75d, Q75e): the
 * source tree label, the build spec hash, the lockfile, the toolchain (each tool by path, sha256 and version), runnerSha256 over
 * the whole post-build checkout (every file's bytes and mode and every link's text; install metadata excluded) and configSha256,
 * which is null: no engine configuration is applied offline, so the composition's configuration is recorded with each execution
 * as unbound, never hashed as if applied. Returns the canonical record bytes; its sha256 is the binarySha256 build returns and
 * A0_REGISTRY records. Rejected: the hash of the declared dist outputs alone (Codex round 8 finding 2).
 */
// [EXP-G03] Why: one canonical v2 constructor binds actual walker modes/links in both runs and focused fixture checks.
// Rejected: a fixture-only hash that could disagree with the evaluator's identity.
export function boxExecutionIdentity({runner,...fields}) {
  return Buffer.from(canonText({...fields,schema:'execution-identity/2',runnerSha256:sha256(runtimeListing(runner))}));
}
export function executionIdentity({ sourceTreeSha256, buildSpecSha256: specSha, lockfileSha256, toolchain, runner }) {
  return Buffer.from(canonText({ schema: 'execution-identity/1', sourceTreeSha256, buildSpecSha256: specSha, lockfileSha256: lockfileSha256 ?? null, toolchain, runnerSha256: sha256(runtimeListing(runner)), configSha256: null }));
}

/**
 * Re-judge a case-result/2 record (RULINGS Q67i, Q71c): a refusal is REFUSED, any other oracle failure FAIL, otherwise the declared
 * comparator on the retained raw expected and observed objects (recompute). No comparator is plain byte equality; CMP-EXACT-VALUE
 * compares the canonical values, and hash equality applies only to case-result/1 documents (Q75j).
 */
export function caseResultVerdict(rec, store) {
  if (rec.oracleExit === 2 || rec.oracleCode === 'X-NOT-MODELED') return 'REFUSED';
  if (rec.oracleExit !== 0 || rec.oracleCode !== null) return 'FAIL';
  const e = store.get(rec.expectedSha256), o = store.get(rec.observedSha256);
  return e.ok && o.ok ? recompute(rec.comparator, e.bytes, o.bytes) : 'FAIL';
}

/** The offline stand-in for step 3: the evaluator-built system under test run locally with the build spec's run argv, through the
 * run's child runner (fresh HOME, pinned PATH, own process group, writes confined to its checkout). Its observations make the run
 * DIAGNOSTIC (RUN-NOT-ON-GATE) whatever they show. */
export function localSut(spec) {
  return ({ dir, casePath, mode, runChild }) => {
    const r = runChild(fill(spec.run, { case: casePath, mode }), { cwd: dir, writable: [dir], label: 'sut' });
    return { exit: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
  };
}

/** Step 3 as far as it exists: gate.mjs OBL --dry-run checks the lane and the registered slot and echoes the plan. */
export function gateDryRun(workDir, runChild) {
  if (!runChild) throw new Error('gateDryRun requires the run-bound child runner');
  return plan => {
    const file = path.join(workDir, 'gate-plan.json');
    fs.writeFileSync(file, JSON.stringify(plan, null, 2) + '\n');
    // [EXP-E01] Why: the gate uses the same recorded toolchain and per-child environment. Rejected: inherited HOME/PATH.
    const argv = ['node', QUALIFY.gate, 'OBL', '--lane', String(plan.lane), '--slot', String(plan.slot), '--dry-run', '--plan', file];
    const r = runChild(argv, { cwd: EVALUATOR_ROOT, writable: [workDir], timeout: 60_000, label: 'gate' });
    let out = null;
    try { out = JSON.parse(r.stdout); } catch { out = null; }
    return r.status === 0 && isObj(out) ? { ok: true, ...out } : { ok: false, error: `${r.stderr?.length ? r.stderr : r.stdout}`.trim().slice(0, 400) };
  };
}

// ---------------------------------------------------------------- trusted bytes, read before any candidate process (Q75b)

/** Every tracked entry of a commit with its bytes, each blob checked against its tree entry's object id (RULINGS Q75b). */
function snapshotCommit(git, commit, cache) {
  const tree = git.tree(commit);
  if (!tree) return null;
  const blobs = git.objects(tree.filter(e => e.type === 'blob').map(e => e.oid), cache);
  const files = new Map();
  for (const e of tree) {
    if (e.type === 'blob') { const b = blobs.get(e.oid); if (!b) return null; files.set(e.path, { mode: e.mode, bytes: b, sha256: sha256(b) }); }
    else if (e.type === 'commit') files.set(e.path, { mode: e.mode, bytes: null, sha256: null });
  }
  return { commit, files };
}
/** Write a snapshot as a checkout: files with their git mode (0644 or 0755, set explicitly, not by umask), links with their text,
 * a submodule as an empty directory (as git archive writes it). No filter, attribute or export rule applies. */
function writeCheckout(snap, dir) {
  for (const [p, f] of snap.files) {
    const abs = path.join(dir, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (f.mode === '120000') fs.symlinkSync(f.bytes, abs);
    else if (f.mode === '160000') fs.mkdirSync(abs, { recursive: true });
    else { fs.writeFileSync(abs, f.bytes); fs.chmodSync(abs, f.mode === '100755' ? 0o755 : 0o644); }
  }
}
/** pinnedFileProblems over a snapshot: each pinned file a regular blob with the pinned sha256; a key ending in "/" pins the listing
 * hash of the directory's tracked files (VA6). */
function snapshotPinProblems(snap, map) {
  const out = [];
  for (const p of Object.keys(map).filter(k => !k.endsWith('/'))) { const f = snap.files.get(p); if (!f || f.mode === '120000' || f.mode === '160000' || f.sha256 !== map[p]) out.push(`${p} hashes to ${f?.sha256 ?? null}, pinned ${map[p]}`); }
  for (const dir of Object.keys(map).filter(k => k.endsWith('/'))) {
    const listed = [...snap.files.keys()].filter(p => p.startsWith(dir)).sort();
    const actual = listed.length ? listingHash(listed.map(p => [p, snap.files.get(p).sha256])) : null;
    if (actual !== map[dir]) out.push(`directory ${dir} hashes to ${actual}, pinned ${map[dir]}`);
  }
  return out;
}

/**
 * Read, hash and copy everything the run trusts before the first candidate process runs (RULINGS Q75b; V-E01 F2): the claimed
 * commit's and the A0 commit's trees (every blob checked against its object id), the case manifests and inputs of every obligation
 * the run may execute, and every oracle's files, copied into a read-only directory of their own (pinned files from the claimed
 * commit once they hash to the pin; an unpinned COMPILED oracle's runner files from the authority). Nothing is read from git after
 * this: a request the run did not prepare is refused, never read late.
 */
function prepareTrusted({ git, commit, authority, authorityRef, contract, ctx, obligations, a0Commit, why, iso }) {
  const cache = new Map(), snapshots = new Map();
  for (const c of [commit, a0Commit].filter(Boolean)) if (!snapshots.has(c)) { const s = snapshotCommit(git, c, cache); if (s) snapshots.set(c, s); else why('SNAPSHOT-FAILED', `the tree of ${c} could not be read with every blob matching its object id (RULINGS Q75b)`); }
  const snap = snapshots.get(commit), manifests = new Map(), inputs = new Map();
  for (const set of new Set(obligations.flatMap(o => o.cases.map(c => c.set)))) {
    const cs = own(contract.caseSets, set), f = isObj(cs) && safePath(cs.manifest) ? snap?.files.get(cs.manifest) : null;
    const bytes = f?.bytes ?? null;
    manifests.set(set, bytes);
    let cases = [];
    try { cases = bytes ? JSON.parse(bytes.toString('utf8')).cases : []; } catch { cases = []; }
    for (const x of Array.isArray(cases) ? cases : []) if (isObj(x) && safePath(x.input)) { const b = snap?.files.get(x.input); if (b?.bytes && b.mode !== '120000') inputs.set(x.input, b.bytes); }
  }
  const oracles = new Map();
  for (const x of new Set(obligations.flatMap(o => o.oracles))) {
    const pin = own(ctx.pins, x), runner = own(ctx.cfg.oracleRunners, x);
    let files = null, pinCommit = null, from = null;
    if (!isObj(runner) || !strList(runner.argv)) why('ORACLE-NO-RUNNER', `the contract's oracleRunners give no argv for ${x} (RULINGS Q61c)`);
    else if (isObj(pin?.sha256)) {
      if (pin.acceptReceipt == null || !Object.values(pin.sha256).every(sha) || Object.keys(pin.sha256).some(p => p.endsWith('/') || !safePath(p))) why('ORACLE-UNPINNED', `${x} has no accepted per-file pin, so its expected answers cannot be computed from pinned code (RULINGS Q37b, Q55a)`);
      else if (!snap) why('ORACLE-FILES', `${x}: the claimed commit's tree was not read`);
      else { const problems = snapshotPinProblems(snap, pin.sha256); for (const p of problems) why('ORACLE-FILES', `${x} at ${commit}: ${p} (VA6)`); if (!problems.length) { files = Object.keys(pin.sha256).map(p => [p, snap.files.get(p).bytes, pin.sha256[p]]); pinCommit = str(pin.commit) ? pin.commit : commit; from = commit; } }
    } else if (!pin && ctx.oracles[x]?.status === 'COMPILED' && strList(runner.files) && runner.files.every(safePath)) {
      const read = runner.files.map(p => [p, git.blob(authority, p)]);
      if (read.some(([p, b]) => !b || (isObj(runner.sha256) && sha256(b) !== runner.sha256[p]))) why('ORACLE-FILES', `${x}: a runner file is missing at ${authorityRef}, or its blob differs from its declared hash/object identity (RULINGS Q75b, Q75c)`);
      else { files = read.map(([p, b]) => [p, b, sha256(b)]); pinCommit = authority; from = authority; }
    } else why('ORACLE-UNPINNED', `${x} is ${ctx.oracles[x]?.status ?? 'unknown'}, has no per-file pin, and its runner names no files to run from ${authorityRef} (RULINGS Q59e, Q61c)`);
    let out = null;
    if (files) {
      const dir = iso(`oracle-${x}`);
      for (const [p, b] of files) { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), b); }
      setReadOnly(dir, true);
      out = { dir, argv: runner.argv, runner, pinCommit, from, expect: runtimeListing(walkTree(dir).entries) };
    }
    oracles.set(x, out);
  }
  return { snapshots, manifests, inputs, oracles };
}

/**
 * The lab's executor for admitCore (QUALIFICATION_RUN steps build, resolve, execute, expect, compare, control, record). Every
 * value it returns comes from the evaluator's own work and from bytes prepareTrusted read before any candidate process ran; the
 * claim supplies only kind, obligations, commit, tree label and composition.
 *   build(tree, commit)        a new instance per call: the prepared tree of commit written into a fresh directory, built with the
 *                              contract's buildSpec as a child (fresh HOME, pinned PATH, own process group, writes confined to its
 *                              checkout); a symlink resolving outside the checkout is refused; returns the instance's execution
 *                              identity and writes build-manifest/2 and execution-identity/1
 *   manifest(set) / input(p)   the prepared manifest and case input bytes (admitCore checks both hashes)
 *   oracle(orc, commit, raw)   the oracle's read-only copy, re-listed and re-hashed before every invocation, run as a child with
 *                              no writable directory but its HOME; oracleAnswerRule decides the answer; one oracle-invocation/1 each
 *   sut(binary, comp, x, mode) offline: the instance with that execution identity, re-hashed whenever another instance ran in
 *                              between, run as a child; through the gate: not yet (null)
 *   compare(cmp, exp, obs)     the declared comparator (recompute); writes case-result/2, re-judged the same way (Q67i)
 *   witness(...)               no fault injector exists, so no fault-witness/1: null (a faultPoint case fails closed)
 *   workload(o)                the evaluator's workload from the frozen trace (CR-NS and CR-GS only; no slot, Q67g)
 *   measure_pair(...)          no PAIR_0 paired-rounds runner exists: null (a CR-NS or CR-GS comparison fails closed)
 */
// [EXP-G03] Why: the final-use guard is also checked directly for external controller faults; candidates see only read-only inputs.
// Rejected: candidate callbacks with Mac filesystem access.
export function verifyInputCopy(h,p,why) {
  let ok=false;try{ok=sha256(fs.readFileSync(p))===h}catch{}
  if(!ok)why('INPUT-TAMPERED',`the evaluator's copy of case input ${h} is missing, unreadable or changed after it was written (Q81a)`);
  return ok;
}
export function verifyOracleCopy(x, root, why) {
    if (root.broken) return false;
    let now = null;
    try { const w = walkTree(root.dir); now = w.outside.length ? null : runtimeListing(w.entries); } catch { now = null; }
    if (now === root.expect) return true;
    root.broken = true;
    why('ORACLE-TAMPERED', `the evaluator's copy of ${x}'s files changed after it was written; the oracle is not run again (RULINGS Q67e)`);
    return false;
  }
function labExecutor({ commit, contract, ctx, spec, slots, loadContract, claim, pre, put, iso, runChild, toolchain, sut, why, run, box, canaryPort, offline }) {
  const instances = [], byIdentity = new Map(), inputFiles = new Map(), answers = new Map(), repCount = new Map();
  const specSha = buildSpecSha256(spec), exclusions = Array.isArray(spec?.installMetadataExclusions) ? spec.installMetadataExclusions.filter(safePath) : [];
  const inputsDir = iso('inputs');
  let current = { o: null }, last = null, lastAnswer = null;
  ctx.onRun = (o, binary) => { current = { o, binary }; };
  // [EXP-E01] Why: Q81a covers persistent edits after final use. Rejected: pre-use checks alone (no next use to detect them).
  const verifyInput = (h,p) => verifyInputCopy(h,p,why);

  // A case input is copied once and re-hashed before every use and at the end, before isolation cleanup.
  const inputPath = raw => {
    const h = sha256(raw), p = path.join(inputsDir, `${h}.json`);
    if (!inputFiles.has(h)) { fs.writeFileSync(p, raw); fs.chmodSync(p, 0o444); inputFiles.set(h, p); }
    return verifyInput(h, p) ? p : null;
  };
  const ev = {
    slots: [...new Set(Object.values(isObj(slots?.slots) ? slots.slots : {}).flatMap(l => isObj(l) ? Object.keys(l) : []))],
    build(tree, c) {
      const snap = pre.snapshots.get(c);
      if (!snap || pre.labels.get(c) !== tree) { why('BUILD-REFUSED', `tree ${tree} at ${c} is not a tree the run read before its first candidate process (the claimed commit or the A0 entry's, under its clean label; RULINGS Q55a step 1, Q75b)`); return null; }
      if (!strList(spec?.argv) || !Array.isArray(spec?.outputs) || !spec.outputs.length || !spec.outputs.every(p => safePath(p.replace(/\/$/, '')))) { why('BUILD-SPEC', 'the contract\'s buildSpec argv or outputs are not usable (RULINGS Q61f)'); return null; }
      // Q67b: every build call is its own instance, in its own directory; nothing is shared with another instance.
      if (!box) { why('ISOLATION-NOT-IN-FORCE', 'no container executor; candidate builds are refused'); return null; }
      const n = instances.length;
      let built;
      try { built = box.build(snap, spec); }
      catch (error) { why('ISOLATION-NOT-IN-FORCE', String(error)); return null; }
      const dir = built.volume, walk = { ...built.walk, entries: built.walk.entries.filter(e => !exclusions.includes(e[0])) };
      const inputList = [...built.files.keys()];
      const modules = walk.modules.map(m => {
        const bytes = Buffer.from(m.base64, 'base64');
        if (sha256(bytes) !== m.sha256) throw Error('walker module bytes mismatch');
        return { path: m.path, sha256: put(bytes) };
      });
      const identityBytes = boxExecutionIdentity({ sourceTreeSha256: tree, buildSpecSha256: specSha,
        boxInputsSha256: sha256(canonText(spec.boxInputs)), installMetadataExclusionsSha256: sha256(canonText(exclusions)), lockfileSha256: snap.files.get('pnpm-lock.yaml')?.sha256,
        toolchain: box.toolchain, runner:walk.entries, configSha256: null,
        imageId: box.config.imageId, imageBuildInputsSha256: box.config.buildInputsSha256, storeListingSha256: box.storeListingSha256,
        isolationProfileSha256: sha256(canonText({ ...isolationProfile(box.config), resultLimits: { stdoutMaxBytes: box.config.stdoutMaxBytes ?? 16777216, caseTimeoutMs: box.config.caseTimeoutMs ?? 120000, buildTimeoutMs: box.config.buildTimeoutMs ?? 1800000 } })),
        runtime: box.runtime, kernel: box.kernel, gateway: box.config.gatewaySpec ?? null });
      const identity = put(identityBytes);
      const runnerSha256 = put(runtimeListing(walk.entries));
      const manifest = put({ schema: 'build-manifest/2', sourceTreeSha256: tree, binarySha256: identity, modules,
        inputs: inputList.map(p => ({ path: p, sha256: snap.files.get(p).sha256 })), buildSpecSha256: specSha });
      const rec = { n, commit: c, dir, volume: built.volume, identity, runtime: walk.entries, manifest, tampered: false };
      instances.push(rec);
      // Two instances with one identity have byte-identical checkouts (same tree, spec, toolchain, every file and mode), so either
      // executes the same code; the first one serves both.
      if (!byIdentity.has(identity)) byIdentity.set(identity, rec);
      const summary = { instance: n, commit: c, sourceTreeSha256: tree, binarySha256: identity, runnerSha256, distSha256: listingHash(modules.map(x => [x.path, x.sha256])), runtimeFiles: walk.entries.length,
        buildManifestSha256: manifest, modules: modules.length, inputs: inputList.length, checkout: dir };
      run.instances.push(summary);
      run.builds[c] = summary;
      return identity;
    },
    manifest(set) { return pre.manifests.get(set) ?? null; },
    input(p) {
      const b = pre.inputs.get(p) ?? null;
      if (!b) why('CASE-INPUT', `case input ${p} is not a file at ${commit} (or was not named by a manifest the run read before its first candidate process)`);
      return b;
    },
    oracle(orc, pinCommit, raw) {
      const key = `${orc}\u0000${Buffer.isBuffer(raw) ? sha256(raw) : ''}`;
      if (answers.has(key)) return (lastAnswer = answers.get(key));
      const root = Buffer.isBuffer(raw) ? pre.oracles.get(orc) ?? null : null;
      let a = null;
      if (root && verifyOracleCopy(orc, root, why)) {
        const casePath = inputPath(raw);
        if (casePath) {
          // O-DOMAIN (0.3.10 decodedInputArgv): a case carrying inputBase64 is decoded and fed on stdin with the case's op.
          let doc = null;
          try { doc = JSON.parse(raw.toString('utf8')); } catch { doc = null; }
          const decoded = strList(root.runner.decodedInputArgv) && isObj(doc) && typeof doc.inputBase64 === 'string' && str(doc.op);
          const argv = decoded ? fill(root.runner.decodedInputArgv, { op: doc.op }) : fill(root.argv, { case: casePath });
          const r = runChild(argv, { cwd: root.dir, writable: [], label: `oracle-${orc}`, input: decoded ? Buffer.from(doc.inputBase64, 'base64') : null });
          const exit = r.status ?? -1, stderr = r.stderr, stdout = r.stdout;
          // oracleAnswerRule (Q45b, Q47a, Q61c): exit 2 or X-NOT-MODELED on either stream is a refusal; any other nonzero exit is an
          // oracle error; on exit 0 stdout is one canonical JSON document, and the answer is its answerMembers (O-REPLAY:
          // commandOutcomes, state, queries) or, for an oracle whose answerMembers are null, the whole document.
          const refused = exit === 2 || stderr.includes('X-NOT-MODELED') || stdout.includes('X-NOT-MODELED');
          const parsed = !refused && exit === 0 ? canonicalAnswer(trimNl(stdout)) : { ok: false };
          const members = own(ctx.answerMembers, orc);
          const answer = parsed.ok && Array.isArray(members) ? (isObj(parsed.value) && members.every(k => has(parsed.value, k)) ? Buffer.from(canonText(Object.fromEntries(members.map(k => [k, parsed.value[k]])))) : null) : parsed.ok ? trimNl(stdout) : null;
          a = refused ? { exit, code: 'X-NOT-MODELED', output: null } : exit !== 0 || !answer ? { exit, code: 'X-ORACLE-ERROR', output: null } : { exit: 0, code: null, output: answer };
          if (a.code) why(refused ? 'CASE-REFUSED' : 'ORACLE-ERROR', `oracle ${orc} on input ${sha256(raw)}: exit ${exit} ${a.code}${exit === 0 && !refused ? ' (stdout is not one canonical JSON document with the answer members)' : ''}: ${stderr.toString('utf8').trim().slice(0, 200)} (RULINGS Q45b, Q47a, Q61c)`);
          // oracle-invocation/1 (Q71b): the runtime that ran it, because an answer can depend on it.
          const tool = toolchain[argv[0]] ?? null;
          const invocation = put({ schema: 'oracle-invocation/1', oracle: orc, pinCommit: root.pinCommit, argvSha256: sha256(canonText(decoded ? root.runner.decodedInputArgv : root.argv)), runtime: tool ? `${tool.version} (${tool.path}, sha256 ${tool.sha256})` : String(argv[0]),
            inputSha256: sha256(raw), exit, outputSha256: put(stdout) });
          run.oracle.push({ oracle: orc, inputSha256: sha256(raw), exit, code: a.code, outputSha256: put(a.output ?? stderr), invocationSha256: invocation });
          a = { ...a, oracle: orc, inputSha256: sha256(raw) };
        }
      }
      answers.set(key, a);
      lastAnswer = a;
      return a;
    },
    sut(binary, comp, x, mode) {
      const b = byIdentity.get(binary);
      const k = `${current.o?.id}\u0000${binary}\u0000${own(x, 'id')}\u0000${mode}`;
      const rep = repCount.get(k) ?? 0;
      repCount.set(k, rep + 1);
      last = { instance: b?.n ?? null, build: b?.commit ?? null, binary, comp, x, mode, rep, observed: null };
      const raw = isObj(x) && safePath(x.input) ? pre.inputs.get(x.input) ?? null : null;
      if (!b || !raw || sha256(raw) !== own(x, 'contentSha256') || !box) return null;
      // [EXP-E01] Why: same-instance mutations must fail too. Rejected: hashing only on instance switches (last-case edits escaped).
      verifyBuild(b);
      if (b.tampered) return null;
      const casePath = inputPath(raw);
      if (!casePath) return null;
      let seen;
      try {
        const arm = offline ? {network:'none',env:[],configSha256:null} : box.arm(comp, canaryPort);
        let gateway;
        try {
          if (!offline && comp.source.engine === 'datomic') {
            gateway = box.gateway(b, arm, box.config.gatewaySpec, box.auxiliaryPlacement(comp.source.slot).cpuset);
            if (!gateway.durableReadbackAllowed) why('DATOMIC-DEV-STORAGE', 'Datomic dev storage cannot qualify durable readback (Q86f); this run stays diagnostic');
          }
          seen = box.case(b, raw, mode, spec.run, arm.network, gateway?.env ?? arm.env);
        } finally { if (gateway) box.remove(gateway.name); }
        last.configSha256 = arm.configSha256;
      } catch (error) { why('ISOLATION-NOT-IN-FORCE', String(error)); return null; }
      last.rawStdoutSha256 = put(seen.stdout); last.rawStderrSha256 = put(seen.stderr.subarray(0, 65536));
      last.observed = seen.exit === 0 ? trimNl(seen.stdout) : null;
      last.exit = seen.exit;
      return last.observed;
    },
    compare(cmp, exp, obs) {
      // Q67i: the declared comparator decides, on the raw objects retained below.
      const v = Buffer.isBuffer(exp) && Buffer.isBuffer(obs) ? recompute(cmp, exp, obs) : 'FAIL';
      const expectedSha256 = Buffer.isBuffer(exp) ? put(exp) : null, observedSha256 = put(Buffer.isBuffer(obs) ? obs : Buffer.from(`X-NO-OBSERVATION${last?.exit != null ? ` exit ${last.exit}` : ''}\n`));
      const o = current.o, x = last?.x;
      const selection = o && isObj(x) ? (o.cases.flatMap(c => c.select).find(t => t === 'all' || t === x.id || (Array.isArray(x.tags) && x.tags.includes(t))) ?? null) : null;
      const rec = o && isObj(x) && expectedSha256 && lastAnswer ? put({ schema: 'case-result/2', obligation: o.id, case: x.id, selection, oracle: lastAnswer.oracle, oracleExit: lastAnswer.exit, oracleCode: lastAnswer.code,
        expectedSha256, observedSha256, mode: last.mode, rep: last.rep, comparator: cmp, inputSha256: x.contentSha256 }) : null;
      // Q67b, Q75e: an execution is the instance plus the configuration it ran under; offline no engine configuration is applied, so
      // the composition is recorded as unbound configuration, not hashed as if applied.
      const executionSha256 = last?.binary ? sha256(canonText({ binarySha256: last.binary, configApplied: Boolean(last?.configSha256), configSha256: last?.configSha256 ?? null })) : null;
      run.cases.push({ obligation: o?.id ?? null, instance: last?.instance ?? null, build: last?.build ?? null, executionSha256, configApplied: Boolean(last?.configSha256), case: x?.id ?? null, mode: last?.mode ?? null, rep: last?.rep ?? null,
        comparator: cmp, verdict: v, rawStdoutSha256: last?.rawStdoutSha256 ?? null, rawStderrSha256: last?.rawStderrSha256 ?? null, expectedSha256, observedSha256, recordSha256: rec, unboundConfig: last?.comp ?? null });
      if (v !== 'PASS' && box) why(v === 'UNCOMPARABLE' ? 'CASE-UNCOMPARABLE' : 'CASE-FAIL', `instance ${last?.instance ?? '?'} (${last?.build ?? '?'}) ${o?.id} ${x?.id} mode ${last?.mode}: ${cmp} ${v}${obs == null ? ` (no observation${last?.exit != null ? `, exit ${last.exit}` : ''})` : ''} (RULINGS Q55a, Q67i)`);
      return v === 'PASS';
    },
    witness(oid, binary, comp, x, mode, rep) {
      why('FAULT-WITNESS-MISSING', `${oid} ${own(x, 'id')}: no fault injector exists in this evaluator, so no fault-witness/1 for mode ${mode} repetition ${rep} (RULINGS Q61j)`);
      return null;
    },
    workload() {
      const frozen = loadContract.writerTrace?.generator?.frozen, w = (loadContract.windows ?? {})[claim.kind === 'promotion' ? 'acceptance' : 'screening'];
      if (!(isObj(frozen) && sha(frozen.sha256) && Number.isSafeInteger(frozen.seed) && sha(frozen.offerScheduleSha256) && Number.isSafeInteger(w?.warmupS) && Number.isSafeInteger(w?.perLadderLevelS))) {
        why('TRACE-NOT-FROZEN', `${PATHS.loadContract} writerTrace.generator.frozen (sha256, seed, offerScheduleSha256) or the window is not pinned, so no CR-NS or CR-GS comparison has a workload identity (VA15, RULINGS Q47b, Q61h)`);
        return null;
      }
      // 0.3.10 (Q67g): the shared workload identity has no slot; each arm's placement is in the paired measurement.
      return { generatorSourceSha256: frozen.sha256, seed: frozen.seed, offerScheduleSha256: frozen.offerScheduleSha256, window: [w.warmupS, w.warmupS + w.perLadderLevelS] };
    },
    measure_pair() {
      why('PAIRED-NOT-RUN', 'the PAIR_0 paired-rounds measurement of the candidate against A0 (two registered slots with disjoint, equal cpusets, the NS gate) has no runner in this evaluator yet (RULINGS Q60, Q61g, Q67f, Q67g)');
      return null;
    },
  };
  function verifyBuild(b) {
    if (b.tampered) return;
    const now = box ? { entries: box.walk(b.volume).entries.filter(e => !exclusions.includes(e[0])), outside: [] } : walkTree(b.dir, exclusions);
    if (runtimeListing(now.entries) !== runtimeListing(b.runtime) || now.outside.length) {
      b.tampered = true;
      why('BUILD-TAMPERED', `instance ${b.n} (${b.commit}): its checkout changed after the evaluator built it (RULINGS Q67b, Q67e)`);
    }
  }
  // [EXP-E01] Why: detect even the final execution's edits. Rejected: pre-invocation-only checks (no later invocation).
  ev.verifyRuntime = () => {
    for (const [h, p] of inputFiles) verifyInput(h, p);
    for (const b of instances) verifyBuild(b);
    if (box) box.attestStore();
    for (const [x, root] of pre.oracles) if (root) verifyOracleCopy(x, root, why);
  };
  // Q67e: immediately before every invocation, the oracle copy holds exactly the prepared files with their bytes and read-only
  // modes, and nothing else (no planted module, no bytecode cache); any change refuses the oracle for the rest of the run.

  return ev;
}

/** Execute only from a protected evaluator clone with explicit commit ids. Candidates use BoxExecutor;
 * trusted oracles retain the existing copied, rehashed Mac runner. Offline requests remain diagnostic. */
export function evaluatorCloneProblems(root, sourceGit, evaluatorGit, workDir) {
  const problems = [], absolute = path.resolve(root);
  const writable = ['/Users/sam/projects/triplex-db-2', '/Users/sam/Claude/Projects/triplex-db-2', '/tmp', '/private/tmp', os.tmpdir()];
  if (writable.some(p => absolute === path.resolve(p) || absolute.startsWith(path.resolve(p) + path.sep))) problems.push('evaluator is inside an agent writable root');
  if (!evaluatorGit.commonDir() || evaluatorGit.commonDir() === sourceGit.commonDir() || evaluatorGit.gitDir() !== evaluatorGit.commonDir()) problems.push('evaluator requires an independent clone, not a shared worktree');
  const output = path.resolve(workDir ?? absolute);
  if (!output.startsWith(absolute + path.sep)) problems.push('evidence work directory must be inside the protected evaluator clone');
  return problems;
}
export function qualifyClaim(claim, env) {
  const reasons = [];
  const seen = new Set();
  const why = (code, detail, receipt) => { const k = `${code}\u0000${detail}`; if (!seen.has(k)) { seen.add(k); reasons.push(receipt ? { code, detail, receipt } : { code, detail }); } };
  const run = { offline: env?.offline === true || typeof env?.sut === 'function', ignored: [], builds: {}, instances: [], cases: [], oracle: [], gate: null, objects: null, core: null, evaluator: null, toolchain: null, isolation: null, dirs: [] };
  why('GATE-NOT-RUN', 'no pinned case has yet completed through the isolated OBL executor and cleanup proofs (Q55a, Q86)');
  if (run.offline) why('RUN-NOT-ON-GATE', 'the system under test runs in an offline container with network none; no registered engine configuration is applied');
  const state = {};
  try {
    // Q75a: the evaluator's own files match their blobs at its commit, and no earlier run marked this checkout poisoned.
    if (!COMMIT.test(env?.authorityRef ?? '') || !COMMIT.test(env?.evaluator?.rev ?? '')) {
      why('ISOLATION-NOT-IN-FORCE', 'qualification requires explicit --authority and --evaluator-commit full commit ids (Q86e)');
    } else if (path.resolve(env.evaluator.repo ?? EVALUATOR_ROOT) !== EVALUATOR_ROOT || evaluatorCloneProblems(EVALUATOR_ROOT, env.git, gitSource(EVALUATOR_ROOT), env.workDir).length) {
      why('ISOLATION-NOT-IN-FORCE', 'the executing evaluator must be in its own clone, with no shared git directory with candidate source (Q86e)');
    } else state.integrity = evaluatorIntegrity(env?.evaluator ?? {});
    if (state.integrity) {
    run.evaluator = { repo: state.integrity.repo, commit: state.integrity.commit, files: state.integrity.files };
    if (state.integrity.problems.length) { for (const p of state.integrity.problems) why('EVALUATOR-TAMPERED', `${p}; the run is refused (RULINGS Q75a)`); poison(state.integrity, state.integrity.problems.join('; ')); }
    else runQualification(claim, env, why, run, state);
    }
  } catch (error) { why('EVALUATOR-ERROR', `qualification stopped: ${error?.message ?? error} (fail closed)`); }
  // Q75i: the end checks run inside a try of their own, so an unreadable store or file is a reason, never an exception.
  try { endChecks(why, run, state); } catch (error) { why('EVALUATOR-ERROR', `the end-of-run checks stopped: ${error?.message ?? error} (fail closed)`); }
  if (state.box) {
    try { state.box.close(); } catch (error) { why('ISOLATION-NOT-IN-FORCE', `cleanup proof failed: ${error}`); }
    run.isolation = { ...run.isolation, records: state.box.records, resourcesRemaining: state.box.resources };
  }
  if (state.gateExecuted && !reasons.some(r => r.code === 'ISOLATION-NOT-IN-FORCE')) {
    const index = reasons.findIndex(r => r.code === 'GATE-NOT-RUN'); if (index >= 0) reasons.splice(index, 1);
  }
  if (!env?.keepIsolation) for (const d of run.dirs) removeDir(d);
  return { verdict: reasons.length ? 'DIAGNOSTIC' : 'QUALIFIED', offlineVerdict: run.offline ? 'DIAGNOSTIC' : null, reasons: summarise(reasons), run };
}

/** The checks after a run (RULINGS Q67e, Q75a, Q75d, Q75i): the evaluator's files are those it started with (a change poisons the
 * checkout), every handed-out case input is present with its bytes (Q81a), the toolchain's files are unchanged, and every
 * evidence object the run wrote is present with its bytes and nothing
 * else is in the store. */
export function endChecks(why, run, state) {
  state.verifyRuntime?.();
  if (state.integrity && !state.integrity.problems.length) {
    const now = evaluatorBytes(), changed = EVALUATOR_FILES.filter(f => now[f] !== state.integrity.files[f]);
    if (changed.length) { why('EVALUATOR-TAMPERED', `${changed.join(', ')} changed during the run; the checkout is marked poisoned until restored from git (RULINGS Q75a)`); poison(state.integrity, `${changed.join(', ')} changed during a run`); }
  }
  for (const [name, t] of Object.entries(state.toolchain ?? {})) if (t) {
    let h = null;
    try { h = sha256(fs.readFileSync(t.path)); } catch { h = null; }
    if (h !== t.sha256) why('TOOLCHAIN-TAMPERED', `${name} at ${t.path} changed during the run (RULINGS Q75d)`);
  }
  const put = state.put;
  if (put) {
    for (const h of put.written) {
      let bytes = null;
      try { bytes = fs.readFileSync(path.join(put.dir, h)); } catch { bytes = null; }
      if (bytes === null) why('EVIDENCE-MISSING', `evidence object ${h} the run wrote is gone (RULINGS Q75i)`);
      else if (sha256(bytes) !== h) why('EVIDENCE-TAMPERED', `evidence object ${h} no longer hashes to its name (RULINGS Q67e)`);
    }
    for (const h of fs.readdirSync(put.dir)) if (!put.written.has(h)) why('EVIDENCE-UNEXPECTED', `${h} is in the evidence store but this run did not write it (RULINGS Q75i)`);
  }
}

function runQualification(claim, env, why, run, state) {
  const { git } = env;
  const authorityRef = env.authorityRef ?? 'main';
  if (!isObj(claim) || claim.format !== FORMATS.claim) return why('CLAIM-FORMAT', `claim format must be ${FORMATS.claim}`);
  // Q55a: the claimant states only what to run. Receipts, records, selections, case lists, a control, a verifier record, a W0
  // pin or an O-DOMAIN fingerprint (Q55e) in the claim are never read; they are listed so nobody believes they counted.
  run.ignored = Object.keys(claim).filter(k => !CLAIM_FIELDS.includes(k));
  if (!['comparative', 'promotion'].includes(claim.kind)) why('CLAIM-KIND', 'kind must be comparative or promotion');
  // Q67j, Q75i (Codex round 8 finding 11): promotion prerequisites (GATE-BROKER-HARDENING for a log-source composition, and the
  // others a promotion needs) are not enforced mechanically yet, so a promotion claim is never qualified; admitCore says so too.
  if (claim.kind === 'promotion') why('PROMOTION-UNSUPPORTED', 'promotion prerequisites (GATE-BROKER-HARDENING and the others a promotion needs) are not enforced mechanically yet, so promotion qualification is rejected (RULINGS Q62b, Q67j)');
  const commit = str(claim.commit) && COMMIT.test(claim.commit) ? git.resolve(claim.commit) : null;
  if (!commit || commit !== claim.commit) return why('CLAIM-COMMIT', `commit ${JSON.stringify(claim.commit)} is not a full commit id in this repository`);
  // -- the contract and load contract (qualificationRun.contractSource: the authority ref, RULINGS Q61a), and the slots.
  const authority = git.resolve(authorityRef);
  if (!authority) return why('CONTRACT-AUTHORITY', `authority ref ${authorityRef} does not resolve`);
  const readJson = (c, f) => { const b = git.blob(c, f); try { return b ? JSON.parse(b.toString('utf8')) : null; } catch { return null; } };
  const contract = readJson(authority, PATHS.contract), loadContract = readJson(authority, PATHS.loadContract), slots = readJson(authority, PATHS.slots);
  if (!isObj(contract) || !isObj(loadContract)) return why('CONTRACT-MISSING', `${PATHS.contract} or ${PATHS.loadContract} is missing or unreadable at ${authorityRef}`);
  const ctx = coreContext(contract, {}, loadContract);
  const label = sourceTreeIdOf(git.treeOf(commit));
  if (claim.sourceTreeSha256 !== label) why('CLAIM-SOURCE-LABEL', `sourceTreeSha256 ${claim.sourceTreeSha256} is not the clean label ${label} of ${commit}`);
  const comp = claim.composition;
  if (!boundComposition(comp, ctx)) return why('COMPOSITION-UNBOUND', 'the claim composition must bind four assignments with string engine, imageDigest, configSha256 (sha256) and slot, and the source its protocol variant (VA14, RULINGS Q55b)');
  const entry = own(ctx.a0, own(ctx.byEngine, comp.source.engine));
  if (isObj(entry) && boundComposition(entry.composition, ctx)) {
    for (const p of imageProblems(entry.composition, contract.imagePins, ctx.assignments)) why('IMAGE-NOT-PINNED', `A0 ${p} (VA4, RULINGS Q61i)`);
    if (same(entry.composition, comp)) why('CONTROL-IS-CANDIDATE', 'the claimed composition is the A0 control itself');
  }
  fs.mkdirSync(env.workDir, { recursive: true });
  const isoBase = path.resolve(env.isolationRoot ?? os.tmpdir());
  fs.mkdirSync(isoBase, { recursive: true });
  const isolationRoot = fs.realpathSync(isoBase);
  const iso = prefix => { const d = fs.mkdtempSync(path.join(isolationRoot, `tx2-${prefix}-`)); run.dirs.push(d); return d; };
  const put = state.put = writeStore(path.join(env.workDir, 'objects'));
  run.objects = put.dir;

  // -- Q75b, Q75d: everything trusted is read, hashed and copied before the first candidate process: the toolchain, the trees to
  // build, the manifests and inputs, and the oracle copies.
  const tools = state.toolchain = resolveToolchain(process.env.PATH ?? '');
  const toolchainDir = iso('toolchain');
  for (const [name, t] of Object.entries(tools)) if (t) fs.symlinkSync(t.path, path.join(toolchainDir, name));
  setReadOnly(toolchainDir, true);
  run.toolchain = Object.fromEntries(Object.entries(tools).map(([k, t]) => [k, toolRecord(t)]));
  const sandbox = env.sandbox !== false && sandboxWorks();
  run.isolation = { root: isolationRoot, sandbox: sandbox ? 'sandbox-exec: writes confined to each child\'s own directories, no network, no mach-lookup, signals inside the sandbox only' : `none (${env.sandbox === false ? 'disabled by the caller' : 'sandbox-exec is not available here'}): detection only`, perChildHome: true, pathPinned: [toolchainDir, ...SYSTEM_PATH].join(':') };
  const runChild = childRunner({ iso, toolchainDir, toolchain: tools, sandbox });
  const ids = Array.isArray(claim.obligations) ? claim.obligations.filter(i => typeof i === 'string' && ctx.byId.has(i)) : [];
  const claimed = ids.map(i => ctx.byId.get(i));
  const domain = claimed.some(o => o.oracles.includes('O-DOMAIN'));
  const prereq = [PREREQ.position, PREREQ.identity, ...(domain ? [PREREQ.w0] : [])].map(i => ctx.byId.get(i));
  const a0Commit = isObj(entry) && str(entry.commit) && COMMIT.test(entry.commit) && git.resolve(entry.commit) === entry.commit ? entry.commit : null;
  const pre = prepareTrusted({ git, commit, authority, authorityRef, contract, ctx, obligations: [...prereq, ...claimed], a0Commit, why, iso });
  pre.labels = new Map([...pre.snapshots.keys()].map(c => [c, sourceTreeIdOf(git.treeOf(c))]));
  let box;
  try {
    box = state.box = new BoxExecutor({ config: bindStore(authorityPolicy(git, authority), env.storeReceipt), authority:{commit:authority,repo:git.repo}, workDir: env.workDir, holder: env.holder, put, why });
    if (env.pairSlots) { box.placement = pairLayout(authorityPolicy(git, authority), env.pairSlots); run.placement = box.placement; }
    box.attestStore();
    run.isolation = { candidate: 'hardened-container', imageId: box.config.imageId, oracleSandbox: run.isolation.sandbox, toolchain:box.toolchain, residual: ['R1: shared VM kernel', 'R4/N4: engine egress pending Q86g H2', 'D1: development runs on Mac', 'D2: shared Docker socket and writable HOME VM mount', 'D3: external writers of authority refs', 'Q86g retains L1 and N1-N4 on the unprotected list until VM hardening'] };
  } catch (error) { return why('ISOLATION-NOT-IN-FORCE', String(error)); }
  const ev = labExecutor({ commit, contract, ctx, spec: ctx.cfg.buildSpec, slots, loadContract, claim, pre, put, iso, runChild, toolchain: tools, sut: env.sut ?? null, why, run, box, canaryPort: env.canaryPort, offline: run.offline });

  state.verifyRuntime = ev.verifyRuntime;

  run.gate = { gate: 'OBL', executing: !run.offline, offline: run.offline, registeredSlot: run.offline ? null : comp.source.slot };
  // [EXP-G03] Why: remove GATE-NOT-RUN only after a case actually returned through the isolated executor and cleanup passed.
  // Rejected: successful planning or a zero-case run as evidence of execution.
  // -- the verdict: the contract's reference model over the lab's executor, with the claim kind (Q67j, Q75i).
  run.core = admitCore({ kind: claim.kind, obligations: claim.obligations, commit, sourceTreeSha256: claim.sourceTreeSha256, composition: comp }, ev, ctx);
  for (const r of run.core.reasons) why(r.code, r.detail);
  // Lab, stricter than the reference (Q41d): GATE-POSITION covers A0 too (Q38a), so the registry's A0 build must pass its own
  // position and identity runs; and the contract-level blockers are reported, not only the first.
  if (run.core.verdict === 'QUALIFIED') for (const o of [prereq[0], prereq[1]]) {
    const notes = [];
    if (qualificationRun(o, entry.binarySha256, entry.composition, ev, ctx, ctx.pins, ctx.pinned, ctx.cfg.oracleRunners, d => notes.push(d)) === null) why('PREREQ-FAILED', `the evaluator's ${o.id} run of the A0 build did not pass (GATE-POSITION "A0 included", RULINGS Q38a): ${notes.join('; ')}`);
  }
  run.gate.executions = run.cases.length;
  state.gateExecuted = !run.offline && run.cases.length > 0 && run.cases.every(c => c.configApplied);
  if (ids.length === (Array.isArray(claim.obligations) ? claim.obligations.length : -1)) {
    if (!isObj(ctx.cfg.buildSpec) || ['argv', 'outputs', 'run'].some(k => own(ctx.cfg.buildSpec, k) == null)) why('BUILD-SPEC-NULL', 'the contract\'s buildSpec (argv, outputs, run) is not specified, so no run qualifies (RULINGS Q55a step 1, Q61f)');
    if (!isObj(entry)) why('A0-REGISTRY-NULL', `A0_REGISTRY has no entry for source engine ${comp.source.engine}; every comparison is a diagnostic until A0 is frozen (RULINGS Q46b, Q47b)`);
    for (const o of claimed) if (!Object.keys(ctx.verifiers ?? {}).some(v => registeredAcceptance(v, 'obligation', o.id, commit, ctx.verifiers))) why('VERIFIER-UNREGISTERED', `no VERIFIER_REGISTRY entry accepts ${o.id} at ${commit} (RULINGS Q55a)`);
    for (const b of contractBlockers(claimed, prereq, domain, ctx)) why(b.code, b.detail);
    // [EXP-A01-R3] Why: common preflight and admitCore now share the reference's complete runner-pin predicate through contractBlockers. Rejected: a second pin-only implementation that disagrees for contract-output-pinned COMPILED runners.
  }
}

// ================================================================ CLI

export function admitFile(file, { repo = REPO, objects = OBJECTS, authorityRef = 'main' } = {}) {
  let claim;
  // parseJson keeps Python's int/float distinction, so a workload seed of 1.0 is refused here as the reference refuses it.
  try { claim = parseJson(fs.readFileSync(file)); } catch (error) { return { verdict: 'DIAGNOSTIC', documentVerdict: 'DIAGNOSTIC', reasons: [{ code: 'CLAIM-FORMAT', detail: `cannot read ${file}: ${error.message}` }] }; }
  return admitClaim(claim, { git: gitSource(repo), objects: objectStore(objects), authorityRef });
}

const USAGE = 'usage: claim.mjs admit <claim.json> [--repo DIR] [--objects DIR] [--authority-ref main] [--json]\n       claim.mjs qualify <claim.json> --repo SOURCE --authority SHA --evaluator-commit SHA [--work DIR] [--holder NAME] [--offline-sut] [--json]\n       claim.mjs restore-evaluator [--evaluator-repo DIR]';
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main(async () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, file] = positional;
  if (command === 'restore-evaluator') {
    // Q75a: the only way to clear a poisoned evaluator checkout is to restore its files from git.
    const r = restoreEvaluator(options['evaluator-repo'] ? { repo: path.resolve(options['evaluator-repo']) } : {});
    console.log(r.ok ? `evaluator restored from ${r.commit}` : `evaluator not restored: ${r.problems.join('; ')}`);
    process.exitCode = r.ok ? 0 : 2;
    return;
  }
  if (!['admit', 'qualify'].includes(command) || !file) fail('USAGE', USAGE);
  const repo = path.resolve(options.repo ?? REPO);
  const authorityRef = options.authority ?? options['authority-ref'] ?? 'main';
  let result;
  if (command === 'admit') result = admitFile(path.resolve(file), { repo, objects: path.resolve(options.objects ?? path.join(repo, 'runs/objects')), authorityRef });
  else {
    let claim = null;
    try { claim = parseJson(fs.readFileSync(path.resolve(file))); } catch (error) { fail('USAGE', `cannot read ${file}: ${error.message}`); }
    const git = gitSource(repo);
    const workDir = path.resolve(options.work ?? path.join(EVALUATOR_ROOT, 'runs/qualify', `${String(claim?.claimId ?? 'claim').replace(/[^A-Za-z0-9._-]/g, '_')}-${new Date().toISOString().replace(/[:.]/g, '-')}`));
    // [EXP-G03] Why: offline mode executes authority argv inside network-none boxes and stays DIAGNOSTIC.
    // Rejected: the legacy Mac localSut callback, which violates Q86 even for fixtures.
    const net = await import('node:net');
    const canary = net.createServer();
    await new Promise(resolve => canary.listen(0, '127.0.0.1', resolve));
    try { result = qualifyClaim(claim, { git, authorityRef, workDir, holder: options.holder, pairSlots: options['pair-slots']?.split(','), storeReceipt: options['store-receipt'] ? JSON.parse(fs.readFileSync(path.resolve(options['store-receipt']))) : null, canaryPort: canary.address().port, offline:Boolean(options['offline-sut']), ...(options['no-sandbox'] ? { sandbox: false } : {}),
      evaluator: { repo: path.resolve(options['evaluator-repo'] ?? EVALUATOR_ROOT), rev: options['evaluator-commit'] } });
    } finally { canary.close(); }
  }
  if (options.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else {
    console.log(result.verdict + (result.documentVerdict ? ` (documents: ${result.documentVerdict})` : '') + (result.offlineVerdict ? ` (offline run: ${result.offlineVerdict})` : ''));
    for (const r of result.reasons) console.log(`  ${r.code}${r.receipt ? ` [${r.receipt}]` : ''}: ${r.detail}`);
    if (result.run) console.log(`  run: ${Object.keys(result.run.builds).length} build(s), ${result.run.cases.length} case executions, objects in ${result.run.objects}`);
  }
  process.exitCode = result.verdict === 'QUALIFIED' ? 0 : 2;
});
