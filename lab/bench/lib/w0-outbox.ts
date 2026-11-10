import { readW0Pages } from "./w0-pages.ts";
import { measureHttp } from "./http-counts.ts";
import { measureW0Http } from "./w0-http.ts";
import type { CompositionHandle } from "./composition.ts";
import { W0, canonical, sha256 } from "./w0-world.ts";
const submissionTails = new WeakMap<CompositionHandle, Promise<void>>();
const publicationLimit = Number(process.env.TX2_W0_PUBLISH_INFLIGHT ?? "2");
if (!Number.isSafeInteger(publicationLimit) || publicationLimit < 1 || publicationLimit > 8)
  throw Error("invalid publication capacity");
const capacities = new WeakMap<CompositionHandle, { active: number; waiting: (() => void)[] }>();
async function publicationSlot(comp: CompositionHandle) {
  let state = capacities.get(comp);
  if (!state) {
    state = { active: 0, waiting: [] };
    capacities.set(comp, state);
  }
  const pool = state;
  await new Promise<void>((resolve) => {
    if (pool.active < publicationLimit) {
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
) {
  if (records.length > 1024 || new Set(records.map((r) => r.subject)).size !== records.length)
    throw new Error("outbox frame must contain <=1024 distinct subjects");
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
    release = await publicationSlot(comp);
    const publishCapacityWaitMs = performance.now() - capacityQueuedAt;
    const buildStart = performance.now();
    const cpuNow = () => process.threadCpuUsage();
    const buildCpu = cpuNow();
    const commandId = "p5:outbox:" + sha256(canonical(records));
    const commandLookupStart = performance.now();
    const existing = await comp.transactionByCommand(commandId);
    const commandLookupMs = performance.now() - commandLookupStart;
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
    const stateReadStart = performance.now();
    const statePosition = await comp.currentPosition();
    // [DX-H8] Why: the 64-root reach limit constrains reads, not the atomic publication frame.
    // Rejected: a >64-root request (gateway decline), or one state request per subject.
    const states = new Map<string, any[]>();
    const stateSubjects = records.map((r) => "p5:outbox:" + r.subject);
    const stateBasis = { position: statePosition, validAt: V_PUBLIC };
    const statePage =
      records.length <= 64
        ? await comp.sweepPage(stateSubjects, stateBasis)
        : await readW0Pages(comp, stateSubjects, stateBasis);
    for (const row of statePage.rows) {
      const list = states.get(row.entityId) ?? [];
      list.push(row);
      states.set(row.entityId, list);
    }
    const stateReadMs = performance.now() - stateReadStart;
    const foldStart = performance.now();
    for (const record of records) {
      const entityId = "p5:outbox:" + record.subject;
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
    await previousSubmission;
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
        buildOutboxMs,
        commandLookupMs,
        stateReadMs,
        stateFoldMs: buildOutboxMs - (foldStart - buildStart),
        publishRequestBytes: commit.value.requestBytes,
        publishMaxRequestBytes: commit.value.maxRequestBytes,
        publishWireParseMicros: commit.value.wireParseMicros,
        publishWireSerializeMicros: commit.value.wireSerializeMicros,
        publishCapacityWaitMs,
        publicationLimit,
        buildOutboxMainThreadIntervalCpuMs:
          (buildEndCpu.user - buildCpu.user + buildEndCpu.system - buildCpu.system) / 1000,
        publishCommitMainThreadIntervalCpuMs:
          (commitEndCpu.user - buildEndCpu.user + commitEndCpu.system - buildEndCpu.system) / 1000,
        publishCommitMs: commit.wallMs,
        publishRequests: commit.requests,
        publishDatoms: commit.value.datomSamples ? commit.value.datoms : null,
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
