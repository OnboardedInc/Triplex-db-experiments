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
//            evaluator's own workload, and the gate. Step 3 (the gate) exists only as gate.mjs --dry-run, so qualify is DIAGNOSTIC
//            (GATE-NOT-RUN) until an executing OBL gate exists; an offline run (--offline-sut) reports offlineVerdict.
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
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
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
    resolve(rev) { if (!str(rev) || rev.startsWith('-')) return null; try { return run(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]).toString().trim() || null; } catch { return null; } },
    treeOf(commit) { return run(['rev-parse', `${commit}^{tree}`]).toString().trim(); },
    commitTime(commit) { return Number(run(['show', '-s', '--format=%ct', commit]).toString().trim()); },
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
export const EVALUATOR_FILES = ['lab/bin/claim.mjs', 'lab/bin/lib.mjs', 'lab/bin/gate.mjs', 'lab/bin/engine.mjs', 'lab/bin/heavy-lock.mjs', 'lab/bin/receipt.mjs', 'lab/acceptance/build_contract.py'];
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
function walkTree(root, exclude = []) {
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
function labExecutor({ commit, contract, ctx, spec, slots, loadContract, claim, pre, put, iso, runChild, toolchain, sut, why, run }) {
  const instances = [], byIdentity = new Map(), inputFiles = new Map(), answers = new Map(), repCount = new Map();
  const specSha = buildSpecSha256(spec), exclusions = Array.isArray(spec?.installMetadataExclusions) ? spec.installMetadataExclusions.filter(safePath) : [];
  const inputsDir = iso('inputs');
  let current = { o: null }, last = null, lastAnswer = null;
  ctx.onRun = (o, binary) => { current = { o, binary }; };
  // [EXP-E01] Why: Q81a covers persistent edits after final use. Rejected: pre-use checks alone (no next use to detect them).
  function verifyInput(h, p) {
    let ok = false;
    try { ok = sha256(fs.readFileSync(p)) === h; } catch { ok = false; }
    if (!ok) why('INPUT-TAMPERED', `the evaluator's copy of case input ${h} is missing, unreadable or changed after it was written (RULINGS Q67e, Q81a)`);
    return ok;
  }
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
      const n = instances.length, dir = iso(`build${n}-${c.slice(0, 12)}`);
      writeCheckout(snap, dir);
      // [EXP-E01] Why: reject external source links before the build can read them. Rejected: post-build detection (already executed).
      if (walkTree(dir).outside.length) { why('BUILD-LINK-OUTSIDE', `${c}: source checkout contains an outside symlink`); return null; }
      // build-manifest/2 inputs: every tracked file of each built package (the output's parent of dist/), the lockfile and the
      // root package.json, from the prepared tree (RULINGS Q61f, Q65d).
      const pkgs = [...new Set(spec.outputs.map(p => p.replace(/\/$/, '').replace(/\/?dist$/, '')).filter(Boolean))];
      const inputList = [...snap.files.keys()].filter(p => snap.files.get(p).sha256 && (pkgs.some(k => p.startsWith(`${k}/`)) || p === 'pnpm-lock.yaml' || p === 'package.json')).sort();
      const b = runChild(spec.argv, { cwd: dir, writable: [dir], timeout: 1_800_000, label: `build${n}` });
      if (b.status !== 0) { why('BUILD-FAILED', `${c}: ${spec.argv.join(' ')} exited ${b.status ?? b.signal}: ${b.stderr.toString('utf8').trim().slice(-300)}`); return null; }
      // [EXP-E01] Why: never read output symlinks before refusing them. Rejected: collecting modules before the safe walk.
      const walk = walkTree(dir, exclusions);
      if (walk.outside.length) { why('BUILD-LINK-OUTSIDE', `${c}: ${walk.outside.join(', ')} resolves outside the checkout`); return null; }
      const files = [];
      for (const out of spec.outputs.map(p => p.replace(/\/$/, ''))) {
        const abs = path.join(dir, out);
        if (!fs.existsSync(abs)) { why('BUILD-OUTPUTS', `${c}: build output ${out} was not produced`); continue; }
        for (const e of fs.statSync(abs).isDirectory() ? fs.readdirSync(abs, { recursive: true, withFileTypes: true }).map(d => path.join(d.parentPath ?? d.path, d.name)) : [abs]) {
          const st = fs.lstatSync(e);
          if (st.isSymbolicLink()) why('BUILD-OUTPUTS', `${c}: build output ${path.relative(dir, e)} is a symlink`);
          else if (st.isFile()) files.push(path.relative(dir, e).split(path.sep).join('/'));
        }
      }
      const modules = [...new Set(files)].sort().map(p => ({ path: p, sha256: put(fs.readFileSync(path.join(dir, p))) }));
      if (!modules.length) { why('BUILD-OUTPUTS', `${c}: the build produced no files under ${spec.outputs.join(', ')}`); return null; }
      const lock = walk.entries.find(e => e[0] === 'pnpm-lock.yaml');
      const identityBytes = executionIdentity({ sourceTreeSha256: tree, buildSpecSha256: specSha, lockfileSha256: lock?.[2], toolchain: toolchainIdentity(toolchain, spec), runner: walk.entries });
      const identity = put(identityBytes);
      const runnerSha256 = put(runtimeListing(walk.entries));
      const manifest = put({ schema: 'build-manifest/2', sourceTreeSha256: tree, binarySha256: identity, modules, inputs: inputList.map(p => ({ path: p, sha256: snap.files.get(p).sha256 })), buildSpecSha256: specSha });
      const rec = { n, commit: c, dir, identity, runtime: walk.entries, manifest, tampered: false };
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
      if (root && verifyOracleCopy(orc, root)) {
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
      if (!b || !raw || sha256(raw) !== own(x, 'contentSha256') || !sut) return null;
      // [EXP-E01] Why: same-instance mutations must fail too. Rejected: hashing only on instance switches (last-case edits escaped).
      verifyBuild(b);
      if (b.tampered) return null;
      const casePath = inputPath(raw);
      if (!casePath) return null;
      const seen = sut({ dir: b.dir, casePath, mode, instance: b.n, runChild });
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
      const executionSha256 = last?.binary ? sha256(canonText({ binarySha256: last.binary, configApplied: false })) : null;
      run.cases.push({ obligation: o?.id ?? null, instance: last?.instance ?? null, build: last?.build ?? null, executionSha256, configApplied: false, case: x?.id ?? null, mode: last?.mode ?? null, rep: last?.rep ?? null,
        comparator: cmp, verdict: v, expectedSha256, observedSha256, recordSha256: rec, unboundConfig: last?.comp ?? null });
      if (v !== 'PASS' && sut) why(v === 'UNCOMPARABLE' ? 'CASE-UNCOMPARABLE' : 'CASE-FAIL', `instance ${last?.instance ?? '?'} (${last?.build ?? '?'}) ${o?.id} ${x?.id} mode ${last?.mode}: ${cmp} ${v}${obs == null ? ` (no observation${last?.exit != null ? `, exit ${last.exit}` : ''})` : ''} (RULINGS Q55a, Q67i)`);
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
    const now = walkTree(b.dir, exclusions);
    if (runtimeListing(now.entries) !== runtimeListing(b.runtime) || now.outside.length) {
      b.tampered = true;
      why('BUILD-TAMPERED', `instance ${b.n} (${b.commit}): its checkout changed after the evaluator built it (RULINGS Q67b, Q67e)`);
    }
  }
  // [EXP-E01] Why: detect even the final execution's edits. Rejected: pre-invocation-only checks (no later invocation).
  ev.verifyRuntime = () => {
    for (const [h, p] of inputFiles) verifyInput(h, p);
    for (const b of instances) verifyBuild(b);
    for (const [x, root] of pre.oracles) if (root) verifyOracleCopy(x, root);
  };
  // Q67e: immediately before every invocation, the oracle copy holds exactly the prepared files with their bytes and read-only
  // modes, and nothing else (no planted module, no bytecode cache); any change refuses the oracle for the rest of the run.
  function verifyOracleCopy(x, root) {
    if (root.broken) return false;
    let now = null;
    try { const w = walkTree(root.dir); now = w.outside.length ? null : runtimeListing(w.entries); } catch { now = null; }
    if (now === root.expect) return true;
    root.broken = true;
    why('ORACLE-TAMPERED', `the evaluator's copy of ${x}'s files changed after it was written; the oracle is not run again (RULINGS Q67e)`);
    return false;
  }
  return ev;
}

/**
 * Qualify a claim by running it (RULINGS Q55a). env = { git: gitSource(repo), authorityRef, workDir, isolationRoot?, sut?:
 * localSut(spec) for an offline run, gate?: (plan) -> result (default gateDryRun), sandbox? (default true: confine children's
 * writes with sandbox-exec where it works), evaluator?: { repo, rev } (whose commit vouches for the evaluator's files; default the
 * repository they live in, at HEAD), keepIsolation? }.
 * Returns { verdict, offlineVerdict, reasons, run }. admitCore (the contract's reference model) decides over labExecutor; the
 * verdict is QUALIFIED only from a run whose system under test ran through an executing gate, which does not exist yet, so every
 * return path is DIAGNOSTIC with GATE-NOT-RUN from the start (Q75i). offlineVerdict (offline runs only) is the verdict the run would
 * reach had the local observations come from the gate. run records the build instances, every comparison (with its case-result/2),
 * every oracle invocation, the toolchain, the isolation in force, the gate plan and the evaluator's object store.
 */
export function qualifyClaim(claim, env) {
  const reasons = [];
  const seen = new Set();
  const why = (code, detail, receipt) => { const k = `${code}\u0000${detail}`; if (!seen.has(k)) { seen.add(k); reasons.push(receipt ? { code, detail, receipt } : { code, detail }); } };
  const run = { offline: typeof env?.sut === 'function', ignored: [], builds: {}, instances: [], cases: [], oracle: [], gate: null, objects: null, core: null, evaluator: null, toolchain: null, isolation: null, dirs: [] };
  why('GATE-NOT-RUN', 'step 3: gate.mjs OBL is plan-only (--dry-run); no executing gate runs pinned case manifests on a registered slot yet, so no run is QUALIFIED (RULINGS Q55a, Q75i)');
  if (run.offline) why('RUN-NOT-ON-GATE', 'the system under test ran locally from the evaluator\'s own build (offline stand-in for step 3), not through the gate on a registered slot');
  const state = {};
  try {
    // Q75a: the evaluator's own files match their blobs at its commit, and no earlier run marked this checkout poisoned.
    state.integrity = evaluatorIntegrity(env?.evaluator ?? {});
    run.evaluator = { repo: state.integrity.repo, commit: state.integrity.commit, files: state.integrity.files };
    if (state.integrity.problems.length) { for (const p of state.integrity.problems) why('EVALUATOR-TAMPERED', `${p}; the run is refused (RULINGS Q75a)`); poison(state.integrity, state.integrity.problems.join('; ')); }
    else runQualification(claim, env, why, run, state);
  } catch (error) { why('EVALUATOR-ERROR', `qualification stopped: ${error?.message ?? error} (fail closed)`); }
  // Q75i: the end checks run inside a try of their own, so an unreadable store or file is a reason, never an exception.
  try { endChecks(why, run, state); } catch (error) { why('EVALUATOR-ERROR', `the end-of-run checks stopped: ${error?.message ?? error} (fail closed)`); }
  if (!env?.keepIsolation) for (const d of run.dirs) removeDir(d);
  const blocking = reasons.filter(r => !NOT_ON_GATE.has(r.code));
  return { verdict: reasons.length ? 'DIAGNOSTIC' : 'QUALIFIED', offlineVerdict: run.offline ? (blocking.length ? 'DIAGNOSTIC' : 'QUALIFIED') : null, reasons: summarise(reasons), run };
}

/** The checks after a run (RULINGS Q67e, Q75a, Q75d, Q75i): the evaluator's files are those it started with (a change poisons the
 * checkout), every handed-out case input is present with its bytes (Q81a), the toolchain's files are unchanged, and every
 * evidence object the run wrote is present with its bytes and nothing
 * else is in the store. */
function endChecks(why, run, state) {
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
  const ev = labExecutor({ commit, contract, ctx, spec: ctx.cfg.buildSpec, slots, loadContract, claim, pre, put, iso, runChild, toolchain: tools, sut: env.sut ?? null, why, run });

  state.verifyRuntime = ev.verifyRuntime;

  // -- step 3, as far as it exists: the plan goes through gate.mjs --dry-run, which checks the lane and the registered slot.
  const count = o => { const cs = resolveCases(o, ev, ctx.pinned); return cs ? cs.reduce((n, x) => n + o.closure.modes.length * (o.closure.rules.includes('CR-FAULT') && own(x, 'faultPoint') === true ? ctx.faultReps : 1), 0) : 0; };
  run.gate = (env.gate ?? gateDryRun(env.workDir, runChild))({ claimId: claim.claimId ?? null, kind: claim.kind ?? null, commit, lane: comp.source.engine, slot: comp.source.slot,
    obligations: [...prereq, ...claimed].map(o => o.id), executions: [...prereq, ...claimed].reduce((n, o) => n + count(o), 0) + (entry ? [prereq[0], prereq[1]].reduce((n, o) => n + count(o), 0) : 0) });
  if (!run.gate.ok) why('GATE-SLOT', `gate.mjs refused the plan (lane ${comp.source.engine}, slot ${comp.source.slot}): ${run.gate.error}`);

  // -- the verdict: the contract's reference model over the lab's executor, with the claim kind (Q67j, Q75i).
  run.core = admitCore({ kind: claim.kind, obligations: claim.obligations, commit, sourceTreeSha256: claim.sourceTreeSha256, composition: comp }, ev, ctx);
  for (const r of run.core.reasons) why(r.code, r.detail);
  // Lab, stricter than the reference (Q41d): GATE-POSITION covers A0 too (Q38a), so the registry's A0 build must pass its own
  // position and identity runs; and the contract-level blockers are reported, not only the first.
  if (run.core.verdict === 'QUALIFIED') for (const o of [prereq[0], prereq[1]]) {
    const notes = [];
    if (qualificationRun(o, entry.binarySha256, entry.composition, ev, ctx, ctx.pins, ctx.pinned, ctx.cfg.oracleRunners, d => notes.push(d)) === null) why('PREREQ-FAILED', `the evaluator's ${o.id} run of the A0 build did not pass (GATE-POSITION "A0 included", RULINGS Q38a): ${notes.join('; ')}`);
  }
  if (ids.length === (Array.isArray(claim.obligations) ? claim.obligations.length : -1)) {
    if (!isObj(ctx.cfg.buildSpec) || ['argv', 'outputs', 'run'].some(k => own(ctx.cfg.buildSpec, k) == null)) why('BUILD-SPEC-NULL', 'the contract\'s buildSpec (argv, outputs, run) is not specified, so no run qualifies (RULINGS Q55a step 1, Q61f)');
    if (!isObj(entry)) why('A0-REGISTRY-NULL', `A0_REGISTRY has no entry for source engine ${comp.source.engine}; every comparison is a diagnostic until A0 is frozen (RULINGS Q46b, Q47b)`);
    for (const o of claimed) if (!Object.keys(ctx.verifiers ?? {}).some(v => registeredAcceptance(v, 'obligation', o.id, commit, ctx.verifiers))) why('VERIFIER-UNREGISTERED', `no VERIFIER_REGISTRY entry accepts ${o.id} at ${commit} (RULINGS Q55a)`);
    for (const b of contractBlockers(claimed, prereq, domain, ctx)) why(b.code, b.detail);
    // [EXP-A01-R3] Why: common preflight and admitCore now share the reference's complete runner-pin predicate through contractBlockers. Rejected: a second pin-only implementation that disagrees for contract-output-pinned COMPILED runners.
  }
}

// ================================================================ CR-NS offline recomputation (R44 B5)
// [EXP-CRNS] Why: keep pending Q99/Q100 arithmetic independently testable without admitting a claim.
// Rejected: trusting bench summaries or enabling pending rulings in admitCore (neither is acceptance authority).
export const NS_ENCODING = 'feed-entry/1\nUTF-8 canonical sorted-key JSON; no whitespace; no trailing newline; identity fields only';
export const NS_ENCODING_SHA256 = sha256(NS_ENCODING);
export const NS_EVENT_SCHEMA = Object.freeze({
  format: 'ns-events/1', E1: 'offers[]', E2: 'reads[]', E3: 'source', E4: 'sourceBrackets[]',
  E5: 'consumerBrackets[]', E6: 'consumer', E7: 'faults[]', E8: 'readers[]',
  E9: 'window', E10: 'noise', E11: 'crossChecks[]',
});
const nsAssert = (ok, code, detail = code) => { if (!ok) throw Object.assign(new Error(detail), { code }); };
const nsUint = x => typeof x === 'string' && /^(0|[1-9][0-9]*)$/.test(x);
const nsTime = x => { nsAssert(nsUint(x), 'EVENT-SCHEMA', 'time/offset must be an unsigned decimal string'); return BigInt(x); };
const nsArray = (x, name) => { nsAssert(Array.isArray(x), 'RAW-EVENTS-MISSING', name); return x; };
const nsText = x => typeof x === 'string' && x.length > 0;
const nsHash = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const nsKey = x => canonText([x.consumer, x.epoch, x.position, x.subject]);
const nsPos = x => {
  if (nsUint(x)) return ['', 0n, BigInt(x), 0n];
  nsAssert(isObj(x) && nsText(x.stream) && nsUint(x.epoch) && nsUint(x.offset) && nsUint(x.ordinal), 'EVENT-SCHEMA', 'position coordinate');
  return [x.stream, BigInt(x.epoch), BigInt(x.offset), BigInt(x.ordinal)];
};
export function nsComparePosition(a, b) {
  const aa = nsPos(a), bb = nsPos(b);
  for (let i = 0; i < 4; i++) { if (aa[i] < bb[i]) return -1; if (aa[i] > bb[i]) return 1; }
  return 0;
}
/** Exact nearest rank; BigInt inputs stay exact, including clocks beyond Number.MAX_SAFE_INTEGER. */
export function nsNearestRank(values, numerator, denominator = 100) {
  nsAssert(Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator) && numerator > 0 && numerator <= denominator, 'QUANTILE-SCHEMA');
  nsAssert(values.every(x => typeof x === 'bigint' || (typeof x === 'number' && !Number.isNaN(x))), 'QUANTILE-SCHEMA');
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const rank = (BigInt(sorted.length) * BigInt(numerator) + BigInt(denominator) - 1n) / BigInt(denominator);
  return sorted[Number(rank - 1n)];
}
const nsMs = n => n === null ? null : n === Infinity ? Infinity : Number(n) / 1e6;
const nsStats = xs => ({ count: xs.length, p50Ms: nsMs(nsNearestRank(xs, 50)), p99Ms: nsMs(nsNearestRank(xs, 99)), maxMs: nsMs(nsNearestRank(xs, 100)) });
/** This proposed encoding must be pinned by the next contract; it is not an FD01 serialization alias. */
export function nsFeedEntryBytes(entry) {
  nsAssert(isObj(entry) && sameKeys(entry, entry.kind === 'commit' ? ['stream', 'epoch', 'offset', 'kind', 'transactions'] : ['stream', 'epoch', 'offset', 'kind']), 'FEED-ENTRY-SCHEMA');
  nsAssert(nsText(entry.stream) && nsUint(entry.epoch) && nsUint(entry.offset) && ['commit', 'aborted', 'epoch', 'seal'].includes(entry.kind), 'FEED-ENTRY-SCHEMA');
  if (entry.kind === 'commit') {
    nsAssert(Array.isArray(entry.transactions) && entry.transactions.length > 0, 'FEED-ENTRY-SCHEMA');
    for (const tx of entry.transactions) {
      nsAssert(sameKeys(tx, ['stamp', 'positions', 'txIds', 'operationId', 'commandIds', 'changes']) && tx.stamp !== null && nsText(tx.operationId), 'FEED-ENTRY-SCHEMA');
      for (const k of ['positions', 'txIds', 'commandIds', 'changes']) nsAssert(Array.isArray(tx[k]) && tx[k].length > 0, 'FEED-ENTRY-SCHEMA');
      tx.positions.forEach(nsPos);
      nsAssert(tx.txIds.every(nsText) && tx.commandIds.every(nsText), 'FEED-ENTRY-SCHEMA');
      for (const op of tx.changes) {
        nsAssert(sameKeys(op, ['op', 'entity', 'attribute', 'validFrom', 'validTo', 'position', 'assertionId', ...(op.op === 'erase' ? ['erasureSeq'] : [])]), 'FEED-ENTRY-SCHEMA');
        nsAssert(['assert', 'retract', 'erase'].includes(op.op) && nsText(op.entity) && nsText(op.attribute) && nsText(op.assertionId), 'FEED-ENTRY-SCHEMA');
        nsPos(op.position);
        nsAssert(tx.positions.some(p => same(p, op.position)), 'FEED-ENTRY-SCHEMA', 'change position outside transaction');
      }
    }
  }
  return Buffer.from(canonText(entry));
}
// [EXP-CRNS] Why: independently check the SQL01 broker's frame.ts CRC32C header/payload chain using retained bytes.
// Inspiration: EXP-P2Q frame.ts (R13 framing), adapted to pure byte validation without importing candidate code.
// Rejected: trusting a normalizer's crcValid boolean (a forged verdict is not a content check).
export function nsCrc32c(bytes, seed = 0) {
  let crc = (seed ^ 0xffffffff) >>> 0;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0x82f63b78 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function nsVerifyBrokerFrames(frames, initialCrc) {
  nsAssert(Array.isArray(frames) && frames.length > 0 && Number.isSafeInteger(initialCrc) && initialCrc >= 0 && initialCrc <= 0xffffffff, 'SOURCE-CRC-CHAIN');
  let previous = initialCrc, lastLsn = -1n, lastEpoch = -1;
  for (const f of frames) {
    nsAssert(typeof f.hex === 'string' && /^(?:[0-9a-f]{2})+$/.test(f.hex), 'SOURCE-CRC-CHAIN');
    const bytes = Buffer.from(f.hex, 'hex');
    nsAssert(bytes.length >= 36 && bytes.readUInt32LE(0) === 0x464c5854 && bytes.readUInt32LE(4) === bytes.length - 36, 'SOURCE-CRC-CHAIN');
    const headerCrc = bytes.readUInt32LE(28), lsn = bytes.readBigUInt64LE(8), epoch = bytes.readUInt32LE(16);
    nsAssert(nsUint(f.offset) && lsn === BigInt(f.offset) && lsn > lastLsn && epoch >= lastEpoch && bytes.readUInt32LE(20) === previous && nsCrc32c(bytes.subarray(0, 28), previous) === headerCrc, 'SOURCE-CRC-CHAIN');
    const crc = bytes.readUInt32LE(bytes.length - 4);
    nsAssert(nsCrc32c(bytes.subarray(32, bytes.length - 4), headerCrc) === crc, 'SOURCE-CRC-CHAIN');
    previous = crc; lastLsn = lsn; lastEpoch = epoch;
  }
  return previous;
}

/** Count committed insertions, including delete/reinsert. Validate ranges in WAL commit order, never row order. */
export function nsConsumerCounts(transactions, initialFrontier, finalEffects = []) {
  let frontier = initialFrontier, orderViolations = 0, duplicates = 0;
  nsPos(frontier);
  const insertions = new Map();
  for (const tx of transactions) {
    nsAssert(tx.committed === true, 'WAL-NOT-ESTIMABLE', 'normalizer must supply committed transactions only');
    nsPos(tx.frontierBefore); nsPos(tx.frontierAfter);
    if (!same(tx.frontierBefore, frontier) || nsComparePosition(tx.frontierAfter, frontier) <= 0) orderViolations++;
    for (const row of [...nsArray(tx.effects, 'effect insertions'), ...nsArray(tx.affected, 'affected insertions')]) {
      nsAssert(nsText(row.consumer) && nsText(row.epoch) && nsText(row.subject), 'EVENT-SCHEMA', 'consumer key');
      if (nsComparePosition(row.position, frontier) <= 0 || nsComparePosition(row.position, tx.frontierAfter) > 0) orderViolations++;
    }
    for (const row of tx.effects) { const key = nsKey(row), count = insertions.get(key) ?? 0; duplicates += count > 0 ? 1 : 0; insertions.set(key, count + 1); }
    frontier = tx.frontierAfter;
  }
  const finalCounts = new Map();
  for (const row of finalEffects) { const key = nsKey(row), count = finalCounts.get(key) ?? 0; duplicates += count > 0 ? 1 : 0; finalCounts.set(key, count + 1); }
  return { orderViolations, duplicates, frontier };
}
const nsBracket = b => { nsAssert(isObj(b) && nsTime(b.U) >= nsTime(b.L), 'BRACKET-INVALID'); return b; };
const nsIndex = (xs, key) => {
  const m = new Map();
  for (const x of xs) { const k = canonText(x[key]); nsAssert(!m.has(k), 'EVENT-SCHEMA', `duplicate ${key}`); m.set(k, x); }
  return m;
};
const nsDifference = (expected, observed) => ({ misses: expected.filter(x => !observed.includes(x)), extras: observed.filter(x => !expected.includes(x)) });
/**
 * Pure evaluator boundary. `trusted` is evaluator-owned, never deserialized from a claim: expected binding, driver pins,
 * witnessed bundle head, run HMAC key, clock domain, reader level, and oracle functions executing pinned O-DOMAIN/O-REPLAY.
 * A sealed JSON payload carries the normalized E1-E11 events. Authentication binds the complete payload and exact attempt,
 * source, slot and inputs. It does not establish that a normalizer correctly decoded SQLite: O-OBS must do that at admission.
 * RECOMPUTED means arithmetic completed; it never means PASS/QUALIFIED. Pending Q99/Q100 cannot authorize admission.
 */
// [EXP-CRNS-R2] Why: every bar needs nonempty, window-bound, identity-bound content before arithmetic.
// Rejected: adapter promises and declared loop labels (R01-R06, Opus O1-O29 show vacuous success).
export const nsCommandSha256 = changes => sha256(canonText(changes.map(({ position, ...content }) => content)));
const nsReadKey = read => canonText(Object.fromEntries(Object.entries(read).filter(([k]) => !['readId', 'loop', 'sentAtNs', 'receivedAtNs', 'answerSha256', 'answer', 'echoedBasis', 'hot', 'splitGroup', 'straddledCommandId', 'step', 'purpose'].includes(k))));
function nsUniqueEvents(rows, id, code = 'EVENT-ID-DUPLICATE') {
  const seen = new Set();
  for (const row of rows) { nsAssert(nsText(row[id]) && !seen.has(row[id]), code, `${code}: missing/duplicate ${id}`); seen.add(row[id]); }
}
function nsPrefix(entries, basis) {
  nsAssert(basis !== undefined && basis !== null, 'BASIS-UNBOUND');
  if (Number.isSafeInteger(basis) && basis >= 0) basis = String(basis);
  const example=entries.flatMap(e=>(e.transactions??[]).flatMap(t=>t.positions))[0];
  nsAssert(example===undefined || (typeof example==='string')===(typeof basis==='string'), 'BASIS-FORM-MISMATCH');
  return entries.filter(entry => BigInt(entry.offset) <= nsPos(basis)[2]).map(entry => entry.kind === 'commit' ? ({ ...entry, transactions: entry.transactions.filter(tx => tx.positions.every(p => nsComparePosition(p, basis) <= 0)) }) : entry);
}
function nsReaderEvidence(reads, declared, window, level) {
  nsAssert(Number.isSafeInteger(level) && level >= 0, 'READER-LEVEL-MISMATCH');
  const start = nsTime(window.startNs), end = nsTime(window.endNs), seconds = Number((end - start + 999999999n) / 1000000000n);
  nsAssert(end > start && Array.isArray(declared), 'READER-LEVEL-MISMATCH');
  nsUniqueEvents(reads, 'readId');
  if (level === 0) return 1;
  nsAssert(reads.length > 0, 'READER-LEVEL-MISMATCH', 'no completed reads');
  const observed = new Map(), labels = nsIndex(declared, 'second');
  for (const r of reads) {
    nsAssert(Number.isSafeInteger(r.loop) && r.loop >= 0 && nsTime(r.receivedAtNs) >= nsTime(r.sentAtNs), 'EVENT-SCHEMA');
    const at = nsTime(r.receivedAtNs);
    if (at < start || at >= end) continue;
    const second = Number((at - start) / 1000000000n);
    if (!observed.has(second)) observed.set(second, new Set()); observed.get(second).add(r.loop);
  }
  let qualifying = 0;
  for (let second = 0; second < seconds; second++) {
    const loops = observed.get(second) ?? new Set(), d = labels.get(canonText(second));
    if (d && Array.isArray(d.loops) && same([...new Set(d.loops)].sort((a,b) => a-b), [...loops].sort((a,b) => a-b)) && loops.size >= level && Number.isFinite(d.relayConcurrent) && Math.abs(d.relayConcurrent - loops.size) <= loops.size * .1) qualifying++;
  }
  return qualifying / seconds;
}
// [EXP-CRNS-R4] Why: loop presence alone allows fast but mostly idle readers. Rejected: a candidate-chosen throughput floor.
function nsLoadRate(reads, window, level, floor) {
  nsAssert(Number.isSafeInteger(floor) && floor>0, 'READER-RATE-UNBOUND');
  const start=nsTime(window.startNs),end=nsTime(window.endNs),bins=new Map(),byLoop=new Map();
  for(const r of reads) {if(!byLoop.has(r.loop)) byLoop.set(r.loop,[]);byLoop.get(r.loop).push(r);}
  for(const loop of byLoop.values()) {
    loop.sort((a,b)=>nsTime(a.sentAtNs)<nsTime(b.sentAtNs)?-1:1);
    for(let i=1;i<loop.length;i++) nsAssert(nsTime(loop[i].sentAtNs)>=nsTime(loop[i-1].receivedAtNs),'READER-LOOP-OVERLAP');
  }
  for(const r of reads) {
    const at=nsTime(r.receivedAtNs); if(at<start||at>=end) continue;
    const second=(at-start)/1000000000n, key=String(second);
    if(!bins.has(key)) bins.set(key,new Map());
    const loops=bins.get(key); loops.set(r.loop,(loops.get(r.loop)??0)+1);
  }
  for(let at=start;at<end;at+=1000000000n) {
    const width=end-at<1000000000n?end-at:1000000000n;
    const needed=Number((BigInt(floor)*width+999999999n)/1000000000n);
    nsAssert([...(bins.get(String((at-start)/1000000000n))??new Map()).values()].filter(n=>n>=needed).length>=level,'READER-RATE-SHORT');
  }
}
function nsReadSample(reads, window, replayRead, entries) {
  nsAssert(Array.isArray(reads) && reads.length > 0 && typeof replayRead === 'function', 'READS-NOT-ESTIMABLE');
  nsUniqueEvents(reads, 'readId');
  const expected = new Map(); let correct = 0, violations = 0;
  for (const read of reads) {
    nsAssert(nsText(read.subject) && nsText(read.shape) && nsHash(read.answerSha256) && nsTime(read.sentAtNs) >= nsTime(window.startNs) && nsTime(read.receivedAtNs) < nsTime(window.endNs) && nsTime(read.receivedAtNs) >= nsTime(read.sentAtNs), 'READ-OUTSIDE-WINDOW');
    const key = nsReadKey(read);
    if (!expected.has(key)) expected.set(key, replayRead(read, nsPrefix(entries, read.requestedBasis)));
    const want = expected.get(key); nsAssert(nsHash(want), 'O-REPLAY-REFUSED');
    if (want === read.answerSha256 && same(read.echoedBasis, read.requestedBasis)) correct++; else violations++;
  }
  return { correct, violations, evaluatedShare: 1, goodput: correct * 1e9 / Number(nsTime(window.endNs) - nsTime(window.startNs)), latency: nsStats(reads.map(r => nsTime(r.receivedAtNs) - nsTime(r.sentAtNs))) };
}

// [EXP-CRNS-R3] Why: neither missing traffic nor a self-selected companion/calibration may grant a bar.
// Rejected: checking just positive sample counts, hash-shaped labels, or a supplied successful verdict.
function nsSameCompanionContext(primary, companion) {
  const omit = new Set(['crashRun', 'binding', 'key', 'headSha256']);
  const keys = Object.keys(primary).filter(k=>!omit.has(k)).sort();
  if (!same(keys,Object.keys(companion).filter(k=>!omit.has(k)).sort())) return false;
  return keys.every(k => typeof primary[k] === 'function' ? primary[k] === companion[k] : same(primary[k],companion[k]));
}
function nsTraceAttempt(trusted, binding) {
  nsAssert(isObj(trusted.frozenTrace) && sha256(canonText(trusted.frozenTrace)) === binding.traceSha256, 'TRACE-NOT-FROZEN');
  nsAssert(same(Object.keys(trusted.commands??{}).sort(),Object.keys(trusted.frozenTrace.commands??{}).sort()), 'TRACE-COMMAND-PIN-MISMATCH');
  for(const [id,expected] of Object.entries(trusted.frozenTrace.commands??{})) nsAssert(typeof expected.valid==='boolean' && nsHash(expected.commandSha256) && trusted.commands?.[id]?.commandSha256===expected.commandSha256 && trusted.commands?.[id]?.changesSha256===expected.changesSha256 && trusted.commands?.[id]?.valid===expected.valid, 'TRACE-COMMAND-PIN-MISMATCH');
  const plan=trusted.frozenTrace.attempts?.[binding.attemptId];
  nsAssert(plan && Array.isArray(plan.offers) && plan.offers.length>0, 'TRACE-NOT-FROZEN');
  return plan;
}
// [EXP-CRNS-R4] Why: a prior run of this candidate is not an independent budget. Rejected: a self-pinned GREEN label (Q103c).
function nsCalibrationIdentity(record) {
  nsAssert(nsText(record?.candidateUnderTest) && nsText(record?.payload?.candidateId) && record.candidateUnderTest!==record.payload.candidateId && ['A0','registered-calibration'].includes(record.payload.authority), 'CALIBRATION-CANDIDATE-MISMATCH');
}
function nsCalibration(record, observed, kind) {
  nsCalibrationIdentity(record);
  nsAssert(record?.format==='ns-calibration/1' && nsHash(record.pinSha256) && sha256(canonText(record.payload))===record.pinSha256 && same(record.payload.binding,record.expectedBinding) && ['attemptId','sourceSha256','slot','inputsSha256'].every(k=>nsText(record.expectedBinding?.[k])), 'BASELINE-UNBOUND');
  const raw=record.payload.segments?.find(s=>nsMatchedSegment(s,observed));
  nsAssert(raw && record.payload.kind===kind && record.payload.grade==='GREEN', 'BASELINE-UNBOUND');
  const metrics=nsSegment(raw), current=nsSegment(observed);
  nsAssert(metrics.writerP99Ms!==null && Number.isFinite(metrics.writerP99Ms) && raw.offers.length>0, 'BASELINE-UNBOUND');
  nsAssert(current.writerP99Ms<=metrics.writerP99Ms, 'BASELINE-INFLATED');
  return metrics;
}

export function recomputeNS(bundle, trusted) {
  const result = { status: 'REFUSED', reasons: [], bars: {}, measurements: {}, a0: null };
  const refuse = (code, detail = code) => result.reasons.push({ code, detail });
  try {
    nsAssert(isObj(bundle) && typeof bundle.payload === 'string', 'RAW-EVENTS-MISSING');
    nsAssert(trusted?.key && nsHash(trusted.headSha256) && nsHash(bundle.hmac), 'OBS-UNAUTHENTICATED');
    const hmac = createHmac('sha256', trusted.key).update(bundle.payload).digest('hex');
    nsAssert(hmac === bundle.hmac && Array.isArray(bundle.chunks) && bundle.chunks.length > 0, 'OBS-UNAUTHENTICATED');
    let previous = '0'.repeat(64), payload = '';
    for (const chunk of bundle.chunks) {
      nsAssert(typeof chunk.payload === 'string' && chunk.previousSha256 === previous, 'OBS-UNAUTHENTICATED');
      const bytes = canonText({ previousSha256: previous, payload: chunk.payload });
      nsAssert(chunk.sha256 === sha256(bytes) && chunk.hmac === createHmac('sha256', trusted.key).update(bytes).digest('hex'), 'OBS-UNAUTHENTICATED');
      previous = chunk.sha256; payload += chunk.payload;
    }
    nsAssert(previous === trusted.headSha256 && payload === bundle.payload, 'OBS-UNAUTHENTICATED');
    const raw = JSON.parse(bundle.payload);
    nsAssert(canonText(raw) === bundle.payload, 'EVENT-SCHEMA', 'canonical JSON required, duplicate keys forbidden');
    nsAssert(raw.format === NS_EVENT_SCHEMA.format && same(raw.binding, trusted.binding), 'EVENT-BINDING');
    nsAssert(['attemptId', 'sourceSha256', 'slot', 'inputsSha256'].every(k => nsText(raw.binding?.[k])), 'EVENT-BINDING');
    nsAssert(same(raw.driver, trusted.driver) && nsHash(raw.driver?.bundleSha256) && nsHash(raw.driver?.generatorSha256) && nsText(raw.driver?.imageId), 'DRIVER-NOT-PINNED');
    nsAssert(trusted.encodingSha256 === NS_ENCODING_SHA256, 'FEED-ENCODING-NOT-PINNED');
    const e = raw.events;
    nsAssert(isObj(e) && isObj(e.source) && isObj(e.consumer) && isObj(e.window), 'RAW-EVENTS-MISSING');
    for (const name of ['offers', 'reads', 'sourceBrackets', 'consumerBrackets', 'faults', 'readers', 'crossChecks']) nsArray(e[name], name);
    nsAssert(e.source.origin === 'observer-source-store', 'PREFIX-NOT-FROM-SOURCE');
    nsAssert(e.lagStart === 'observer-bracket', 'LAG-START-CR');
    nsAssert(same(e.clockDomain, trusted.clockDomain) && Array.isArray(trusted.roles) && trusted.roles.length > 0 && Array.isArray(e.clockDomains) && e.clockDomains.length === trusted.roles.length && new Set(e.clockDomains.map(d => d.role)).size === trusted.roles.length && trusted.roles.every(role => e.clockDomains.some(d => d.role === role && same(d.domain, trusted.clockDomain))), 'CLOCK-DOMAIN-MISMATCH');
    const trace = nsTraceAttempt(trusted,raw.binding);
    nsAssert(nsText(trusted.frozenTrace.candidateId), 'CANDIDATE-IDENTITY-UNBOUND');
    for (const record of [trusted.calibrationP1,trusted.calibrationP4,trusted.calibrationP5].filter(Boolean)) {
      nsCalibrationIdentity(record);
      nsAssert(record.candidateUnderTest===trusted.frozenTrace.candidateId, 'CALIBRATION-CANDIDATE-MISMATCH');
      nsAssert(record.payload.binding?.attemptId!==raw.binding.attemptId && record.payload.binding?.attemptId!==raw.binding.crashAttemptId, 'BASELINE-UNBOUND');
    }
    const w = e.window, start = nsTime(w.startNs), end = nsTime(w.endNs), drain = nsTime(w.drainEndNs);
    nsAssert(end > start && drain >= end, 'EVENT-SCHEMA', 'window bounds');
    if (!same(trace.window,w)) refuse('TRACE-WINDOW-MISMATCH');
    if (!same(e.offers.map(o=>({eventId:o.eventId,commandId:o.commandId,scheduledAtNs:o.scheduledAtNs,commandSha256:o.commandSha256})), trace.offers.map(o=>({eventId:o.eventId,commandId:o.commandId,scheduledAtNs:o.scheduledAtNs,commandSha256:o.commandSha256})))) refuse('TRACE-OFFERS-MISMATCH');
    nsArray(w.bursts, 'burst intervals').forEach(b => nsAssert(nsTime(b.startNs) < nsTime(b.endNs), 'EVENT-SCHEMA'));
    const entries = nsArray(e.source.entries, 'source entries');
    nsAssert(e.source.storage === trusted.sourceStorage && nsText(trusted.sourceStorage), 'SOURCE-STORAGE-MISMATCH');
    try { if (trusted.verifySource?.(e.source) !== true || typeof trusted.normalizeSource !== 'function' || !same(trusted.normalizeSource(e.source, raw.binding), { entries, commandDigests:e.source.commandDigests })) refuse('SOURCE-NOT-VERIFIED'); } catch { refuse('SOURCE-NOT-VERIFIED','source bytes could not be decoded'); }
    if (e.source.storage === 'broker-frame/2') {
      const finalCrc = nsVerifyBrokerFrames(e.source.frames, e.source.initialCrc);
      nsAssert(finalCrc === e.source.finalCrc && entries.filter(x => x.kind === 'commit').every(x => e.source.frames.some(f => f.offset === x.offset)), 'SOURCE-CRC-CHAIN');
    }
    nsAssert(entries.length > 0 && nsUint(e.source.firstOffset) && nsUint(e.source.finalOffset), 'RAW-EVENTS-MISSING');
    const byOffset = new Map(), positions = new Map(), resolvedPositions = new Set();
    let next = BigInt(e.source.firstOffset), sourceGaps = 0, lastPosition = null;
    const committedCommands = new Map();
    for (const entry of entries) {
      nsFeedEntryBytes(entry);
      nsAssert(entry.stream === trusted.sourceStream, 'SOURCE-COORDINATE-MISMATCH');
      const offset = BigInt(entry.offset);
      nsAssert(offset >= next, 'SOURCE-GAP', 'source offsets must be unique and increasing');
      sourceGaps += Number(offset - next); next = offset + 1n; byOffset.set(entry.offset, entry);
      for (const tx of entry.transactions ?? []) {
        for (const id of tx.commandIds) {
          if (committedCommands.has(id)) refuse('DUPLICATE-COMMIT', id);
          committedCommands.set(id, { tx, entry });
          const frozen = trusted.commands?.[id];
          if (!frozen || frozen.changesSha256 !== nsCommandSha256(tx.changes) || e.source.commandDigests?.[id] !== frozen.commandSha256) refuse('SOURCE-CONTENT-MISMATCH', id);
        }
      }
      for (const tx of entry.transactions ?? []) for (const p of tx.positions) {
        const coordinate = nsPos(p);
        if (trusted.epochs?.[canonText(p)] !== entry.epoch) refuse('CONSUMER-IDENTITY-MISMATCH', 'source epoch disagrees with pinned mapping');
        if ((lastPosition !== null && nsComparePosition(p, lastPosition) <= 0) || coordinate[2] !== BigInt(entry.offset) || (typeof p !== 'string' && (p.stream !== entry.stream || p.epoch !== entry.epoch))) refuse('NS-P3-ORDER-VIOLATIONS-MAX', 'source cursor disagrees with offset order');
        lastPosition = p; resolvedPositions.add(canonText(p));
        const key = canonText(p); nsAssert(!positions.has(key), 'SOURCE-GAP', 'position repeated in source'); positions.set(key, { p, tx, entry });
      }
      if (entry.kind !== 'commit') {
        const p = trusted.resolveFrontier?.(entry); const coordinate=nsPos(p);
        nsAssert(coordinate[2] === BigInt(entry.offset) && (typeof p === 'string' || (p.stream===entry.stream && p.epoch===entry.epoch)) && (lastPosition===null || nsComparePosition(p,lastPosition)>0), 'SOURCE-COORDINATE-MISMATCH');
        lastPosition=p; resolvedPositions.add(canonText(p));
      }
    }
    nsAssert(next - 1n <= BigInt(e.source.finalOffset), 'SOURCE-GAP');
    sourceGaps += Number(BigInt(e.source.finalOffset) - (next - 1n));
    if (sourceGaps) refuse('SOURCE-GAP');
    const offered = new Set(e.offers.map(o => o.commandId));
    for (const { tx } of positions.values()) for (const id of tx.commandIds) if (!offered.has(id)) refuse('FOREIGN-COMMIT', id);
    for (const offer of e.offers) if (offer.receipt) {
      const p = positions.get(canonText(offer.receipt.position));
      if (!p || !p.tx.txIds.includes(offer.receipt.txId) || !p.tx.commandIds.includes(offer.commandId) || !same(offer.receipt.stamp, p.tx.stamp) || !same(offer.receipt.commandIds, p.tx.commandIds)) refuse('LOST-ACKED-COMMIT', offer.commandId);
    }
    const sourceBrackets = nsIndex(e.sourceBrackets, 'position'), consumerBrackets = nsIndex(e.consumerBrackets, 'position');
    sourceBrackets.forEach(nsBracket); consumerBrackets.forEach(nsBracket);
    nsAssert(nsUint(trusted.maxBracketWidthNs), 'BRACKET-LIMIT-UNBOUND');
    for (const b of [...sourceBrackets.values(), ...consumerBrackets.values()]) if (nsTime(b.U)-nsTime(b.L)>BigInt(trusted.maxBracketWidthNs)) refuse('BRACKET-TOO-WIDE');
    const c = e.consumer;
    nsAssert(c.walComplete === true, 'WAL-NOT-ESTIMABLE');
    nsAssert(typeof c.tailedWalHex === 'string' && /^(?:[0-9a-f]{2})*$/.test(c.tailedWalHex) && typeof c.finalWalHex === 'string' && /^(?:[0-9a-f]{2})*$/.test(c.finalWalHex), 'EVENT-SCHEMA');
    nsAssert(c.finalWalHex.startsWith(c.tailedWalHex), 'TAMPER', 'final WAL differs from retained tail');
    const transactions = nsArray(c.transactions, 'WAL transactions');
    nsAssert(transactions.length > 0 && c.tailedWalHex.length > 0, 'WAL-NOT-ESTIMABLE');
    for (const name of ['effects', 'affected', 'deliveries']) nsArray(c[name], `final ${name}`);
    nsAssert(same(c.initialFrontier,trusted.initialFrontier), 'CHECKPOINT-UNBOUND');
    const counts = nsConsumerCounts(transactions, c.initialFrontier, c.effects);
    nsAssert(typeof trusted.normalizeWal === 'function', 'WAL-NOT-ESTIMABLE');
    if (!same(trusted.normalizeWal(c, raw.binding), { transactions, effects: c.effects, affected: c.affected, deliveries: c.deliveries })) refuse('WAL-NOT-ESTIMABLE', 'normalized rows disagree with decoded WAL');
    for (const tx of transactions) if (!resolvedPositions.has(canonText(tx.frontierAfter))) refuse('NS-P3-ORDER-VIOLATIONS-MAX', 'frontier is not a resolved source position');
    if (!same(counts.frontier, lastPosition)) refuse('NS-P3-ORDER-VIOLATIONS-MAX', 'final checkpoint must reach exactly the final source frontier');
    nsAssert(nsText(trusted.consumerId) && isObj(trusted.epochs), 'CONSUMER-IDENTITY-UNBOUND');
    for (const rows of [c.effects, c.affected, ...transactions.flatMap(t => [t.effects, t.affected, t.deleted.effects, t.deleted.affected])]) for (const row of rows) if (row.consumer !== trusted.consumerId || row.epoch !== trusted.epochs[canonText(row.position)]) refuse('CONSUMER-IDENTITY-MISMATCH');
    if (counts.orderViolations) refuse('NS-P3-ORDER-VIOLATIONS-MAX');
    if (counts.duplicates) refuse('NS-P3-VISIBLE-DUP-EFFECTS-MAX');
    // [EXP-CRNS] Why: tie final rows to all committed mutations, including deletes. Rejected: final-state-only duplicate counting.
    for (const name of ['effects', 'affected', 'deliveries']) {
      const rows = new Map();
      for (const tx of transactions) {
        for (const row of nsArray(tx.deleted?.[name], `deleted ${name}`)) rows.delete(name === 'deliveries' ? row.offset : nsKey(row));
        for (const row of nsArray(tx[name], `inserted ${name}`)) rows.set(name === 'deliveries' ? row.offset : nsKey(row), row);
      }
      const uniqueFinal = new Map(c[name].map(row => [name === 'deliveries' ? row.offset : nsKey(row), row]));
      nsAssert(same([...rows].sort(), [...uniqueFinal].sort()), 'TAMPER', `final ${name} disagrees with WAL`);
    }
    const deliveries = nsIndex(c.deliveries, 'offset');
    let gaps = sourceGaps;
    for (const entry of entries) if (deliveries.get(canonText(entry.offset))?.digest !== sha256(nsFeedEntryBytes(entry))) gaps++;
    for (const row of c.deliveries) if (!byOffset.has(row.offset)) gaps++;
    if (gaps) refuse('NS-P3-GAPS-MAX');
    nsAssert(typeof trusted.domainAffected === 'function', 'O-DOMAIN-NOT-RUN');
    let misses = 0, extras = 0;
    for (const row of [...c.effects, ...c.affected]) if (!positions.has(canonText(row.position))) extras++;
    const observedSubjects = {};
    for (const name of ['effects', 'affected']) {
      observedSubjects[name] = new Map();
      for (const row of c[name]) { const k = canonText(row.position); if (!observedSubjects[name].has(k)) observedSubjects[name].set(k, new Set()); observedSubjects[name].get(k).add(row.subject); }
    }
    const lag = [], steady = [], burst = [], widths = [], midpoint = [];
    const scheduledIds=new Set(trace.offers.filter(o=>nsTime(o.scheduledAtNs)>=start && nsTime(o.scheduledAtNs)<end && trusted.frozenTrace.commands?.[o.commandId]?.valid===true).map(o=>o.commandId));
    let outOfWindowLag=0;
    for (const [key, { p, tx, entry }] of positions) {
      const expected = trusted.domainAffected({ position: p, transaction: tx, entry, prefix: nsPrefix(entries, p) });
      nsAssert(Array.isArray(expected) && expected.every(nsText) && new Set(expected).size === expected.length, 'O-DOMAIN-REFUSED');
      for (const name of ['affected', 'effects']) {
        const observed = [...(observedSubjects[name].get(key) ?? [])];
        const diff = nsDifference(expected, observed); misses += diff.misses.length; extras += diff.extras.length;
      }
      const s = sourceBrackets.get(key), consumer = consumerBrackets.get(key);
      if (!s) { refuse('NS-P3-EVERY-POSITION-ACCOUNTED', key); continue; }
      nsAssert(nsTime(s.U) <= drain, 'BRACKET-INVALID', 'source bracket after drain');
      if (!consumer) { gaps++; refuse('NS-P3-EVERY-POSITION-ACCOUNTED', `no durable consumer bracket ${key}`); }
      if (consumer) nsAssert(nsTime(consumer.U) >= nsTime(s.L) && nsTime(consumer.U) <= drain, 'BRACKET-INVALID');
      if (tx.commandIds.some(id=>scheduledIds.has(id))) {
        const inside=nsTime(s.L)>=start && nsTime(s.L)<end;
        if(!inside) outOfWindowLag++;
        const delta = consumer && inside ? nsTime(consumer.U) - nsTime(s.L) : Infinity;
        lag.push(delta);
        const offer=trace.offers.find(o=>tx.commandIds.includes(o.commandId));
        const inBurst = w.bursts.some(b => nsTime(offer.scheduledAtNs) >= nsTime(b.startNs) && nsTime(offer.scheduledAtNs) < nsTime(b.endNs));
        (inBurst ? burst : steady).push(delta);
        if (consumer) { widths.push(nsTime(s.U) - nsTime(s.L), nsTime(consumer.U) - nsTime(consumer.L)); midpoint.push(Number(nsTime(consumer.L) + nsTime(consumer.U) - nsTime(s.L) - nsTime(s.U)) / 2e6); }
      }
    }
    if (misses || extras) refuse('NS-P3-DOMAIN-AFFECTED-SET');
    const crKeys = new Set();
    for (const cr of e.crossChecks) {
      nsAssert(['source', 'consumer'].includes(cr.role), 'CR-INCONSISTENT');
      const key = canonText([cr.role, cr.position]); nsAssert(!crKeys.has(key), 'CR-INCONSISTENT'); crKeys.add(key);
      const b = (cr.role === 'source' ? sourceBrackets : consumerBrackets).get(canonText(cr.position));
      if (!b || nsTime(cr.atNs) < nsTime(b.L) - 1000000n || nsTime(cr.atNs) > nsTime(b.U) + 5000000n) refuse('CR-INCONSISTENT');
    }
    for (const { p } of positions.values()) for (const role of ['source', 'consumer']) if (!crKeys.has(canonText([role, p]))) refuse('CR-CROSSCHECK-MISSING');
    let readerShare = 0;
    try { readerShare = nsReaderEvidence(e.reads, e.readers, w, trusted.readerLevel); } catch (error) { refuse(error.code ?? 'READER-LEVEL-MISMATCH', error.message); }
    if (readerShare < .99) refuse('READER-LEVEL-MISMATCH');
    const witnessHashes = new Set(), crashTimes = new Set(), injectionIds = new Set();
    for (const f of e.faults) {
      nsAssert(f.format === 'fault-witness/1' && same(f.binding, raw.binding) && nsHash(f.eventsSha256) && f.eventsSha256 === sha256(canonText(f.events)) && !witnessHashes.has(f.eventsSha256) && f.events?.some(x => x.transition === 'cgroup-gone' && nsTime(x.t) <= drain), 'FAULT-WITNESS-INVALID');
      const gone=f.events.filter(x=>x.transition==='cgroup-gone');
      nsAssert(gone.length===1 && nsTime(gone[0].t)>=start && nsTime(gone[0].t)<end && !crashTimes.has(gone[0].t) && nsText(f.injectionId) && !injectionIds.has(f.injectionId), 'FAULT-WITNESS-INVALID', 'crash not distinct/in traffic');
      nsAssert(e.offers.some(o=>nsTime(o.sentAtNs)<nsTime(gone[0].t)) && e.offers.some(o=>nsTime(o.sentAtNs)>nsTime(gone[0].t)) && e.reads.some(r=>nsTime(r.receivedAtNs)<nsTime(gone[0].t)) && e.reads.some(r=>nsTime(r.sentAtNs)>nsTime(gone[0].t)), 'FAULT-WITNESS-INVALID','crash outside active reader/writer span');
      const injection=trace.injections?.find(x=>x.injectionId===f.injectionId);
      nsAssert(injection && injection.faultPointId===f.faultPointId && same(injection.pageFrontier,f.pageFrontier) && gone[0].injectionId===f.injectionId, 'FAULT-WITNESS-INVALID', 'injection not in frozen crash plan');
      crashTimes.add(gone[0].t); injectionIds.add(f.injectionId);
      const checkpoint = f.checkpointOffset === null ? BigInt(e.source.firstOffset)-1n : nsUint(f.checkpointOffset) ? BigInt(f.checkpointOffset) : null;
      nsAssert(checkpoint !== null && checkpoint >= BigInt(e.source.firstOffset)-1n && nsUint(f.recoveryOffset) && BigInt(f.recoveryOffset) > checkpoint && Array.isArray(f.replay) && f.replay.length > 0, 'FAULT-WITNESS-INVALID', 'recovery checkpoint/range absent');
      nsAssert(Number.isSafeInteger(f.beforeTransaction) && f.beforeTransaction >= -1 && Number.isSafeInteger(f.recoveryTransaction) && f.recoveryTransaction > f.beforeTransaction && f.recoveryTransaction < transactions.length, 'FAULT-WITNESS-INVALID', 'missing checkpoint transaction anchors');
      const beforeFrontier = f.beforeTransaction < 0 ? c.initialFrontier : transactions[f.beforeTransaction].frontierAfter;
      const afterFrontier = transactions[f.recoveryTransaction].frontierAfter;
      nsAssert(nsPos(beforeFrontier)[2] === checkpoint && nsPos(afterFrontier)[2] === BigInt(f.recoveryOffset), 'FAULT-WITNESS-INVALID', 'checkpoint anchors disagree with WAL');
      const beforeBracket=consumerBrackets.get(canonText(beforeFrontier)), afterBracket=consumerBrackets.get(canonText(afterFrontier));
      nsAssert(beforeBracket && afterBracket && nsTime(beforeBracket.U)<=nsTime(gone[0].t) && nsTime(afterBracket.L)>nsTime(gone[0].t), 'FAULT-WITNESS-INVALID', 'checkpoint/recovery not bound to crash time');
      nsAssert([...consumerBrackets.values()].filter(b=>nsTime(b.U)<=nsTime(gone[0].t)).every(b=>nsComparePosition(b.position,beforeFrontier)<=0), 'FAULT-WITNESS-INVALID', 'checkpoint is stale at crash time');
      const snapshot=trusted.normalizeFault?.(f,raw.binding);
      const expectedState={'before-effect':'absent','after-effect':'uncommitted','after-checkpoint':'committed'}[f.faultPointId];
      nsAssert(snapshot && snapshot.injectionId===f.injectionId && same(snapshot.checkpoint,beforeFrontier) && same(snapshot.pageFrontier,f.pageFrontier) && snapshot.effectState===expectedState && same(f.pageFrontier,f.faultPointId==='after-checkpoint'?beforeFrontier:afterFrontier), 'FAULT-WITNESS-INVALID', 'fault-point snapshot disagrees');
      nsAssert(same(f.replay, transactions.slice(f.beforeTransaction+1,f.recoveryTransaction+1).flatMap(t=>t.deliveries)), 'FAULT-WITNESS-INVALID', 'replay disagrees with recovered WAL range');
      const expectedReplay = entries.filter(x => BigInt(x.offset) > checkpoint && BigInt(x.offset) <= BigInt(f.recoveryOffset)).map(x => ({ offset: x.offset, digest: sha256(nsFeedEntryBytes(x)) }));
      nsAssert(expectedReplay.length === Number(BigInt(f.recoveryOffset) - checkpoint) && same(f.replay, expectedReplay), 'FAULT-WITNESS-INVALID', 'recovery range missing/reordered/repeated deliveries');
      for (const delivered of f.replay) {
        const entry = byOffset.get(delivered.offset);
        nsAssert(entry && delivered.digest === sha256(nsFeedEntryBytes(entry)), 'FAULT-WITNESS-INVALID', 'resume is not byte exact');
      }
      witnessHashes.add(f.eventsSha256);
    }
    // [EXP-CRNS-R4] Why: a missing recovery cannot disappear from the denominator. Rejected: counting only witnessed crashes.
    nsAssert(Array.isArray(trace.injections??[]) && new Set((trace.injections??[]).map(x=>x.injectionId)).size===(trace.injections??[]).length && same([...injectionIds].sort(),(trace.injections??[]).map(x=>x.injectionId).sort()), 'CRASH-INJECTION-UNWITNESSED');
    if (e.faults.length) for (const point of ['before-effect', 'after-effect', 'after-checkpoint']) if (e.faults.filter(f => f.faultPointId === point).length < 3) refuse('CX-FAULT-REPS-SHORT', point);
    const timing = e.noise?.grade === 'GREEN' && trusted.gradeWindow?.(e.noise, w) === 'GREEN';
    nsAssert(isObj(trusted.minimumSamples), 'SAMPLE-FLOOR-UNBOUND');
    const frozenMinimum=scheduledIds.size;
    if (trusted.minimumSamples.lag?.[raw.binding.attemptId] !== frozenMinimum) {refuse('LAG-POPULATION-UNBOUND');refuse('LAG-SAMPLES-SHORT');}
    const lagJudged = timing && !e.faults.length && frozenMinimum>0 && lag.length>=frozenMinimum;
    if (outOfWindowLag) refuse('LAG-SAMPLES-SHORT','scheduled command published outside window; infinite lag retained');
    if (!e.faults.length && lag.length < frozenMinimum) refuse('LAG-SAMPLES-SHORT');
    result.measurements.P3 = { gaps, ...counts, misses, extras, readerShare, lag: { pooled: nsStats(lag), steady: nsStats(steady), burst: nsStats(burst), midpointP99Ms: nsNearestRank(midpoint, 99), bracketWidthP99Ms: nsMs(nsNearestRank(widths, 99)) }, lagJudged };
    result.bars.P3 = { sourcePrefixEnumerated: !result.reasons.some(r => ['SOURCE-GAP', 'LOST-ACKED-COMMIT', 'FOREIGN-COMMIT'].includes(r.code)), everyPositionAccounted: !result.reasons.some(r => r.code === 'NS-P3-EVERY-POSITION-ACCOUNTED'), counts: gaps === 0 && counts.orderViolations === 0 && counts.duplicates === 0 && misses === 0 && extras === 0, lag: lagJudged ? nsStats(lag).p99Ms <= 250 : null };
    if (lagJudged && !result.bars.P3.lag) refuse('NS-P3-LAG-P99-MS');
    if (!lagJudged && !e.faults.length) refuse('TIMING-UNJUDGED');
    result.bars.P3.resume = e.faults.length >= 9 && result.reasons.length === 0 && result.bars.P3.counts;
    if (!e.faults.length) {
      if (trusted.crashRun) {
        const ct = trusted.crashRun.trusted;
        const bound = ct?.binding && ct.binding.attemptId !== raw.binding.attemptId && same(ct.binding,{...raw.binding,attemptId:raw.binding.crashAttemptId}) && nsSameCompanionContext(trusted,ct) && !ct.crashRun;
        if (!bound) refuse('COMPANION-UNBOUND');
        const crash = bound ? recomputeNS(trusted.crashRun.bundle, ct) : null;
        result.bars.P3.resume = crash?.status === 'CRASH-RECOMPUTED' && crash.bars.P3.resume === true && crash.bars.P3.counts === true;
      }
      if (!result.bars.P3.resume) refuse('P3-RESUME-MISSING');
    }
    nsOtherPriorities(e, trusted, result, refuse, positions, sourceBrackets, timing);
    if (result.reasons.some(r => !['TIMING-UNJUDGED','NS-P3-LAG-P99-MS','P3-RESUME-MISSING'].includes(r.code))) result.bars.P3.counts = false;
    if (e.faults.length && result.reasons.length) result.bars.P3.resume = false;
    result.bars.P3.met = result.bars.P3.lag === true && result.bars.P3.resume && result.reasons.length === 0;
    if (result.reasons.length) result.bars.P3.met = false;
    if (trusted.control) result.a0 = nsControlRecord(trusted.control);
    result.status = result.reasons.length ? 'REFUSED' : e.faults.length ? 'CRASH-RECOMPUTED' : 'RECOMPUTED';
  } catch (error) { refuse(error.code ?? 'EVENT-SCHEMA', error.message); }
  return result;
}

/** Q99b proposal: record A0's actual rung. Never substitute this record for a paired comparative/promotion result. */
export function nsControlRecord({ kind, candidateRung, a0Rung, a0Fits, binding, measuredBinding, grade, aaGrade, paired }) {
  nsAssert(same(binding, measuredBinding) && isObj(binding) && nsText(binding.attemptId) && nsText(binding.sourceSha256) && nsText(binding.slot) && nsText(binding.inputsSha256), 'A0-RUNG-UNBOUND');
  nsAssert(Number.isSafeInteger(a0Rung) && a0Rung > 0 && Number.isSafeInteger(candidateRung) && candidateRung > 0, 'A0-RUNG-INVALID');
  const absolute = kind === 'absolute' && a0Fits === false && a0Rung < candidateRung;
  nsAssert(absolute ? grade === 'GREEN' && aaGrade === 'GREEN' : paired === true && a0Rung === candidateRung, 'CONTROL-UNMATCHED');
  return { format: 'a0-rung/1', binding, candidateRung, a0Rung, role: absolute ? 'comparison-and-budgets-only' : 'paired-control', admission: 'PENDING-CONTRACT' };
}

function nsOtherPriorities(e, trusted, result, refuse, positions, brackets, timing) {
  const requested = new Set(e.faults.length ? trusted.priorities.filter(p=>p==='P2') : trusted.priorities);
  const commandPositions = new Map();
  for (const p of positions.values()) for (const id of p.tx.commandIds) commandPositions.set(id, p);
  const offers = e.offers, bands = new Map(), receipts = new Map();
  let unaccounted = 0, ackUndecided = 0, maxWaitNs = 0n;
  const queue = [], validity = new Map();
  try { nsUniqueEvents(offers, 'eventId'); } catch (error) { refuse(error.code, error.message); }
  nsAssert(offers.length > 0 && typeof trusted.commandValid === 'function' && typeof trusted.ryow === 'function', 'O-REPLAY-NOT-RUN');
  for (const o of offers) {
    const scheduled = nsTime(o.scheduledAtNs), sent = nsTime(o.sentAtNs);
    nsAssert(sent >= scheduled && nsText(o.commandId), 'EVENT-SCHEMA');
    if (!['normal', 'duplicate', 'lost-ACK', 'lost-ACK retry', 'correction', 'invalid'].includes(o.kind)) refuse('OFFER-KIND-MISSING');
    const frozen = trusted.commands?.[o.commandId];
    if (!frozen || o.commandSha256 !== frozen.commandSha256) refuse('SOURCE-CONTENT-MISMATCH', o.commandId);
    const p = commandPositions.get(o.commandId);
    const prefix = e.source.entries.filter(entry => (entry.transactions ?? []).some(tx => tx.positions.every(pos => { const b = brackets.get(canonText(pos)); return b && nsTime(b.U) <= scheduled; })));
    // [EXP-CRNS-R4] Why: committed validity is a property of source order, not poll visibility or candidate errors.
    // Rejected: passing E1 to the oracle (typedError could determine the answer being judged).
    const command = new Proxy(Object.freeze({commandId:o.commandId,commandSha256:frozen?.commandSha256,changesSha256:frozen?.changesSha256}), {
      get(target,key) { nsAssert(Object.hasOwn(target,key), 'O-REPLAY-INPUT-UNBOUND',String(key)); return target[key]; },
      has(target,key) { nsAssert(Object.hasOwn(target,key), 'O-REPLAY-INPUT-UNBOUND',String(key)); return true; }
    });
    const beforePosition = p ? e.source.entries.map(en=>({...en,transactions:(en.transactions??[]).filter(tx=>tx.positions.every(pos=>nsComparePosition(pos,p.p)<0))})).filter(en=>en.kind!=='commit'||en.transactions.length) : prefix;
    const valid = trusted.commandValid(command, beforePosition);
    nsAssert(typeof valid === 'boolean', 'O-REPLAY-REFUSED');
    validity.set(o.commandId,valid);
    if (valid!==frozen?.valid) refuse('COMMAND-VALIDITY-PIN-MISMATCH',o.commandId);
    if (!valid && p) refuse('INVALID-COMMAND-PUBLISHED',o.commandId);
    const firstAttempt=offers.filter(x=>x.commandId===o.commandId).reduce((a,x)=>nsTime(x.sentAtNs)<nsTime(a.sentAtNs)?x:a,o);
    const publication=p && brackets.get(canonText(p.p));
    if (publication && nsTime(publication.L)<nsTime(firstAttempt.sentAtNs)) refuse('PUBLISHED-BEFORE-OFFER',o.commandId);
    if (['duplicate','lost-ACK retry'].includes(o.kind) && !offers.some(x=>x.commandId===o.commandId && x.eventId!==o.eventId && nsTime(x.sentAtNs)<sent)) refuse('RETRY-ORIGIN-MISSING');
    if (valid && !p) refuse('VALID-COMMAND-NOT-PUBLISHED', o.commandId);
    if ((o.typedError || o.typedConflict) && p) refuse('ERROR-BUT-COMMITTED', o.commandId);
    if (valid && (o.typedError || o.typedConflict)) refuse('VALID-COMMAND-REJECTED', o.commandId);
    const later = offers.find(r => r.commandId === o.commandId && r.receipt && r.ackAtNs && nsTime(r.sentAtNs) >= sent);
    const resolvedLostAck = o.kind === 'lost-ACK' && !o.receipt && !o.typedError && !o.typedConflict && later;
    const receipt = o.receipt ?? (resolvedLostAck ? later.receipt : null);
    if (!o.receipt && !o.typedError && !o.typedConflict && !resolvedLostAck) unaccounted++;
    if (['duplicate', 'lost-ACK retry'].includes(o.kind) && (!o.receipt || !p)) refuse('IDEMPOTENCY-RECEIPT-MISMATCH', o.commandId);
    const stop = nsTime(resolvedLostAck ? later.ackAtNs : o.ackAtNs ?? o.censoredAtNs);
    nsAssert(stop >= sent, 'EVENT-SCHEMA');
    const elapsed = stop - scheduled;
    if (elapsed > maxWaitNs) maxWaitNs = elapsed;
    const band = o.sizeBand;
    nsAssert(['5-10', '11-25', '26-50'].includes(band), 'EVENT-SCHEMA');
    if (!bands.has(band)) bands.set(band, []);
    bands.get(band).push(valid && !receipt ? Infinity : o.ackAtNs || resolvedLostAck ? elapsed : Infinity);
    if (receipt) {
      const b = brackets.get(canonText(receipt.position));
      const ack = nsTime(resolvedLostAck ? later.ackAtNs : o.ackAtNs);
      if (b && ack < nsTime(b.L)) refuse('ACK-BEFORE-PUBLICATION', o.commandId);
      else if (b && ack < nsTime(b.U)) ackUndecided++;
      if (receipts.has(o.commandId) && !same(receipts.get(o.commandId), receipt)) refuse('IDEMPOTENCY-RECEIPT-MISMATCH');
      receipts.set(o.commandId, receipt);
      if (!resolvedLostAck && !trusted.ryow(o, nsPrefix(e.source.entries, receipt.position), e.reads)) refuse('RYOW-MISMATCH', o.commandId);
    }
    queue.push([scheduled, 1]);
    const b = p && brackets.get(canonText(p.p));
    const isRetry=offers.some(x=>x.commandId===o.commandId && x.eventId!==o.eventId && nsTime(x.sentAtNs)<sent);
    const finished = isRetry ? stop : b ? nsTime(b.U) : stop;
    queue.push([finished, -1]);
  }
  const firsts=[...new Set(offers.map(o=>o.commandId))].map(id=>offers.filter(o=>o.commandId===id).sort((a,b)=>nsTime(a.sentAtNs)<nsTime(b.sentAtNs)?-1:1)[0]);
  for (const a of firsts) for(const b of firsts) if(a.subject===b.subject && nsTime(a.sentAtNs)<nsTime(b.sentAtNs) && commandPositions.has(a.commandId) && commandPositions.has(b.commandId) && nsComparePosition(commandPositions.get(a.commandId).p,commandPositions.get(b.commandId).p)>0) refuse('SUBJECT-OFFER-ORDER-MISMATCH');
  let depth = 0, maxQueue = 0, maxSteadyQueue = 0;
  for (const [at, delta] of queue.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : b[1] - a[1])) { depth += delta; maxQueue = Math.max(depth, maxQueue);
    if (!e.window.bursts.some(b => at >= nsTime(b.startNs) && at < nsTime(b.endNs))) maxSteadyQueue = Math.max(depth, maxSteadyQueue);
  }
  const latency = Object.fromEntries([...bands].map(([b, xs]) => [b, nsStats(xs)]));
  result.measurements.P2 = { latency, unaccounted, ackUndecided, maxWaitMs: nsMs(maxWaitNs), maxQueue, maxSteadyQueue };
  if (unaccounted) refuse('NS-P2-UNACCOUNTED');
  if (ackUndecided) refuse('ACK-ORDER-UNDECIDED');
  result.measurements.P2.ackUndecidedShare = ackUndecided / offers.length;
  if (requested.has('P2')) {
    if (unaccounted) refuse('NS-P2-UNACCOUNTED');
    nsAssert(Number.isFinite(trusted.steadyRate) && trusted.steadyRate > 0, 'TRACE-NOT-FROZEN');
    if (maxSteadyQueue > 2 * trusted.steadyRate) refuse('NS-P2-QUEUE');
    for (const burst of e.window.bursts) for (const o of offers) if (nsTime(o.scheduledAtNs) < nsTime(burst.endNs) && validity.get(o.commandId)) {
      const p = commandPositions.get(o.commandId);
      const b = p && brackets.get(canonText(p.p));
      if (!b || nsTime(b.U) > nsTime(burst.endNs) + 60000000000n) refuse('NS-P2-BURST-DRAIN');
    }
    for (const b of ['5-10', '11-25', '26-50']) {
      const s = latency[b];
      const floor = trusted.minimumSamples?.bands?.[b];
      nsAssert(Number.isSafeInteger(floor) && floor > 0, 'SAMPLE-FLOOR-UNBOUND');
      if (!s || s.count < floor) refuse('P2-BAND-MISSING', b);
      else if (timing && (s.p99Ms > (b === '26-50' ? 100 : 50) || (b !== '26-50' && s.p50Ms > 10))) refuse('NS-P2-LATENCY', b);
    }
  }
  if (trusted.readerLevel>0) {
    nsAssert(typeof trusted.replayRead === 'function', 'O-REPLAY-NOT-RUN');
    const metrics = nsReadSample(e.reads, e.window, trusted.replayRead, e.source.entries);
    if (metrics.violations) refuse('NS-P1-VIOLATIONS-MAX');
    if (!timing || metrics.latency.p99Ms===null || metrics.latency.p99Ms>100) refuse('NS-P1-LATENCY');
    try { nsLoadRate(e.reads,e.window,trusted.readerLevel,trusted.frozenTrace.attempts[trusted.binding.attemptId].minimumCompletionsPerLoopSecond); }
    catch(error) { refuse(error.code??'READER-RATE-SHORT',error.message); }
    result.measurements.P1 = metrics;
    if (requested.has('P1')) {
      nsAssert(Array.isArray(e.maintenance) && e.maintenance.some(m => nsTime(m.atNs) >= nsTime(e.window.startNs) && nsTime(m.atNs) < nsTime(e.window.endNs)), 'MAINTENANCE-MISSING');
      // Baseline and ladder data must be separate source-bound raw runs, not inline ratios.
      nsAssert(e.ladder.some(x => x.id === e.mainSegmentId && x.level === trusted.readerLevel && same(x.reads, e.reads) && x.startNs === e.window.startNs && x.endNs === e.window.endNs), 'P1-MAIN-SEGMENT-MISMATCH');
      nsAssert(e.reads.filter(r => r.hot === true && e.offers.some(o => o.subject === r.subject && o.receipt && nsTime(o.sentAtNs) <= nsTime(r.sentAtNs) && nsTime(r.sentAtNs)-nsTime(o.sentAtNs) <= 60000000000n)).length >= e.reads.length * .5, 'P1-HOT-SET-SHORT');
      const split = new Map();
      for (const r of e.reads) if (nsText(r.splitGroup)) { if (!split.has(r.splitGroup)) split.set(r.splitGroup, []); split.get(r.splitGroup).push(r); }
      let straddles = 0;
      for (const group of split.values()) {
        if (group.length < 2 || !group.every(r => same(r.requestedBasis, group[0].requestedBasis) && r.subject === group[0].subject)) continue;
        const o = e.offers.find(o => o.commandId === group[0].straddledCommandId && o.ackAtNs);
        if (o && group.some(r => nsTime(r.sentAtNs) < nsTime(o.ackAtNs)) && group.some(r => nsTime(r.sentAtNs) >= nsTime(o.ackAtNs))) straddles += group.length;
      }
      nsAssert(straddles >= e.reads.length * .1, 'P1-STRADDLE-SHORT');
      result.measurements.P1.ladder = nsP1Ladder(e.ladder, trusted.replayRead, e.source.entries, trusted.calibrationP1);
      if (!result.measurements.P1.ladder.met) refuse('P1-LADDER-BAR');
    }
  }
  if (requested.has('P4')) {
    nsAssert(isObj(e.pullResources) && Array.isArray(e.pullResources.cpuset) && new Set(e.pullResources.cpuset).size > 0, 'P4-RESOURCES-MISSING');
    const pulls = e.reads.filter(r => r.shape === 'pull-current');
    nsAssert(pulls.length > 0 && new Set(pulls.map(r => r.loop)).size === 1, 'P4-SINGLE-CLIENT');
    const sequential = [...pulls].sort((a,b) => nsTime(a.sentAtNs) < nsTime(b.sentAtNs) ? -1 : 1);
    for (let i = 1; i < sequential.length; i++) nsAssert(nsTime(sequential[i].sentAtNs) >= nsTime(sequential[i-1].receivedAtNs), 'P4-SINGLE-CLIENT', 'overlapping single-client requests');
    const bucketCounts = { '50-200': 0, '201-800': 0, '801-2000': 0 }, hopCounts = { 3: 0, 4: 0, 6: 0 };
    for (const p of pulls) {
      nsAssert(Number.isSafeInteger(p.facts) && p.facts >= 50 && p.facts <= 2000 && [3, 4, 6].includes(p.hops), 'P4-MIX-MISMATCH');
      const bucket = p.facts <= 200 ? '50-200' : p.facts <= 800 ? '201-800' : '801-2000';
      nsAssert(p.bucket === bucket, 'P4-MIX-MISMATCH'); bucketCounts[bucket]++; hopCounts[p.hops]++;
    }
    nsAssert(Object.entries({ '50-200': 50, '201-800': 35, '801-2000': 15 }).every(([b, pct]) => bucketCounts[b] * 100 === pulls.length * pct) && Object.entries({ 3: 40, 4: 35, 6: 25 }).every(([b, pct]) => hopCounts[b] * 100 === pulls.length * pct), 'P4-MIX-MISMATCH');
    const cpuUs = nsTime(e.pullResources.cpuUsageEndUs) - nsTime(e.pullResources.cpuUsageStartUs);
    nsAssert(cpuUs > 0n && nsTime(e.pullResources.ioReadEndBytes) >= nsTime(e.pullResources.ioReadStartBytes) && nsTime(e.pullResources.historyScansEnd) === nsTime(e.pullResources.historyScansStart), 'P4-RESOURCES-MISSING');
    const perBucket = Object.fromEntries([...new Set(pulls.map(r => r.bucket))].map(b => [b, nsStats(pulls.filter(r => r.bucket === b).map(r => nsTime(r.receivedAtNs) - nsTime(r.sentAtNs)))]));
    const latency = nsStats(pulls.map(r => nsTime(r.receivedAtNs) - nsTime(r.sentAtNs)));
    const perCore = pulls.length * 1e9 / Number(nsTime(e.window.endNs) - nsTime(e.window.startNs)) / e.pullResources.cpuset.length;
    result.measurements.P4 = { latency, perBucket, pullsPerSecondPerCore: perCore, pullsPerCpuSecond: pulls.length * 1e6 / Number(cpuUs), bytesRead: String(nsTime(e.pullResources.ioReadEndBytes) - nsTime(e.pullResources.ioReadStartBytes)), bucketCounts, hopCounts };
    if (timing && (latency.p50Ms > 5 || latency.p99Ms > 25 || perCore < 1100)) refuse('NS-P4-LATENCY-THROUGHPUT');
    const largeBar = trusted.p4LargestBucketP99Ms;
    nsAssert(Number.isFinite(largeBar) && largeBar > 0, 'P4-BUCKET-BAR-UNBOUND');
    if (perBucket['801-2000'].p99Ms > largeBar) refuse('P4-LARGE-BUCKET-BAR');
    result.measurements.P4.history = nsP4History(e.historyPulls, trusted.replayRead, e.source.entries, e.historyResources, trusted.calibrationP4);
    if (!result.measurements.P4.history.met) refuse('P4-HISTORY-BAR');
  }
  if (requested.has('P5')) {
    const s = e.sweep;
    nsAssert(isObj(s) && s.activationReceipt?.basis !== undefined && Array.isArray(s.subjects) && Array.isArray(s.outputs) && Array.isArray(s.outbox), 'P5-RAW-EVENTS-MISSING');
    nsAssert(new Set(s.subjects).size === s.subjects.length && sha256(canonText(s.subjects)) === trusted.subjectListSha256, 'P5-COVERAGE-MISMATCH');
    nsAssert(s.subjects.length === 100000 && s.outputs.length === s.subjects.length, 'P5-COVERAGE-MISMATCH');
    const outputs = new Map(), outbox = new Map(), subjectSet = new Set(s.subjects);
    for (const [rows, index] of [[s.outputs, outputs], [s.outbox, outbox]]) for (const row of rows) {
      nsAssert(subjectSet.has(row.subject), 'P5-COVERAGE-MISMATCH');
      if (!index.has(row.subject)) index.set(row.subject, []);
      index.get(row.subject).push(row);
    }
    const activation = commandPositions.get(trusted.activationCommandId);
    nsAssert(activation && same(s.activationReceipt.basis, activation.p) && nsHash(trusted.releaseSha256) && s.activationReceipt.releaseSha256 === trusted.releaseSha256 && trusted.commands[trusted.activationCommandId]?.releaseSha256 === trusted.releaseSha256, 'P5-ACTIVATION-UNBOUND');
    nsBracket(s.durableBracket);
    nsAssert(nsTime(s.durableBracket.U) === nsTime(s.endNs) && nsTime(s.durableBracket.L) >= nsTime(s.startNs) && trusted.verifySweepDurability?.(s, result) === true, 'P5-DURABILITY-UNBOUND');
    for (const subject of s.subjects) {
      nsAssert(typeof trusted.domainSweep === 'function', 'O-DOMAIN-NOT-RUN');
      const expected = trusted.domainSweep(subject, s.activationReceipt.basis, nsPrefix(e.source.entries, s.activationReceipt.basis));
      if (!same(expected, { output: outputs.get(subject) ?? [], outbox: outbox.get(subject) ?? [] })) refuse('P5-DOMAIN-MISMATCH', subject);
    }
    nsAssert(nsTime(s.endNs) >= nsTime(s.startNs), 'EVENT-SCHEMA');
    const wallMs = nsMs(nsTime(s.endNs) - nsTime(s.startNs));
    result.measurements.P5 = { wallMs, subjects: s.subjects.length, basis: s.activationReceipt.basis };
    if (timing && wallMs > 100000) refuse('NS-P5-WALL');
    result.measurements.P5.traffic = nsP5Traffic(e.sweepTraffic, s, trusted.replayRead, e.source.entries, trusted.calibrationP5);
    if (!result.measurements.P5.traffic.met) refuse('P5-LIVE-TRAFFIC-BAR');
  }
}

// [EXP-CRNS] Why: comparison denominators come from full matched raw windows, never a candidate-supplied ratio.
// Rejected: trusting summary p99/throughput fields (F18) or matching only reader count without trace phase.
function nsSegment(segment) {
  nsAssert(isObj(segment) && nsText(segment.phase) && nsText(segment.traceSegment), 'MATCHED-SEGMENT-MISSING');
  const width = nsTime(segment.endNs) - nsTime(segment.startNs);
  nsAssert(width > 0n, 'EVENT-SCHEMA');
  const reads = nsArray(segment.reads, 'segment reads'), offers = nsArray(segment.offers, 'segment offers');
  nsUniqueEvents(reads, 'readId'); nsUniqueEvents(offers, 'eventId');
  const inWindow = t => nsTime(t) >= nsTime(segment.startNs) && nsTime(t) < nsTime(segment.endNs);
  for (const r of reads) nsAssert(inWindow(r.sentAtNs) && inWindow(r.receivedAtNs) && nsTime(r.receivedAtNs) >= nsTime(r.sentAtNs), 'EVENT-SCHEMA');
  for (const o of offers) nsAssert(inWindow(o.scheduledAtNs) && nsTime(o.ackAtNs ?? o.censoredAtNs) >= nsTime(o.scheduledAtNs), 'EVENT-SCHEMA');
  const writer = offers.map(o => o.ackAtNs ? nsTime(o.ackAtNs) - nsTime(o.scheduledAtNs) : Infinity);
  return { reads, width, writerP99Ms: nsMs(nsNearestRank(writer, 99)), maxWriterWaitMs: nsMs(nsNearestRank(writer, 100)), readP99Ms: nsMs(nsNearestRank(reads.map(r => nsTime(r.receivedAtNs) - nsTime(r.sentAtNs)), 99)) };
}
const nsMatchedSegment = (a, b) => a.phase === b.phase && a.traceSegment === b.traceSegment && same(a.offerScheduleSha256, b.offerScheduleSha256) && nsHash(a.offerScheduleSha256);

export function nsP1Ladder(windows, replayRead, prefix, calibration) {
  nsAssert(Array.isArray(windows) && windows.length > 0 && typeof replayRead === 'function', 'P1-LADDER-NOT-VERIFIED');
  const results = [], expected = new Map();
  nsUniqueEvents(windows, 'id', 'EVENT-SCHEMA');
  for (const w of windows) {
    nsAssert([0, 1, 4, 16, 64, 256, 1024].includes(w.level), 'EVENT-SCHEMA');
    const m = nsSegment(w);
    let correct = 0, violations = 0;
    nsAssert(m.reads.length > 0 && nsReaderEvidence(w.reads, w.readers, w, w.level) >= .99, 'READER-LEVEL-MISMATCH');
    if(w.level>0) nsLoadRate(w.reads,w,w.level,calibration?.payload?.minimumCompletionsPerLoopSecond);
    for (const read of m.reads) {
      const key = nsReadKey(read);
      if (!expected.has(key)) expected.set(key, replayRead(read, nsPrefix(prefix, read.requestedBasis)));
      nsAssert(nsHash(expected.get(key)), 'O-REPLAY-REFUSED');
      if (expected.get(key) === read.answerSha256 && same(read.requestedBasis, read.echoedBasis)) correct++; else violations++;
    }
    results.push({ level: w.level, phase: w.phase, traceSegment: w.traceSegment, goodput: correct * 1e9 / Number(m.width), violations, writerP99Ms: m.writerP99Ms, maxWriterWaitMs: m.maxWriterWaitMs, readP99Ms: m.readP99Ms });
  }
  let met = true, reason;
  for (const level of [0, 1, 4, 16, 64, 256, 1024]) nsAssert(windows.some(w => w.level === level), 'P1-LADDER-NOT-VERIFIED', `missing reader level ${level}`);
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i], r = results[i];
    const baseIndex = windows.findIndex(x => x.level === 0 && nsMatchedSegment(x, w));
    nsAssert(baseIndex >= 0, 'MATCHED-SEGMENT-MISSING');
    const base = results[baseIndex];
    try { nsCalibration(calibration,windows[baseIndex],'P1'); } catch(error) { met=false; reason??=error.code; }
    if ((w.level>0 && (r.readP99Ms===null || r.readP99Ms>100)) || base.writerP99Ms > 50 || r.violations || r.maxWriterWaitMs === null || r.maxWriterWaitMs > 2000 || r.writerP99Ms === null || !Number.isFinite(r.writerP99Ms) || !Number.isFinite(base.writerP99Ms)) met = false;
    if (w.level === 256 || w.level === 1024) {
      const lowerIndex = windows.findIndex(x => x.level === (w.level === 256 ? 64 : 256) && nsMatchedSegment(x, w));
      nsAssert(lowerIndex >= 0, 'MATCHED-SEGMENT-MISSING');
      const lower = results[lowerIndex];
      if (r.writerP99Ms > base.writerP99Ms * (w.level === 256 ? 1.25 : 2) || r.goodput < lower.goodput * (w.level === 256 ? 1 : .9) || (w.level === 256 && (r.readP99Ms === null || r.readP99Ms > 100))) met = false;
    }
    if (w.level === 1024) {
      const recoveryIndex = windows.findIndex(x => nsText(w.id) && nsText(x.id) && nsText(x.recoveryOf) && x.level === 256 && x.recoveryOf === w.id && nsTime(x.startNs) >= nsTime(w.endNs) && nsTime(x.startNs) - nsTime(w.endNs) <= 60000000000n);
      nsAssert(recoveryIndex >= 0, 'P1-RECOVERY-MISSING');
      const recovery = results[recoveryIndex];
      if (recovery.readP99Ms === null || recovery.readP99Ms > 100 || recovery.writerP99Ms > base.writerP99Ms * 1.25) met = false;
    }
  }
  return { met, ...(reason?{reason}:{}), windows: results, evaluatedShare: 1 };
}

/** Matched 1,000-subject depth sample; compare both latency and read bytes, retaining per-depth denominators. */
export function nsP4History(pulls, replayRead, prefix, resources, calibration) {
  nsAssert(Array.isArray(pulls) && pulls.length > 0, 'P4-HISTORY-NOT-VERIFIED');
  nsAssert(typeof replayRead === 'function' && Array.isArray(resources) && resources.length === 3, 'P4-HISTORY-NOT-VERIFIED');
  nsUniqueEvents(pulls, 'readId');
  const byDepth = new Map([1, 3, 10].map(d => [d, new Map()]));
  for (const p of pulls) {
    nsAssert(byDepth.has(p.depth) && nsText(p.subject) && !byDepth.get(p.depth).has(p.subject) && nsHash(p.answerSha256), 'EVENT-SCHEMA');
    nsAssert(p.answerSha256 === replayRead(p, nsPrefix(prefix, p.requestedBasis)) && same(p.echoedBasis, p.requestedBasis), 'P4-HISTORY-ANSWER-MISMATCH');
    nsAssert(nsTime(p.receivedAtNs) >= nsTime(p.sentAtNs), 'EVENT-SCHEMA');
    byDepth.get(p.depth).set(p.subject, p);
  }
  const subjects = [...byDepth.get(1).keys()].sort();
  nsAssert(subjects.length === 1000, 'P4-HISTORY-NOT-VERIFIED', 'requires matched 1000-subject sample');
  const depths = {};
  for (const [depth, rows] of byDepth) {
    nsAssert(same([...rows.keys()].sort(), subjects), 'P4-HISTORY-NOT-VERIFIED', 'unmatched subjects');
    const phase = resources.find(r => r.depth === depth);
    nsAssert(phase && [...rows.values()].every(r => nsTime(r.sentAtNs) >= nsTime(phase.startNs) && nsTime(r.receivedAtNs) <= nsTime(phase.endNs)) && nsTime(phase.ioReadEndBytes) >= nsTime(phase.ioReadStartBytes), 'P4-HISTORY-NOT-VERIFIED');
    depths[depth] = { count: rows.size, p99Ns: nsNearestRank([...rows.values()].map(p => nsTime(p.receivedAtNs) - nsTime(p.sentAtNs)), 99), bytesRead: nsTime(phase.ioReadEndBytes) - nsTime(phase.ioReadStartBytes) };
  }
  const baseline = nsStats([...byDepth.get(1).values()].map(p => nsTime(p.receivedAtNs) - nsTime(p.sentAtNs)));
  nsCalibrationIdentity(calibration);
  nsAssert(calibration?.format==='ns-calibration/1' && sha256(canonText(calibration.payload))===calibration.pinSha256 && same(calibration.payload.binding,calibration.expectedBinding) && calibration.payload.kind==='P4' && calibration.payload.grade==='GREEN' && calibration.payload.historyPulls?.length===1000, 'BASELINE-UNBOUND');
  nsAssert(same(calibration.payload.historyPulls.map(p=>p.subject).sort(),subjects), 'BASELINE-UNBOUND');
  const prior=nsStats(calibration.payload.historyPulls.map(p=>nsTime(p.receivedAtNs)-nsTime(p.sentAtNs)));
  const priorBytes=nsTime(calibration.payload.resources.ioReadEndBytes)-nsTime(calibration.payload.resources.ioReadStartBytes);
  const inflated=baseline.p99Ms>prior.p99Ms || depths[1].bytesRead>priorBytes;
  const met = !inflated && baseline.p50Ms <= 5 && baseline.p99Ms <= 25 && [3, 10].every(d => depths[d].p99Ns * 10n <= depths[1].p99Ns * 11n && depths[d].bytesRead * 10n <= depths[1].bytesRead * 11n);
  return { met, ...(inflated?{reason:'BASELINE-INFLATED'}:{}), depths: Object.fromEntries(Object.entries(depths).map(([d, m]) => [d, { count: m.count, p99Ms: nsMs(m.p99Ns), bytesRead: String(m.bytesRead) }])) };
}

export function nsP5Traffic(segments, sweep, replayRead, prefix, calibration) {
  try {
    nsAssert(isObj(segments) && nsMatchedSegment(segments.baseline, segments.sweep) && sweep && nsTime(segments.sweep.startNs) >= nsTime(sweep.startNs) && nsTime(segments.sweep.endNs) <= nsTime(sweep.endNs) && (nsTime(segments.baseline.endNs) <= nsTime(sweep.startNs) || nsTime(segments.baseline.startNs) >= nsTime(sweep.endNs)), 'P5-LIVE-TRAFFIC-NOT-VERIFIED');
    nsAssert(segments.sweep.startNs===sweep.startNs && segments.sweep.endNs===sweep.endNs, 'P5-TRAFFIC-COVERAGE-SHORT');
    nsAssert(nsUint(calibration?.samplingPeriodNs) && calibration.samplingPeriodNs==='1000000000', 'P5-SAMPLING-UNBOUND');
    nsCalibration(calibration,segments.baseline,'P5');
    const baseline = nsSegment(segments.baseline), during = nsSegment(segments.sweep);
    for (const s of [segments.baseline, segments.sweep]) {
      nsAssert(nsSegment(s).readP99Ms!==null && nsSegment(s).readP99Ms<=100,'NS-P1-LATENCY');
      nsAssert(nsReaderEvidence(s.reads, s.readers, s, 64) === 1, 'READER-LEVEL-MISMATCH');
      nsLoadRate(s.reads,s,64,calibration?.payload?.minimumCompletionsPerLoopSecond);
      nsAssert(nsReadSample(s.reads, s, replayRead, prefix).violations === 0, 'NS-P1-VIOLATIONS-MAX');
    }
    const expectedOffers=calibration.payload.sweepOfferOffsetsNs;
    nsAssert(Array.isArray(expectedOffers) && expectedOffers.every(nsUint) && same(segments.sweep.offers.map(o=>String(nsTime(o.scheduledAtNs)-nsTime(sweep.startNs))),expectedOffers), 'P5-WRITER-COVERAGE-SHORT');
    const valid = m => m.reads.length > 0 && Number.isFinite(m.readP99Ms) && m.readP99Ms !== null && Number.isFinite(m.writerP99Ms) && m.writerP99Ms !== null;
    return { met: valid(baseline) && valid(during) && baseline.readP99Ms <= 100 && baseline.writerP99Ms <= 50 && during.readP99Ms <= baseline.readP99Ms * 1.5 && during.writerP99Ms <= baseline.writerP99Ms * 1.5, baseline: { readP99Ms: baseline.readP99Ms, writerP99Ms: baseline.writerP99Ms }, sweep: { readP99Ms: during.readP99Ms, writerP99Ms: during.writerP99Ms } };
  } catch (error) { return { met: false, reason: error.code ?? 'P5-LIVE-TRAFFIC-NOT-VERIFIED' }; }
}

/** Old P3M events have candidate-origin instants, no observer brackets/WAL; compare arithmetic only, never qualify. */
export function recomputeP3MDiagnostic(observations) {
  const samples = nsArray(observations?.consumed?.samples, 'P3M samples');
  const values = samples.map(s => {
    nsAssert(same(s.publication.domain, s.known.domain), 'CLOCK-DOMAIN-MISMATCH');
    nsAssert(nsTime(s.known.atNs) >= nsTime(s.publication.atNs), 'BRACKET-INVALID');
    return { burst: s.burst, ns: nsTime(s.known.atNs) - nsTime(s.publication.atNs) };
  });
  return { status: 'DIAGNOSTIC', reason: 'LAG-START-CR', lag: { pooled: nsStats(values.map(s => s.ns)), steady: nsStats(values.filter(s => !s.burst).map(s => s.ns)), burst: nsStats(values.filter(s => s.burst).map(s => s.ns)) } };
}

// ================================================================ CLI

export function admitFile(file, { repo = REPO, objects = OBJECTS, authorityRef = 'main' } = {}) {
  let claim;
  // parseJson keeps Python's int/float distinction, so a workload seed of 1.0 is refused here as the reference refuses it.
  try { claim = parseJson(fs.readFileSync(file)); } catch (error) { return { verdict: 'DIAGNOSTIC', documentVerdict: 'DIAGNOSTIC', reasons: [{ code: 'CLAIM-FORMAT', detail: `cannot read ${file}: ${error.message}` }] }; }
  return admitClaim(claim, { git: gitSource(repo), objects: objectStore(objects), authorityRef });
}

const USAGE = 'usage: claim.mjs admit <claim.json> [--repo DIR] [--objects DIR] [--authority-ref main] [--json]\n       claim.mjs qualify <claim.json> [--repo DIR] [--authority-ref main] [--work DIR] [--offline-sut] [--no-sandbox] [--evaluator-repo DIR] [--json]\n       claim.mjs restore-evaluator [--evaluator-repo DIR]';
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
  const authorityRef = options['authority-ref'] ?? 'main';
  let result;
  if (command === 'admit') result = admitFile(path.resolve(file), { repo, objects: path.resolve(options.objects ?? path.join(repo, 'runs/objects')), authorityRef });
  else {
    let claim = null;
    try { claim = parseJson(fs.readFileSync(path.resolve(file))); } catch (error) { fail('USAGE', `cannot read ${file}: ${error.message}`); }
    const git = gitSource(repo);
    const workDir = path.resolve(options.work ?? path.join(repo, 'runs/qualify', `${String(claim?.claimId ?? 'claim').replace(/[^A-Za-z0-9._-]/g, '_')}-${new Date().toISOString().replace(/[:.]/g, '-')}`));
    let sut = null;
    // --offline-sut runs the system under test with the contract's buildSpec run argv (the authority's), locally.
    if (options['offline-sut']) { const b = git.resolve(authorityRef) && git.blob(git.resolve(authorityRef), PATHS.contract); try { const s = b ? JSON.parse(b.toString('utf8')).buildSpec : null; sut = strList(s?.run) ? localSut(s) : null; } catch { sut = null; } }
    result = qualifyClaim(claim, { git, authorityRef, workDir, ...(sut ? { sut } : {}), ...(options['no-sandbox'] ? { sandbox: false } : {}),
      ...(options['evaluator-repo'] ? { evaluator: { repo: path.resolve(options['evaluator-repo']) } } : {}) });
  }
  if (options.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else {
    console.log(result.verdict + (result.documentVerdict ? ` (documents: ${result.documentVerdict})` : '') + (result.offlineVerdict ? ` (offline run: ${result.offlineVerdict})` : ''));
    for (const r of result.reasons) console.log(`  ${r.code}${r.receipt ? ` [${r.receipt}]` : ''}: ${r.detail}`);
    if (result.run) console.log(`  run: ${Object.keys(result.run.builds).length} build(s), ${result.run.cases.length} case executions, objects in ${result.run.objects}`);
  }
  process.exitCode = result.verdict === 'QUALIFIED' ? 0 : 2;
});
