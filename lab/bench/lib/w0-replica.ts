import { Worker } from "node:worker_threads";
import { Replica, type ReplicaSnapshot } from "../../../packages/datomic/dist/index.js";
import type { CompositionHandle } from "./composition.ts";
import { W0, canonical, requirePosition } from "./w0-world.ts";

export interface ReplicaEvaluation {
  subject: string;
  worldSha256: string;
  candidates: (W0.SubjectResult & { release: string })[];
}
export interface ReplicaEvaluationOptions {
  replica: Replica;
  subjects: readonly string[];
  releases: W0.CompiledRelease | readonly W0.CompiledRelease[];
  position?: number;
  view?: ReplicaSnapshot;
  workers?: number;
  beforeTimedWindow?: () => Promise<void>;
  // [DX-R1] Why: several candidates may share a preview, but publication selects one active release.
  // Rejected: racing distinct release choices through the same published outbox state.
  publish?: CompositionHandle;
}
export async function evaluateAll(o: ReplicaEvaluationOptions) {
  const releases = (
    Array.isArray(o.releases) ? o.releases : [o.releases]
  ) as readonly W0.CompiledRelease[];
  const workers = o.workers ?? 4;
  if (
    !Number.isInteger(workers) ||
    workers < 1 ||
    workers > 8 ||
    !releases.length ||
    new Set(releases.map((r) => r.hash)).size !== releases.length ||
    new Set(o.subjects).size !== o.subjects.length ||
    (o.publish && releases.length !== 1)
  )
    throw new Error("Invalid replica evaluation request");
  if (!o.view && o.position !== undefined && o.position > o.replica.position)
    requirePosition(
      { position: o.position, validAt: o.replica.validAt },
      await o.replica.source.head(),
    );
  const captureStarted = performance.now();
  const snapshot =
    o.view ??
    (o.position === undefined ? await o.replica.capture() : await o.replica.snapshotAt(o.position));
  if (
    (o.position !== undefined && snapshot.position !== o.position) ||
    snapshot.validAt !== o.replica.validAt
  )
    throw new Error("Frozen view basis mismatch");
  const captureMs = performance.now() - captureStarted;
  return evaluateSnapshot(snapshot, o, releases, workers, captureMs);
}
async function evaluateSnapshot(
  snapshot: ReplicaSnapshot,
  o: ReplicaEvaluationOptions,
  releases: readonly W0.CompiledRelease[],
  count: number,
  captureMs: number,
) {
  const threads: Worker[] = [],
    results = new Map<number, ReplicaEvaluation[]>();
  let next = 0,
    completed = 0,
    cpuSeconds = 0;
  const pages = Array.from({ length: Math.ceil(o.subjects.length / 64) }, (_, i) =>
    o.subjects.slice(i * 64, i * 64 + 64),
  );
  const started = performance.now();
  const image = snapshot.sharedImage();
  try {
    const pool = await Promise.all(
      Array.from({ length: count }, async () => {
        const worker = new Worker(new URL("./w0-replica-worker.ts", import.meta.url), {
          workerData: { image, releases },
        });
        threads.push(worker);
        let dispatch!: () => void, failure: unknown;
        const ready = new Promise<void>((resolve, reject) => {
          worker.once("error", reject);
          worker.once("exit", (code) => {
            if (code !== 0) reject(new Error("Worker exited " + code));
          });
          worker.once("message", (m) =>
            m.type === "ready" ? resolve() : reject(new Error("Worker readiness failed")),
          );
        });
        await ready;
        const run = () =>
          new Promise<void>((resolve, reject) => {
            const fail = (e: unknown) => {
              failure = e;
              reject(e);
            };
            worker.on("error", fail);
            worker.on("exit", (code) => {
              if (completed < pages.length) fail(new Error("Worker exited early " + code));
            });
            dispatch = () => {
              if (failure) return;
              const id = next++;
              if (id >= pages.length) {
                resolve();
                return;
              }
              worker.postMessage({ type: "page", id, subjects: pages[id] });
            };
            worker.on("message", (m) => {
              if (m.type !== "result") {
                fail(new Error(m.error ?? "Unexpected worker message"));
                return;
              }
              if (
                !Number.isInteger(m.id) ||
                m.id < 0 ||
                m.id >= pages.length ||
                results.has(m.id) ||
                canonical(m.records.map((r: ReplicaEvaluation) => r.subject)) !==
                  canonical(pages[m.id])
              ) {
                fail(new Error("Replica page coverage mismatch"));
                return;
              }
              results.set(m.id, m.records);
              completed++;
              cpuSeconds += m.cpuSeconds;
              dispatch();
            });
            dispatch();
          });
        return { run };
      }),
    );
    const startupMs = performance.now() - started;
    await o.beforeTimedWindow?.();
    const start = performance.now();
    await Promise.all(pool.map((p) => p.run()));
    const evaluationWallMs = performance.now() - start;
    const records = [...results].sort(([a], [b]) => a - b).flatMap(([, records]) => records);
    if (
      records.length !== o.subjects.length ||
      new Set(records.map((r) => r.subject)).size !== o.subjects.length
    )
      throw new Error("Replica exact coverage failed");
    let publication: Awaited<ReturnType<typeof publishChanged>> | undefined;
    if (o.publish)
      publication = await publishChanged(
        o.publish,
        records.map((r) => r.candidates[0]!.record),
      );
    return {
      records,
      captureMs,
      startupMs,
      evaluationWallMs,
      cpuSeconds,
      subjectsPerSecond: records.length / (evaluationWallMs / 1000),
      passWallMs: captureMs + startupMs + evaluationWallMs,
      passSubjectsPerSecond: records.length / ((captureMs + startupMs + evaluationWallMs) / 1000),
      replicaBytes: snapshot.bytes,
      publication,
      position: snapshot.position,
    };
  } finally {
    await Promise.all(threads.map((w) => w.terminate()));
  }
}
// [DX-R1] Why: compare work-item identities/payloads with the stored outbox state, not an earlier preview's answers.
// Rejected: comparing full records (basis/release changes would force no-op publications for every subject).
export async function publishChanged(
  comp: CompositionHandle,
  records: readonly W0.EvaluationRecord[],
) {
  const started = performance.now();
  let changed = 0,
    commits = 0;
  const responses: any[] = [];
  const pending: W0.EvaluationRecord[] = [];
  const flush = async (count: number) => {
    const frame = pending.splice(0, count);
    responses.push(await comp.publishOutbox(frame));
    changed += frame.length;
    commits++;
  };
  for (let i = 0; i < records.length; i += 64) {
    const page = records.slice(i, i + 64);
    const position = await comp.currentPosition();
    const stored = await comp.sweepPage(
      page.map((r) => "p5:outbox:" + r.subject),
      { position, validAt: Date.parse("2026-11-04T12:00:00Z") },
    );
    const states = new Map<string, W0.OutboxState>();
    for (const row of stored.rows)
      if (row.attribute === "p5/state") {
        if (states.has(row.entityId)) throw new Error("Ambiguous publication state");
        // [DX-R1] Why: the existing JSON publisher revives numbers only after parsing; reject tokens it would round.
        // Rejected: silently comparing rounded sequence or basis integers before deciding whether to publish.
        const s = JSON.parse(row.value.value, (_key, value, context?: { source: string }) => {
          if (
            typeof value === "number" &&
            (!Number.isSafeInteger(value) || !/^-?(0|[1-9][0-9]*)$/.test(context?.source ?? ""))
          )
            throw new Error("Unsafe numeric token in stored outbox state");
          return value;
        });
        states.set(row.entityId, {
          items: s.items.map((x: any) => ({ ...x, seq: BigInt(x.seq) })),
          pending: s.pending.map((x: any) => ({ ...x, seq: BigInt(x.seq) })),
          subjects: s.subjects.map((x: any) => ({
            ...x,
            basis: { ...x.basis, tx: BigInt(x.basis.tx) },
          })),
        });
      }
    const differences = page.filter((r) => {
      const state = states.get("p5:outbox:" + r.subject) ?? W0.EMPTY_OUTBOX;
      const result = W0.publish(state, [r]);
      // [DX-R1] Why: retirement changes persisted item state without emitting a delivery in W0.
      // Rejected: filtering by delivery count alone (silently retains removed work items).
      return (
        result.deliveries.length > 0 || canonical(result.state.items) !== canonical(state.items)
      );
    });
    // [DX-R1] Why: pack changed subjects across input pages into the existing 64-subject atomic frame size.
    // Rejected: publishing each sparse input page separately (needlessly multiplies native commits).
    pending.push(...differences);
    while (pending.length >= 64) await flush(64);
  }
  if (pending.length) await flush(pending.length);
  return { changed, commits, wallMs: performance.now() - started, responses };
}
