import { parentPort, workerData } from "node:worker_threads";
import { serialize } from "node:v8";
import { statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ReplicaSnapshot } from "../../../packages/datomic/dist/index.js";
import { W0, canonical, worldOf, w0Basis } from "./w0-world.ts";
import { buildIndex, selectRelease, type SelectorCut } from "./w0-selector.ts";

const port = parentPort!, view = new ReplicaSnapshot(workerData.image);
const cut: SelectorCut = workerData.cut, roster: string[] = workerData.roster;
if (canonical(cut.basis) !== canonical(w0Basis(view))) throw Error("Wrong selector source snapshot");
const world = (id: string) => worldOf(id, view.world(id));
const release = W0.compileRelease(workerData.doc);
const file = join(workerData.dir, "members.sqlite"), checkpoint = join(workerData.dir, "coverage.sqlite");
const start = performance.now();
const seal = buildIndex(file, cut, roster, (function* () { for (const id of roster) yield world(id); })());
writeFileSync(join(workerData.dir, "index-seal.json"), canonical(seal), { flag: "wx" });
port.postMessage({ type: "ready", buildMs: performance.now() - start, indexBytes: statSync(file).size });
port.once("message", (m) => {
  if (m !== "evaluate") throw Error("Invalid selector worker request");
  const cpu = process.threadCpuUsage();
  const coverage = selectRelease({ cut, roster, release, index: { file, seal }, checkpoint, world,
    attempt: workerData.attempt, onPage: (rows) => port.postMessage({ type: "page", records: rows.map((r) => ({
      subject: r.subject, worldSha256: r.world, selection: r.mode, encodedCandidates: serialize([{
        output: r.output, release: release.hash, json: W0.outputJson(r.output), record: W0.recordOf(r.output),
      }]),
    })) }) });
  const used = process.threadCpuUsage(cpu);
  port.postMessage({ type: "finish", coverage, cpuSeconds: (used.user + used.system) / 1e6, checkpointBytes: statSync(checkpoint).size });
  port.close();
});
