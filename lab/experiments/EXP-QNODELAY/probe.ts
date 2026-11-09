// [EXP-QNODELAY] Why: sequential, nonce-bound literal SELECTs isolate host HTTP
// transport without writes or data drift. Rejected: P1/P4 qualification from a
// shared delta-only resident (Q91a), or an engine-only timing that excludes HTTP.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  makeQleverClient,
  type QleverConnectionMode,
} from "../../../packages/qlever/dist/index.js";
import { inspect, listTx2Containers, loadSlots, slotInfo, readOwner } from "../../bin/lib.mjs";

const output = process.argv[2];
if (!output || fs.existsSync(output)) throw Error("new attempt output directory required");
const info = slotInfo(loadSlots(), "qlever", "dev");
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const identity = () => {
  const c = inspect(info.container);
  if (!c?.State.Running || c.Config.Labels?.["tx2.managed-by"] !== "lab/bin/engine.mjs")
    throw Error("managed resident is not running");
  return {
    containerId: c.Id,
    image: c.Image,
    startedAt: c.State.StartedAt,
    endpoint: info.endpoint,
    slot: "qlever-dev",
    owner: readOwner(info),
    coRunning: listTx2Containers(),
  };
};
const before = identity();
fs.mkdirSync(output, { recursive: true });
const save = (name: string, value: unknown) =>
  fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const sourcePaths = [
  "packages/qlever/src/QleverClient.ts",
  "lab/experiments/EXP-QNODELAY/probe.ts",
  "lab/bin/lib.mjs",
  "lab/config/slots.json",
  "packages/qlever/dist/QleverClient.js",
  "packages/qlever/dist/index.js",
  "pnpm-lock.yaml",
];
const sources = Object.fromEntries(
  sourcePaths.map((p, i) => {
    const bytes = fs.readFileSync(p);
    fs.writeFileSync(path.join(output, `source-${i}${path.extname(p)}`), bytes, { flag: "wx" });
    return [p, hash(bytes)];
  }),
);
const report: any = {
  format: "qlever-connection-diagnostic/1",
  classification: "DIAGNOSTIC",
  attempt: randomUUID(),
  startedAt: new Date().toISOString(),
  northStar: "P1 and P4 host QLever read transport",
  node: process.version,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sources,
  before,
  layout: { baseTriples: null, deltaTriples: null, touchedBlockDelta: null },
  stallThresholdMs: 35,
  percentile: "nearest rank ceil(p*n)-1",
  warmupPerCell: 5,
  samplesPerCell: 60,
  samples: [],
  summary: [],
};
save("start.json", report);
try {
  // ABBA reduces order bias; requests and cells never overlap.
  for (const [round, mode] of (
    ["keep-alive", "per-request", "per-request", "keep-alive"] as QleverConnectionMode[]
  ).entries()) {
    const client = makeQleverClient(info.endpoint, { connectionMode: mode });
    try {
      for (const size of [16, 2048]) {
        const times: number[] = [];
        for (let i = -report.warmupPerCell; i < report.samplesPerCell; i++) {
          const nonce = `${report.attempt}:${round}:${size}:${i}`;
          const value = "x".repeat(size);
          const query = `SELECT ?nonce ?payload WHERE { BIND(${JSON.stringify(nonce)} AS ?nonce) BIND(${JSON.stringify(value)} AS ?payload) }`;
          const at = new Date().toISOString(),
            start = performance.now();
          const rows = await client.query(query, {
            queryId: `qnodelay-${nonce}`,
            timeoutMs: 10000,
          });
          const ms = performance.now() - start;
          const expected = [
            { nonce: { type: "literal", value: nonce }, payload: { type: "literal", value } },
          ];
          const actualBytes = JSON.stringify(rows),
            expectedBytes = JSON.stringify(expected);
          // Compare terms by key: JSON member ordering is not a SPARQL result contract.
          const contentEqual =
            rows.length === 1 &&
            Object.keys(rows[0]).length === 2 &&
            ["nonce", "payload"].every((key) =>
              ["type", "value", "datatype"].every(
                (field) => (rows[0][key] as any)?.[field] === (expected[0] as any)[key][field],
              ),
            );
          report.samples.push({
            connectionMode: mode,
            round,
            size,
            i,
            warmup: i < 0,
            at,
            ms,
            query,
            contentEqual,
            expectedSha256: hash(expectedBytes),
            decodedBindingBytes: actualBytes,
            decodedBindingsSha256: hash(actualBytes),
          });
          if (!contentEqual) throw Error(`wrong content at ${round}/${size}/${i}`);
          if (i >= 0) times.push(ms);
        }
        times.sort((a, b) => a - b);
        report.summary.push({
          connectionMode: mode,
          round,
          payloadBytes: size,
          n: times.length,
          p50Ms: times[Math.ceil(times.length * 0.5) - 1],
          p99Ms: times[Math.ceil(times.length * 0.99) - 1],
          stallCount: times.filter((ms) => ms >= report.stallThresholdMs).length,
        });
      }
    } finally {
      await client.close();
    }
  }
  report.after = identity();
  if (
    report.before.containerId !== report.after.containerId ||
    report.before.startedAt !== report.after.startedAt
  )
    throw Error("resident changed during probe");
  for (const [p, sha] of Object.entries(sources))
    if (hash(fs.readFileSync(p)) !== sha) throw Error(`source changed: ${p}`);
  report.completed = true;
} catch (error) {
  report.completed = false;
  report.error = String(error);
  process.exitCode = 1;
} finally {
  report.endedAt = new Date().toISOString();
  save("result.json", report);
  console.log(
    JSON.stringify(
      { completed: report.completed, error: report.error, summary: report.summary },
      null,
      2,
    ),
  );
}
