/** [EXP-P5B-R2] Why: source-bound B0 runs the product writer and fresh independent O-DOMAIN.
 * Rejected: replaying round 1's refusal or substituting native positions in oracle inputs.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { openMappedHost } from "./lib/host-store.ts";
import { readW0Fingerprint } from "./lib/w0-fingerprint.ts";
import { requireFingerprint } from "./lib/w0-gates.ts";
import { loadW0Pins } from "./lib/evaluate.ts";
import { canonical, sha256, V_W0, W0 } from "./lib/w0-world.ts";
const [out, Narg = "10000"] = process.argv.slice(2),
  N = Number(Narg);
if (!out || fs.existsSync(path.join(out, "receipt.json")))
  throw Error("new attempt output required");
fs.mkdirSync(out, { recursive: true });
const files = [
  "lab/bench/p5-host-round2.ts",
  "lab/bench/lib/host-store.ts",
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
  format: "EXP-P5B-round2/1",
  attempt: randomUUID(),
  N,
  startedAt: new Date().toISOString(),
  classification: "DIAGNOSTIC",
  acceptance: false,
  status: "RUNNING",
  sources: before,
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  replica: "detached",
  predictions: {
    B0: { seedS: 120, fileBytes: 450000000 },
    B1: {
      W4S: [1.5, 5],
      W1Rate: [600, 2100],
      pageMs: 50,
      walBytes: 67108864,
      readRatio: 1.2,
      commitRatio: 1.25,
    },
    B2: { W4S: [15, 45], rssGrowthBytes: 300000000 },
  },
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
  h = await openMappedHost(path.join(out, "store"), "p5b-r2:" + receipt.attempt);
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
  } catch (error) {
    receipt.cleanupError = String(error);
    process.exitCode = 1;
  }
  receipt.sourceStable = canonical(before) === canonical(hashes());
  receipt.finishedAt = new Date().toISOString();
  const f = fs.statfsSync(out);
  receipt.freeEnd = f.bavail * f.bsize;
  save();
  console.log(JSON.stringify({ status: receipt.status, error: receipt.error, out }));
}
