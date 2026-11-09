// [EXP-SQL01] Why: ACK must complete while the actual maintenance worker and a pool reader are paused.
// Rejected: using a latency ratio to infer a lock dependency under shared-host load.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { vi, it, expect } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const hooks = vi.hoisted(() => ({ active: false, reader: undefined as SharedArrayBuffer | undefined, checkpoint: undefined as SharedArrayBuffer | undefined, workers: [] as any[] }));
vi.mock("node:worker_threads", async importOriginal => {
  const original = await importOriginal<typeof import("node:worker_threads")>();
  return { ...original, Worker: class extends original.Worker {
    constructor(code: any, options: any) {
      if (hooks.active && typeof code === "string" && options?.workerData?.role) {
        const role = options.workerData.role, base = code;
        if (role === "reader") {
          const needle = "marker();result=handle(op,args);";
          if (code.split(needle).length !== 2) throw Error("reader instrumentation point changed");
          code = code.replace(needle, "marker();if(workerData.verifyPause){const p=new Int32Array(workerData.verifyPause);if(Atomics.compareExchange(p,0,1,0)===1){Atomics.store(p,1,1);Atomics.notify(p,1);Atomics.wait(p,2,0);}}result=handle(op,args);");
          options = { ...options, workerData: { ...options.workerData, verifyPause: hooks.reader } };
        }
        if (role === "checkpointer") {
          const needle = "Atomics.store(gate,0,1);";
          if (code.split(needle).length !== 2) throw Error("checkpoint instrumentation point changed");
          code = code.replace(needle, "Atomics.store(gate,0,1);if(workerData.verifyPause){const p=new Int32Array(workerData.verifyPause);if(Atomics.compareExchange(p,0,1,0)===1){Atomics.store(p,1,1);Atomics.notify(p,1);Atomics.wait(p,2,0);}}");
          options = { ...options, workerData: { ...options.workerData, verifyPause: hooks.checkpoint } };
        }
        hooks.workers.push({ role, gateBuffer: options.workerData.gateBuffer, original: base, instrumented: code });
      }
      super(code, options);
    }
  } };
});
import { HostBroker } from "../../../packages/qlever/src/broker/broker.ts";
import { columns } from "../../../packages/qlever/src/rdf.ts";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const waitFor = async (p: Int32Array, field: number, wanted: number) => {
  const deadline = performance.now() + 10_000;
  while (Atomics.load(p, field) !== wanted) { if (performance.now() > deadline) throw Error("worker barrier not reached"); await new Promise(r => setTimeout(r, 1)); }
};
const release = (p: Int32Array) => { Atomics.store(p, 2, 1); Atomics.notify(p, 2); };
it("ACK completes with the real maintenance gate closed and a real pool reader pinned", async () => {
  hooks.reader = new SharedArrayBuffer(12); hooks.checkpoint = new SharedArrayBuffer(12); hooks.workers = []; hooks.active = true;
  const rp = new Int32Array(hooks.reader), cp = new Int32Array(hooks.checkpoint);
  const dir = path.join(import.meta.dirname, "data", "qa2-pool-barrier-" + randomUUID());
  const b = await HostBroker.open({ dir, scopeKey: "qa2-pool-barrier", minFreeBytes: 0 });
  let read: Promise<any> | undefined, maintenance: Promise<any> | undefined;
  const commits: any[] = [];
  const submit = async (op: string) => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ ...Object.fromEntries(columns.map(c => [c, null])), id: op + "/" + i, entity_id: "hot", attribute: ":many", value_type: "string", value_string: op, recorded_position: -1, recorded_at: 1, valid_from: 0, entity_type: "Subject" })) as TripleRow[];
    const started = performance.now();
    const d = await b.submit({ operationId: op, attemptId: op, sourceK: b.head(), reads: { entities: new Set(), scopeWide: false }, claims: [], placeholders: [-1], rows, priors: new Map(), newIds: new Set(rows.map(r => r.id)) });
    commits.push({ op, ms: performance.now() - started, decision: d.kind, readerReleased: Atomics.load(rp, 2), maintenanceReleased: Atomics.load(cp, 2) });
    expect(d.kind).toBe("committed"); return d;
  };
  try {
    const writerGate = hooks.workers.find(w => w.role === "writer")!.gateBuffer;
    expect(hooks.workers.every(w => w.gateBuffer === writerGate)).toBe(true);
    const gate = new Int32Array(writerGate);
    await submit("seed"); const basis = b.head();
    Atomics.store(rp, 0, 1); read = b.pullAt(basis, { entities: ["hot"] }); await waitFor(rp, 1, 1);
    expect(Atomics.load(gate, 1)).toBe(1);
    Atomics.store(cp, 0, 1); maintenance = b.checkpoint(); await waitFor(cp, 1, 1);
    expect(Atomics.load(gate, 0)).toBe(1);
    // [EXP-SQL01] Why: a real ACK while maintenance cannot run proves the absence of a completion dependency.
    // Rejected: releasing the reader before awaiting ACK (would hide waiting checkpoints).
    await submit("both-barriers-held");
    expect(Atomics.load(rp, 2)).toBe(0); expect(Atomics.load(cp, 2)).toBe(0);
    release(cp); const skipped = await maintenance;
    expect(skipped.events.at(-1)?.outcome).toBe("readers-busy");
    expect(Atomics.load(gate, 0)).toBe(0);
    for (let i = 0; i < 8; i++) await submit("reader-still-held-" + i);
    release(rp); const pinned = await read;
    expect(pinned.rows).toHaveLength(10); expect(pinned.snapshot.position).toBe(basis);
    const current = await b.pullAt(b.head(), { entities: ["hot"] }); expect(current.rows).toHaveLength(100);
    const completed = await b.checkpoint(); expect(completed.events.at(-1)?.outcome).toBe("complete");
    fs.writeFileSync(path.join(import.meta.dirname, "evidence", `${process.env.SQL01_ATTEMPT ?? "qa2"}-pool-barrier.json`), JSON.stringify({ dir, basis, head: b.head(), commits, skipped, completed, pinnedRows: pinned.rows.length, latestRows: current.rows.length, instrumentation: "reader after initial marker; maintenance immediately after closing the actual shared gate", workers: hooks.workers.map(w => ({ role: w.role, originalSha256: hash(w.original), instrumentedSha256: hash(w.instrumented) })) }, null, 2));
  } finally {
    release(cp); release(rp); await maintenance?.catch(() => {}); await read?.catch(() => {}); hooks.active = false; await b.close();
  }
});
