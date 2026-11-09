/** [EXP-P5B-R2] Why: source-bound B0 runs the product writer and fresh independent O-DOMAIN.
 * Rejected: replaying round 1's refusal or substituting native positions in oracle inputs.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { openMappedHost, HOST_FRAME_TAIL_BYTES } from "./lib/host-store.ts";
import { storeBytes } from "./lib/store-bytes.ts";
import { readW0Fingerprint } from "./lib/w0-fingerprint.ts";
import { requireFingerprint } from "./lib/w0-gates.ts";
import { loadW0Pins } from "./lib/evaluate.ts";
import { canonical, sha256, V_W0, W0 } from "./lib/w0-world.ts";
const [out, Narg = "10000"] = process.argv.slice(2),
  N = Number(Narg),
  PREDICTIONS = "lab/experiments/EXP-P5/roundB/round3/PREDICTIONS.json";
if (!out || fs.existsSync(path.join(out, "receipt.json")))
  throw Error("new attempt output required");
fs.mkdirSync(out, { recursive: true });
const files = [
  "lab/bench/p5-host-round2.ts",
  "lab/bench/lib/host-store.ts",
  "lab/bench/lib/store-bytes.ts",
  "lab/bench/lib/position-map.ts",
  "lab/bench/lib/w0-seed.ts",
  "lab/bench/lib/w0-world.ts",
  "lab/bench/lib/w0-fingerprint.ts",
  "lab/bench/lib/g0.ts",
  "packages/qlever/src/broker/broker.ts",
  "packages/qlever/src/broker/log.ts",
  "packages/qlever/src/broker/sqlite-worker.ts",
  "packages/qlever/dist/broker/broker.js",
  "packages/qlever/dist/broker/log.js",
  "packages/qlever/dist/broker/sqlite-worker.js",
  "pnpm-lock.yaml",
  "lab/acceptance/obligations.json",
];
const hashes = () => Object.fromEntries(files.map((f) => [f, sha256(fs.readFileSync(f))]));
const before = hashes();
for (const f of files) {
  const target = path.join(out, "source", f);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(f, target);
}
const receipt: any = {
  format: "EXP-P5B-round3-B0/1",
  attempt: randomUUID(),
  N,
  startedAt: new Date().toISOString(),
  classification: "DIAGNOSTIC",
  acceptance: false,
  status: "RUNNING",
  sources: before,
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  replica: "detached",
  // [EXP-P5B-R3] Why: predictions are committed before any measurement and bound by hash. Rejected: embedding numbers here that could be edited after the run.
  predictionsFile: PREDICTIONS,
  predictionsSha256: sha256(fs.readFileSync(PREDICTIONS)),
  frameRetention: { tailBytes: HOST_FRAME_TAIL_BYTES },
  layout: "EXP-HS01 round 2 (a9ebe759): split facts/history/journal, compact ids, byte-bounded frame tail",
};
const save = () =>
  fs.writeFileSync(path.join(out, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
save();
let h: Awaited<ReturnType<typeof openMappedHost>> | undefined;
try {
  await loadW0Pins();
  const fd = fs.openSync(path.join(out, "oracle.log"), "wx");
  const oracle = spawnSync(
    "python3",
    [
      "-I",
      "lab/oracles/domain/cli.py",
      "--population",
      "--rung",
      String(N),
      "--fingerprint",
      "--no-stats",
      "--out",
      path.join(out, "oracle.json"),
    ],
    { stdio: ["ignore", fd, fd] },
  );
  fs.closeSync(fd);
  if (oracle.status !== 0) throw Error("fresh population oracle failed");
  receipt.oracleSha256 = sha256(fs.readFileSync(path.join(out, "oracle.json")));
  const expected = JSON.parse(fs.readFileSync(path.join(out, "oracle.json"), "utf8"));
  receipt.scope = "p5b-r3:" + receipt.attempt;
  h = await openMappedHost(path.join(out, "store"), receipt.scope);
  receipt.seed = await h.seed(N, out);
  receipt.positionBinding = h.map.binding;
  save();
  const blockWorlds: string[] = [],
    blockOutputs: string[] = [];
  let wh = createHash("sha256"),
    oh = createHash("sha256"),
    n = 0;
  const finish = () => {
    if (n % 1000) {
      wh.update("]");
      oh.update("]");
      blockWorlds.push(wh.digest("hex"));
      blockOutputs.push(oh.digest("hex"));
    }
  };
  const start = performance.now(),
    cpu = process.cpuUsage();
  const observed = await readW0Fingerprint(
    h.comp,
    N,
    { position: receipt.seed.basis.tx, validAt: V_W0 },
    new AbortController().signal,
    (records) => {
      for (const r of records) {
        if (n % 1000 === 0) {
          wh = createHash("sha256");
          oh = createHash("sha256");
          wh.update("[");
          oh.update("[");
        } else {
          wh.update(",");
          oh.update(",");
        }
        wh.update(canonical(r.world));
        oh.update(W0.outputJson(r.output));
        n++;
        if (n % 1000 === 0) {
          wh.update("]");
          oh.update("]");
          blockWorlds.push(wh.digest("hex"));
          blockOutputs.push(oh.digest("hex"));
        }
      }
    },
  );
  finish();
  requireFingerprint(observed, expected, N);
  if (
    canonical(blockWorlds) !== canonical(expected.blockDigests.worlds) ||
    canonical(blockOutputs) !== canonical(expected.blockDigests.R2)
  )
    throw Error("G0 block digests differ");
  const delta = process.cpuUsage(cpu);
  receipt.G0 = {
    status: "R34-FINGERPRINT-MATCH",
    observed,
    blockDigests: { worlds: blockWorlds, R2: blockOutputs },
    wallS: (performance.now() - start) / 1000,
    cpuS: (delta.user + delta.system) / 1e6,
    positionBinding: h.map.binding,
    nativeCounts: await h.broker.storeCounts(),
    genericFullContentAdmission: "NOT-CLAIMED",
  };
  receipt.status = "B0-COMPLETE-DIAGNOSTIC";
  receipt.sourceStable = canonical(before) === canonical(hashes());
  save();
  if (!receipt.sourceStable) throw Error("B0 source changed");
} catch (error: any) {
  receipt.status = "ERROR";
  receipt.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  try {
    await h?.comp.close();
    receipt.closed = true;
    if (h && receipt.seed) {
      // Closed store: the WAL is checkpointed on close, so page_count x page_size is the stored layout (HS01 G9 definition).
      receipt.bytes = {
        ...storeBytes(path.join(out, "store"), receipt.seed.assertions),
        seedIntentBytes: fs.statSync(path.join(out, "seed.ndjson.gz")).size,
        positionMapBytes: fs.statSync(path.join(out, "position-map.json")).size,
      };
    }
  } catch (error) {
    receipt.cleanupError = String(error);
    process.exitCode = 1;
  }
  receipt.sourceStable = canonical(before) === canonical(hashes());
  receipt.finishedAt = new Date().toISOString();
  const f = fs.statfsSync(out);
  receipt.freeEnd = f.bavail * f.bsize;
  receipt.seedWallS = receipt.seed?.wallS;
  save();
  console.log(JSON.stringify({ status: receipt.status, error: receipt.error, out }));
}
