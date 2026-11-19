import { Worker } from "node:worker_threads";
import { mkdirSync } from "node:fs";
import { decodeCandidateRecord, publishChanged, type ReplicaEvaluation, type ReplicaEvaluationOptions } from "./w0-replica.ts";
import { W0, w0Basis } from "./w0-world.ts";
import type { SelectorCut } from "./w0-selector.ts";

export async function evaluateSelected(o: Omit<ReplicaEvaluationOptions, "replica">, context: {
  dir: string; attempt: string; scope: string; source: string; generation: string;
}) {
  const view = o.view, release = o.releases as W0.CompiledRelease;
  if (!view || view.position !== o.position || !o.publish || o.publication?.layout !== "guard-fact")
    throw Error("Selector activation requires a frozen view and guarded publication");
  const cut: SelectorCut = { scope: context.scope, generation: context.generation, source: context.source,
    basis: w0Basis(view), frontier: view.position, erasure: "frozen-W0-seed/" + view.position };
  mkdirSync(context.dir);
  const worker = new Worker(new URL("./w0-selector-worker.ts", import.meta.url), {
    workerData: { ...context, cut, roster: o.subjects, doc: release.doc, image: view.sharedImage() },
  });
  const ready = Promise.withResolvers<{ buildMs: number; indexBytes: number }>();
  const done = Promise.withResolvers<{ coverage: ReturnType<typeof import("./w0-selector.ts").selectRelease>; cpuSeconds: number; checkpointBytes: number }>();
  const records: ReplicaEvaluation[] = [];
  void done.promise.catch(() => {});
  const fail = (error: unknown) => { ready.reject(error); done.reject(error); };
  worker.once("error", fail);
  worker.on("message", (m) => {
    try {
      if (m.type === "ready") ready.resolve(m);
      else if (m.type === "finish") done.resolve(m);
      else if (m.type === "page") {
        for (const row of m.records) {
          if (row.subject !== o.subjects[records.length]) throw Error("Selector worker roster mismatch");
          records.push(Object.assign(decodeCandidateRecord(row), { selection: row.selection }));
        }
      } else throw Error("Unknown selector worker response");
    } catch (error) { fail(error); }
  });
  worker.once("exit", (code) => fail(Error("Selector worker exited before response: " + code)));
  try {
    const build = await ready.promise;
    await o.beforeTimedWindow?.();
    const start = performance.now();
    worker.postMessage("evaluate");
    const terminal = await done.promise;
    const evaluationWallMs = performance.now() - start;
    if (records.length !== o.subjects.length || terminal.coverage.subjects !== records.length)
      throw Error("Incomplete selector worker roster");
    const publication = await publishChanged(o.publish, { length: records.length,
      slice: (from, to) => records.slice(from, to).map((r) => r.candidates[0]!.record) }, o.publication);
    return { records, publication, evaluationWallMs, passWallMs: evaluationWallMs, cpuSeconds: terminal.cpuSeconds,
      startupMs: 0, workerMetrics: [], replicaBytes: view.bytes, subjectsPerSecond: records.length * 1000 / evaluationWallMs,
      selector: { buildMs: build.buildMs, indexBytes: build.indexBytes, checkpointBytes: terminal.checkpointBytes, ...terminal.coverage } };
  } finally { await worker.terminate(); }
}
