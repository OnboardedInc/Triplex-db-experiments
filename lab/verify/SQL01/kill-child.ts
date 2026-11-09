// [EXP-SQL01] Why: pause at real broker boundaries before full-process SIGKILL. Rejected: fabricated success markers without storage reads.
import { HostBroker } from "../../../packages/qlever/src/broker/broker.ts";
import { LogFeed } from "../../../packages/qlever/src/broker/feed.ts";
import { columns } from "../../../packages/qlever/src/rdf.ts";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const [dir, cycleText, mode, cursorText] = process.argv.slice(2) as [string, string, string, string];
const cycle = Number(cycleText);
const b = await HostBroker.open({ dir, scopeKey: "vsql01-kill", minFreeBytes: 0 });
const emit = (x: unknown) => console.log(JSON.stringify(x));
const feed = new LogFeed(dir);
let cursor = JSON.parse(cursorText) ?? feed.start();
const feedPositions: number[] = [];
for (;;) {
  const p = feed.pollSync(cursor, { maxBytes: 1 });
  if (!p.resolutions.length) break;
  for (const r of p.resolutions) if (r.kind === "commit") for (const t of r.transacts) feedPositions.push(t.position);
  cursor = p.cursor;
}
const all = await b.fromLogAsync(0, {}, () => true);
const recovered = [];
for (const op of new Set(all.map(r => r.entity_id))) {
  const receipt = b.operation(op), claim = b.claim(op);
  const pulled = receipt ? await b.pullAt(receipt.positions[0]!, { entities: [op] }) : undefined;
  recovered.push({ op, receipt, claim, rows: pulled?.rows.map(r => r.id).sort(), eligible: pulled?.eligible });
  const replay = await b.submit({ operationId: op, attemptId: "retry", sourceK: b.head(), reads: { entities: new Set(), scopeWide: false }, claims: [], placeholders: [-1], rows: [], priors: new Map(), newIds: new Set() });
  if (replay.kind !== "committed" || !replay.replayed || replay.positions.get(-1) !== receipt?.positions[0]) throw Error("retry receipt mismatch " + op);
}
emit({ event: "recovered", cycle, recovered, feedPositions, cursor });
if (mode === "verify") { await b.close(); process.exit(0); }
const log = (b as any).log;
const hold = async (point: string) => { emit({ event: "barrier", point }); await new Promise(() => {}); };
let armed = false;
const append = log.append.bind(log);
log.append = async (...args: any[]) => {
  if (armed && mode === "before-append") await hold(mode);
  const pending = append(...args);
  if (armed && mode === "inflight") emit({ event: "barrier", point: mode });
  const result = await pending;
  if (armed && mode === "after-append") await hold(mode);
  return result;
};
const publish = log.publishWatermark.bind(log);
log.publishWatermark = (m: unknown) => {
  publish(m);
  // [EXP-SQL01] Why: a synchronous barrier stalls ACK delivery after the actual ACKED rename. Rejected: a fake ACK sidecar.
  if (armed && mode === "after-sidecar") { emit({ event: "barrier", point: mode }); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0); }
};
for (let i = 0; ; i++) {
  const op = `op-${cycle}-${i}`;
  armed = i >= 3;
  const rows = Array.from({ length: 10 }, (_, j) => ({ ...Object.fromEntries(columns.map(c => [c, null])), id: op + "/" + j, entity_id: op, attribute: ":a" + j, value_type: "string", value_string: "v" + j, recorded_position: -1, recorded_at: 1, valid_from: 0, entity_type: "Subject" })) as TripleRow[];
  const d = await b.submit({ operationId: op, attemptId: op, sourceK: b.head(), reads: { entities: new Set(), scopeWide: false }, claims: [{ commandId: op, txId: op, timestamp: 1 }], placeholders: [-1], rows, priors: new Map(), newIds: new Set(rows.map(r => r.id)) });
  if (d.kind !== "committed") throw Error("unexpected conflict");
  emit({ event: "acked", op, position: d.positions.get(-1), cycle });
  if (armed && mode === "acked") await hold(mode);
  await new Promise(r => setTimeout(r, 1));
}
