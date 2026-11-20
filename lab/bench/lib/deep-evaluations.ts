import assert from "node:assert/strict";
import { Worker, parentPort, workerData } from "node:worker_threads";
import { orderedMap } from "./w0-parallel.ts";
import { W0, canonical, sha256 } from "./w0-world.ts";

type Release = "R1" | "R2";
type Inputs = { worlds: W0.World[]; release: Release; basis: W0.Basis };
function evaluate({ worlds, release, basis }: Inputs) {
  return worlds.map((world) => {
    const r = W0.sweepSubject(world, W0[release], basis);
    if ("error" in r) throw Error(world.subject + ": " + r.error);
    return {
      record: r.record,
      worldSha256: sha256(canonical(world)),
      outputSha256: sha256(r.json),
    };
  });
}
if (parentPort && workerData === "deep-evaluation")
  parentPort.on("message", (input: Inputs) => parentPort!.postMessage(evaluate(input)));

// [DX-ACT2] Why: bound the number of pinned pages in memory and publish in roster order at every evaluator count. Rejected: running concurrent promises on the coordinator's single JS thread.
export async function* deepEvaluations(
  groups: number[][],
  release: Release,
  basis: W0.Basis,
  workers: number,
  read: (group: number[]) => Promise<W0.World[]>,
) {
  assert(Number.isInteger(workers) && workers >= 1 && workers <= 5);
  const pool = Array.from({ length: workers }, () => {
    const worker = new Worker(new URL("./deep-evaluations.ts", import.meta.url), {
      workerData: "deep-evaluation",
    });
    let failure: Error | undefined;
    let pending:
      | { resolve: (r: ReturnType<typeof evaluate>) => void; reject: (e: Error) => void }
      | undefined;
    const fail = (e: Error) => {
      failure = e;
      pending?.reject(e);
      pending = undefined;
    };
    worker.on("error", fail);
    worker.on("exit", (code) => fail(Error("Deep evaluator exited " + code)));
    worker.on("message", (result) => {
      pending?.resolve(result);
      pending = undefined;
    });
    const run = (input: Inputs) =>
      new Promise<ReturnType<typeof evaluate>>((resolve, reject) => {
        if (failure) return reject(failure);
        assert(!pending);
        pending = { resolve, reject };
        worker.postMessage(input);
      });
    return { worker, run };
  });
  try {
    yield* orderedMap(
      groups.map((group, index) => ({ group, index })),
      workers,
      async ({ group, index }) => {
        const worlds = await read(group);
        const subjects = group.map(W0.placementId);
        assert.deepEqual(
          worlds.map((w) => w.subject),
          subjects,
        );
        const records = await pool[index % workers]!.run({ worlds, release, basis });
        assert.deepEqual(
          records.map((r) => r.record.subject),
          subjects,
        );
        return { group, records };
      },
    );
  } finally {
    await Promise.all(pool.map((p) => p.worker.terminate()));
  }
}
