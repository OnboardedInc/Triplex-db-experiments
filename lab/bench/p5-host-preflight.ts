/** [EXP-P5B-R2] Why: Q101a supersedes the old dense-native equality preflight.
 * Rejected: keeping round 1's refusal executable after authorizing a bound bijection.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openMappedHost } from "./lib/host-store.ts";
import { seedCommands, seedOperations, type W0Command } from "./lib/w0-seed.ts";
import { W0, sha256, canonical } from "./lib/w0-world.ts";
const out = process.argv[2];
if (!out) throw Error("new durable output directory required");
fs.mkdirSync(out, { recursive: false });
const attempt = randomUUID(),
  files = [
    "lab/bench/p5-host-preflight.ts",
    "lab/bench/lib/host-store.ts",
    "lab/bench/lib/position-map.ts",
    "lab/bench/lib/w0-seed.ts",
    "packages/qlever/dist/broker/broker.js",
    "packages/qlever/dist/broker/log.js",
    "packages/qlever/dist/broker/sqlite-worker.js",
  ];
const hashes = () => Object.fromEntries(files.map((f) => [f, sha256(fs.readFileSync(f))]));
const before = hashes();
const report: any = {
  format: "EXP-P5B-preflight/2",
  attempt,
  classification: "DIAGNOSTIC",
  acceptance: false,
  requestedRung: 10000,
  sources: before,
  startedAt: new Date().toISOString(),
};
let h: Awaited<ReturnType<typeof openMappedHost>> | undefined;
try {
  h = await openMappedHost(path.join(out, "store"), "p5b-preflight:" + attempt);
  const c = seedCommands(10000).next().value as W0Command,
    operations = seedOperations(c, new Map(), W0.rung(10000)),
    meta = { commandId: "p5:seed:1", actor: "p5-seed" };
  const r = await h.comp.transact(operations, meta);
  if (!r.ok) throw Error(r.tag + ": " + String(r.error));
  h.comp.validateMappedReceipt!(r.value, operations, meta);
  if (r.value.position !== c.position) throw Error("mapped reference differs");
  report.receipt = r.value;
  report.positionBinding = h.map.binding;
  report.nativePosition = h.map.native(c.position);
  report.mapHash = h.map.save(path.join(out, "position-map.json"));
  report.status = "PREFLIGHT-MAPPED-ONLY";
  report.G0 = "NOT-RUN";
} catch (error) {
  report.status = "ERROR";
  report.error = String(error);
  process.exitCode = 1;
} finally {
  await h?.comp.close();
  report.closed = true;
  report.sourceStable = canonical(before) === canonical(hashes());
  if (!report.sourceStable) process.exitCode = 1;
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, "receipt.json"), JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      status: report.status,
      nativePosition: report.nativePosition,
      mappedPosition: report.receipt?.position,
      attempt,
    }),
  );
}
