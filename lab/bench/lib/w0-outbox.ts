import { measureHttp } from "./http-counts.ts";
import { measureW0Http } from "./w0-http.ts";
import type { CompositionHandle } from "./composition.ts";
import { W0, canonical, sha256 } from "./w0-world.ts";
export const outboxEntity = (subject: string) =>
  "p5:outbox:" +
  (process.env.TX2_W0_OUTBOX_NAMESPACE ? process.env.TX2_W0_OUTBOX_NAMESPACE + ":" : "") +
  subject;
export interface PublicationOptions {
  frameSize?: number;
  inflight?: number;
  stateRows?: readonly import("./w0-world.ts").WorldRow[];
  gapMs?: number;
  yieldToWriter?: boolean;
  maxWriterYieldMs?: number;
}
// [DX-S5] Why: publication yields before submission while frozen-trace offers await ACK, preserving the trace's own serial order.
// Rejected: merely reducing average publication rate while already queued frames continue ahead of live commits.
let liveWriterBacklog = 0;
export const offerLiveWrite = () => {
  liveWriterBacklog++;
};
export const finishLiveWrite = () => {
  if (--liveWriterBacklog < 0) throw Error("negative writer backlog");
};
const submissionTails = new WeakMap<CompositionHandle, Promise<void>>();
const publicationLimit = Number(process.env.TX2_W0_PUBLISH_INFLIGHT ?? "2");
if (!Number.isSafeInteger(publicationLimit) || publicationLimit < 1 || publicationLimit > 32)
  throw Error("invalid publication capacity");
const capacities = new WeakMap<CompositionHandle, { active: number; waiting: (() => void)[] }>();
async function publicationSlot(comp: CompositionHandle, limit: number) {
  let state = capacities.get(comp);
  if (!state) {
    state = { active: 0, waiting: [] };
    capacities.set(comp, state);
  }
  const pool = state;
  await new Promise<void>((resolve) => {
    if (pool.active < limit) {
      pool.active++;
      resolve();
    } else pool.waiting.push(resolve);
  });
  return () => {
    const next = pool.waiting.shift();
    if (next) next();
    else pool.active--;
  };
}
export async function publishRecords(
  comp: CompositionHandle,
  records: readonly W0.EvaluationRecord[],
  options: PublicationOptions = {},
) {
  if (
    !Number.isInteger(options.frameSize ?? 64) ||
    (options.frameSize ?? 64) < 1 ||
    (options.frameSize ?? 64) > 256 ||
    !Number.isInteger(options.inflight ?? publicationLimit) ||
    (options.inflight ?? publicationLimit) < 1 ||
    (options.inflight ?? publicationLimit) > 32 ||
    records.length > (options.frameSize ?? 64) ||
    new Set(records.map((r) => r.subject)).size !== records.length
  )
    throw new Error("outbox frame must contain bounded distinct subjects");
  // [DX-H6] Why: prepare disjoint pages concurrently, then submit in invocation order without waiting for prior ACKs.
  // Rejected: serial state reads/build/ACK across all pages.
  const previousSubmission = submissionTails.get(comp) ?? Promise.resolve();
  let submitted!: () => void, submissionFailed!: (e: unknown) => void;
  const submission = new Promise<void>((resolve, reject) => {
    submitted = resolve;
    submissionFailed = reject;
  });
  void submission.catch(() => {});
  submissionTails.set(comp, submission);
  let release = () => {};
  const capacityQueuedAt = performance.now();
  try {
    // [DX-H6] Why: large SDK frames registered together delayed live writer p99 23.33x with eight workers.
    // Rejected: letting every ready evaluation immediately stage another native publication.
    release = await publicationSlot(comp, options.inflight ?? publicationLimit);
    const publishCapacityWaitMs = performance.now() - capacityQueuedAt;
    const buildStart = performance.now();
    const cpuNow = () => process.threadCpuUsage();
    const buildCpu = cpuNow();
    const commandId = outboxEntity(sha256(canonical(records)));
    const lookupStart = performance.now();
    const existing = await comp.transactionByCommand(commandId);
    const commandLookupMs = performance.now() - lookupStart;
    if (!existing.ok) throw new Error(existing.tag);
    const recover = (triples: readonly any[]) =>
      triples
        .filter((t) => t.attribute === "p5/deliveries")
        .flatMap((t) => JSON.parse(t.value.value));
    if (existing.value) {
      await previousSubmission;
      submitted();
      return {
        deliveries: recover(
          existing.value.changes?.filter((t: any) => t.op === "assert") ??
            existing.value.triples ??
            [],
        ),
        retry: true,
      };
    }
    const operations: any[] = [],
      preconditions: any[] = [],
      deliveries: any[] = [];
    // [DX-H6] Why: all persisted subject states share one page snapshot, with the same TripleLive CAS at commit.
    // Rejected: one sequential reach request per subject (64 round trips before each publication).
    const stateStarted = performance.now();
    const stateRows =
      options.stateRows ??
      (
        await comp.sweepPage(
          records.map((r) => outboxEntity(r.subject)),
          { position: await comp.currentPosition(), validAt: V_PUBLIC },
        )
      ).rows;
    const stateReadMs = performance.now() - stateStarted;
    const states = new Map<string, any[]>();
    for (const row of stateRows) {
      const list = states.get(row.entityId) ?? [];
      list.push(row);
      states.set(row.entityId, list);
    }
    for (const record of records) {
      const entityId = outboxEntity(record.subject);
      const old = { triples: states.get(entityId) ?? [] };
      const previous = old.triples.find((t) => t.attribute === "p5/state");
      const state = previous ? reviveState(JSON.parse(previous.value.value)) : W0.EMPTY_OUTBOX;
      const result = W0.publish(state, [record]);
      deliveries.push(...result.deliveries);
      for (const t of old.triples) {
        operations.push({ op: "retract", id: t.id });
        preconditions.push({ _tag: "TripleLive", id: t.id });
      }
      operations.push({
        op: "assert",
        entityId,
        attribute: "p5/state",
        value: { type: "string", value: canonical(result.state) },
        validFrom: 0,
      });
      operations.push({
        op: "assert",
        entityId,
        attribute: "p5/deliveries",
        value: { type: "string", value: canonical(result.deliveries) },
        validFrom: 0,
      });
    }
    // [EXP-P5] Why: state, per-item sequence and deliveries commit in the same frame with command-id deduplication. Rejected: updating an in-memory outbox before ACK (loses work on resume).
    const buildOutboxMs = performance.now() - buildStart;
    const buildEndCpu = cpuNow();
    const orderingStarted = performance.now();
    await previousSubmission;
    const submissionOrderWaitMs = performance.now() - orderingStarted;
    const yieldStarted = performance.now();
    // [DX-S5] Why: a saturated trace kept the old strict-idle gate waiting 198 s at only 1k subjects.
    // Rejected: starving publication until the entire burst queue empties; the in-flight bound still limits native interference.
    while (
      options.yieldToWriter &&
      liveWriterBacklog > 0 &&
      performance.now() - yieldStarted < (options.maxWriterYieldMs ?? 50)
    )
      await new Promise((r) => setTimeout(r, 1));
    const writerYieldMs = performance.now() - yieldStarted;
    const committing = measureHttp(() =>
      measureW0Http(() =>
        comp.transact(operations, { commandId, actor: "p5-publisher", preconditions }),
      ),
    );
    submitted();
    const commit = await committing;
    const commitEndCpu = cpuNow();
    const r = commit.value.value;
    if (!r.ok) throw new Error("outbox publication failed: " + r.tag);
    return {
      deliveries,
      retry: false,
      timing: {
        receiptTxId: r.value.txId,
        receiptPosition: r.value.position,
        buildOutboxMs,
        commandLookupMs,
        stateReadMs,
        submissionOrderWaitMs,
        writerYieldMs,
        operations: operations.length,
        preconditions: preconditions.length,
        payloadBytes: Buffer.byteLength(JSON.stringify(operations)),
        publishCapacityWaitMs,
        publicationLimit: options.inflight ?? publicationLimit,
        buildOutboxMainThreadIntervalCpuMs:
          (buildEndCpu.user - buildCpu.user + buildEndCpu.system - buildCpu.system) / 1000,
        publishCommitMainThreadIntervalCpuMs:
          (commitEndCpu.user - buildEndCpu.user + commitEndCpu.system - buildEndCpu.system) / 1000,
        publishCommitMs: commit.wallMs,
        publishRequests: commit.requests,
        requests: commit.value.samples,
        adapterCommits: commit.value.commits,
        nativeFrames: commit.value.nativeFrames,
        publishDatoms: commit.value.datomSamples ? commit.value.datoms : null,
        publishSerializeMicros: commit.value.wireSerializeMicros,
        publishGatewayParseMicros: commit.value.wireParseMicros,
        publishResponseBytes: commit.value.responseBytes,
        publishGatewayMicros: commit.value.gatewayHeaders ? commit.value.gatewayMicros : null,
      },
    };
  } catch (error) {
    submissionFailed(error);
    throw error;
  } finally {
    release();
  }
}
const V_PUBLIC = Date.parse("2026-11-04T12:00:00Z");
function reviveState(s: any): W0.OutboxState {
  return {
    ...s,
    items: s.items.map((i: any) => ({ ...i, seq: BigInt(i.seq) })),
    pending: s.pending.map((i: any) => ({ ...i, seq: BigInt(i.seq) })),
    subjects: s.subjects.map((i: any) => ({ ...i, basis: { ...i.basis, tx: BigInt(i.basis.tx) } })),
  };
}

// [DX-H6] Why: semantic evidence uses W0 canonical integers; fractional telemetry belongs only in page metrics.
// Rejected: canonicalizing the entire publication response (failed the first VM attempt after real ACKs).
export const encodePublicationEvidence = (actual: { deliveries: readonly any[]; retry: boolean }) =>
  canonical({ deliveries: actual.deliveries, retry: actual.retry });

// [DX-S5] Why: Effect's shared scheduler can execute concurrent request callbacks in another ALS context.
// Rejected: attributing those callbacks to their enclosing frame; native diagnostics bind each actual operation/transaction explicitly.
export function bindPublicationProfiles(responses: any[]) {
  const commits = responses.flatMap((r) => r.timing?.adapterCommits ?? []);
  const frames = responses.flatMap((r) => r.timing?.nativeFrames ?? []);
  for (const response of responses) {
    const t = response.timing;
    if (!t) continue;
    const bound = commits.filter((c) =>
      c.transactionIds?.some((id: string) => id === t.receiptTxId || id === "_tx/" + t.receiptTxId),
    );
    t.diagnosticReceiptBound = bound.length === 1;
    if (bound.length !== 1) {
      t.requests = [];
      t.nativeFrames = [];
      t.adapterCommits = [];
      continue;
    }
    t.adapterCommits = bound;
    t.requests = bound.flatMap((c) => c.attempts.flatMap((a: any) => a.requests ?? []));
    t.nativeFrames = frames.filter((f) => f.operationId === bound[0].operationId);
    t.publishRequests = bound[0].httpCalls;
    t.publishResponseBytes = t.requests.reduce(
      (n: number, q: any) => n + (q.responseBytes ?? 0),
      0,
    );
    t.publishDatoms = t.requests.reduce((n: number, q: any) => n + (q.datoms ?? 0), 0);
    t.publishSerializeMicros = t.requests.reduce(
      (n: number, q: any) => n + (Number.isFinite(q.serializeMicros) ? q.serializeMicros : 0),
      0,
    );
    t.publishGatewayParseMicros = t.requests.reduce(
      (n: number, q: any) => n + (Number.isFinite(q.gatewayParseMicros) ? q.gatewayParseMicros : 0),
      0,
    );
    t.publishGatewayMicros = t.requests.reduce(
      (n: number, q: any) => n + (Number.isFinite(q.gatewayMicros) ? q.gatewayMicros : 0),
      0,
    );
  }
}
