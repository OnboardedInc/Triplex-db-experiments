import { parentPort, workerData } from "node:worker_threads";
import { ReplicaSnapshot } from "../../../packages/datomic/dist/index.js";
import { W0, worldOf, worldSha256, w0Basis } from "./w0-world.ts";
const snapshot = new ReplicaSnapshot(workerData.image);
const basis = w0Basis({ position: snapshot.position, validAt: snapshot.validAt });
const releases: W0.CompiledRelease[] = workerData.releases;
parentPort!.on("message", (m) => {
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
      records,
      cpuSeconds: (cpu.user + cpu.system) / 1e6,
      wallMs: performance.now() - started,
    });
  } catch (e: any) {
    parentPort!.postMessage({ type: "failure", error: String(e.stack ?? e) });
  }
});
parentPort!.postMessage({ type: "ready" });
