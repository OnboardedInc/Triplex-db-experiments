import { createRequire, syncBuiltinESMExports } from "node:module";
import { createHash } from "node:crypto";
// [EXP-SQL01] Why: pause at real broker boundaries before full-process SIGKILL. Rejected: fabricated success markers without storage reads.
import { HostBroker } from "../../../packages/qlever/src/broker/broker.ts";
import { LogFeed } from "../../../packages/qlever/src/broker/feed.ts";
import { columns } from "../../../packages/qlever/src/rdf.ts";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const [dir, cycleText, mode, cursorText] = process.argv.slice(2) as [
  string,
  string,
  string,
  string,
];
const cycle = Number(cycleText);
// [EXP-HS01] Why: stop at real in-transaction dictionary/purge barriers, not a timing guess.
// Rejected: killing shortly after enqueue (does not prove the maintenance mutation was in flight).
const nodeRequire = createRequire(import.meta.url),
  nativeThreads = nodeRequire("node:worker_threads"),
  OriginalWorker = nativeThreads.Worker;
const fault = new SharedArrayBuffer(12),
  faultState = new Int32Array(fault),
  instrumentation: unknown[] = [];
nativeThreads.Worker = class extends OriginalWorker {
  constructor(code: any, options: any) {
    if (typeof code === "string" && options?.workerData?.role === "writer") {
      const original = code;
      const dictionary =
        "for(const [t,id,v]of prepared.additions)q('INSERT OR IGNORE INTO '+t+' VALUES(?,?)').run(id,textKey(v));";
      const purge = "if(last){q('DELETE FROM frames WHERE lsn<=?').run(last.lsn);";
      if (code.split(dictionary).length !== 2 || code.split(purge).length !== 2)
        throw Error("HS01 worker barrier point changed");
      const barrier = (mode: number) =>
        "{const p=new Int32Array(workerData.hs01Fault);if(Atomics.load(p,0)===" +
        mode +
        "){Atomics.store(p,1,1);Atomics.notify(p,1);Atomics.wait(p,2,0);}}";
      code = code
        .replace(
          dictionary,
          "for(const [t,id,v]of prepared.additions){q('INSERT OR IGNORE INTO '+t+' VALUES(?,?)').run(id,textKey(v));" +
            barrier(1) +
            "}",
        )
        .replace(purge, purge + barrier(2));
      options = { ...options, workerData: { ...options.workerData, hs01Fault: fault } };
      instrumentation.push({
        originalSha256: createHash("sha256").update(original).digest("hex"),
        instrumentedSha256: createHash("sha256").update(code).digest("hex"),
      });
    }
    super(code, options);
  }
};
syncBuiltinESMExports();
// [EXP-HS01] Why: round 2 retention is by bytes as well as frames; the abrupt-stop schedule must run the byte path.
// Rejected: leaving the frame-count-only path as the only one crash-tested.
const retention = { tailFrames: 2, tailBytes: 9000 };
const b = await HostBroker.open({
  dir,
  scopeKey: "vsql01-kill",
  minFreeBytes: 0,
  frameRetention: retention,
});
const emit = (x: unknown) => console.log(JSON.stringify(x));
emit({ event: "worker-instrumentation", instrumentation });
const feed = new LogFeed(dir);
const store = (b as any).log;
store.retain("crash-feed", store.writer.sync("anchor").base_lsn);
let cursor = JSON.parse(cursorText) ?? feed.start();
const feedPositions: number[] = [];
for (;;) {
  const p = feed.poll(cursor, { maxBytes: 1 });
  if (!p.resolutions.length) break;
  for (const r of p.resolutions)
    if (r.kind === "commit") for (const t of r.transacts) feedPositions.push(t.position);
  cursor = p.cursor;
}
const all = await b.fromLogAsync(0, {}, () => true);
const recovered = [];
for (const op of new Set(all.map((r) => r.entity_id))) {
  const receipt = b.operation(op),
    claim = b.claim(op);
  const pulled = receipt ? await b.pullAt(receipt.positions[0]!, { entities: [op] }) : undefined;
  recovered.push({
    op,
    receipt,
    claim,
    rows: pulled?.rows.map((r) => r.id).sort(),
    eligible: pulled?.eligible,
  });
  const replay = await b.submit({
    operationId: op,
    attemptId: "retry",
    sourceK: b.head(),
    reads: { entities: new Set(), scopeWide: false },
    claims: [],
    placeholders: [-1],
    rows: [],
    priors: new Map(),
    newIds: new Set(),
  });
  if (
    replay.kind !== "committed" ||
    !replay.replayed ||
    replay.positions.get(-1) !== receipt?.positions[0]
  )
    throw Error("retry receipt mismatch " + op);
}
emit({ event: "recovered", cycle, recovered, feedPositions, cursor });
if (mode === "verify") {
  await b.close();
  process.exit(0);
}
const log = (b as any).log;
const hold = async (point: string) => {
  emit({ event: "barrier", point });
  await new Promise(() => {});
};
let armed = false;
const append = log.append.bind(log);
log.append = async (...args: any[]) => {
  if (armed && mode === "before-append") await hold(mode);

  const pending = append(...args);
  if (armed && mode === "inflight") emit({ event: "barrier", point: mode });
  const result = await pending;
  if (armed && mode === "purge") {
    log.retain("crash-feed", cursor.lsn);
    await log.writer.request("purgeFrames", {
      frames: retention.tailFrames,
      bytes: retention.tailBytes,
    });
    await new Promise(() => {});
  }
  if (armed && mode === "after-append") await hold(mode);
  return result;
};
const publish = log.publishWatermark.bind(log);
log.publishWatermark = (m: unknown) => {
  publish(m);
  // [EXP-SQL01] Why: a synchronous barrier stalls ACK delivery after the actual ACKED rename. Rejected: a fake ACK sidecar.
  if (armed && mode === "after-sidecar") {
    emit({ event: "barrier", point: mode });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
  }
};
for (let i = 0; ; i++) {
  const op = `op-${cycle}-${i}`;
  armed = i >= 3;
  if (armed && ["purge", "dictionary-growth"].includes(mode)) {
    Atomics.store(faultState, 0, mode === "purge" ? 2 : 1);
    const watch = setInterval(() => {
      if (Atomics.load(faultState, 1) === 1) {
        clearInterval(watch);
        emit({ event: "barrier", point: mode });
      }
    }, 1);
  }
  const rows = Array.from({ length: 10 }, (_, j) => ({
    ...Object.fromEntries(columns.map((c) => [c, null])),
    // The core generator's shape (8-character head, 18-character counter), so recovery also reads the integer id form;
    // every tenth id is the former text shape.
    id:
      j % 10 === 9
        ? op + "/" + j
        : "K1LLHEAD" +
          (cycle * 1_000_000 + i * 100 + j).toString(36).toUpperCase().padStart(18, "0"),
    entity_id: op,
    attribute: ":a" + j,
    value_type: "string",
    value_string: "v" + j,
    recorded_position: -1,
    recorded_at: 1,
    valid_from: 0,
    entity_type: "Subject",
  })) as TripleRow[];
  const d = await b.submit({
    operationId: op,
    attemptId: op,
    sourceK: b.head(),
    reads: { entities: new Set(), scopeWide: false },
    claims: [{ commandId: op, txId: op, timestamp: 1 }],
    placeholders: [-1],
    rows,
    priors: new Map(),
    newIds: new Set(rows.map((r) => r.id)),
  });
  if (d.kind !== "committed") throw Error("unexpected conflict");
  emit({ event: "acked", op, position: d.positions.get(-1), cycle });
  if (armed && mode === "acked") await hold(mode);
  await new Promise((r) => setTimeout(r, 1));
}
