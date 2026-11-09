import { latencyReceipt, requireQleverConnectionMode } from "../../receipts/latency.mjs";
// [EXP-W02] Why: one process seeds, fingerprints and measures the exact same composition and endpoint.
// Rejected: accepting another process's G0 receipt or running W01's non-W0 stream after a failed admission.
import { checkedRead } from './read.ts';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { generateScenario, RUNGS, generatorIdentity, operations } from './generate.ts';
import { admitWorld } from './admission.ts';
import { seedW0 } from '../../bench/lib/w0-seed.ts';
import { W0, V_W0, canonical, worldOf, many } from '../../bench/lib/w0-world.ts';
import { loadW0Pins } from '../../bench/lib/evaluate.ts';
import type { CompositionHandle } from '../../bench/lib/composition.ts';
// @ts-ignore -- ESM lab helpers.
import { expectDomain, requireDomainClaims } from '../lib/domain.mjs';
// @ts-ignore -- ESM lab helpers.
import { brokerEnv, GS_LANES } from '../lib/policy.mjs';
// @ts-ignore -- ESM lab helpers.
import { REPO } from '../lib/triplex.mjs';
import { openScenarioLane, type LayoutReader } from './lanes.ts';
import { specs } from './expect.ts';
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export async function execute(comp: CompositionHandle, spec: any, gen: ReturnType<typeof generateScenario>, opts: any, seedPosition: number) {
  let head = seedPosition, stop = false, readerError: unknown;
  const checks: any[] = [], attempts: any[] = [], reads: any[] = [], errors: any[] = [];
  const ctx: any = { spec, comp, opts, domainRequests: [], check(id: string, ok: boolean, detail: unknown = null) { checks.push({ id, ok: !!ok, detail }); return !!ok; } };
  const start = performance.now();
  // Read bases come only from published receipts. The clock is W0's fixed valid time plus trace time.
  const readers = Array.from({ length: opts.readers }, (_, k) => (async () => {
    while (!stop) {
      const P = head, validAt = V_W0 + Math.floor(performance.now() - start), subject = W0.placementId(k % gen.N), t = performance.now();
      try {
        const page = await checkedRead(comp, [subject], { position: P, validAt }, reads);
        reads.push({ subject, basis: { recordedPosition: P, validAt }, ms: performance.now() - t, facts: page.rows.length });
      } catch (error) { readerError = String(error); errors.push({ reader: k, P, error: String(error) }); break; }
      await sleep(0);
    }
  })());
  let chain: Promise<void> = Promise.resolve();
  const seen = new Map<string, any>();
  try {
    for (const event of gen.events) {
      const due = start + event.atMs;
      if (due > performance.now()) await sleep(due - performance.now());
      // Unsupported product actions are explicit failed cases; the oracle's absence never turns into a no-op PASS.
      if (event.action || event.race) { checks.push({ id: event.action ?? event.race, ok: false, detail: 'product/fault executor not integrated in W02' }); continue; }
      chain = chain.then(async () => {
        const t = performance.now();
        try {
          let ops: any[];
          if (event.resend) {
            const original = seen.get(event.id);
            if (!original) throw Error('resend before original command');
            ops = original;
          } else {
            const page = await checkedRead(comp, [event.subject], { position: head, validAt: V_W0 + Math.floor(event.atMs) }, reads);
            ops = operations(event);
            const replaced = new Set(event.rows.filter(([, a]) => !many.has(a)).map(([e, a]) => e + '\0' + a));
            ops.unshift(...page.rows.filter(r => replaced.has(r.entityId + '\0' + r.attribute)).map(r => ({ op: 'retract', id: r.id })));
            seen.set(event.id, ops);
          }
          const result = await comp.transact(ops, { actor: 'gs-driver', commandId: event.id });
          let receipt: any;
          if (result.ok) receipt = result.value;
          else if (event.resend) {
            const lookup = await comp.transactionByCommand(event.id);
            if (!lookup.ok || !lookup.value) throw Error('duplicate cannot resolve original receipt');
            receipt = lookup.value;
          } else throw Error(result.tag);
          if (!Number.isSafeInteger(receipt.position) || receipt.position < 1) throw Error('invalid publication position');
          head = Math.max(head, receipt.position);
          attempts.push({ id: event.id, stream: event.stream, resend: !!event.resend, position: receipt.position, txId: receipt.txId,
            offerToAckMs: performance.now() - due, serviceMs: performance.now() - t });
        } catch (error) { errors.push({ id: event.id, stream: event.stream, error: String(error) }); }
      });
    }
    const end = start + gen.durationS * 1000;
    if (end > performance.now()) await sleep(end - performance.now());
    await chain;
  } finally { stop = true; await Promise.all(readers); }
  const validAt = V_W0 + gen.durationS * 1000;
  for (const subject of [gen.witnesses.positive[0], gen.witnesses.negative[0]]) {
    try {
      const page = await checkedRead(comp, [subject], { position: head, validAt }, reads);
      const input = { world: worldOf(subject, page.rows), basis: { tx: head, validTime: new Date(validAt).toISOString().replace('.000Z', '.000000Z') },
        activations: [{ from: W0.POPULATION_VALID_TIME, release: W0.R1.hash, tx: 1 }] };
      const observedBytes = W0.runOpBytes('reconcile', Buffer.from(canonical(input)));
      expectDomain(ctx, { id: `kernel-conformance:${subject}`, op: 'reconcile', input, observedBytes, claims: [],
        observation: { runTag: opts.runTag, scope: opts.scope, endpoint: comp.backend.url, sourceSha256: opts.sourceSha256, recordedPosition: head } });
    } catch (error) { checks.push({ id: `domain-read:${subject}`, ok: false, detail: String(error) }); }
  }
  requireDomainClaims(ctx);
  // These are deliberately explicit: this scaffold cannot close a scenario on kernel agreement alone.
  checks.push({ id: 'O-REPLAY-live-state', ok: false, detail: 'v2 receipt-mode state comparison not integrated' },
    { id: 'maintenance-in-window', ok: false, detail: 'requires independently observed maintenance event' },
    { id: 'feed-and-lost-ack-faults', ok: false, detail: 'v2 feed consumer, lost-ACK injection and fault executor not integrated' },
    { id: 'scenario-specific-domain-witnesses', ok: false, detail: 'kernel conformance is not the named product/domain claim' });
  return { scenario: spec.id, slug: spec.slug, verdict: 'FAIL', verdicts: { database: 'UNQUALIFIED', domain: 'UNQUALIFIED', bars: 'UNQUALIFIED' },
    generator: gen.version, streamSha256: gen.streamSha256, sourceSha256: gen.sourceSha256, domainRequests: ctx.domainRequests,
    positions: { start: seedPosition, end: head }, attempts, reads, errors, readerError,
    correctness: { checks, pass: checks.filter(c => c.ok).length, fail: checks.filter(c => !c.ok).length },
    firstFailures: checks.filter(c => !c.ok).slice(0, 10) };
}
async function main() {
  const args = process.argv.slice(2), opt = (key: string, fallback?: string) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
  const lane = opt('--lane')!, rung = opt('--rung', '10k')!, N = RUNGS[rung], output = path.resolve(opt('--output', '')!);
  if (!GS_LANES.includes(lane) || !N) throw Error('--lane xtdb|qlever|datomic and a known --rung required');
  if (!output.startsWith(path.join(REPO, 'runs') + path.sep) && !(args.includes('--offline') && output.startsWith(path.join(REPO, 'lab/experiments/EXP-W02/evidence') + path.sep))) throw Error('--output must be under owned runs/evidence');
  if (args.includes('--offline')) {
    const result = await (await import('./case-driver.ts')).runCases(lane as any, output, opt('--case'));
    console.log(JSON.stringify({ classification: result.classification, lane, matched: result.matched, blocked: result.blocked, failed: result.failed, total: result.cases.length }));
    if (result.failed) process.exitCode = 1; return;
  }
  const ownerFile = process.env.TRIPLEX_LAB_SLOT_OWNER;
  if (!ownerFile) throw Error('GS v2 live runs require a held exclusive slot');
  const owner = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
  if (owner.lane !== lane || owner.mode !== 'exclusive') throw Error('GS v2 requires matching exclusive slot owner');
  Object.assign(process.env, brokerEnv(lane, opt('--broker-dir'), path.join(REPO, 'runs')));
  const tag = 'W02-' + randomBytes(12).toString('hex');
  const report: any = latencyReceipt({ qleverConnectionMode: lane === 'qlever' ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? 'keep-alive') : null, format: 'tx2-gs-run/2', generator: 'W02/1', classification: 'DIAGNOSTIC', lane, rung, readers: Number(opt('--readers', '256')),
    runTag: tag, status: 'RUNNING', slotOwner: owner, profile: { reduced: true, reason: 'v2 product/fault and state-oracle integration incomplete' },
    qlever: lane === 'qlever' ? { connectionMode: process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? 'keep-alive', commitPath: 'broker', brokerDirectory: process.env.QLEVER_BROKER_DIR, baseTriples: null, deltaTriples: null, touchedBlockDelta: null, rebuildThreshold: null } : null,
    scenarios: [], startedAt: new Date().toISOString() });
  if (!Number.isSafeInteger(report.readers) || report.readers < 1) throw Error('positive integer readers required');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n'); save();
  try {
    await loadW0Pins();
    const which = opt('--scenarios', 'all');
    const selected = specs().filter(s => which === 'all' || which!.split(',').map(Number).includes(s.id));
    if (!selected.length) throw Error('no scenarios selected');
    // The independent population expectation is fixed before seeding and before any measured warm-up.
    const oracleFile = path.join(path.dirname(output), `${tag}-population.json`);
    const oracleRun = spawnSync('python3', ['-I', path.join(REPO, 'lab/oracles/domain/cli.py'), '--population', '--rung', String(N), '--fingerprint', '--out', oracleFile],
      { encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    if (oracleRun.error || oracleRun.status !== 0) throw Error('population oracle: ' + (oracleRun.error ?? oracleRun.stderr));
    const oracle = JSON.parse(fs.readFileSync(oracleFile, 'utf8'));
    for (const spec of selected) {
      const scope = `${tag}-s${spec.id}`;
      report.scope = scope;
      // Dynamic import keeps offline generator/oracle tests independent of engine builds.
      let layoutReader: LayoutReader | undefined;
      const layoutFile = opt('--layout-reader');
      if (layoutFile) {
        const real = fs.realpathSync(path.resolve(layoutFile));
        if (!real.startsWith(path.join(REPO, 'lab') + path.sep)) throw Error('layout reader must be an owned lab module');
        const digest = () => createHash('sha256').update(fs.readFileSync(real)).digest('hex');
        const pinned = digest();
        const module = await import(new URL('file://' + real).href + '?sha256=' + pinned);
        if (typeof module.readQleverLayout !== 'function') throw Error('layout module has no readQleverLayout');
        layoutReader = async binding => {
          if (digest() !== pinned) throw Error('layout reader source changed');
          const observed = await module.readQleverLayout(binding);
          if (digest() !== pinned) throw Error('layout reader source changed during observation');
          return observed;
        };
        report.layoutReader = { file: path.relative(REPO, real), sha256: pinned };
      }
      const lanePort = await openScenarioLane({ lane: lane as any, scope, endpoint: owner.endpoint, attempt: tag, sourceSha256: generatorIdentity() }, {
        root: REPO, brokerDirectory: opt('--broker-dir'), layoutReader,
      });
      const comp = lanePort.comp;
      report.qlever = lanePort.initialLayout;
      try {
        report.endpoint = comp.backend.url;
        if (report.endpoint !== owner.endpoint) throw Error('measuring endpoint differs from slot');
        const seeded = await seedW0(comp, N, path.join(path.dirname(output), `${scope}-seed.jsonl`));
        const counts = { position: seeded.commands, assertions: seeded.assertions, retired: seeded.retractions };
        const admission = await admitWorld(comp, { endpoint: comp.backend.url, scope, N, oracle, counts, position: seeded.commands, validAt: V_W0 });
        report.world = { scope, seeded, admission, countsStart: await comp.storeCounts(), countsEnd: null };
        save();
        const gen = generateScenario(spec, N);
        const result = await execute(comp, spec, gen, { runTag: tag, scope, sourceSha256: generatorIdentity(), readers: report.readers }, seeded.commands);
        report.world.countsEnd = await comp.storeCounts();
        if (lane === 'qlever') report.qlever = { ...await lanePort.layout(), before: lanePort.initialLayout };
        report.scenarios.push({ ...result, world: report.world }); save();
      } finally { await comp.close(); }
    }
    report.status = 'DONE';
  } catch (error) { report.status = 'ERROR'; report.error = String((error as Error).stack ?? error); }
  finally { report.endedAt = new Date().toISOString(); save(); }
  console.log(JSON.stringify({ status: report.status, scenarios: report.scenarios.length, output }));
  if (report.status !== 'DONE') process.exitCode = 1;
}
if (process.argv[1] === new URL(import.meta.url).pathname) await main();
