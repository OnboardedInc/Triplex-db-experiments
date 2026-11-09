/** [EXP-P5B] Why: R34 B0 requires reference-position equality before G0 or live screening.
 * Rejected: renumbering packed broker receipts or world tx (changes frozen W0 oracle semantics).
 * This diagnostic stops at the first actual mismatch; it is not a complete population seeder.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { HostBroker } from "../../packages/qlever/dist/index.js";
import { seedCommands, type W0Command } from "./lib/w0-seed.ts";
import { canonical, triplexValue } from "./lib/w0-world.ts";
const output = process.argv[2];
if (!output) throw Error("usage: p5-host-preflight.ts <new durable attempt directory>");
fs.mkdirSync(output, { recursive: false });
const attempt = randomUUID(),
  startedAt = new Date().toISOString();
const sources = [
  "lab/bench/p5-host-preflight.ts",
  "lab/bench/lib/w0-seed.ts",
  "lab/bench/lib/w0-world.ts",
  "packages/qlever/src/broker/log.ts",
  "packages/qlever/src/broker/sqlite-worker.ts",
  "packages/qlever/src/broker/broker.ts",
  "packages/qlever/src/broker/position.ts",
  "packages/qlever/dist/index.js",
  "packages/qlever/dist/broker/log.js",
  "packages/qlever/dist/broker/sqlite-worker.js",
  "packages/qlever/dist/broker/broker.js",
  "packages/w0/dist/index.js",
  "pnpm-lock.yaml",
  "lab/acceptance/obligations.json",
];
const hash = () =>
  Object.fromEntries(
    sources.map((f) => [f, createHash("sha256").update(fs.readFileSync(f)).digest("hex")]),
  );
const before = hash(),
  stat = fs.statfsSync(output),
  freeStart = stat.bavail * stat.bsize;
if (freeStart < 5 * 1024 ** 3) throw Error("host free below 5 GiB");
const receipt: any = {
  format: "EXP-P5B-preflight/1",
  attempt,
  startedAt,
  runtime: {
    node: process.version,
    executable: process.execPath,
    platform: process.platform,
    arch: process.arch,
  },
  classification: "DIAGNOSTIC",
  acceptance: false,
  replica: "detached",
  requestedRung: 10000,
  scope: `p5b-${attempt}`,
  sources: before,
  freeStart,
  predictions: {
    B0: { seedSeconds: 120, fileBytes: 450000000 },
    B1: {
      W4WallSeconds: [1.5, 5],
      W1SubjectsPerSecond: [600, 2100],
      pageMs: 50,
      walBytes: 64 * 1024 ** 2,
      readRatio: 1.2,
      commitRatio: 1.25,
    },
    B2: { W4WallSeconds: [15, 45], rssGrowthBytes: 300000000, mismatches: 0 },
  },
  gates: {
    G0: "NOT-RUN",
    G1: "NOT-RUN",
    G2: "NOT-RUN",
    G3: "NOT-RUN",
    G4: "NOT-RUN",
    G5: "NOT-RUN",
    G6: "NOT-RUN",
    G7: "NOT-RUN",
    G8: "NOT-RUN",
  },
};
let broker: Awaited<ReturnType<typeof HostBroker.open>> | undefined;
try {
  broker = await HostBroker.open({
    dir: path.join(output, "store"),
    scopeKey: receipt.scope,
    minFreeBytes: 5 * 1024 ** 3,
  });
  const c = seedCommands(10000).next().value as W0Command;
  const rows = c.rows.map(([entity, attribute, v], i) => {
    const value = triplexValue(attribute, v);
    return {
      id: `seed:${c.position}:${i}`,
      entity_id: entity,
      attribute,
      value_type: value.type,
      value_string: ["ref", "string", "integer"].includes(value.type) ? value.value : null,
      value_number: null,
      value_boolean: value.type === "boolean" ? Number(value.value) : null,
      value_datetime: null,
      value_json: value.type === "json" ? JSON.stringify(value.value) : null,
      recorded_at: c.validFrom,
      recorded_position: -1,
      valid_from: c.validFrom,
      valid_to: null,
      created_by: "p5-seed",
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
      entity_type: null,
      schema_version: null,
      tx_id: "p5:seed:1",
    };
  });
  const start = performance.now(),
    cpu = process.cpuUsage();
  const decision = await broker.submit({
    operationId: "p5:seed:1",
    attemptId: attempt,
    sourceK: 0,
    reads: { entities: new Set(), scopeWide: false },
    claims: [{ commandId: "p5:seed:1", txId: "p5:seed:1", timestamp: c.validFrom }],
    placeholders: [-1],
    rows,
    priors: new Map(),
    newIds: new Set(rows.map((r) => r.id)),
  });
  const delta = process.cpuUsage(cpu);
  receipt.firstCommand = {
    reference: c,
    decision: {
      ...decision,
      ...(decision.kind === "committed" ? { positions: [...decision.positions] } : {}),
    },
    wallMs: performance.now() - start,
    cpuMicros: delta.user + delta.system,
  };
  if (decision.kind !== "committed") throw Error("first reference command did not commit");
  const observed = decision.positions.get(-1);
  const read = await broker.pullAt(observed!, {
    entities: [...new Set(rows.map((r) => r.entity_id))],
  });
  receipt.readBack = read;
  const ordered = (r: readonly any[]) => [...r].sort((a, b) => a.id.localeCompare(b.id));
  if (
    !read.eligible ||
    canonical(ordered(read.rows)) !==
      canonical(ordered(rows.map((r) => ({ ...r, recorded_position: observed }))))
  )
    throw Error("first command content readback differs from receipt and submitted bytes");
  receipt.positionComparison = { expected: c.position, observed, equal: observed === c.position };
  if (observed !== c.position) {
    receipt.status = "BLOCKED-REFERENCE-POSITION-MISMATCH";
    receipt.reason =
      "R34 1.2/Q40f requires dense reference tx. Accepted broker positions are packed and non-dense. No remapping or contract change authorized.";
    process.exitCode = 2;
  } else {
    receipt.status = "PREFLIGHT-ONLY";
    receipt.reason = "No full seeder or admission implemented";
    process.exitCode = 2;
  }
} catch (error) {
  receipt.status = "ERROR";
  receipt.error = String(error);
  process.exitCode = 1;
} finally {
  try {
    await broker?.close();
    receipt.closed = true;
  } catch (error) {
    receipt.closed = false;
    receipt.cleanupError = String(error);
    process.exitCode = 1;
  }
  receipt.sourcesAfter = hash();
  receipt.sourceStable = canonical(before) === canonical(receipt.sourcesAfter);
  if (!receipt.sourceStable) {
    receipt.status = "SOURCE-CHANGED";
    process.exitCode = 1;
  }
  const end = fs.statfsSync(output);
  receipt.freeEnd = end.bavail * end.bsize;
  receipt.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", {
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      status: receipt.status,
      attempt,
      output,
      comparison: receipt.positionComparison,
    }),
  );
}
