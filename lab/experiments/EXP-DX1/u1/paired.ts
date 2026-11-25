// [DX-U1] Paired native log: one fixed workload through the SDK's own write path (KvTriples over the in-memory KV
// backend: every row ID from `nextTripleId`, every transaction ID from `generateTransactionId`), with an ordered save
// block taken from `orderedSaveIdentity()` just before each write, in the same millisecond, as a process of the held
// runner does. Run on the base and on this branch: prints how many SDK IDs fall inside a block taken before them, and
// the native log (every datom of the store, in order) twice: raw, and with each ID replaced by the order in which it
// first appears and each clock value by a placeholder.
// Run: node --experimental-strip-types lab/experiments/EXP-DX1/u1/paired.ts <rounds>
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { orderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";

const here = path.dirname(new URL(import.meta.url).pathname);
const fromDatomic = createRequire(path.join(here, "../../../../packages/datomic/package.json"));
const core = await import(pathToFileURL(fromDatomic.resolve("@triplex-build/triplex")).href);
const fromCore = createRequire(path.join(here, "../../../../packages/core/package.json"));
const { Effect } = await import(pathToFileURL(fromCore.resolve("effect")).href);
const { KvTriples, Triples } = core;

const rounds = Number(process.argv[2] ?? 300);
const blocks: string[] = [];
const opt = (o: any) => (o && typeof o === "object" && "_tag" in o ? (o._tag === "Some" ? o.value : null) : o);
const run = <A>(e: unknown) => Effect.runPromise((e as any).pipe(Effect.provide(KvTriples.layer))) as Promise<A>;
const dump = await run<any[]>(Effect.gen(function* () {
  const t = yield* Triples;
  for (let i = 0; i < rounds; i++) {
    const t0 = Date.now();
    while (Date.now() === t0);
    blocks.push(orderedSaveIdentity().token); // a save of the tape takes its block ...
    yield* t.transact(                         // ... and a Publish or a frame writes through the SDK in the same ms
      [0, 1, 2].map((k) => ({ op: "assert", entityId: "s" + (i % 7), attribute: ":f" + k, value: { type: "string", value: "v" + i + "-" + k } })),
      { actor: "u1", commandId: "u1-" + i },
    );
  }
  const out: any[] = [];
  for (let k = 0; k < 7; k++) out.push(...(yield* t.match({ entityId: "s" + k })));
  const txs = [...new Set(out.map((r: any) => String(opt(r.txId))))];
  for (const tx of txs) out.push(...(yield* t.match({ entityId: tx })));
  return out;
}));
const ids = dump.flatMap((r: any) => [String(r.id), String(opt(r.txId)).replace(/^_tx\//, "")]);
const tokens = new Set(blocks);
const sharing = [...new Set(ids)].filter((id) => tokens.has(id.slice(0, 24)));
// Inside a block: the token and then two hexadecimal digits, one of the block's 256 assertion IDs.
const inside = sharing.filter((id) => /^[0-9A-F]{2}$/.test(id.slice(24))).length;
// The native log in order, raw and with IDs and clocks replaced.
const rows = dump.map((r: any) => ({ e: String(r.entityId), a: String(r.attribute), v: r.value, id: String(r.id), tx: String(opt(r.txId)),
  by: opt(r.createdBy), at: r.recordedAt, from: r.validFrom }))
  ;
// In commit order (each transaction's position), then by entity kind and attribute.
const position = new Map(rows.filter((r) => r.a === ":_tx/position").map((r) => [r.e, Number((r.v as any).value)]));
const pos = (r: { tx: string }) => position.get(r.tx) ?? 0;
rows.sort((x, y) => (pos(x) - pos(y)) || (Number(x.e.startsWith("_tx/")) - Number(y.e.startsWith("_tx/"))) ||
  (x.a < y.a ? -1 : x.a > y.a ? 1 : 0) || (x.e < y.e ? -1 : x.e > y.e ? 1 : 0));
const order = new Map<string, number>();
const norm = (s: string) => s.replace(/[0-7][0-9A-HJKMNP-TV-Z]{25}/g, (m) => "#" + (order.has(m) ? order.get(m) : (order.set(m, order.size), order.size - 1)));
const clock = (v: unknown) => (typeof v === "number" && v > 1e12 ? "<clock>" : v);
const normalized = rows.map((r) => ({ ...r, id: norm(r.id), tx: norm(r.tx), e: norm(r.e), at: "<clock>", from: "<clock>",
  v: r.a === ":_tx/instant" ? "<clock>" : JSON.parse(norm(JSON.stringify(r.v, (_, x) => clock(typeof x === "bigint" ? Number(x) : x)))) }));
const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x, (_, v) => (typeof v === "bigint" ? String(v) : v))).digest("hex");
console.log(JSON.stringify({ rounds, datoms: rows.length, sdkIds: new Set(ids).size, sdkIdsSharingABlockToken: sharing.length, sdkIdsInsideABlock: inside, rawSha: sha(rows), normalizedSha: sha(normalized),
  attributes: [...new Set(rows.map((r) => r.a))].sort().length }));
