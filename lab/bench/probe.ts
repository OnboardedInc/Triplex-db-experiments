/** Development probe (not a gate): learns per-lane behaviour the driver depends on. */
import { core, Effect, openTriples, type Lane } from "./lib/triplex.ts";

const lane = (process.argv[2] ?? "xtdb") as Lane;
const scope = `n01-probe-${Date.now()}`;
const a = await openTriples(lane, scope);
const b = await openTriples(lane, scope);
const T = a.triples;
const t0 = Date.now();
const E = (s: string) => core.EntityId.make(s);
const ops = (subject: string, n: number, stamp: number) =>
  Array.from({ length: n }, (_, i) => ({
    op: "assert",
    entityId: E(i === 0 ? subject : `${subject}/x${i % 5}`),
    attribute: i === 0 ? ":p/stamp" : `:p/f${i}`,
    value: i === 0 ? core.integer(String(stamp)) : core.string(`v${i}-${stamp}`),
    validFrom: t0 - 1000,
  }));
const time = async <A>(label: string, f: () => Promise<A>) => {
  const s = performance.now();
  const r = await f();
  console.log(label, (performance.now() - s).toFixed(1), "ms");
  return r;
};
const r1: any = await time("transact 10", () => a.run(T.transact(ops("s:1", 10, 1), { commandId: `${scope}:c1` })));
console.log("receipt", { txId: r1.txId, position: r1.position, instant: r1.instant, n: r1.triples.length });
for (let i = 0; i < 3; i++) await time("transact 10 more", () => a.run(T.transact(ops(`s:${i + 2}`, 10, 1), { commandId: `${scope}:c${i + 2}` })));
await time("transact 50", () => a.run(T.transact(ops("s:9", 50, 1), { commandId: `${scope}:c9` })));
const stampFact = r1.triples.find((t: any) => t.attribute === ":p/stamp");
// CAS: retract previous stamp with TripleLive precondition, assert new stamp.
const r2: any = await time("cas", () =>
  a.run(T.transact([{ op: "retract", id: stampFact.id }, ...ops("s:1", 1, 2)], { commandId: `${scope}:cas`, preconditions: [{ _tag: "TripleLive", id: stampFact.id }] })),
);
const lose: any = await a.runExit(T.transact([{ op: "retract", id: stampFact.id }, ...ops("s:1", 1, 3)], { commandId: `${scope}:cas2`, preconditions: [{ _tag: "TripleLive", id: stampFact.id }] }));
console.log("cas loser", JSON.stringify(lose).slice(0, 400));
const dup: any = await a.runExit(T.transact(ops("s:1", 10, 1), { commandId: `${scope}:c1` }));
console.log("dup", JSON.stringify(dup).slice(0, 600));
const byCmd: any = await a.run(T.transactionByCommand(`${scope}:c1`));
console.log("byCommand", byCmd?.txId === r1.txId, byCmd?.position);
// Reads at basis
const now = Date.now();
await time("entity current (b)", () => b.run(T.entity(E("s:1"), { validAt: now })));
const cur: any = await b.run(b.triples.entity(E("s:1"), { validAt: now }));
console.log("cross-instance stamp", cur.find((t: any) => t.attribute === ":p/stamp")?.value);
const old: any = await b.run(b.triples.entity(E("s:1"), { validAt: now, recordedAt: r1.instant }));
console.log("asOf r1.instant stamp", old.find((t: any) => t.attribute === ":p/stamp")?.value, "r2.instant", r2.instant);
for (let i = 0; i < 5; i++) await time("entities 6 (b)", () => b.run(b.triples.entities([E("s:1"), E("s:1/x1"), E("s:1/x2"), E("s:1/x3"), E("s:1/x4"), E("s:2")], { validAt: now, recordedAt: r2.instant })));
const feed: any = await time("transactions after 0", () => b.run(b.triples.transactions({ after: 0, limit: 100 })));
console.log("feed", feed.transactions.map((t: any) => [t.position, t.commandId, t.changes.length, t.instant]), "next", feed.next);
console.log("change sample", JSON.stringify(feed.transactions.at(-1)?.changes?.[0]));
console.log("currentPosition", await b.run(b.triples.currentPosition()));
await a.close();
await b.close();
