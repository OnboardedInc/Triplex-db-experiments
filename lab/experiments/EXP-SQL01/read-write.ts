// [EXP-SQL01] Why: compare the complete broker commit API with and without concurrent pinned reader traffic.
// Rejected: SQLite-only timing (would omit broker staging, publication and worker dispatch).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.js";
import { columns } from "../../../packages/qlever/src/rdf.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const root = path.resolve("runs/broker/EXP-SQL01/read-write-" + randomUUID());
const results = [];
const summary = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return {
    n: s.length,
    p50: s[Math.ceil(s.length * 0.5) - 1],
    p99: s[Math.ceil(s.length * 0.99) - 1],
    max: s.at(-1),
  };
};
for (const clients of [0, 16]) {
  const b = await HostBroker.open({
    dir: path.join(root, String(clients)),
    scopeKey: "sql01-rw",
    minFreeBytes: 0,
  });
  const write = async (i: number) => {
    const rows = Array.from(
      { length: 10 },
      (_, k) =>
        ({
          ...Object.fromEntries(columns.map((c) => [c, null])),
          id: "row-" + i + "-" + k,
          entity_id: i === 0 ? "pinned" : "writer-" + (i % 100),
          attribute: ":a" + k,
          value_type: "string",
          value_string: "x".repeat(100),
          recorded_position: -1,
          recorded_at: Date.now(),
          valid_from: 0,
          entity_type: "Subject",
        }) as TripleRow,
    );
    return b.submit({
      operationId: "op-" + i,
      attemptId: "at-" + i,
      sourceK: b.head(),
      reads: { entities: new Set(), scopeWide: false },
      claims: [],
      placeholders: [-1],
      rows,
      priors: new Map(),
      newIds: new Set(rows.map((r) => r.id)),
    });
  };
  await write(0);
  const basis = b.head(),
    pin = b.pinBasis(basis, "rw comparison");
  let stop = false,
    pulls = 0,
    violations = 0;
  const errors: string[] = [],
    durations: number[] = [],
    readMs: number[] = [];
  const load0 = os.loadavg(),
    t0 = performance.now();
  const readers = Array.from({ length: clients }, async () => {
    while (!stop) {
      const t = performance.now();
      try {
        const r = await b.pullAt(basis, { entities: ["pinned"] });
        if (
          !r.eligible ||
          r.rows.length !== 10 ||
          r.rows.some((x) => x.recorded_position !== basis)
        )
          violations++;
        pulls++;
        readMs.push(performance.now() - t);
      } catch (e) {
        errors.push(String(e));
        stop = true;
      }
    }
  });
  for (let i = 1; i <= 200 && !stop; i++) {
    const offered = t0 + i * 20,
      delay = offered - performance.now();
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    const t = performance.now();
    try {
      const decision = await write(i);
      if (decision.kind !== "committed") throw Error("commit conflict");
      durations.push(performance.now() - t);
    } catch (e) {
      errors.push(String(e));
      break;
    }
  }
  stop = true;
  await Promise.all(readers);
  const wallMs = performance.now() - t0;
  pin.release();
  results.push({
    clients,
    poolThreads: 4,
    basis,
    commits: summary(durations),
    reads: summary(readMs),
    pulls,
    violations,
    errors,
    wallMs,
    readPerSec: pulls / (wallMs / 1000),
    load0,
    load1: os.loadavg(),
    rss: process.memoryUsage().rss,
  });
  await b.close();
}
fs.writeFileSync(
  "lab/experiments/EXP-SQL01/evidence/read-write.json",
  JSON.stringify({ root, results }, null, 2),
);
console.log(JSON.stringify(results));
if (results.some((x) => x.errors.length || x.violations || x.commits.n !== 200))
  process.exitCode = 1;
