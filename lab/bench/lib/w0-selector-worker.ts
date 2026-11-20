import { parentPort, workerData } from "node:worker_threads";
import { serialize } from "node:v8";
import { statSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ReplicaSnapshot } from "../../../packages/datomic/dist/index.js";
import { W0, canonical, sha256, worldOf, w0Basis } from "./w0-world.ts";
import { buildIndex, selectRelease, type SelectorCut } from "./w0-selector.ts";

import { pinWorker } from "./w0-cpus.ts";
const assignedCpu = pinWorker("selector");
const port = parentPort!,
  view = new ReplicaSnapshot(workerData.image);
const cut: SelectorCut = workerData.cut,
  roster: string[] = workerData.roster;
if (canonical(cut.basis) !== canonical(w0Basis(view)))
  throw Error("Wrong selector source snapshot");
const world = (id: string) => worldOf(id, view.world(id));
const release = W0.compileRelease(workerData.doc);
const file = join(workerData.dir, "members.sqlite"),
  checkpoint = join(workerData.dir, "coverage.sqlite");
const start = performance.now();
const sealPath = join(workerData.dir, "index-seal.json");
function openIndex() {
  if (workerData.resumeSealSha256) {
    const bytes = readFileSync(sealPath);
    if (sha256(bytes) !== workerData.resumeSealSha256) throw Error("Resume index seal mismatch");
    return JSON.parse(bytes.toString()) as ReturnType<typeof buildIndex>;
  }
  const seal = buildIndex(
    file,
    cut,
    roster,
    (function* () {
      for (const id of roster) yield world(id);
    })(),
  );
  writeFileSync(sealPath, canonical(seal), { flag: "wx" });
  return seal;
}
const seal = openIndex();
port.postMessage({
  type: "ready",
  buildMs: performance.now() - start,
  sealSha256: sha256(readFileSync(sealPath)),
  indexBytes: statSync(file).size,
});
port.once("message", (m) => {
  if (m !== "evaluate") throw Error("Invalid selector worker request");
  const cpu = process.threadCpuUsage();
  const coverage = selectRelease({
    cut,
    roster,
    release,
    index: { file, seal },
    checkpoint,
    world,
    attempt: workerData.attempt,
    resume: !!workerData.resumeSealSha256,
    onPage: (rows) =>
      port.postMessage({
        type: "page",
        records: rows.map((r) => ({
          subject: r.subject,
          worldSha256: r.world,
          selection: r.mode,
          encodedCandidates: serialize([
            {
              output: r.output,
              release: release.hash,
              json: W0.outputJson(r.output),
              record: W0.recordOf(r.output),
            },
          ]),
        })),
      }),
  });
  const used = process.threadCpuUsage(cpu);
  port.postMessage({
    type: "finish",
    cpuAssignment: assignedCpu,
    coverage,
    cpuSeconds: (used.user + used.system) / 1e6,
    checkpointBytes: statSync(checkpoint).size,
  });
  port.close();
});
