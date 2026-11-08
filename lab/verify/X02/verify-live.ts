/**
 * V-X02 independent live checks of exp/X02-xtql-parity on the shared tx2-xtdb-dev resident.
 *
 *   node lab/bin/heavy.mjs -- node lab/verify/X02/verify-live.ts <output.json>
 *   (env: XTDB_URL, TRIPLEX_LAB_SLOT_OWNER; lab/verify/X02/node_modules -> packages/qualification/node_modules)
 *
 * Written by the verifier, not the author. Every expected answer below is a hand derivation written next to its
 * fixture before any run. Each fixture lives in its own fresh test scope. Every control runs in XTQL and in SQL
 * with recordedPosition pinned to the SAME position P (the fixture's write receipt), so both languages read one cut.
 *
 * Sections: A equivalence controls (builders 01-04, 07, 10, 11, 13, 14, 15, 16, 20, plus int64 for 06/08);
 * B recursion depth (closure needing depth 9 must fail typed in XTQL, never truncate); C #6345 dense graph (edge
 * count under the guard, walk count over 100k); D writer between calls (multi-call tasks); E hazards (ANY envelope,
 * DECIMAL->BIGINT casts in SQL, XTQL and the Datalog compiler at compiler.ts:572); F reported basis.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { Effect, Exit } from "effect";
import { EntityId, Triples, boolean, integer, ref, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";

// Only the shared dev resident; never a default or forbidden endpoint.
if (process.env["XTDB_URL"] !== "postgres://xtdb:xtdb@127.0.0.1:5470/xtdb" || !process.argv[2]) {
  console.error("usage: XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:5470/xtdb node lab/verify/X02/verify-live.ts <output.json>");
  process.exit(2);
}
process.env["TRIPLEX_QUERY_PATH"] = "xtdb-native";
const root = path.resolve(import.meta.dirname, "../../..");
const { loadQualificationBackend } = await import(path.join(root, "packages/qualification/dist/index.js"));
const library = await import(path.join(root, "packages/qualification/dist/native/xtdb-workloads.js"));
const output = process.argv[2]!;
const backend = await loadQualificationBackend();
const runId = `vx02-${Date.now()}`;
type Row = Record<string, any>;
const MAX = 2n ** 63n - 1n,
  MIN = -(2n ** 63n),
  T = 1_000_000; // runner tick offset: fixture valid time v is Triplex ms v + 1e6

// ------------------------------------------------------------------ writing
type Kind = "str" | "int" | "bool" | "ref";
interface F {
  e: string;
  f: string;
  k: Kind;
  v: unknown;
  from?: number;
  to?: number;
}
const att = (id: string, field: string) => `:w${id}/a${Buffer.from(field).toString("hex")}`;
const value = (k: Kind, v: unknown) =>
  k === "int" ? integer(String(v)) : k === "bool" ? boolean(Boolean(v)) : k === "ref" ? ref(EntityId.make(String(v))) : string(String(v));
// Large fixtures go in chunks of 400 facts (one 5,050-fact transaction hit the write deadline on the loaded
// resident); the receipt of the last chunk is the fixture's position.
const write = async (scope: DatabaseScope, id: string, facts: readonly F[], startTime: number) => {
  let receipt: { position: number } | undefined;
  for (let at = 0, part = 0; at < facts.length; at += 400, part++)
    receipt = await writeChunk(scope, id, facts.slice(at, at + 400), startTime + part, part); // recordedAt must advance per commit
  return receipt!;
};
const writeChunk = (scope: DatabaseScope, id: string, facts: readonly F[], startTime: number, part: number) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.transact(
        facts.map((x) => ({
          op: "assert" as const,
          entityId: EntityId.make(x.e),
          attribute: att(id, x.f),
          value: value(x.k, x.v),
          validFrom: x.from ?? 0,
          ...(x.to === undefined ? {} : { validTo: x.to }),
        })),
        { commandId: `${runId}:${scope}:${startTime}:${part}` },
      );
    }).pipe(
      Effect.provide(
        backend.makeRuntime().layer({ scope, capabilities: Capabilities.none, deterministic: { startTime, seed: `${runId}-${scope}-${startTime}` } }),
      ),
      Effect.scoped,
    ) as Effect.Effect<{ position: number }, unknown, never>,
  );

// ------------------------------------------------------------------ running
const integerOf = (v: unknown): bigint => {
  if (typeof v === "object" && v && (v as Row)["type"] === "integer") return BigInt((v as Row)["value"]);
  if (typeof v === "number" && Number.isSafeInteger(v)) return BigInt(v);
  throw new TypeError(`non-exact integer ${JSON.stringify(v)}`);
};
const wire = (v: unknown) =>
  typeof v === "boolean" ? { tag: "bool", value: v } : typeof v === "string" ? { tag: "str", value: v } : { tag: "i64", value: integerOf(v).toString() };
const canonical = (rows: readonly unknown[][]) => [...new Set(rows.map((r) => JSON.stringify(r.map(wire))))].sort();
const languages = ["xtql", "xtdb-sql"] as const;
type Language = (typeof languages)[number];
const CALL_TIMEOUT_MS = Number(process.env["VX02_CALL_TIMEOUT_MS"] ?? 300_000);
/** Pin every call of a task to position `pin`; optionally run `between` after call number `after`. */
const session = (provider: any, pin: number | undefined, between?: { after: number; run: () => Promise<void> }) => {
  let calls = 0;
  const wrap = (method: string) => (...args: any[]) => {
    const at = method === "selectSqlWithReachability" ? 4 : 3;
    if (pin !== undefined) args[at] = { ...args[at], basis: { ...args[at]?.basis, recordedPosition: pin } };
    // Answers, not latency, are verified here; the loaded shared resident needs more than the 30 s default.
    args[at] = { ...args[at], timeoutMs: CALL_TIMEOUT_MS };
    return provider[method](...args).pipe(
      Effect.tap(() => {
        const n = calls++;
        return between && n === between.after ? Effect.promise(between.run) : Effect.void;
      }),
    );
  };
  return { select: wrap("select"), selectSql: wrap("selectSql"), selectSqlWithReachability: wrap("selectSqlWithReachability") };
};
const causeText = (cause: unknown) => String(cause).slice(0, 600);
const run = async (provider: any, language: Language, id: string, entry: Row, pin?: number, between?: { after: number; run: () => Promise<void> }) => {
  const trace: Row[] = [];
  const started = performance.now();
  const exit = await Effect.runPromiseExit(
    library.evaluateXtdbNativeWorkload(session(provider, pin, between), { id }, entry, new Map([[0, 0]]), trace, language) as Effect.Effect<unknown[][], unknown>,
  );
  const queries = trace.filter((t) => t["operation"] === "public-native-query");
  const stepLanguages = queries.flatMap((q) => (q["steps"] ?? []).map((s: Row) => s["language"]));
  const failure = Exit.isSuccess(exit) ? null : exit.cause;
  return {
    rows: Exit.isSuccess(exit) ? canonical(exit.value) : null,
    error: failure ? causeText(failure) : null,
    // Fail = typed failure in the error channel; Die = thrown defect.
    errorChannel: failure ? (String(failure).includes("Die") || /defect/i.test(JSON.stringify(failure)) ? "die?" : "fail?") : null,
    errorJson: failure ? JSON.stringify(failure).slice(0, 600) : null,
    languages: [...new Set([...queries.map((q) => q["language"]), ...stepLanguages])],
    calls: queries.length,
    positions: [...new Set(queries.map((q) => q["basis"]?.recordedPosition))],
    reportedBasis: queries[0]?.["basis"] ?? null,
    queryChars: queries.map((q) => String(q["query"] ?? "").length),
    elapsedMs: Math.round(performance.now() - started),
  };
};
const S = (v: string) => ({ value: v }),
  I = (v: number | string | bigint) => ({ value: String(v) });
interface Control {
  label: string;
  op: string;
  params: Row;
  cut: Row;
  expect: unknown[][] | { error: string };
  why: string;
  only?: Language;
}
interface Fixture {
  name: string;
  id: string;
  facts: F[];
  controls: Control[];
}
const fixtures: Fixture[] = [];
const cut = (valid: number | string, known = "1") => ({ known_at: known, valid_at: String(valid) });

// ------------------------------------------------------------------ A. equivalence controls
// 01/02 state_at: exact int64 point reads near 1e18 and at the int64 limits.
fixtures.push({
  name: "state-at-int64", id: "01",
  facts: [
    { e: "e", f: "status", k: "int", v: "1000000000000000004" },
    { e: "max", f: "status", k: "int", v: MAX },
    { e: "min", f: "status", k: "int", v: MIN },
    { e: "s", f: "status", k: "str", v: "paid", from: T + 20, to: T + 30 },
    { e: "s", f: "status", k: "str", v: "shipped", from: T + 30 },
  ],
  controls: [
    { label: "1e18+4", op: "state_at", params: { entity: S("e"), attribute: S("status") }, cut: cut(10), expect: [[integer("1000000000000000004")]], why: "one int fact" },
    { label: "int64 max", op: "state_at", params: { entity: S("max"), attribute: S("status") }, cut: cut(10), expect: [[integer(MAX)]], why: "2^63-1 stored and read as text" },
    { label: "int64 min", op: "state_at", params: { entity: S("min"), attribute: S("status") }, cut: cut(10), expect: [[integer(MIN)]], why: "-2^63" },
    { label: "status at 29", op: "state_at", params: { entity: S("s"), attribute: S("status") }, cut: cut(29), expect: [["paid"]], why: "paid [20,30)" },
    { label: "status at 30", op: "state_at", params: { entity: S("s"), attribute: S("status") }, cut: cut(30), expect: [["shipped"]], why: "paid ends at 30 exclusive; shipped [30,)" },
    { label: "status at 19", op: "state_at", params: { entity: S("s"), attribute: S("status") }, cut: cut(19), expect: [], why: "nothing before 20" },
  ],
});
// 03 price_at_purchase: price intervals [0,50)=100, [50,70)=120, [70,)=1e18+4; purchases at 49, 50, 75; b3 is another product.
fixtures.push({
  name: "price-at-purchase", id: "03",
  facts: [
    { e: "prod", f: "price", k: "int", v: 100, from: T + 0, to: T + 50 },
    { e: "prod", f: "price", k: "int", v: 120, from: T + 50, to: T + 70 },
    { e: "prod", f: "price", k: "int", v: "1000000000000000004", from: T + 70 },
    { e: "b1", f: "product", k: "str", v: "prod" }, { e: "b1", f: "purchased_at", k: "int", v: 49 },
    { e: "b2", f: "product", k: "str", v: "prod" }, { e: "b2", f: "purchased_at", k: "int", v: 50 },
    { e: "b4", f: "product", k: "str", v: "prod" }, { e: "b4", f: "purchased_at", k: "int", v: 75 },
    { e: "b3", f: "product", k: "str", v: "other" }, { e: "b3", f: "purchased_at", k: "int", v: 10 },
  ],
  controls: [
    { label: "three purchases", op: "price_at_purchase", params: { product: S("prod"), purchase_ids: [S("b1"), S("b2"), S("b3"), S("b4")] }, cut: cut(100), expect: [["b1", integer("100")], ["b2", integer("120")], ["b4", integer("1000000000000000004")]], why: "49 in [0,50); 50 in [50,70); 75 in [70,); b3 is not this product" },
    { label: "only b1", op: "price_at_purchase", params: { product: S("prod"), purchase_ids: [S("b1")] }, cut: cut(100), expect: [["b1", integer("100")]], why: "requested ids filter" },
  ],
});
// 04 coverage_at_claim / relation_exists. Claim entity id is ["claim", c]; coverage id ["coverage", k].
{
  const claim = (c: string) => JSON.stringify(["claim", c]),
    cov = (k: string) => JSON.stringify(["coverage", k]);
  fixtures.push({
    name: "coverage", id: "04",
    facts: [
      { e: claim("c1"), f: "coverage_customer", k: "str", v: cov("k1") }, { e: claim("c1"), f: "claim_at", k: "int", v: 29 },
      { e: claim("c2"), f: "coverage_customer", k: "str", v: cov("k1") }, { e: claim("c2"), f: "claim_at", k: "int", v: 30 },
      { e: claim("c3"), f: "coverage_customer", k: "str", v: cov("k2") }, { e: claim("c3"), f: "claim_at", k: "int", v: 29 },
      { e: cov("k1"), f: "covers/P", k: "bool", v: true, from: T + 10, to: T + 30 },
      { e: cov("k2"), f: "covers/P", k: "bool", v: false, from: T + 0 },
    ],
    controls: [
      { label: "c1 at 29", op: "coverage_at_claim", params: { claim: S("c1"), policy: S("P") }, cut: cut(100), expect: [[true]], why: "k1 covers P on [10,30)" },
      { label: "c2 at 30", op: "coverage_at_claim", params: { claim: S("c2"), policy: S("P") }, cut: cut(100), expect: [[false]], why: "30 is the exclusive end" },
      { label: "c3 false flag", op: "coverage_at_claim", params: { claim: S("c3"), policy: S("P") }, cut: cut(100), expect: [[false]], why: "k2's covers/P is false" },
      { label: "c1 other policy", op: "coverage_at_claim", params: { claim: S("c1"), policy: S("Q") }, cut: cut(100), expect: [[false]], why: "no covers/Q" },
      { label: "no claim", op: "coverage_at_claim", params: { claim: S("none"), policy: S("P") }, cut: cut(100), expect: [[false]], why: "no driver row" },
      { label: "relation at 20", op: "relation_exists", params: { entity: S("P"), attribute: S("covers"), target: S("k1") }, cut: cut(20), expect: [[true]], why: "inside [10,30)" },
      { label: "relation at 30", op: "relation_exists", params: { entity: S("P"), attribute: S("covers"), target: S("k1") }, cut: cut(30), expect: [[false]], why: "exclusive end" },
    ],
  });
}
// 06 account_balance near 1e18 (exact) and past int64 (typed).
{
  const cases: Record<string, bigint[]> = {
    "1e18+4": [1000000000000000000n, 4n],
    "three-near-1e18": [999999999999999999n, 999999999999999999n, -999999999999999994n],
    "2^53+1 twice": [9007199254740993n, 9007199254740993n],
    "negative near -1e18": [-1000000000000000000n, -4n],
    "max plus one": [MAX, 1n],
    "min minus one": [MIN, -1n],
  };
  const facts: F[] = [], controls: Control[] = [];
  for (const [name, amounts] of Object.entries(cases)) {
    amounts.forEach((amount, i) =>
      facts.push({ e: `${name}#${i}`, f: "account", k: "str", v: name }, { e: `${name}#${i}`, f: "currency", k: "str", v: "USD" }, { e: `${name}#${i}`, f: "amount", k: "int", v: amount }),
    );
    const total = amounts.reduce((s, v) => s + v, 0n);
    controls.push({ label: name, op: "account_balance", params: { account: S(name), currency: S("USD") }, cut: cut(100), expect: total >= MIN && total <= MAX ? [[integer(total)]] : { error: "NativeIntegerOverflowError" }, why: `exact sum ${total}` });
  }
  fixtures.push({ name: "balance-int64", id: "06", facts, controls });
}
// 07 inventory_balance: physical, reserved, available = physical - reserved (host-side checked).
fixtures.push({
  name: "inventory", id: "07",
  facts: [
    ...([["S", "physical", 10], ["S", "reservation", 4], ["S", "reservation", -1], ["T", "physical", 99]] as const).flatMap(([sku, ledger, d], i) => [
      { e: `i${i}`, f: "sku", k: "str" as Kind, v: sku }, { e: `i${i}`, f: "ledger", k: "str" as Kind, v: ledger }, { e: `i${i}`, f: "delta", k: "int" as Kind, v: d },
    ]),
    ...([["near", "physical", 999999999999999999n], ["near", "physical", 5n], ["fit", "physical", 2n ** 62n], ["fit", "physical", 2n ** 62n - 1n], ["fit", "reservation", -1n], ["over", "physical", 2n ** 62n], ["over", "physical", 2n ** 62n]] as const).flatMap(([sku, ledger, d], i) => [
      { e: `j${i}`, f: "sku", k: "str" as Kind, v: sku }, { e: `j${i}`, f: "ledger", k: "str" as Kind, v: ledger }, { e: `j${i}`, f: "delta", k: "int" as Kind, v: d },
    ]),
  ],
  controls: [
    { label: "S", op: "inventory_balance", params: { sku: S("S") }, cut: cut(100), expect: [[integer("10"), integer("3"), integer("7")]], why: "10; 4-1=3; 10-3" },
    { label: "T", op: "inventory_balance", params: { sku: S("T") }, cut: cut(100), expect: [[integer("99"), integer("0"), integer("99")]], why: "no reservation ledger" },
    { label: "unknown sku", op: "inventory_balance", params: { sku: S("none") }, cut: cut(100), expect: [[integer("0"), integer("0"), integer("0")]], why: "no rows" },
    { label: "near 1e18", op: "inventory_balance", params: { sku: S("near") }, cut: cut(100), expect: [[integer("1000000000000000004"), integer("0"), integer("1000000000000000004")]], why: "999999999999999999 + 5" },
    { label: "available past max", op: "inventory_balance", params: { sku: S("fit") }, cut: cut(100), expect: { error: "NativeIntegerOverflowError" }, why: "physical 2^63-1 fits; reserved -1; available 2^63 does not" },
    { label: "physical past max", op: "inventory_balance", params: { sku: S("over") }, cut: cut(100), expect: { error: "NativeIntegerOverflowError" }, why: "physical 2^63" },
  ],
});
// 08 net revenue near 1e18.
fixtures.push({
  name: "net-revenue-1e18", id: "08",
  facts: [
    { e: "cap", f: "customer", k: "str", v: "c" }, { e: "cap", f: "currency", k: "str", v: "USD" }, { e: "cap", f: "amount", k: "int", v: "1000000000000000004" },
    { e: "ref1", f: "capture", k: "str", v: "cap" }, { e: "ref1", f: "currency", k: "str", v: "USD" }, { e: "ref1", f: "amount", k: "int", v: 3 },
  ],
  controls: [
    { label: "1e18+4 minus 3", op: "customer_net_revenue", params: { customer: S("c"), currency: S("USD") }, cut: cut(100), expect: [[integer("1000000000000000001")]], why: "capture 1e18+4, refund 3" },
  ],
});
// 10 workflow_status. Start: subject=W, deadline, source=feed. Completion: subject=W, source=feed, completed_at.
// Watermark: subject=feed, through.
fixtures.push({
  name: "workflow", id: "10",
  facts: [
    { e: "s1", f: "subject", k: "str", v: "W1" }, { e: "s1", f: "deadline", k: "int", v: 20 }, { e: "s1", f: "source", k: "str", v: "F" },
    { e: "wF", f: "subject", k: "str", v: "F" }, { e: "wF", f: "through", k: "int", v: 15 },
    { e: "s2", f: "subject", k: "str", v: "W2" }, { e: "s2", f: "deadline", k: "int", v: 20 }, { e: "s2", f: "source", k: "str", v: "G" },
    { e: "c2", f: "subject", k: "str", v: "W2" }, { e: "c2", f: "source", k: "str", v: "G" }, { e: "c2", f: "completed_at", k: "int", v: 18 },
    { e: "s3", f: "subject", k: "str", v: "W3" }, { e: "s3", f: "deadline", k: "int", v: 20 }, { e: "s3", f: "source", k: "str", v: "F" },
    { e: "c3", f: "subject", k: "str", v: "W3" }, { e: "c3", f: "source", k: "str", v: "F" }, { e: "c3", f: "completed_at", k: "int", v: 25 },
    { e: "s4", f: "subject", k: "str", v: "W4" }, { e: "s4", f: "deadline", k: "int", v: 20 }, { e: "s4", f: "source", k: "str", v: "H" },
    { e: "wH", f: "subject", k: "str", v: "H" }, { e: "wH", f: "through", k: "int", v: 20 },
  ],
  controls: [
    { label: "W1 pending", op: "workflow_status", params: { workflow: S("W1") }, cut: cut(25), expect: [["pending_knowledge"]], why: "no completion; 25 >= 20; F watermark 15 < 20" },
    { label: "W1 in progress", op: "workflow_status", params: { workflow: S("W1") }, cut: cut(10), expect: [["in_progress"]], why: "10 < deadline 20" },
    { label: "W2 completed", op: "workflow_status", params: { workflow: S("W2") }, cut: cut(25), expect: [["completed"]], why: "completed 18 <= 20" },
    { label: "W3 late", op: "workflow_status", params: { workflow: S("W3") }, cut: cut(25), expect: [["completed_late"]], why: "completed 25 > 20" },
    { label: "W4 overdue", op: "workflow_status", params: { workflow: S("W4") }, cut: cut(25), expect: [["overdue"]], why: "H watermark 20 >= 20" },
    { label: "W4 at deadline", op: "workflow_status", params: { workflow: S("W4") }, cut: cut(20), expect: [["overdue"]], why: "20 is not < 20; watermark 20" },
    { label: "unknown", op: "workflow_status", params: { workflow: S("W9") }, cut: cut(25), expect: [], why: "no start" },
  ],
});
// 11 inherited_access over explicit _member/_resource ref edges and a kind=grant (subject, target).
fixtures.push({
  name: "inherited", id: "11",
  facts: [
    { e: "u", f: "_member", k: "ref", v: "t1" }, { e: "t1", f: "_member", k: "ref", v: "t2" },
    { e: "doc", f: "_resource", k: "ref", v: "folder" }, { e: "folder", f: "_resource", k: "ref", v: "root" },
    { e: "g1", f: "kind", k: "str", v: "grant" }, { e: "g1", f: "subject", k: "str", v: "t2" }, { e: "g1", f: "target", k: "str", v: "root" },
    { e: "g2", f: "kind", k: "str", v: "deny" }, { e: "g2", f: "subject", k: "str", v: "t1" }, { e: "g2", f: "target", k: "str", v: "folder" },
  ],
  controls: [
    { label: "u doc", op: "inherited_access", params: { user: S("u"), resource: S("doc") }, cut: cut(10), expect: [[true]], why: "u->t1->t2 (grant subject), doc->folder->root (grant target)" },
    { label: "u folder", op: "inherited_access", params: { user: S("u"), resource: S("folder") }, cut: cut(10), expect: [[true]], why: "folder->root" },
    { label: "u root", op: "inherited_access", params: { user: S("u"), resource: S("root") }, cut: cut(10), expect: [[false]], why: "root has no _resource edge, closure is one or more hops" },
    { label: "t1 doc via deny kind", op: "inherited_access", params: { user: S("t1"), resource: S("doc") }, cut: cut(10), expect: [[true]], why: "t1->t2 grant on root; g2 is kind deny and ignored" },
    { label: "t2 doc", op: "inherited_access", params: { user: S("t2"), resource: S("doc") }, cut: cut(10), expect: [[false]], why: "t2 has no _member edge" },
  ],
});
// 12 access_with_deny: the author's R12 control fixture, re-derived here. An allow is a kind=support event
// (subject, target, principal); a block (subject, target) or a revoke (principal, target) removes it.
{
  const facts: F[] = [];
  const ev = (e: string, kind: string, subject: string, target: string, principal?: string) => {
    facts.push({ e, f: "kind", k: "str", v: kind }, { e, f: "subject", k: "str", v: subject }, { e, f: "target", k: "str", v: target });
    if (principal) facts.push({ e, f: "principal", k: "str", v: principal });
  };
  ev("a1", "support", "u1", "r1", "p1");
  ev("a2", "support", "u2", "r2", "p2"), ev("b2", "block", "u2", "r2");
  ev("a3", "support", "u3", "r3", "p3"), ev("c3", "revoke", "p3", "r3");
  ev("a6", "support", "u6", "r6", "p6"), ev("a6b", "support", "u6", "r6", "p6b"), ev("c6", "revoke", "p6", "r6");
  ev("a7", "support", "u7", "r7");
  facts.push({ e: "bnull", f: "kind", k: "str", v: "block" }, { e: "bnull", f: "subject", k: "bool", v: true }, { e: "bnull", f: "target", k: "str", v: "r1" });
  fixtures.push({
    name: "deny", id: "12", facts,
    controls: [
      { label: "u1 r1 (NULL-subject block)", op: "access_with_deny", params: { user: S("u1"), resource: S("r1") }, cut: cut(10), expect: [[true]], why: "a1 allows; bnull's boolean subject matches no user" },
      { label: "u2 r2 blocked", op: "access_with_deny", params: { user: S("u2"), resource: S("r2") }, cut: cut(10), expect: [[false]], why: "b2 blocks (u2, r2)" },
      { label: "u3 r3 revoked", op: "access_with_deny", params: { user: S("u3"), resource: S("r3") }, cut: cut(10), expect: [[false]], why: "c3 revokes p3 on r3" },
      { label: "u6 r6 one of two revoked", op: "access_with_deny", params: { user: S("u6"), resource: S("r6") }, cut: cut(10), expect: [[true]], why: "a6 (p6) revoked, a6b (p6b) is not" },
      { label: "u7 no principal", op: "access_with_deny", params: { user: S("u7"), resource: S("r7") }, cut: cut(10), expect: [[false]], why: "a7 has no principal fact" },
    ],
  });
}
// 13 container_items: leaves reached through _contains (diamond, a deeper leaf).
fixtures.push({
  name: "containers", id: "13",
  facts: [["p", "q"], ["p", "r"], ["q", "x"], ["r", "x"], ["r", "y"], ["y", "z"]].map(([a, b]) => ({ e: a!, f: "_contains", k: "ref" as Kind, v: b })),
  controls: [
    { label: "from p", op: "container_items", params: { container: S("p") }, cut: cut(10), expect: [["x"], ["z"]], why: "descendants q r x y z; q r y contain something" },
    { label: "from y", op: "container_items", params: { container: S("y") }, cut: cut(10), expect: [["z"]], why: "y->z" },
    { label: "from x", op: "container_items", params: { container: S("x") }, cut: cut(10), expect: [], why: "x contains nothing" },
  ],
});
// 14 recalled_customers.
fixtures.push({
  name: "recall", id: "14",
  facts: [
    { e: "A", f: "_production", k: "ref", v: "B" }, { e: "B", f: "_production", k: "ref", v: "C" }, { e: "B", f: "_production", k: "ref", v: "D" },
    { e: "s1", f: "shipped_lot", k: "str", v: "C" }, { e: "s1", f: "customer", k: "str", v: "K1" },
    { e: "s2", f: "shipped_lot", k: "str", v: "D" }, { e: "s2", f: "customer", k: "str", v: "K2" },
    { e: "s3", f: "shipped_lot", k: "str", v: "A" }, { e: "s3", f: "customer", k: "str", v: "K3" },
    { e: "s4", f: "shipped_lot", k: "str", v: "Z" }, { e: "s4", f: "customer", k: "str", v: "K4" },
    { e: "m", f: "contaminated_lot", k: "str", v: "A" },
  ],
  controls: [
    { label: "A", op: "recalled_customers", params: { contaminated_lot: S("A") }, cut: cut(10), expect: [["K1"], ["K2"]], why: "A->B->{C,D}; shipments of C and D; A itself is not downstream" },
    { label: "B not contaminated", op: "recalled_customers", params: { contaminated_lot: S("B") }, cut: cut(10), expect: [], why: "no contaminated_lot fact for B" },
  ],
});
// 15 vulnerable_deployments / dependency_closure with a cycle.
fixtures.push({
  name: "deps", id: "15",
  facts: [
    { e: "d1", f: "environment", k: "str", v: "prod" }, { e: "d1", f: "application", k: "str", v: "X" },
    { e: "d2", f: "environment", k: "str", v: "prod" }, { e: "d2", f: "application", k: "str", v: "Q" },
    { e: "d3", f: "environment", k: "str", v: "dev" }, { e: "d3", f: "application", k: "str", v: "X" },
    { e: "X", f: "_dependency", k: "ref", v: "Y" }, { e: "Y", f: "_dependency", k: "ref", v: "Z" }, { e: "Z", f: "_dependency", k: "ref", v: "Y" },
    { e: "Q", f: "_dependency", k: "ref", v: "R" },
    { e: "v1", f: "vulnerable_subject", k: "str", v: "Z" }, { e: "v1", f: "vulnerable", k: "bool", v: true },
    { e: "v2", f: "vulnerable_subject", k: "str", v: "R" }, { e: "v2", f: "vulnerable", k: "bool", v: false },
    { e: "v3", f: "vulnerable_subject", k: "str", v: "X" }, { e: "v3", f: "vulnerable", k: "bool", v: true },
  ],
  controls: [
    { label: "prod", op: "vulnerable_deployments", params: { environment: S("prod") }, cut: cut(10), expect: [["X"]], why: "X reaches Z (vulnerable); Q reaches R (vulnerable=false); X itself is not in its own closure" },
    { label: "dev", op: "vulnerable_deployments", params: { environment: S("dev") }, cut: cut(10), expect: [["X"]], why: "same X" },
    { label: "closure X", op: "dependency_closure", params: { application: S("X") }, cut: cut(10), expect: [["Y"], ["Z"]], why: "X->Y->Z->Y" },
    { label: "closure Q", op: "dependency_closure", params: { application: S("Q") }, cut: cut(10), expect: [["R"]], why: "Q->R" },
  ],
});
// 16 output_lineage: input_a/input_b plus metadata entity sharing the run's subject; a 1e18+4 version.
fixtures.push({
  name: "lineage", id: "16",
  facts: [
    { e: "r", f: "output", k: "str", v: "D" }, { e: "r", f: "input_a", k: "str", v: "A" }, { e: "r", f: "input_b", k: "str", v: "B" }, { e: "r", f: "code_version", k: "int", v: 7 }, { e: "r", f: "subject", k: "str", v: "S1" },
    { e: "m", f: "subject", k: "str", v: "S1" }, { e: "m", f: "input", k: "str", v: "C" },
    { e: "r2", f: "output", k: "str", v: "E" }, { e: "r2", f: "input_a", k: "str", v: "A2" }, { e: "r2", f: "code_version", k: "int", v: "1000000000000000004" },
  ],
  controls: [
    { label: "D", op: "output_lineage", params: { output: S("D") }, cut: cut(10), expect: [["A", integer("7")], ["B", integer("7")], ["C", integer("7")]], why: "A,B direct; C via metadata subject S1" },
    { label: "E big version", op: "output_lineage", params: { output: S("E") }, cut: cut(10), expect: [["A2", integer("1000000000000000004")]], why: "exact int64 version" },
    { label: "missing", op: "output_lineage", params: { output: S("none") }, cut: cut(10), expect: [], why: "no run" },
  ],
});
// 20 supports (bounded DAG witnesses) and closure.
fixtures.push({
  name: "supports", id: "20",
  facts: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["A", "D"], ["B", "C"]].map(([a, b]) => ({ e: a!, f: "_support", k: "ref" as Kind, v: b })),
  controls: [
    { label: "A to D", op: "reachability_supports", params: { from: S("A"), to: S("D") }, cut: cut(10), expect: [[true, integer("4")]], why: "A-D; A-B-D, A-C-D; A-B-C-D" },
    { label: "B to D", op: "reachability_supports", params: { from: S("B"), to: S("D") }, cut: cut(10), expect: [[true, integer("2")]], why: "B-D; B-C-D" },
    { label: "D to A", op: "reachability_supports", params: { from: S("D"), to: S("A") }, cut: cut(10), expect: [[false, integer("0")]], why: "no edge out of D" },
    { label: "closure A", op: "reachability_closure", params: { from: S("A") }, cut: cut(10), expect: [["B"], ["C"], ["D"]], why: "all" },
  ],
});

// ------------------------------------------------------------------ B. recursion depth (needs depth 9 -> typed refusal in XTQL)
{
  const chain = (prefix: string, n: number, field: string): F[] =>
    Array.from({ length: n }, (_, i) => ({ e: `${prefix}${i}`, f: field, k: "ref" as Kind, v: `${prefix}${i + 1}` }));
  const nodes = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => [`${prefix}${from + i}`]);
  const depthError = { error: "NativeRecursionDepthError" };
  fixtures.push({
    name: "depth-20", id: "20",
    facts: [...chain("c", 9, "_support"), ...chain("d", 8, "_support"), ...chain("e", 9, "_support"), { e: "e9", f: "_support", k: "ref", v: "e0" }],
    controls: [
      { label: "chain needs depth 9 (xtql)", op: "reachability_closure", params: { from: S("c0") }, cut: cut(10), expect: depthError, why: "c0..c9: c9 is 9 hops; D <= 8", only: "xtql" },
      { label: "chain needs depth 9 (sql)", op: "reachability_closure", params: { from: S("c0") }, cut: cut(10), expect: nodes("c", 1, 9), why: "SQL rounds up to 100", only: "xtdb-sql" },
      { label: "chain depth 8", op: "reachability_closure", params: { from: S("d0") }, cut: cut(10), expect: nodes("d", 1, 8), why: "d8 is 8 hops: inside the budget" },
      { label: "chain from c1 depth 8", op: "reachability_closure", params: { from: S("c1") }, cut: cut(10), expect: nodes("c", 2, 9), why: "c9 is 8 hops from c1" },
      { label: "10-cycle (xtql)", op: "reachability_closure", params: { from: S("e0") }, cut: cut(10), expect: depthError, why: "e0 is 10 hops from itself", only: "xtql" },
      { label: "10-cycle (sql)", op: "reachability_closure", params: { from: S("e0") }, cut: cut(10), expect: nodes("e", 0, 9), why: "e0..e9", only: "xtdb-sql" },
    ],
  });
  fixtures.push({
    name: "depth-13", id: "13",
    facts: chain("k", 9, "_contains"),
    controls: [
      { label: "leaf 9 deep (xtql)", op: "container_items", params: { container: S("k0") }, cut: cut(10), expect: depthError, why: "k9 is 9 hops", only: "xtql" },
      { label: "leaf 9 deep (sql)", op: "container_items", params: { container: S("k0") }, cut: cut(10), expect: [["k9"]], why: "only k9 is a leaf", only: "xtdb-sql" },
      { label: "leaf 8 deep", op: "container_items", params: { container: S("k1") }, cut: cut(10), expect: [["k9"]], why: "k9 is 8 hops from k1" },
    ],
  });
  fixtures.push({
    name: "depth-15", id: "15",
    facts: [
      ...chain("q", 9, "_dependency"),
      { e: "dd", f: "environment", k: "str", v: "deep" }, { e: "dd", f: "application", k: "str", v: "q0" },
      { e: "vv", f: "vulnerable_subject", k: "str", v: "q9" }, { e: "vv", f: "vulnerable", k: "bool", v: true },
    ],
    controls: [
      { label: "vulnerable 9 deep (xtql)", op: "vulnerable_deployments", params: { environment: S("deep") }, cut: cut(10), expect: depthError, why: "q9 is 9 hops from q0", only: "xtql" },
      { label: "vulnerable 9 deep (sql)", op: "vulnerable_deployments", params: { environment: S("deep") }, cut: cut(10), expect: [["q0"]], why: "q0 reaches q9", only: "xtdb-sql" },
      { label: "dependency closure 9 deep (xtql)", op: "dependency_closure", params: { application: S("q0") }, cut: cut(10), expect: depthError, why: "9 hops", only: "xtql" },
    ],
  });
  fixtures.push({
    name: "depth-11", id: "11",
    facts: [
      ...chain("m", 9, "_member"), { e: "res", f: "_resource", k: "ref", v: "top" },
      { e: "g", f: "kind", k: "str", v: "grant" }, { e: "g", f: "subject", k: "str", v: "m9" }, { e: "g", f: "target", k: "str", v: "top" },
    ],
    controls: [
      { label: "member 9 deep (xtql)", op: "inherited_access", params: { user: S("m0"), resource: S("res") }, cut: cut(10), expect: depthError, why: "m9 is 9 hops", only: "xtql" },
      { label: "member 9 deep (sql)", op: "inherited_access", params: { user: S("m0"), resource: S("res") }, cut: cut(10), expect: [[true]], why: "m0 reaches m9; res reaches top", only: "xtdb-sql" },
      { label: "member 8 deep", op: "inherited_access", params: { user: S("m1"), resource: S("res") }, cut: cut(10), expect: [[true]], why: "m9 is 8 hops from m1" },
    ],
  });
  fixtures.push({
    name: "depth-14", id: "14",
    facts: [...chain("l", 9, "_production"), { e: "sh", f: "shipped_lot", k: "str", v: "l9" }, { e: "sh", f: "customer", k: "str", v: "KK" }, { e: "mm", f: "contaminated_lot", k: "str", v: "l0" }],
    controls: [
      { label: "recall 9 deep (xtql)", op: "recalled_customers", params: { contaminated_lot: S("l0") }, cut: cut(10), expect: depthError, why: "l9 is 9 hops", only: "xtql" },
      { label: "recall 9 deep (sql)", op: "recalled_customers", params: { contaminated_lot: S("l0") }, cut: cut(10), expect: [["KK"]], why: "l0 reaches l9", only: "xtdb-sql" },
    ],
  });
}

// ------------------------------------------------------------------ C. #6345: 5,050 edges (under the 100k guard), 125,000 length-3 walks
{
  const W = 50;
  const facts: F[] = [];
  for (let i = 0; i < W; i++) facts.push({ e: "src", f: "_support", k: "ref", v: `a${i}` });
  for (let i = 0; i < W; i++) for (let j = 0; j < W; j++) facts.push({ e: `a${i}`, f: "_support", k: "ref", v: `b${j}` });
  for (let i = 0; i < W; i++) for (let j = 0; j < W; j++) facts.push({ e: `b${i}`, f: "_support", k: "ref", v: `c${j}` });
  const all = [...Array.from({ length: W }, (_, i) => [`a${i}`]), ...Array.from({ length: W }, (_, i) => [`b${i}`]), ...Array.from({ length: W }, (_, i) => [`c${i}`])];
  fixtures.push({
    name: "dense-6345", id: "20", facts,
    controls: [
      { label: "closure over 125k walks", op: "reachability_closure", params: { from: S("src") }, cut: cut(10, "100"), expect: all, why: "src->50 a, a x b complete, b x c complete: 150 nodes; 5,050 edges; 50^3 = 125,000 walks of length 3 from src" },
    ],
  });
}

// ------------------------------------------------------------------ execute A, B, C
const report: Row = { format: "tx2-vx02-live/1", runId, endpoint: backend.url, startedAt: new Date().toISOString(), controls: [], writerBetween: [], hazards: {}, basis: null };
const opened: { close: () => Promise<void> }[] = [];
const providers = new Map<Fixture, { provider: any; position: number; scope: DatabaseScope }>();
const only = process.env["VX02_ONLY"]?.split(",");
for (const [index, fixture] of fixtures.entries()) {
  if (only && !only.includes(fixture.name)) continue;
  const scope = DatabaseScope.test(`${runId}-${fixture.name}-${index}`);
  let receipt: { position: number };
  try {
    receipt = await write(scope, fixture.id, fixture.facts, 1001);
  } catch (error) {
    report.setupErrors = [...(report.setupErrors ?? []), { fixture: fixture.name, error: String(error).slice(0, 400) }];
    console.log("SETUP-ERROR", fixture.name, String(error).slice(0, 200));
    continue;
  }
  const native = backend.openNative(scope);
  opened.push(native);
  providers.set(fixture, { provider: native.provider, position: receipt.position, scope });
}
const verdict = (control: Control, result: Awaited<ReturnType<typeof run>>, language: Language, position: number) => {
  const pure = result.languages.length > 0 && result.languages.every((l) => l === language);
  const onePosition = result.positions.length <= 1 && (result.positions.length === 0 || result.positions[0] === position);
  if ("error" in control.expect) return result.error !== null && result.error.includes(control.expect.error) && result.languages.every((l) => l === language) && onePosition;
  return pure && onePosition && JSON.stringify(result.rows) === JSON.stringify(canonical(control.expect as unknown[][]));
};
for (const fixture of fixtures) {
  const held = providers.get(fixture);
  if (!held) continue;
  for (const control of fixture.controls) {
    const rows: Record<string, unknown> = {};
    for (const language of languages) {
      if (control.only && control.only !== language) continue;
      const entry = { id: control.label, operation: control.op, cut: control.cut, parameters: control.params };
      const result = await run(held.provider, language, fixture.id, entry, held.position);
      const pass = verdict(control, result, language, held.position);
      rows[language] = result.rows;
      report.controls.push({ fixture: fixture.name, workload: fixture.id, operation: control.op, label: control.label, language, pinnedPosition: held.position, pass, expect: "error" in control.expect ? control.expect : canonical(control.expect as unknown[][]), why: control.why, ...result });
      report.basis ??= result.reportedBasis;
      console.log(pass ? "PASS" : "FAIL", language.padEnd(8), `${fixture.id}/${control.op}`.padEnd(28), control.label, pass ? "" : JSON.stringify({ rows: result.rows, error: result.error }).slice(0, 400));
    }
  }
}

// ------------------------------------------------------------------ D. writer between calls (multi-call tasks), both languages
const writerCases: { id: string; name: string; base: F[]; later: F[]; entry: Row; before: unknown[][]; after: unknown[][]; afterCall: number }[] = [
  {
    id: "10", name: "workflow completion appears between calls",
    base: [{ e: "s", f: "subject", k: "str", v: "W" }, { e: "s", f: "deadline", k: "int", v: 20 }, { e: "s", f: "source", k: "str", v: "F" }, { e: "w", f: "subject", k: "str", v: "F" }, { e: "w", f: "through", k: "int", v: 15 }],
    later: [{ e: "c", f: "subject", k: "str", v: "W" }, { e: "c", f: "source", k: "str", v: "F" }, { e: "c", f: "completed_at", k: "int", v: 18 }],
    entry: { id: "wb10", operation: "workflow_status", cut: { known_at: "2", valid_at: "25" }, parameters: { workflow: S("W") } },
    before: [["pending_knowledge"]], after: [["completed"]], afterCall: 0,
  },
  {
    id: "16", name: "lineage input_b appears between calls",
    base: [{ e: "r", f: "output", k: "str", v: "D" }, { e: "r", f: "input_a", k: "str", v: "A" }, { e: "r", f: "code_version", k: "int", v: 7 }],
    later: [{ e: "r", f: "input_b", k: "str", v: "B" }],
    entry: { id: "wb16", operation: "output_lineage", cut: { known_at: "2", valid_at: "25" }, parameters: { output: S("D") } },
    before: [["A", integer("7")]], after: [["A", integer("7")], ["B", integer("7")]], afterCall: 0,
  },
  {
    id: "20", name: "length-2 witness appears between calls",
    base: [{ e: "A", f: "_support", k: "ref", v: "D" }, { e: "A", f: "_support", k: "ref", v: "B" }],
    later: [{ e: "B", f: "_support", k: "ref", v: "D" }],
    entry: { id: "wb20", operation: "reachability_supports", cut: { known_at: "2", valid_at: "0" }, parameters: { from: S("A"), to: S("D") } },
    before: [[true, integer("1")]], after: [[true, integer("2")]], afterCall: 0,
  },
  {
    id: "03", name: "overlapping price appears between calls",
    base: [{ e: "prod", f: "price", k: "int", v: 100, from: T + 0 }, { e: "b1", f: "product", k: "str", v: "prod" }, { e: "b1", f: "purchased_at", k: "int", v: 49 }],
    later: [{ e: "prod", f: "price", k: "int", v: 999, from: T + 40 }],
    entry: { id: "wb03", operation: "price_at_purchase", cut: { known_at: "2", valid_at: "60" }, parameters: { product: S("prod"), purchase_ids: [S("b1")] } },
    before: [["b1", integer("100")]], after: [["b1", integer("100")], ["b1", integer("999")]], afterCall: 0,
  },
  {
    id: "20", name: "closure edge appears between XTQL substeps",
    base: [{ e: "n0", f: "_support", k: "ref", v: "n1" }, { e: "n1", f: "_support", k: "ref", v: "n2" }],
    later: [{ e: "n2", f: "_support", k: "ref", v: "n3" }],
    entry: { id: "wb20c", operation: "reachability_closure", cut: { known_at: "2", valid_at: "0" }, parameters: { from: S("n0") } },
    before: [["n1"], ["n2"]], after: [["n1"], ["n2"], ["n3"]], afterCall: 0,
  },
];
if (!only || only.includes("writer"))
  for (const item of writerCases)
    for (const language of languages) {
      const scope = DatabaseScope.test(`${runId}-writer-${item.id}-${item.entry.id}-${language}`);
      await write(scope, item.id, item.base, 1001);
      const native = backend.openNative(scope);
      let writerPosition: number | undefined;
      const pinned = await run(native.provider, language, item.id, item.entry, undefined, {
        after: item.afterCall,
        run: async () => {
          writerPosition = (await write(scope, item.id, item.later, 1002)).position;
        },
      });
      const fresh = await run(native.provider, language, item.id, item.entry);
      await native.close();
      const multiCall = pinned.calls > 1;
      const pass =
        JSON.stringify(pinned.rows) === JSON.stringify(canonical(item.before)) &&
        JSON.stringify(fresh.rows) === JSON.stringify(canonical(item.after)) &&
        pinned.positions.length === 1 && writerPosition !== undefined && writerPosition > (pinned.positions[0] as number) &&
        pinned.languages.length === 1 && pinned.languages[0] === language;
      report.writerBetween.push({ workload: item.id, name: item.name, language, pass, multiCall, writerPosition, pinned, fresh });
      console.log(pass ? "PASS" : "FAIL", language.padEnd(8), "writer between calls", item.name, `calls=${pinned.calls}`, JSON.stringify({ pinned: pinned.rows, positions: pinned.positions, writerPosition, fresh: fresh.rows }));
    }

// ------------------------------------------------------------------ B2. depth budget at a lowered maxDepth (same settle code)
// At D = 8 one XTQL statement is ~56 KB and did not finish within 300 s on the loaded resident, so the refusal
// path is also exercised through evaluateXtqlReachability's own maxDepth parameter on a chain c0 -> ... -> c9.
if (!only || only.includes("budget")) {
  const reach = await import(path.join(root, "packages/qualification/dist/native/xtdb-xtql-reach.js"));
  const scope = DatabaseScope.test(`${runId}-budget`);
  const receipt = await write(scope, "20", Array.from({ length: 9 }, (_, i) => ({ e: `c${i}`, f: "_support", k: "ref" as Kind, v: `c${i + 1}` })), 1001);
  const native = backend.openNative(scope);
  opened.push(native);
  const call = (name: string, values: Row, resultType: unknown, build: (ctx: any, input: Row) => string) =>
    native.provider
      .select(
        { name: `workload/20/${name}`, parameters: TypeExpr.struct(Object.fromEntries(Object.keys(values).map((k) => [k, TypeExpr.required(TypeExpr.text)]))), row: resultType },
        values,
        (ctx: any, input: Row) => build(ctx, input),
        { basis: { recordedAt: 1001, validAt: T + 10, recordedPosition: receipt.position }, maxRows: 1000, timeoutMs: CALL_TIMEOUT_MS },
      )
      .pipe(Effect.map((result: Row) => result["rows"]));
  const chainNodes = (from: number) => Array.from({ length: 9 - from }, (_, i) => [`c${from + 1 + i}`]);
  const budget: [string, number, unknown[][] | { error: string }, string][] = [
    ["c7", 2, chainNodes(7), "c9 is 2 hops: complete at D=2"],
    ["c6", 2, { error: "NativeRecursionDepthError" }, "c9 is 3 hops: not complete within D=2"],
    ["c5", 4, chainNodes(5), "c9 is 4 hops: complete at D=4"],
    ["c4", 4, { error: "NativeRecursionDepthError" }, "c9 is 5 hops: not complete within D=4"],
  ];
  report.depthBudget = [];
  for (const [from, maxDepth, expect, why] of budget) {
    const started = performance.now();
    const exit = await Effect.runPromiseExit(
      reach.evaluateXtqlReachability({ id: "20", operation: "reachability_closure", p: { from: { value: from } }, a: (field: string) => att("20", field), call, maxDepth }) as Effect.Effect<unknown[][], unknown>,
    );
    const rows = Exit.isSuccess(exit) ? canonical(exit.value) : null;
    const error = Exit.isSuccess(exit) ? null : causeText(exit.cause);
    const pass = "error" in (expect as Row) ? error !== null && error.includes((expect as { error: string }).error) && rows === null : JSON.stringify(rows) === JSON.stringify(canonical(expect as unknown[][]));
    report.depthBudget.push({ from, maxDepth, pass, rows, error, why, elapsedMs: Math.round(performance.now() - started) });
    console.log(pass ? "PASS" : "FAIL", "xtql    ", `depth budget D=${maxDepth} from ${from}`, why, pass ? "" : JSON.stringify({ rows, error }).slice(0, 300));
  }
}

// ------------------------------------------------------------------ E. hazards
if (!only || only.includes("hazards")) {
  const scope = DatabaseScope.test(`${runId}-hazards`);
  const id = "99";
  const native = backend.openNative(scope);
  opened.push(native);
  const textRow = TypeExpr.struct({ v: TypeExpr.required(TypeExpr.text) });
  const none = TypeExpr.struct({});
  const probe = async (name: string, method: "select" | "selectSql", text: string) => {
    const exit = await Effect.runPromiseExit(native.provider[method]({ name: `vx02/${name}`, parameters: none, row: textRow }, {}, () => text, { timeoutMs: CALL_TIMEOUT_MS }) as Effect.Effect<Row, unknown>);
    return Exit.isSuccess(exit) ? exit.value["rows"][0]?.["v"] : `ERROR ${causeText(exit.cause).slice(0, 300)}`;
  };
  const h = report.hazards;
  // 1. ANY over a non-subquery operand is refused before reaching the engine.
  h.anyRejected = await probe("any", "selectSql", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE k = ANY(ARRAY[1, 2]) AND 1 = 1");
  h.anyOverSubqueryAllowed = await probe("any-subquery", "selectSql", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE k = ANY (SELECT 1) AND 1 = 1");
  // Envelope bypass candidates (correct answer 'x' for each: k = 1 is in {1, 2} and 1 = 1).
  h.anyNoParenthesis = await probe("any-bare", "selectSql", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE k = ANY ARRAY[1, 2] AND 1 = 1");
  h.anyCommentBeforeParenthesis = await probe("any-comment", "selectSql", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE k = ANY/**/(ARRAY[1, 2]) AND 1 = 1");
  h.anyParenthesisedControl = await probe("any-paren-control", "selectSql", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE (k = ANY(ARRAY[1, 2])) AND 1 = 1");
  // 2. DECIMAL -> BIGINT in SQL and XTQL (Q39a): exact value 1000000000000000004.
  h.sqlDecimalToBigint = await probe("sql-dec-bigint", "selectSql", "SELECT CAST(CAST(CAST('1000000000000000004' AS DECIMAL(32,0)) AS BIGINT) AS TEXT) AS v");
  h.sqlDecimalText = await probe("sql-dec-text", "selectSql", "SELECT CAST(CAST('1000000000000000004' AS DECIMAL(32,0)) AS TEXT) AS v");
  h.sqlTextToBigint = await probe("sql-text-bigint", "selectSql", "SELECT CAST(CAST('1000000000000000004' AS BIGINT) AS TEXT) AS v");
  h.sqlDecimalSumToBigint = await probe("sql-dec-sum-bigint", "selectSql", "SELECT CAST(CAST(SUM(CAST(x AS DECIMAL(32,0))) AS BIGINT) AS TEXT) AS v FROM (VALUES (CAST(1000000000000000001 AS BIGINT)), (CAST(3 AS BIGINT))) t (x)");
  h.xtqlDecimalToI64 = await probe("xtql-dec-i64", "select", "(-> (rel [{:n 1000000000000000004}] [n]) (with {:d (cast n #xt/type [:decimal 32 0 128])}) (return {:v (cast (cast d #xt/type :i64) #xt/type :utf8)}))");
  h.xtqlTextToI64 = await probe("xtql-text-i64", "select", "(-> (rel [{:s \"1000000000000000004\"}] [s]) (return {:v (cast (cast s #xt/type :i64) #xt/type :utf8)}))");
  // The exact-sum helpers' own arithmetic on one addend near 1e18, both languages, as text.
  h.sqlHalvesNear1e18 = await probe("sql-halves", "selectSql", "SELECT CAST((x / CAST(4294967296 AS BIGINT)) * CAST(4294967296 AS BIGINT) + (x - (x / CAST(4294967296 AS BIGINT)) * CAST(4294967296 AS BIGINT)) AS TEXT) AS v FROM (VALUES (CAST(-1000000000000000004 AS BIGINT))) t (x)");
  h.xtqlHalvesNear1e18 = await probe("xtql-halves", "select", "(-> (rel [{:n -1000000000000000004}] [n]) (with {:hi (/ n 4294967296)}) (with {:lo (- n (* hi 4294967296))}) (return {:v (cast (+ (* hi 4294967296) lo) #xt/type :utf8)}))");
  // 3. The Datalog compiler's exact integer arithmetic (compiler.ts:572: CAST(CAST(<decimal> AS BIGINT) AS TEXT)).
  const datalog = (query: unknown) =>
    Effect.runPromiseExit(
      Effect.gen(function* () {
        const triples = yield* Triples;
        return (yield* triples.queryAll(query as any, { basis: { recordedAt: 1001, validAt: 10 } as any })).results;
      }).pipe(Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })), Effect.scoped) as Effect.Effect<unknown, unknown, never>,
    ).then((exit) => (Exit.isSuccess(exit) ? exit.value : `ERROR ${causeText(exit.cause).slice(0, 400)}`));
  const x = att(id, "x");
  console.log("hazards (engine probes)", JSON.stringify(h));
  // The data-free probes above run first; only the Datalog probes need these two facts.
  try {
    await write(scope, id, [{ e: "e", f: "x", k: "int", v: "1000000000000000004" }, { e: "e2", f: "x", k: "int", v: "4611686018427387905" }], 1001);
  } catch (error) {
    h.datalogSetupError = String(error).slice(0, 300);
  }
  h.datalogRead = await datalog({ find: ["?x"], where: [["e", x, "?x"]] });
  h.datalogPlusZero = await datalog({ find: ["?y"], where: [["e", x, "?x"]], compute: [["+", "?x", integer("0"), "?y"]] });
  h.datalogTimesOne = await datalog({ find: ["?y"], where: [["e2", x, "?x"]], compute: [["*", "?x", integer("1"), "?y"]] });
  h.datalogSum = await datalog({ find: ["?s"], where: [["?e", x, "?x"]], aggregate: [["sum", "?x", "?s"]] });
  h.expected = { e: "1000000000000000004", e2: "4611686018427387905", sum: "5611686018427387909" };
  console.log("hazards", JSON.stringify(h));
}

for (const native of opened) await native.close();
report.endedAt = new Date().toISOString();
report.summary = {
  controls: { total: report.controls.length, pass: report.controls.filter((c: Row) => c.pass).length },
  writerBetween: { total: report.writerBetween.length, pass: report.writerBetween.filter((c: Row) => c.pass).length },
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, ...report.summary }));
