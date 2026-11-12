import { performance } from "node:perf_hooks";
import { serialize } from "node:v8";
import { parentPort, workerData } from "node:worker_threads";
import { ReplicaSnapshot } from "../../../packages/datomic/dist/index.js";
import { W0, worldOf, worldSha256, w0Basis } from "./w0-world.ts";
const snapshot = new ReplicaSnapshot(workerData.image);
const basis = w0Basis({ position: snapshot.position, validAt: snapshot.validAt });
const releases: W0.CompiledRelease[] = workerData.releases;
let phaseStart = performance.now(),
  phaseElu = performance.eventLoopUtilization(),
  phaseCpu = process.threadCpuUsage();
parentPort!.on("message", (m) => {
  if (m.type === "begin") {
    phaseStart = performance.now();
    phaseElu = performance.eventLoopUtilization();
    phaseCpu = process.threadCpuUsage();
    return;
  }
  if (m.type === "metrics") {
    parentPort!.postMessage({
      type: "metrics",
      elu: performance.eventLoopUtilization(phaseElu),
      cpu: process.threadCpuUsage(phaseCpu),
      wallMs: performance.now() - phaseStart,
    });
    return;
  }
  if (m.type !== "page") return;
  try {
    const start = process.threadCpuUsage(),
      started = performance.now();
    const records = m.subjects.map((subject: string) => {
      // [DX-R1] Why: candidate releases share input construction; only immutable SAB row bytes are shared across workers.
      // Rejected: fetching a world or cloning packed bytes for each release/worker.
      const world = worldOf(subject, snapshot.world(subject));
      return {
        subject,
        worldSha256: worldSha256(world),
        candidates: releases.map((release) => {
          const result = W0.sweepSubject(world, release, basis);
          if ("error" in result) throw new Error(subject + ": " + result.error);
          return { release: release.hash, ...result };
        }),
      };
    });
    const cpu = process.threadCpuUsage(start);
    parentPort!.postMessage({
      type: "result",
      id: m.id,
      // [DX-S5] Why: keep all three exact candidate payloads in lossless binary form instead of retaining 300000 object graphs in the coordinator.
      // Rejected: JSON coercion (BigInt/negative-zero loss) or dropping outputs to make the 11 GiB cap fit.
      records:
        releases.length > 1
          ? records.map(({ candidates, ...record }) => ({
              ...record,
              encodedCandidates: serialize(candidates),
            }))
          : records,
      cpuSeconds: (cpu.user + cpu.system) / 1e6,
      wallMs: performance.now() - started,
    });
  } catch (e: any) {
    parentPort!.postMessage({ type: "failure", error: String(e.stack ?? e) });
  }
});
parentPort!.postMessage({ type: "ready" });
