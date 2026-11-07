#!/usr/bin/env node
// lab/bin/claim.mjs admit <claim.json> [--repo DIR] [--objects DIR] [--authority-ref main] [--json]
//
// Claim admission from evidence (EXP-E01; RULINGS Q34d, Q37b, Q38b; pending Q41d, Q42a). Prints QUALIFIED
// (exit 0) only when every piece of evidence the claim depends on exists, verifies, is fresh and is bound to
// the claimed source tree; otherwise DIAGNOSTIC (exit 2) with every reason found. Usage errors exit 1.
//
// [EXP-E01] Why: Codex rounds 4 and 5 (plan-v2-round4 finding 4, round5 findings 4 and 11) admitted a
// claim on a fabricated receipt: all eight position case names, all-zero object hashes and a binary from
// another build under the claim's own source label; the generator's admit_claim (a structural reference
// model, Q41d) never opened an object. This evaluator implements that reference model as a minimum and
// adds what only I/O can check: it opens every object, binds what executed to the claimed commit's tree
// through a build/import manifest, checks freshness against that commit, and requires the claim's own
// measurements and a matched A0 control.
//
// Threat model, stated so nobody over-reads a QUALIFIED: this defeats stale, partial, placeholder and
// relabelled evidence (an honest-but-wrong harness or agent). It does not defeat someone who writes a
// consistent forged object graph into runs/objects (every object self-consistent, a build manifest that
// lies about which inputs produced which outputs); that is what independent verifiers (VV, required for
// promotion claims below) and verdict recomputation by the closure rules are for. Verdicts recorded in
// case-result objects are trusted here (B21 recomputation belongs to the CR-* evaluators).
//
// Rejected: reading pins, receipts or the contract from the working tree (an uncommitted edit could
// qualify a claim; everything is read from the claimed commit and the authority ref); accepting the
// first valid receipt among invalid ones as the reference model does (every receipt a claim carries is
// evidence it depends on, so one bad receipt makes the claim DIAGNOSTIC; this also blocks rerun-until-green
// bundles, B11); carrying receipts forward from ancestor commits (ACCEPTANCE 5.7: carry-forward serves
// intermediate tracking only).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { OBJECTS, REPO, fail, main, parseArgs, sha256, sourceTreeIdOf } from './lib.mjs';

export const FORMATS = {
  claim: 'triplex-db-2/claim/1',
  receipt: 'triplex-db-2/receipt/2', // ACCEPTANCE 5.1 receiptSchema.format
  manifest: 'triplex-db-2/build-manifest/1',
  caseResult: 'triplex-db-2/case-result/1',
  faultWitness: 'triplex-db-2/fault-witness/1',
  nsRun: 'triplex-db-2/ns-run/1',
  verifierRecord: 'triplex-db-2/verifier-record/1',
};
export const PATHS = { contract: 'lab/acceptance/obligations.json', loadContract: 'lab/acceptance/load-contract.json', slots: 'lab/config/slots.json', lockfile: 'pnpm-lock.yaml' };
const PREREQ = { position: 'G7.position.coordinates', identity: 'G10.composition.identity-bound', w0: 'W0.coverage-floors' };
const COMPOSITION_FIELDS = ['engine', 'imageDigest', 'configSha256', 'slot'];
const ACCEPTED_ORACLE_STATUS = ['EXISTS', 'COMPILED', 'ACCEPTED']; // generator admit_claim, unpinned oracles
const SHA = /^[0-9a-f]{64}$/;
const COMMIT = /^([0-9a-f]{40}|[0-9a-f]{64})$/;

// ---------------------------------------------------------------- I/O: git and the object store

/** Read-only git access to one repository; blob hashes are sha256 of the blob bytes, cached per commit:path. */
export function gitSource(repo) {
  const run = (args, input) => execFileSync('git', args, { cwd: repo, input, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'pipe'] });
  const cache = new Map();
  const safe = p => typeof p === 'string' && p.length > 0 && !p.startsWith('/') && !p.includes('\n') && !p.split('/').includes('..');
  const api = {
    resolve(rev) { try { return run(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]).toString().trim() || null; } catch { return null; } },
    treeOf(commit) { return run(['rev-parse', `${commit}^{tree}`]).toString().trim(); },
    commitTime(commit) { return Number(run(['show', '-s', '--format=%ct', commit]).toString().trim()); },
    blob(rev, file) {
      // Cached only for full commit ids (immutable); a ref such as main is re-read every time.
      const key = COMMIT.test(rev) ? `blob:${rev}:${file}` : null;
      if (key && cache.has(key)) return cache.get(key);
      let bytes = null;
      try { bytes = run(['cat-file', 'blob', `${rev}:${file}`]); } catch { bytes = null; }
      if (key) cache.set(key, bytes);
      return bytes;
    },
    /** Tracked files (blobs) under the given roots at the commit, sorted. */
    list(commit, roots) {
      if (!roots.every(safe)) return null;
      const out = run(['ls-tree', '-r', '-z', commit, '--', ...roots]).toString('utf8');
      return out.split('\0').filter(Boolean).map(line => { const [meta, file] = line.split('\t'); return { type: meta.split(' ')[1], path: file }; })
        .filter(e => e.type === 'blob').map(e => e.path).sort();
    },
    /** Map path -> sha256 of the blob at commit, null when absent or not a file (one cat-file --batch call). */
    blobHashes(commit, files) {
      const want = [...new Set(files)].filter(f => !cache.has(`${commit}:${f}`));
      for (const f of want.filter(f => !safe(f))) cache.set(`${commit}:${f}`, null);
      const ok = want.filter(safe);
      if (ok.length) {
        const out = run(['cat-file', '--batch'], ok.map(f => `${commit}:${f}\n`).join(''));
        let at = 0;
        for (const f of ok) {
          const nl = out.indexOf(10, at);
          const header = out.subarray(at, nl).toString('utf8').split(' ');
          at = nl + 1;
          if (header[1] === 'missing' || header.length < 3) { cache.set(`${commit}:${f}`, null); continue; }
          const size = Number(header[2]);
          const bytes = out.subarray(at, at + size);
          at += size + 1;
          cache.set(`${commit}:${f}`, header[1] === 'blob' ? sha256(bytes) : null);
        }
      }
      return new Map(files.map(f => [f, cache.get(`${commit}:${f}`) ?? null]));
    },
  };
  return api;
}

/** Content-addressed store reader: an object counts only if runs/objects/<sha> exists and its bytes hash to <sha>. */
export function objectStore(dir) {
  const memo = new Map();
  const get = sha => {
    if (memo.has(sha)) return memo.get(sha);
    let result;
    if (typeof sha !== 'string' || !SHA.test(sha)) result = { ok: false, why: `not a sha256: ${JSON.stringify(sha)}` };
    else {
      const file = path.join(dir, sha);
      if (!fs.existsSync(file)) result = { ok: false, why: `object ${sha} is not in the store` };
      else {
        const bytes = fs.readFileSync(file);
        const actual = sha256(bytes);
        result = actual === sha ? { ok: true, bytes } : { ok: false, why: `object ${sha} hashes to ${actual}` };
      }
    }
    memo.set(sha, result);
    return result;
  };
  return {
    get,
    json(sha) {
      const o = get(sha);
      if (!o.ok) return o;
      try { return { ok: true, value: JSON.parse(o.bytes.toString('utf8')) }; } catch { return { ok: false, why: `object ${sha} is not JSON` }; }
    },
  };
}

// ---------------------------------------------------------------- helpers

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = v => v !== undefined && v !== null && v !== '';
const canon = v => Array.isArray(v) ? v.map(canon) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
/** Hash of a directory pin: sha256 over "<sha256>  <path>\n" lines sorted by path (the gate.mjs hashDist convention). */
const listingHash = rows => sha256(rows.map(([p, h]) => `${h}  ${p}\n`).join(''));

/** ACCEPTANCE 5.3, as the reference model reads it: the literal select entries of every case set. */
export function requiredCases(contract, obligation) {
  if (obligation.id === PREREQ.position) return [...contract.positionRequiredCases]; // RULINGS Q38a: all eight, no exemption
  return [...new Set(obligation.cases.flatMap(c => c.select))];
}
/** The ns-run measurement an NS or GS obligation's evidence must carry (CR-GS: params.scenario; CX-GS-WRONG-SCENARIO). */
export function expectedMeasurement(obligation) {
  const p = obligation.closure?.params ?? {};
  if (p.evidenceMeasurement) return p.evidenceMeasurement;
  const m = /^NS\.(P[1-5])$/.exec(obligation.id);
  return m ? m[1] : obligation.id.startsWith('NS.SEC.') ? 'secondary' : null;
}
const isMeasured = o => (o.closure?.rules ?? []).some(r => r === 'CR-NS' || r === 'CR-GS');
const threshold = (contract, id) => contract.thresholds?.[id]?.value;

// ---------------------------------------------------------------- the evaluator

/**
 * Admit a claim. env = { git: gitSource(repo), objects: objectStore(dir), authorityRef }.
 * Returns { verdict: 'QUALIFIED' | 'DIAGNOSTIC', reasons: [{code, detail, receipt?}] }.
 */
export function admitClaim(claim, env) {
  const reasons = [];
  const why = (code, detail, receipt) => reasons.push(receipt ? { code, detail, receipt } : { code, detail });
  // Every reason is kept in order; a run of more than three with the same code on one receipt is summarised
  // (24 missing objects read better as three examples and a count).
  const done = () => {
    const seen = new Map(), out = [];
    for (const r of reasons) {
      const k = `${r.code}\u0000${r.receipt ?? ''}`;
      const n = (seen.get(k) ?? 0) + 1;
      seen.set(k, n);
      if (n <= 3) out.push(r);
    }
    for (const [k, n] of seen) if (n > 3) { const [code, receipt] = k.split('\u0000'); out.push({ code, detail: `${n - 3} more ${code} reason${n === 4 ? '' : 's'} like the above`, ...(receipt ? { receipt } : {}) }); }
    return { verdict: reasons.length ? 'DIAGNOSTIC' : 'QUALIFIED', reasons: out };
  };
  const { git, objects } = env;

  // -- the claim itself
  if (!isObj(claim) || claim.format !== FORMATS.claim) { why('CLAIM-FORMAT', `claim format must be ${FORMATS.claim}`); return done(); }
  if (!['comparative', 'promotion'].includes(claim.kind)) why('CLAIM-KIND', 'kind must be comparative or promotion');
  // Q38b / CX-CLAIM-SUPPLIED-NAMES: supplied case names and Booleans (positionCasesClosed, compositionBound,
  // positionsDense) carry no authority; nothing below reads any claim field except those named here.
  const commit = typeof claim.commit === 'string' && COMMIT.test(claim.commit) ? git.resolve(claim.commit) : null;
  if (!commit || commit !== claim.commit) { why('CLAIM-COMMIT', `commit ${JSON.stringify(claim.commit)} is not a full commit id in this repository`); return done(); }
  const tree = git.treeOf(commit);
  const commitTime = git.commitTime(commit);

  // -- the contract: read from the claimed commit, never the working tree, and equal to the authority's.
  // Why: pins and definitions decide admission (Q37b, VA6). A branch that edits lab/acceptance (or a dirty
  // working copy) must not be able to pin its own oracles; the authority ref (main) holds the contract.
  const contractBytes = git.blob(commit, PATHS.contract);
  const loadBytes = git.blob(commit, PATHS.loadContract);
  if (!contractBytes || !loadBytes) { why('CONTRACT-MISSING', `${PATHS.contract} or ${PATHS.loadContract} is missing at ${commit}`); return done(); }
  const authority = git.resolve(env.authorityRef ?? 'main');
  if (!authority) why('CONTRACT-AUTHORITY', `authority ref ${env.authorityRef ?? 'main'} does not resolve`);
  else for (const file of [PATHS.contract, PATHS.loadContract]) {
    const theirs = git.blob(authority, file);
    if (!theirs || !theirs.equals(file === PATHS.contract ? contractBytes : loadBytes)) why('CONTRACT-NOT-AUTHORITY', `${file} at the claimed commit differs from ${env.authorityRef ?? 'main'} (VA6: receipts are judged against the pinned contract)`);
  }
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const loadContract = JSON.parse(loadBytes.toString('utf8'));
  const slots = (() => { const b = authority && git.blob(authority, PATHS.slots); return b ? JSON.parse(b.toString('utf8')) : null; })();
  const byId = new Map(contract.obligations.map(o => [o.id, o]));
  const assignments = contract.composition.assignments;

  // -- the source label: the claim names the clean tree of its commit (lib.sourceTreeIdOf with no diff and no
  // untracked inputs). Why: a dirty-tree label can never be recomputed from git, so it can never be bound.
  const cleanLabel = sourceTreeIdOf(tree);
  if (claim.sourceTreeSha256 !== cleanLabel) why('CLAIM-SOURCE-LABEL', `sourceTreeSha256 ${claim.sourceTreeSha256} is not the clean label ${cleanLabel} of ${commit}`);

  // -- obligations. Q42a (round 5 finding 11): unknown ids are rejected, never dropped.
  const claimedIds = Array.isArray(claim.obligations) ? claim.obligations : [];
  if (!claimedIds.length) why('CLAIM-NO-OBLIGATIONS', 'the claim names no obligation');
  for (const id of claimedIds) if (!byId.has(id)) why('UNKNOWN-OBLIGATION', `obligation ${JSON.stringify(id)} is not in contract ${contract.version} (RULINGS Q42a)`);
  for (const id of claimedIds) if (Object.values(PREREQ).includes(id)) why('CLAIM-PREREQ-AS-CLAIM', `${id} is a prerequisite, not a comparative claim`);
  const claimed = claimedIds.filter(id => byId.has(id)).map(id => byId.get(id));
  const domain = claimed.some(o => o.oracles.includes('O-DOMAIN'));
  const prereqIds = [PREREQ.position, PREREQ.identity, ...(domain ? [PREREQ.w0] : [])];

  // -- compositions. VA14 / CX-COMPOSITION-UNBOUND: four assignments, each with exactly the four fields, none empty.
  const bound = comp => isObj(comp) && same(Object.keys(comp).sort(), [...assignments].sort())
    && assignments.every(k => isObj(comp[k]) && same(Object.keys(comp[k]).sort(), [...COMPOSITION_FIELDS].sort()) && COMPOSITION_FIELDS.every(f => nonEmpty(comp[k][f])));
  if (!bound(claim.composition)) why('COMPOSITION-UNBOUND', 'claim composition must bind source, current, history and analytics with engine, imageDigest, configSha256 and slot (VA14, RULINGS Q28)');
  const measured = claimed.filter(isMeasured);
  const control = claim.control ?? null;
  if (measured.length && !control) why('CONTROL-MISSING', `${measured.map(o => o.id).join(', ')} need${measured.length === 1 ? 's' : ''} a matched A0 control (RULINGS Q42a)`);
  if (control) {
    const a0 = contract.a0Controls?.[control.id];
    if (!a0) why('CONTROL-NOT-A0', `control ${JSON.stringify(control.id)} is not an A0 control (${Object.keys(contract.a0Controls ?? {}).join(', ')})`);
    if (!bound(control.composition)) why('COMPOSITION-UNBOUND', 'control composition is not fully bound (VA14)');
    else if (a0 && control.composition.source.engine !== a0.source) why('CONTROL-NOT-A0', `control ${control.id} needs a ${a0.source} source, got ${control.composition.source.engine}`);
    if (same(control.composition, claim.composition)) why('CONTROL-IS-CANDIDATE', 'the control composition equals the claimed composition');
  }
  // VA4: every assignment runs the pinned image. The contract pins no images, so the pin is
  // lab/config/slots.json at the authority ref (a branch cannot move its own pin).
  for (const [label, comp] of [['claim', claim.composition], ['control', control?.composition]]) {
    if (!bound(comp)) continue;
    for (const k of assignments) {
      const pin = slots?.lanes?.[comp[k].engine]?.imageId;
      if (!pin || comp[k].imageDigest !== pin) why('IMAGE-NOT-PINNED', `${label} ${k} image ${comp[k].imageDigest} is not the pinned ${pin ?? '(no pin)'} (VA4)`);
    }
  }

  // -- oracle pins (Q37b, Q38b; GATE-ORACLE-PIN): every oracle the claim or its prerequisites use needs a
  // non-null, accepted pin, screening included; the reference model's rule, plus (lab, VA6) the pinned files
  // at the claimed commit must still hash to the pin.
  const oracles = new Set([...claimed, ...prereqIds.map(id => byId.get(id)).filter(Boolean)].flatMap(o => o.oracles));
  for (const x of [...oracles].sort()) {
    const pin = contract.oraclePins?.[x];
    if (pin) {
      const sha = pin.sha256;
      // An empty file map pins nothing, so it counts as unpinned here (stricter than the reference, Q41d).
      if (pin.acceptReceipt == null || sha == null || (isObj(sha) && (!Object.keys(sha).length || Object.values(sha).some(v => v == null)))) { why('ORACLE-UNPINNED', `oracle ${x} has no accepted pin (RULINGS Q37b, Q38b: every claim is a diagnostic until it does)`); continue; }
      checkPinnedFiles(`oracle ${x}`, isObj(sha) ? sha : { [pin.files.replace(/\*+$/, '')]: sha }, 'ORACLE-FILES');
    } else if (!ACCEPTED_ORACLE_STATUS.includes(contract.oracles?.[x]?.status)) why('ORACLE-UNACCEPTED', `oracle ${x} is ${contract.oracles?.[x]?.status ?? 'unknown'} and unpinned`);
  }
  // GATE-W0 (Q31i, Q34d): a domain-dependent claim needs every W0 pin and the review receipt.
  if (domain) {
    const w0 = contract.w0Pin;
    if (!w0 || w0.reviewReceipt == null || Object.values(w0.files ?? {}).some(v => v == null) || !Object.keys(w0.files ?? {}).length) why('W0-UNPINNED', 'W0 pin or its review receipt is null (GATE-W0)');
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

  // -- receipts: assign each one a role, then verify it completely.
  const compositions = [['claim', claim.composition], ...(control ? [['control', control.composition]] : [])];
  const receipts = Array.isArray(claim.receipts) ? claim.receipts : [];
  const seenIds = new Set();
  const roles = []; // {r, role, obligation}
  for (const [i, r] of receipts.entries()) {
    const label = isObj(r) && typeof r.receiptId === 'string' ? r.receiptId : `#${i}`;
    if (!isObj(r) || r.format !== FORMATS.receipt) { why('RECEIPT-FORMAT', `receipt format must be ${FORMATS.receipt}`, label); continue; }
    if (!r.receiptId || seenIds.has(r.receiptId)) { why('RECEIPT-ID', 'receiptId missing or repeated', label); continue; }
    seenIds.add(r.receiptId);
    // One obligation per claim receipt, so every evidence object belongs to exactly one obligation.
    if (!Array.isArray(r.obligations) || r.obligations.length !== 1) { why('RECEIPT-OBLIGATIONS', 'a claim receipt names exactly one obligation', label); continue; }
    const oid = r.obligations[0].id;
    const obligation = byId.get(oid);
    if (!obligation) { why('UNKNOWN-OBLIGATION', `receipt obligation ${JSON.stringify(oid)} is not in the contract (RULINGS Q42a)`, label); continue; }
    let role = null;
    if (r.runKind === 'verifier') role = claimedIds.includes(oid) ? 'verifier' : null;
    else if (prereqIds.includes(oid)) role = 'prereq';
    else if (claimedIds.includes(oid)) role = same(r.composition, claim.composition) ? 'measurement' : control && same(r.composition, control.composition) ? 'control' : null;
    if (!role) { why('RECEIPT-UNUSED', `receipt for ${oid} on this composition is not evidence for this claim`, label); continue; }
    roles.push({ r, role, obligation });
    verifyReceipt(r, role, obligation, label);
  }

  // -- prerequisites (Q34d, Q38b, GATE-POSITION "A0 included"): per composition the claim compares, a receipt
  // for each prerequisite, derived from receipts only. W0.coverage-floors is required for the claimed composition.
  for (const [label, comp] of compositions) for (const pid of prereqIds) {
    if (pid === PREREQ.w0 && label === 'control') continue;
    if (!roles.some(x => x.role === 'prereq' && x.obligation.id === pid && same(x.r.composition, comp)))
      why('PREREQ-MISSING', `no ${pid} receipt for the ${label} composition (RULINGS Q34d, Q38b${pid === PREREQ.position ? ', Q38a' : ''})`);
  }

  // -- the claim's own evidence (Q42a, round 5 finding 11): measurement receipts for every claimed obligation;
  // for NS and GS a matched control: A0 on the same slot, trace generator, seed and window.
  for (const o of claimed) {
    const mine = roles.filter(x => x.role === 'measurement' && x.obligation.id === o.id);
    if (!mine.length) { why('MEASUREMENT-MISSING', `no ${o.id} measurement receipt for the claimed composition; prerequisites alone never qualify (RULINGS Q42a)`); continue; }
    if (!isMeasured(o)) continue;
    const theirs = roles.filter(x => x.role === 'control' && x.obligation.id === o.id);
    if (!theirs.length) { if (control) why('CONTROL-MISSING', `no ${o.id} receipt for control ${control.id} (RULINGS Q42a)`); continue; }
    const key = run => JSON.stringify(canon({ slot: run.slot, generator: run.trace?.generatorSourceSha256, seed: run.trace?.seed, windows: run.windows }));
    const controlKeys = new Set(theirs.flatMap(x => x.nsRuns ?? []).map(key));
    for (const x of mine) for (const run of x.nsRuns ?? [])
      if (!controlKeys.has(key(run))) why('CONTROL-UNMATCHED', `${o.id} run on slot ${run.slot}, seed ${run.trace?.seed} has no control run on the same slot, trace generator, seed and windows (RULINGS Q42a)`, x.r.receiptId);
  }

  // -- promotion claims need verifier evidence (Q42a "verifier evidence required by the obligation"; VV1, VV2, VV4).
  if (claim.kind === 'promotion') for (const o of claimed) {
    const verified = new Set(roles.filter(x => x.role === 'verifier' && x.obligation.id === o.id && x.verifierOk).flatMap(x => x.record.verifiesReceiptIds));
    for (const x of roles.filter(x => (x.role === 'measurement' || x.role === 'control') && x.obligation.id === o.id))
      if (!verified.has(x.r.receiptId)) why('VERIFIER-MISSING', `${x.r.receiptId} has no independent verifier record with zero mismatches (VV1 to VV4)`);
  }
  return done();

  // ---------------------------------------------------------------- one receipt
  function verifyReceipt(r, role, obligation, label) {
    const bad = (code, detail) => why(code, detail, label);
    const entry = roles.at(-1);
    // VA6 / CX-STALE-DEFINITION: the receipt was judged against this contract and this definition.
    if (r.contract?.version !== contract.version || r.contract?.transitiveSha256 !== contract.transitiveContractSha256) bad('RECEIPT-CONTRACT', `contract ${r.contract?.version}/${r.contract?.transitiveSha256} is not ${contract.version}/${contract.transitiveContractSha256} (VA6)`);
    if (r.obligations[0].definitionSha256 !== obligation.definitionSha256) bad('RECEIPT-DEFINITION', `${obligation.id} definition hash differs from the contract (VA6, CX-STALE-DEFINITION)`);
    // VA1 / B7 / B8: produced by lab/bin; run kinds that never count (calibration, diagnostic, smoke, mutation).
    if (typeof r.producer?.tool !== 'string' || !r.producer.tool.startsWith('lab/bin/')) bad('RECEIPT-PRODUCER', 'producer.tool must be a lab/bin script (VA1, B8)');
    const kinds = role === 'verifier' ? ['verifier'] : role === 'prereq' || claim.kind === 'promotion' ? ['acceptance'] : ['acceptance', 'candidate', 'control'];
    if (!kinds.includes(r.runKind)) bad('RECEIPT-RUN-KIND', `runKind ${r.runKind} cannot support a ${claim.kind} claim as ${role} (allowed: ${kinds.join(', ')}; B7)`);
    // VA16, ACCEPTANCE 5.7: a screening receipt is evidence for candidate comparison only. Prerequisites must be
    // VA-valid (CLAIM_ADMISSION), so they can never come from a screening profile; nor can a promotion.
    const screening = (contract.screeningProfiles ?? []).includes(r.profile);
    if (!nonEmpty(r.profile)) bad('RECEIPT-PROFILE', 'profile is missing');
    else if (screening && (role === 'prereq' || claim.kind === 'promotion')) bad('RECEIPT-SCREENING', `${r.profile} receipt cannot serve as ${role === 'prereq' ? 'a prerequisite' : 'promotion evidence'} (VA16, RULINGS Q34d)`);
    // VA14: composition bound, and equal to the composition this receipt speaks for.
    if (!bound(r.composition)) bad('COMPOSITION-UNBOUND', 'receipt composition is not fully bound (VA14, CX-COMPOSITION-UNBOUND)');
    else if (role === 'prereq' && !compositions.some(([, c]) => same(c, r.composition))) bad('RECEIPT-UNUSED', `${obligation.id} receipt is for a composition this claim does not compare`);
    // Freshness (Q42a): produced at the claim's commit (not an ancestor, even with an unchanged closure:
    // ACCEPTANCE 5.7 limits carry-forward to intermediate tracking), on its clean tree, after that commit existed.
    // Why each: Codex round 5 used a falsifier receipt from an earlier commit; a stale binary kept the
    // claim's source label (so the label alone proves nothing); a start time before the commit is a
    // relabelled receipt.
    if (r.git?.commit !== commit || r.git?.tree !== tree) bad('RECEIPT-NOT-FRESH', `produced at ${r.git?.commit ?? '?'}, not the claimed commit ${commit} (RULINGS Q42a)`);
    const pid = r.profileIdentity ?? {};
    if (pid.sourceTreeSha256 !== cleanLabel) bad('RECEIPT-SOURCE-LABEL', `source label ${pid.sourceTreeSha256} is not the clean label of the claimed commit (RULINGS Q38b)`);
    const start = Date.parse(r.timing?.start), end = Date.parse(r.timing?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) bad('RECEIPT-TIMING', 'timing.start and timing.end must be ISO times, end after start');
    else if (start < commitTime * 1000) bad('RECEIPT-NOT-FRESH', `started ${r.timing.start}, before the claimed commit existed (${new Date(commitTime * 1000).toISOString()}) (RULINGS Q42a)`);
    // VA2: profile identity complete; the lockfile it names is the commit's.
    for (const f of ['sourceTreeSha256', 'buildManifestSha256', 'lockfileSha256', 'node', 'pnpm']) if (!nonEmpty(pid[f])) bad('RECEIPT-IDENTITY', `profileIdentity.${f} is missing (VA2)`);
    const lock = git.blobHashes(commit, [PATHS.lockfile]).get(PATHS.lockfile);
    if (pid.lockfileSha256 !== lock) bad('RECEIPT-LOCKFILE', `lockfile ${pid.lockfileSha256} is not ${PATHS.lockfile} at the claimed commit (${lock}) (VA2, B4)`);
    // VA5: the endpoint contacted is the one expected, and never a homebase port.
    const forbidden = slots?.forbiddenPorts ?? [15442, 17019];
    if (!isObj(r.endpoint) || !nonEmpty(r.endpoint.contacted) || !same(r.endpoint.contacted, r.endpoint.expected)) bad('RECEIPT-ENDPOINT', 'endpoint.contacted must equal endpoint.expected (VA5)');
    else if (forbidden.some(p => JSON.stringify(r.endpoint.contacted).includes(`:${p}`))) bad('RECEIPT-ENDPOINT', `contacted a forbidden port ${forbidden.join(' or ')} (VA5)`);
    // VA10: resource admission recorded and not refused.
    if (!isObj(r.admission) || !nonEmpty(r.admission.reservationId) || r.admission.status === 'BLOCKED_CAPACITY') bad('RECEIPT-ADMISSION', 'admission must record a reservation and not BLOCKED_CAPACITY (VA10)');
    // VA8 / B1 / B12: nothing skipped, unsupported or unimplemented; executed equals declared.
    const c = r.counts ?? {};
    if (!(c.executed > 0) || c.executed !== c.declared || ['skipped', 'unsupported', 'notImplemented', 'unexpectedErrors'].some(k => c[k] !== 0)) bad('RECEIPT-COUNTS', 'counts must show executed = declared > 0 and zero skipped, unsupported, notImplemented and unexpectedErrors (VA8)');

    // The build/import manifest binds what executed to the claimed tree (Q42a; Codex round 4 finding 4).
    verifyManifest(pid.buildManifestSha256, r, bad);

    // VA1: open every evidence object; each must exist, hash to its name and describe this receipt.
    const evidence = Array.isArray(r.evidence) ? r.evidence : [];
    if (!evidence.length) bad('EVIDENCE-MISSING', 'receipt carries no evidence');
    const open = (sha, format, what) => {
      const o = objects.json(sha);
      if (!o.ok) { bad('OBJECT', `${what}: ${o.why} (VA1)`); return null; }
      const v = o.value;
      // Why self-description: a real object from another case, receipt or commit must not stand in for this one.
      if (v.format !== format || v.receiptId !== r.receiptId || v.commit !== commit || v.obligation !== obligation.id) { bad('OBJECT-NOT-THIS-RECEIPT', `${what}: object ${sha} describes ${v.format}/${v.receiptId}/${v.obligation}/${v.commit}, not this receipt`); return null; }
      return v;
    };
    const blob = (sha, what) => { const o = objects.get(sha); if (!o.ok) bad('OBJECT', `${what}: ${o.why} (VA1)`); return o.ok; };
    const passed = new Set();
    const nsRuns = [];
    const faults = [];
    for (const e of evidence) {
      if (!isObj(e) || !nonEmpty(e.kind)) { bad('EVIDENCE-FORMAT', 'evidence entries need kind and objectSha256'); continue; }
      if (e.kind === 'case-result') {
        const v = open(e.objectSha256, FORMATS.caseResult, `case ${e.caseId}/${e.mode}`);
        if (!v) continue;
        if (v.caseId !== e.caseId || v.mode !== e.mode || v.verdict !== e.verdict) { bad('OBJECT-NOT-THIS-RECEIPT', `case ${e.caseId}/${e.mode}: object says ${v.caseId}/${v.mode} ${v.verdict}`); continue; }
        if (v.rawResultObject !== undefined) blob(v.rawResultObject, `case ${e.caseId}/${e.mode} raw result`);
        // The correctness checks: any non-PASS case fails the receipt, even beside a later PASS (B11 rerun-until-green).
        if (e.verdict !== 'PASS') bad('CASE-NOT-PASS', `case ${e.caseId}/${e.mode} is ${e.verdict}`);
        else passed.add(`${e.caseId}\u0000${e.mode}`);
      } else if (e.kind === 'fault-witness') {
        const v = open(e.objectSha256, FORMATS.faultWitness, `fault witness ${e.faultPointId}`);
        if (!v) continue;
        const injections = Array.isArray(v.injections) ? v.injections : [];
        for (const inj of injections) blob(inj?.durableEvidenceObject, `fault ${v.faultPointId} injection`);
        faults.push({ faultPointId: v.faultPointId, injections: injections.length });
      } else if (e.kind === 'ns-run') {
        const v = open(e.objectSha256, FORMATS.nsRun, 'ns-run');
        if (!v) continue;
        blob(v.rawEventsObject, 'ns-run raw events');
        nsRuns.push(v);
      } else if (e.kind === 'verifier-record') {
        const v = open(e.objectSha256, FORMATS.verifierRecord, 'verifier record');
        if (!v) continue;
        blob(v.recomputedVerdictsObject, 'verifier recomputed verdicts');
        entry.record = v;
      } else blob(e.objectSha256, `${e.kind} evidence`);
    }
    entry.nsRuns = nsRuns;

    if (role === 'verifier') {
      // VV1: a different agent from every author of the code under test; VV4: zero mismatches.
      const rec = entry.record;
      if (!rec) { bad('VERIFIER-RECORD', 'verifier receipt carries no verifier-record object'); return; }
      const verified = receipts.filter(x => rec.verifiesReceiptIds?.includes(x?.receiptId));
      if (!Array.isArray(rec.verifiesReceiptIds) || !rec.verifiesReceiptIds.length || verified.length !== rec.verifiesReceiptIds.length) bad('VERIFIER-RECORD', 'verifiesReceiptIds must name receipts carried by this claim');
      if (!Array.isArray(rec.mismatches) || rec.mismatches.length) bad('VERIFIER-MISMATCH', `verifier reports mismatches: ${JSON.stringify(rec.mismatches)}`);
      if (!nonEmpty(r.producer?.agentId) || verified.some(x => (x.producer?.authorsOfCodeUnderTest ?? []).includes(r.producer.agentId) || x.producer?.agentId === r.producer.agentId)) bad('VERIFIER-NOT-INDEPENDENT', `verifier agent ${r.producer?.agentId} authored or produced the verified receipts (VV1)`);
      entry.verifierOk = reasons.every(x => x.receipt !== label);
      return;
    }
    // VA8 and Q42a "modes required by the obligation": every selected case PASSes in every declared mode.
    const modes = obligation.closure?.modes ?? [];
    const missing = requiredCases(contract, obligation).flatMap(cs => modes.filter(m => !passed.has(`${cs}\u0000${m}`)).map(m => `${cs}/${m}`));
    if (!modes.length) bad('CASES-MISSING', `${obligation.id} declares no mode (CX-ZERO-MODES)`);
    if (missing.length) bad('CASES-MISSING', `${obligation.id} lacks a PASS for ${missing.length} required case x mode pair(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', ...' : ''} (VA8; Q38a for position)`);
    // Q42a "fault repetitions": a CR-FAULT obligation needs fault witnesses, each injected T-FAULT-REPS times.
    if ((obligation.closure?.rules ?? []).includes('CR-FAULT')) {
      const reps = threshold(contract, 'T-FAULT-REPS') ?? 3;
      if (!faults.length) bad('FAULT-WITNESS-MISSING', `${obligation.id} closes by CR-FAULT but carries no fault witness`);
      for (const f of faults) if (f.injections < reps) bad('FAULT-REPS-SHORT', `fault point ${f.faultPointId} injected ${f.injections} times, T-FAULT-REPS is ${reps} (CX-FAULT-REPS-SHORT)`);
    }
    // NS and GS: the ns-run measurement is this obligation's (CX-GS-WRONG-SCENARIO) on the frozen trace (VA15).
    if (isMeasured(obligation)) {
      const want = expectedMeasurement(obligation);
      if (!nsRuns.length) bad('NS-RUN-MISSING', `${obligation.id} carries no ns-run evidence`);
      const frozen = loadContract.writerTrace?.generator?.frozen;
      if (!frozen) bad('TRACE-NOT-FROZEN', `${PATHS.loadContract} pins no frozen trace generator (writerTrace.generator.frozen {path, sha256, seed}); VA15 cannot hold`);
      const genHashes = git.blobHashes(commit, nsRuns.map(x => x.trace?.generatorPath).filter(Boolean));
      for (const run of nsRuns) {
        if (run.measurement !== want) bad('NS-RUN-WRONG-MEASUREMENT', `ns-run measures ${run.measurement}, ${obligation.id} needs ${want} (CX-GS-WRONG-SCENARIO)`);
        if (!nonEmpty(run.slot) || !Array.isArray(run.windows) || !run.windows.length) bad('NS-RUN-FORMAT', 'ns-run needs slot and windows');
        const t = run.trace ?? {};
        if (genHashes.get(t.generatorPath) !== t.generatorSourceSha256) bad('TRACE-UNBOUND', `trace generator ${t.generatorPath} at the claimed commit does not hash to ${t.generatorSourceSha256}`);
        if (frozen && (t.generatorPath !== frozen.path || t.generatorSourceSha256 !== frozen.sha256 || t.seed !== frozen.seed)) bad('TRACE-NOT-FROZEN', `trace ${t.generatorPath}@${t.generatorSourceSha256}/seed ${t.seed} is not the frozen pair (VA15, CX-NS-UNFROZEN-TRACE)`);
      }
    }
  }

  // ---------------------------------------------------------------- one build/import manifest
  // Q42a: "the executed binary and modules are bound to the claimed source tree through a build/import manifest
  // that is itself an object". Closes Codex round 4 finding 4 (a stale binary under the same source label).
  function verifyManifest(sha, r, bad) {
    const o = objects.json(sha);
    if (!o.ok) { bad('MANIFEST', `build manifest: ${o.why} (VA1)`); return; }
    const m = o.value;
    if (m.format !== FORMATS.manifest) { bad('MANIFEST', `build manifest format must be ${FORMATS.manifest}`); return; }
    // VA3 "build first": the manifest was produced by this run, so an old build cannot be reused under a new receipt.
    if (m.receiptId !== r.receiptId) bad('MANIFEST-NOT-THIS-RUN', `manifest was produced for ${m.receiptId}, not this receipt (VA3)`);
    if (m.commit !== commit || m.tree !== tree) bad('MANIFEST-NOT-FRESH', `manifest records ${m.commit}/${m.tree}, not the claimed commit (RULINGS Q42a)`);
    const modules = Array.isArray(m.modules) ? m.modules : [];
    const builds = new Map((Array.isArray(m.builds) ? m.builds : []).map(b => [b?.id, b]));
    if (!Array.isArray(m.entrypoints) || !m.entrypoints.length || !modules.length) { bad('MANIFEST', 'manifest must list its entry points and executed modules'); return; }
    for (const ep of m.entrypoints) if (!modules.some(x => x?.path === ep)) bad('MANIFEST', `entry point ${ep} is not among the executed modules`);
    const treeFiles = modules.filter(x => x?.origin === 'tree').map(x => x.path);
    const buildInputs = [...builds.values()].flatMap(b => (b?.inputs ?? []).map(x => x?.path));
    const hashes = git.blobHashes(commit, [...treeFiles, ...buildInputs, PATHS.lockfile]);
    for (const x of modules) {
      if (!isObj(x) || !nonEmpty(x.path) || !SHA.test(x.sha256 ?? '')) { bad('MANIFEST', 'every module needs path and sha256'); continue; }
      if (x.origin === 'tree') {
        // A source module executed directly (lab/bin, tsx): its bytes are the blob at the claimed commit.
        if (hashes.get(x.path) !== x.sha256) bad('MODULE-STALE', `executed ${x.path} ${x.sha256} is not the claimed commit's (${hashes.get(x.path)})`);
      } else if (x.origin === 'build') {
        // A built module (dist): it must be an output of a build whose inputs are the claimed commit's (checked below).
        const b = builds.get(x.build);
        if (!b || !(b.outputs ?? []).some(y => y?.path === x.path && y?.sha256 === x.sha256)) bad('MODULE-NOT-BUILT', `executed ${x.path} is not an output of build ${x.build} in this manifest`);
      } else if (x.origin === 'dependency') {
        // Third-party code is bound only through the lockfile at the commit (pnpm's store integrity).
        if (!/^node_modules\//.test(x.path) || x.path.split('/').includes('..') || m.lockfileSha256 !== hashes.get(PATHS.lockfile)) bad('DEPENDENCY-UNBOUND', `${x.path} is not bound by the claimed commit's lockfile`);
      } else bad('MODULE-ORIGIN', `${x.path} has origin ${JSON.stringify(x.origin)}; allowed: tree, build, dependency`);
    }
    for (const [id, b] of builds) {
      // Every build's inputs are exactly the tracked files under its source roots at the claimed commit, byte for
      // byte. Why exactly: an omitted input is how an older file slips into a "current" build.
      const roots = Array.isArray(b?.sourceRoots) ? b.sourceRoots : [];
      const listed = roots.length ? git.list(commit, roots) : null;
      if (!listed || !listed.length) { bad('BUILD-INPUTS', `build ${id} names no source roots present at the claimed commit`); continue; }
      const inputs = (b.inputs ?? []).map(x => x?.path);
      const missing = listed.filter(p => !inputs.includes(p)), extra = inputs.filter(p => !listed.includes(p));
      if (missing.length || extra.length) bad('BUILD-INPUTS-INCOMPLETE', `build ${id} inputs differ from the tracked files under ${roots.join(', ')}: missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'}`);
      for (const x of b.inputs ?? []) if (listed.includes(x?.path) && hashes.get(x.path) !== x.sha256) bad('BUILD-INPUT-STALE', `build ${id} was built from ${x.path} ${x.sha256}, the claimed commit has ${hashes.get(x.path)} (stale binary under the claim's source label)`);
    }
  }
}

// ---------------------------------------------------------------- CLI

export function admitFile(file, { repo = REPO, objects = OBJECTS, authorityRef = 'main' } = {}) {
  const claim = JSON.parse(fs.readFileSync(file, 'utf8'));
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
