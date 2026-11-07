/**
 * EXP-X02 live checks of the XTDB native task library, in both languages, on a lab slot.
 *
 *   XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:5470/xtdb TRIPLEX_LAB_SLOT_OWNER=<lab/locks/xtdb-dev/owner.json> \
 *     node packages/qualification/workloads/xtdb-native-x02.ts --output runs/X02/<name>.json
 *
 * 1. Controls: R12's 38 hand-built scenarios (workloads 05, 08, 09, 12, 17, 18, 20). Facts are
 *    written through the public Triplex transact API; every expected answer is a written hand
 *    derivation next to the scenario (never a SQL or XTQL result). The packet's event oracle
 *    (qualification/workloads/event_oracles.py) reads packet events, not these fact fixtures.
 * 2. int64 boundaries (workloads 06, 08): R12's seven, +/-(2^63-1) totals, the carry
 *    counterexample, and a net that fits while one side does not. Exact total or the typed
 *    integer-overflow error.
 * 3. Mutation check: each mutant (a text change to one builder in one language) must fail at
 *    least one control in that language.
 * 4. Fixed cut: a writer commits between the two calls of a workload-04 task; the second call
 *    must not see it (answer false), while a new task afterwards does (answer true).
 *
 * Exit code 1 on any failure. Uses the built dist (run the gate's build first).
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect, Exit } from "effect";
import { EntityId, Triples, boolean, integer, ref, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";

process.env["TRIPLEX_QUERY_PATH"] = "xtdb-native";
const { loadQualificationBackend } = await import("@triplex-build/triplex-qualification");
const root = path.resolve(import.meta.dirname, "../../..");
const library = await import(
  path.join(root, "packages/qualification/dist/native/xtdb-workloads.js")
);
type Row = Record<string, any>;

const args = process.argv.slice(2);
const output = path.resolve(
  args.includes("--output")
    ? args[args.indexOf("--output") + 1]!
    : path.join(root, "runs/X02", `x02-live-${new Date().toISOString().replace(/[:.]/g, "")}.json`),
);
assert.ok(output.startsWith(path.join(root, "runs") + path.sep), "output must stay under runs/");
const backend = await loadQualificationBackend();
const ownerFile = process.env["TRIPLEX_LAB_SLOT_OWNER"];
assert.ok(ownerFile, "TRIPLEX_LAB_SLOT_OWNER is required (a held lab slot)");
const owner = JSON.parse(readFileSync(realpathSync(ownerFile), "utf8"));
assert.equal(owner.format, "tx2-slot-owner/1");
assert.equal(owner.lane, "xtdb");
assert.equal(owner.endpoint, backend.url, "XTDB_URL differs from the held slot's endpoint");
const runId = `x02-${Date.now()}`;

// ------------------------------------------------------------------ writing and reading
const att = (id: string, field: string) => `:w${id}/a${Buffer.from(field).toString("hex")}`;
type Kind = "str" | "int" | "bool" | "ref";
interface FactSpec {
  readonly entity: string;
  readonly field: string;
  readonly kind: Kind;
  readonly value: unknown;
  readonly from?: number;
  readonly to?: number;
}
const valueOf = (kind: Kind, value: unknown) =>
  kind === "int"
    ? integer(String(value))
    : kind === "bool"
      ? boolean(Boolean(value))
      : kind === "ref"
        ? ref(EntityId.make(String(value)))
        : string(String(value));
const write = (scope: DatabaseScope, id: string, facts: readonly FactSpec[], startTime: number) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.transact(
        facts.map((fact) => ({
          op: "assert" as const,
          entityId: EntityId.make(fact.entity),
          attribute: att(id, fact.field),
          value: valueOf(fact.kind, fact.value),
          validFrom: fact.from ?? 0,
          ...(fact.to === undefined ? {} : { validTo: fact.to }),
        })),
        { commandId: `${runId}:${scope}:${startTime}` },
      );
    }).pipe(
      Effect.provide(
        backend.makeRuntime().layer({
          scope,
          capabilities: Capabilities.none,
          deterministic: { startTime, seed: `${runId}-${scope}-${startTime}` },
        }),
      ),
      Effect.scoped,
    ) as Effect.Effect<{ position: number }, unknown, never>,
  );
const integerOf = (value: unknown): bigint => {
  if (typeof value === "object" && value && (value as Row)["type"] === "integer")
    return BigInt((value as Row)["value"]);
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  throw new TypeError(`Expected exact integer result: ${JSON.stringify(value)}`);
};
// The runner's canonical row set (runner.ts wire/canonicalRows).
const wire = (value: unknown) =>
  typeof value === "boolean"
    ? { tag: "bool", value }
    : typeof value === "string"
      ? { tag: "str", value }
      : { tag: "i64", value: integerOf(value).toString() };
const canonical = (rows: readonly unknown[][]) =>
  [...new Set(rows.map((row) => JSON.stringify(row.map(wire))))].sort();
type Mutate = (text: string) => string;
const session = (provider: any, mutate?: Mutate, afterFirst?: () => Promise<void>) => {
  if (!mutate && !afterFirst) return provider;
  let calls = 0;
  const wrap =
    (method: string) =>
    (...callArgs: any[]) => {
      const index = method === "selectSqlWithReachability" ? 3 : 2;
      const build = callArgs[index];
      callArgs[index] = (ctx: unknown, input: unknown) =>
        mutate ? mutate(build(ctx, input)) : build(ctx, input);
      return provider[method](...callArgs).pipe(
        Effect.tap(() =>
          calls++ === 0 && afterFirst ? Effect.promise(afterFirst) : Effect.void,
        ),
      );
    };
  return {
    select: wrap("select"),
    selectSql: wrap("selectSql"),
    selectSqlWithReachability: wrap("selectSqlWithReachability"),
  };
};
const languages = ["xtql", "xtdb-sql"] as const;
type Language = (typeof languages)[number];
const run = async (
  provider: any,
  language: Language,
  id: string,
  entry: Row,
  options: { mutate?: Mutate; afterFirst?: () => Promise<void> } = {},
) => {
  const trace: Row[] = [];
  const exit = await Effect.runPromiseExit(
    library.evaluateXtdbNativeWorkload(
      session(provider, options.mutate, options.afterFirst),
      { id },
      entry,
      new Map([[0, 0]]),
      trace,
      language,
    ) as Effect.Effect<unknown[][], unknown>,
  );
  const queries = trace.filter((item) => item["operation"] === "public-native-query");
  const substeps = queries.flatMap((query) => (query["steps"] ?? []).map((s: Row) => s["language"]));
  return {
    rows: Exit.isSuccess(exit) ? canonical(exit.value) : null,
    error: Exit.isSuccess(exit) ? null : String(exit.cause).slice(0, 400),
    languages: [...new Set([...queries.map((q) => q["language"]), ...substeps])],
    positions: queries.map((q) => q["basis"]?.recordedPosition),
  };
};
const S = (value: string) => ({ value }),
  I = (value: number | string | bigint) => ({ value: String(value) });
const cut = { known_at: "1", valid_at: "0" };

// ------------------------------------------------------------------ 1. controls
interface Control {
  readonly id: string;
  readonly operation: string;
  readonly label: string;
  readonly parameters: Row;
  /** Hand-derived answer rows (JS values in the runner's wire domain) or a typed error tag. */
  readonly expect: readonly unknown[][] | { readonly error: string };
  readonly derivation: string;
}
interface Fixture {
  readonly id: string;
  readonly facts: FactSpec[];
  readonly controls: Control[];
}
const fixtures: Fixture[] = [];
{
  // 12 access_with_deny: a support allows unless a block matches (subject, target) or a revoke
  // matches (principal, target); no principal fact means no allow.
  const facts: FactSpec[] = [];
  const ev = (e: string, kind: string, subject: string, target: string, principal?: string) => {
    facts.push(
      { entity: e, field: "kind", kind: "str", value: kind },
      { entity: e, field: "subject", kind: "str", value: subject },
      { entity: e, field: "target", kind: "str", value: target },
    );
    if (principal) facts.push({ entity: e, field: "principal", kind: "str", value: principal });
  };
  ev("a1", "support", "u1", "r1", "p1");
  ev("a2", "support", "u2", "r2", "p2"), ev("b2", "block", "u2", "r2");
  ev("a3", "support", "u3", "r3", "p3"), ev("c3", "revoke", "p3", "r3");
  ev("a4", "support", "u4", "r4", "p4"), ev("c4", "revoke", "p4", "rX");
  ev("a5", "support", "u5", "r5", "p5"), ev("b5", "block", "uX", "r5");
  ev("a6", "support", "u6", "r6", "p6"), ev("a6b", "support", "u6", "r6", "p6b"), ev("c6", "revoke", "p6", "r6");
  ev("a7", "support", "u7", "r7");
  // R14 H02 (#6313): a block whose subject is a boolean has a NULL value_string. It matches no
  // user, so u1 stays allowed; an unguarded correlated NOT EXISTS answers false.
  facts.push(
    { entity: "bnull", field: "kind", kind: "str", value: "block" },
    { entity: "bnull", field: "subject", kind: "bool", value: true },
    { entity: "bnull", field: "target", kind: "str", value: "r1" },
  );
  const why: Record<string, string> = {
    u1: "support a1, no block or revoke",
    u2: "block b2 matches (u2, r2)",
    u3: "revoke c3 matches principal p3 on r3",
    u4: "revoke c4 is for rX, not r4",
    u5: "block b5 is for uX, not u5",
    u6: "a6 is revoked (p6) but a6b (p6b) is not",
    u7: "a7 has no principal fact",
    nobody: "no support for this user",
  };
  fixtures.push({
    id: "12",
    facts,
    controls: (
      [
        ["u1", "r1", true],
        ["u2", "r2", false],
        ["u3", "r3", false],
        ["u4", "r4", true],
        ["u5", "r5", true],
        ["u6", "r6", true],
        ["u7", "r7", false],
        ["nobody", "r1", false],
      ] as const
    ).map(([user, resource, allowed]) => ({
      id: "12",
      operation: "access_with_deny",
      label: `${user}->${resource}`,
      parameters: { user: S(user), resource: S(resource) },
      expect: [[allowed]],
      derivation: why[user]!,
    })),
  });
}
{
  // 17 funnel: view < checkout < payment strictly, every step inside [from, to), one session.
  const facts: FactSpec[] = [];
  const ev = (e: string, session: string, step: string, at: number) =>
    facts.push(
      { entity: e, field: "session", kind: "str", value: session },
      { entity: e, field: "step", kind: "str", value: step },
      { entity: e, field: "at", kind: "int", value: at },
    );
  const seq = (s: string, view: number, checkout: number, payment: number) => {
    ev(`${s}v`, s, "view", view), ev(`${s}c`, s, "checkout", checkout), ev(`${s}p`, s, "payment", payment);
  };
  seq("ok", 1, 2, 3), seq("eq01", 5, 5, 6), seq("eq12", 1, 4, 4), seq("rev", 3, 2, 1);
  seq("lo", 0, 2, 3), seq("hi", 1, 2, 10);
  ev("mixv", "mix1", "view", 1), ev("mixc", "mix2", "checkout", 2), ev("mixp", "mix1", "payment", 3);
  seq("dup", 1, 2, 3), ev("dup2c", "dup", "checkout", 2);
  const p = (from: number, to: number, session?: string) => ({
    from: I(from),
    to: I(to),
    ...(session ? { session: S(session) } : {}),
  });
  const controls: Control[] = [
    {
      id: "17", operation: "conversion_funnel", label: "funnel [0,10)", parameters: p(0, 10),
      expect: [["dup"], ["lo"], ["ok"]],
      derivation: "ok 1<2<3, lo 0<2<3 (0 >= from), dup 1<2<3; eq01/eq12 have equal steps, rev is reversed, hi pays at 10 (not < 10), mix1 has no checkout",
    },
    {
      id: "17", operation: "conversion_funnel", label: "funnel [1,10)", parameters: p(1, 10),
      expect: [["dup"], ["ok"]],
      derivation: "as [0,10) but lo's view at 0 is before from=1",
    },
    {
      id: "17", operation: "conversion_funnel", label: "funnel [0,3)", parameters: p(0, 3),
      expect: [],
      derivation: "every ordered session pays at 3 or later (ok, lo, dup at 3; hi at 10); rev's view at 3 is outside",
    },
  ];
  for (const [s, ok, why] of [
    ["ok", true, "1<2<3 inside [0,10)"],
    ["eq01", false, "view = checkout = 5"],
    ["eq12", false, "checkout = payment = 4"],
    ["rev", false, "3 > 2 > 1"],
    ["mix1", false, "mix1 has no checkout (it is in mix2)"],
    ["dup", true, "1<2<3; the second checkout at 2 changes nothing"],
  ] as const)
    controls.push({
      id: "17", operation: "session_conversion", label: `session ${s}`, parameters: p(0, 10, s),
      expect: [[ok]], derivation: why,
    });
  fixtures.push({ id: "17", facts, controls });
}
{
  // 08 net revenue = sum of the customer's capture amounts in the currency minus the amounts of
  // refunds in that currency that reference one of those captures (one row per capture amount fact).
  const facts: FactSpec[] = [];
  const cap = (e: string, customer: string, currency: string, amount: number) =>
    facts.push(
      { entity: e, field: "customer", kind: "str", value: customer },
      { entity: e, field: "currency", kind: "str", value: currency },
      { entity: e, field: "amount", kind: "int", value: amount },
    );
  const refund = (e: string, capture: string, currency: string, amount: number) =>
    facts.push(
      { entity: e, field: "capture", kind: "str", value: capture },
      { entity: e, field: "currency", kind: "str", value: currency },
      { entity: e, field: "amount", kind: "int", value: amount },
    );
  cap("k1", "cust", "USD", 1000), cap("k2", "cust", "USD", 500), cap("k3", "cust", "EUR", 700), cap("k4", "other", "USD", 9);
  refund("r1", "k1", "USD", 100), refund("r2", "k1", "USD", 50), refund("r3", "k3", "USD", 70);
  facts.push({ entity: "k2", field: "amount", kind: "int", value: 25 });
  const control = (customer: string, currency: string, total: number, derivation: string): Control => ({
    id: "08", operation: "customer_net_revenue", label: `${customer}/${currency}`,
    parameters: { customer: S(customer), currency: S(currency) }, expect: [[integer(String(total))]], derivation,
  });
  fixtures.push({
    id: "08",
    facts,
    controls: [
      control("cust", "USD", 1375, "captures 1000 + 500 + 25 (k2 has two amount facts) = 1525; refunds of k1 in USD 100 + 50 = 150; 1525 - 150"),
      control("cust", "EUR", 700, "capture k3 700; its refund r3 is in USD, not EUR"),
      control("other", "USD", 9, "capture k4 9, no refunds"),
      control("nobody", "USD", 0, "no captures: the empty sum is 0"),
    ],
  });
}
{
  // 05: count distinct accepted events of an object; the status at the highest revision (ties: all).
  const facts: FactSpec[] = [];
  const ev = (e: string, object: string, revision: number, status: string) =>
    facts.push(
      { entity: e, field: "webhook_object", kind: "str", value: object },
      { entity: e, field: "revision", kind: "int", value: revision },
      { entity: e, field: "status", kind: "str", value: status },
    );
  ev("e1", "o1", 1, "created"), ev("e2", "o1", 3, "shipped"), ev("e3", "o1", 3, "shipped-b"), ev("e4", "o1", 2, "paid"), ev("e5", "o2", 7, "x");
  fixtures.push({
    id: "05",
    facts,
    controls: [
      { id: "05", operation: "accepted_event_count", label: "o1 count", parameters: { subject: S("o1") }, expect: [[integer("4")]], derivation: "e1, e2, e3, e4" },
      { id: "05", operation: "accepted_event_count", label: "empty count", parameters: { subject: S("none") }, expect: [[integer("0")]], derivation: "no events" },
      { id: "05", operation: "state_at", label: "o1 highest revision tie", parameters: { subject: S("o1") }, expect: [["shipped"], ["shipped-b"]], derivation: "revision 3 is highest, held by e2 and e3" },
      { id: "05", operation: "state_at", label: "unknown object", parameters: { subject: S("none") }, expect: [], derivation: "no events" },
    ],
  });
}
{
  // 09: subscriptions with a paid=true payment and no entitled=true entitlement.
  const facts: FactSpec[] = [];
  const pay = (e: string, sub: string, paid: boolean) =>
    facts.push({ entity: e, field: "subscription", kind: "str", value: sub }, { entity: e, field: "paid", kind: "bool", value: paid });
  const ent = (e: string, sub: string, entitled: boolean) =>
    facts.push({ entity: e, field: "subject", kind: "str", value: sub }, { entity: e, field: "entitled", kind: "bool", value: entitled });
  pay("p1", "s1", true), pay("p2", "s2", true), pay("p3", "s3", false), pay("p4", "s4", true), pay("p5", "s4", true);
  ent("n1", "s1", true), ent("n2", "s2", false), ent("n3", "s3", true);
  // R14 H02 (#6313): an entitlement whose subject is a boolean (NULL value_string) matches no
  // subscription; an unguarded correlated NOT EXISTS drops every row.
  facts.push({ entity: "nnull", field: "subject", kind: "bool", value: true }, { entity: "nnull", field: "entitled", kind: "bool", value: true });
  fixtures.push({
    id: "09",
    facts,
    controls: [
      { id: "09", operation: "paid_without_entitlement", label: "s2 and s4", parameters: {}, expect: [["s2"], ["s4"]], derivation: "s1 entitled; s2 only entitled=false; s3 not paid; s4 paid twice, no entitlement; nnull's boolean subject matches nothing" },
    ],
  });
}
{
  // 18: covered length of the union of the machine's intervals clipped to [from, to) (ticks +1e6).
  const base = 1_000_000;
  const facts: FactSpec[] = [];
  const up = (e: string, machine: string, from: number, to?: number) =>
    facts.push({ entity: e, field: "machine", kind: "str", value: machine, from: base + from, ...(to === undefined ? {} : { to: base + to }) });
  up("a1", "m1", 0.25, 3.25), up("a2", "m1", 2, 5.25);
  up("b1", "m2", 8);
  up("c1", "m3", 1.5, 2.5), up("c2", "m3", 1.5, 2.5), up("c3", "m3", 2.5, 3.5);
  up("d1", "m4", 4, 6), up("d2", "m4", 7, 9);
  const controls: Control[] = (
    [
      ["m1", 0, 10, 5, "[0.25, 3.25) U [2, 5.25) = [0.25, 5.25)"],
      ["m2", 0, 10, 2, "[8, open) clipped to [8, 10)"],
      ["m3", 0, 10, 2, "duplicate [1.5, 2.5) and adjacent [2.5, 3.5): [1.5, 3.5)"],
      ["m3", 2, 3, 1, "[1.5, 3.5) clipped to [2, 3)"],
      ["m4", 0, 10, 4, "[4, 6) and [7, 9), gap at [6, 7)"],
      ["m4", 5, 8, 2, "[5, 6) and [7, 8)"],
      ["none", 0, 10, 0, "no intervals"],
    ] as const
  ).map(([machine, from, to, duration, derivation]) => ({
    id: "18", operation: "uptime_duration", label: `${machine} [${from},${to})`,
    parameters: { machine: S(machine), from: I(from), to: I(to) }, expect: [[integer(String(duration))]], derivation,
  }));
  fixtures.push({ id: "18", facts, controls });
}
{
  // 20 closure: chain n0 -> ... -> n6, back edge n6 -> n2 (cycle n2..n6), side branch n1 -> b1 -> b2.
  const facts: FactSpec[] = [];
  const edge = (from: string, to: string) => facts.push({ entity: from, field: "_support", kind: "ref", value: to });
  for (let i = 0; i < 6; i++) edge(`n${i}`, `n${i + 1}`);
  edge("n6", "n2"), edge("n1", "b1"), edge("b1", "b2");
  fixtures.push({
    id: "20",
    facts,
    controls: (
      [
        ["n0", ["n1", "n2", "n3", "n4", "n5", "n6", "b1", "b2"], "the chain, the side branch; 6 hops deep"],
        ["n3", ["n2", "n3", "n4", "n5", "n6"], "n3 -> n4 -> n5 -> n6 -> n2 -> n3 (cycle includes n3 itself)"],
        ["b1", ["b2"], "one edge"],
        ["b2", [], "no outgoing edge"],
        ["nobody", [], "not a node"],
      ] as const
    ).map(([from, targets, derivation]) => ({
      id: "20", operation: "reachability_closure", label: `closure(${from})`,
      parameters: { from: S(from) }, expect: targets.map((t) => [t]), derivation,
    })),
  });
}
// int64 boundaries (workloads 06 and 08) are controls too, so the 06 mutant has a target.
const MAX = 2n ** 63n - 1n,
  MIN = -(2n ** 63n);
const int64Cases: Record<string, bigint[]> = {
  "three-2^62": [2n ** 62n, 2n ** 62n, 2n ** 62n],
  "int64max-plus-1": [MAX, 1n],
  "int64max-plus-min": [MAX, MIN],
  "min-plus-minus1": [MIN, -1n],
  "exact-int64max": [2n ** 62n, 2n ** 62n - 1n],
  "exact-int64min": [-(2n ** 62n), -(2n ** 62n)],
  "mixed-wrap-cancels": [MAX, MAX, -MAX, -MAX, 5n],
  "total+(2^63-1)": [MAX - 10n, 4n, 6n],
  "total-(2^63-1)": [-MAX + 10n, -4n, -6n],
  "carry-counterexample": [MAX, 2n ** 32n, -(2n ** 32n - 1n), -(2n ** 32n - 1n)],
};
{
  const facts: FactSpec[] = [];
  const controls: Control[] = [];
  for (const [name, amounts] of Object.entries(int64Cases)) {
    amounts.forEach((amount, index) =>
      facts.push(
        { entity: `${name}#${index}`, field: "account", kind: "str", value: name },
        { entity: `${name}#${index}`, field: "currency", kind: "str", value: "USD" },
        { entity: `${name}#${index}`, field: "amount", kind: "int", value: amount },
      ),
    );
    const total = amounts.reduce((sum, value) => sum + value, 0n);
    const inRange = total >= MIN && total <= MAX;
    controls.push({
      id: "06", operation: "account_balance", label: name,
      parameters: { account: S(name), currency: S("USD") },
      expect: inRange ? [[integer(total)]] : { error: "NativeIntegerOverflowError" },
      derivation: `exact sum ${total}${inRange ? "" : " is outside int64"}`,
    });
  }
  fixtures.push({ id: "06", facts, controls });
}
{
  const facts: FactSpec[] = [];
  const cap = (e: string, customer: string, amount: bigint) =>
    facts.push(
      { entity: e, field: "customer", kind: "str", value: customer },
      { entity: e, field: "currency", kind: "str", value: "USD" },
      { entity: e, field: "amount", kind: "int", value: amount },
    );
  cap("big1", "big", 2n ** 62n), cap("big2", "big", 2n ** 62n);
  facts.push(
    { entity: "bigr", field: "capture", kind: "str", value: "big1" },
    { entity: "bigr", field: "currency", kind: "str", value: "USD" },
    { entity: "bigr", field: "amount", kind: "int", value: 1 },
  );
  cap("over1", "over", MAX), cap("over2", "over", MAX);
  fixtures.push({
    id: "08",
    facts,
    controls: [
      { id: "08", operation: "customer_net_revenue", label: "net fits, captures do not", parameters: { customer: S("big"), currency: S("USD") }, expect: [[integer(MAX)]], derivation: "2^62 + 2^62 - 1 = 2^63 - 1; the captures alone (2^63) are outside int64" },
      { id: "08", operation: "customer_net_revenue", label: "net outside int64", parameters: { customer: S("over"), currency: S("USD") }, expect: { error: "NativeIntegerOverflowError" }, derivation: "2 * (2^63 - 1) with no refunds" },
    ],
  });
}

const report: Row = {
  format: "tx2-x02-live/1",
  runId,
  endpoint: backend.url,
  startedAt: new Date().toISOString(),
  controls: [],
  mutants: [],
  fixedCut: [],
};
const scopes = new Map<Fixture, { scope: DatabaseScope; provider: any; close: () => Promise<void> }>();
const ok = (control: Control, result: Awaited<ReturnType<typeof run>>, language: Language) => {
  // A failed call records no trace, so a task that fails on its only call has no languages.
  const within = result.languages.every((item) => item === language);
  const pure = within && result.languages.length === 1;
  if ("error" in control.expect)
    return within && result.error !== null && result.error.includes(control.expect.error);
  return pure && JSON.stringify(result.rows) === JSON.stringify(canonical(control.expect as unknown[][]));
};
for (const [index, fixture] of fixtures.entries()) {
  const scope = DatabaseScope.test(`${runId}-control-${fixture.id}-${index}`);
  await write(scope, fixture.id, fixture.facts, 1001);
  const opened = backend.openNative(scope);
  scopes.set(fixture, { scope, provider: opened.provider, close: opened.close });
}
const runControl = async (fixture: Fixture, control: Control, language: Language, mutate?: Mutate) =>
  run(scopes.get(fixture)!.provider, language, control.id, {
    id: control.label,
    operation: control.operation,
    cut,
    parameters: control.parameters,
  }, mutate ? { mutate } : {});
for (const fixture of fixtures)
  for (const control of fixture.controls)
    for (const language of languages) {
      const result = await runControl(fixture, control, language);
      const pass = ok(control, result, language);
      report.controls.push({ workload: control.id, operation: control.operation, label: control.label, language, pass, expect: control.expect, derivation: control.derivation, ...result });
      console.log(pass ? "PASS" : "FAIL", language.padEnd(8), `${control.id}/${control.operation}`.padEnd(28), control.label);
    }

// ------------------------------------------------------------------ 3. mutation check
const replaceOnce = (from: string, to: string): Mutate => (text) => {
  if (!text.includes(from)) return text;
  return text.replace(from, to);
};
const replaceLast = (from: string, to: string): Mutate => (text) => {
  const at = text.lastIndexOf(from);
  return at < 0 ? text : text.slice(0, at) + to + text.slice(at + from.length);
};
const mutants: { name: string; workload: string; operation?: string; xtql?: Mutate; sql?: Mutate }[] = [
  { name: "17 view<=checkout", workload: "17", xtql: replaceOnce("(< t0 t1)", "(<= t0 t1)"), sql: replaceOnce(" AS BIGINT) < CAST(CASE WHEN t1.", " AS BIGINT) <= CAST(CASE WHEN t1.") },
  { name: "17 checkout<=payment", workload: "17", xtql: replaceOnce("(< t1 t2)", "(<= t1 t2)"), sql: replaceOnce(" AS BIGINT) < CAST(CASE WHEN t2.", " AS BIGINT) <= CAST(CASE WHEN t2.") },
  { name: "12 revoke never matches", workload: "12", xtql: replaceOnce('"revoke"', '"revoke-x"'), sql: replaceOnce("'revoke'", "'revoke-x'") },
  { name: "12 block never matches", workload: "12", xtql: replaceOnce('"block"', '"block-x"'), sql: replaceOnce("'block'", "'block-x'") },
  { name: "09 entitlement value ignored", workload: "09", xtql: replaceLast(" (= value_boolean 1)", ""), sql: replaceOnce(" AND entitled.value_boolean = 1", "") },
  { name: "05 lowest revision wins", workload: "05", xtql: replaceOnce("(max rev)", "(min rev)"), sql: replaceOnce("SELECT MAX(revision)", "SELECT MIN(revision)") },
  { name: "18 covered test drops the upper end", workload: "18", xtql: replaceOnce(" (>= hi r3)", ""), sql: replaceOnce(" AND c.hi >= s.hi", "") },
  { name: "06 wrong attribute filter", workload: "06", xtql: replaceOnce("(= attribute", "(<> attribute"), sql: replaceOnce("account.attribute = ", "account.attribute <> ") },
  { name: "08 refunds ignored", workload: "08", xtql: replaceOnce("(coalesce rlo 0)", "0"), sql: replaceOnce("- COALESCE((SELECT SUM(lo) FROM refunds), 0)", "") },
  { name: "09 #6313 guard removed (SQL)", workload: "09", sql: replaceOnce("(subject.value_string = subscription.value_string) IS TRUE", "subject.value_string = subscription.value_string") },
  { name: "12 #6313 guard removed on block (SQL)", workload: "12", sql: replaceOnce("(s.value_string = subject.value_string) IS TRUE", "s.value_string = subject.value_string") },
  { name: "20 fixpoint check never fires (XTQL)", workload: "20", xtql: replaceOnce("(limit 1) (return {:incomplete true})", "(where (= 1 2)) (limit 1) (return {:incomplete true})") },
];
for (const mutant of mutants)
  for (const language of languages) {
    const mutate = language === "xtql" ? mutant.xtql : mutant.sql;
    if (!mutate) {
      report.mutants.push({ mutant: mutant.name, language, applicable: false });
      continue;
    }
    let killed = 0,
      tried = 0,
      changed = false;
    for (const fixture of fixtures.filter((f) => f.id === mutant.workload))
      for (const control of fixture.controls) {
        tried++;
        const probe: Mutate = (text) => {
          const after = mutate(text);
          if (after !== text) changed = true;
          return after;
        };
        if (!ok(control, await runControl(fixture, control, language, probe), language)) killed++;
      }
    const caught = changed && killed > 0;
    report.mutants.push({ mutant: mutant.name, language, applicable: true, textChanged: changed, controls: tried, failedControls: killed, caught });
    console.log(caught ? "KILLED" : "SURVIVED", language.padEnd(8), mutant.name, `(${killed}/${tried} controls fail${changed ? "" : ", text unchanged"})`);
  }

// ------------------------------------------------------------------ 4. writer between calls
for (const language of languages) {
  const scope = DatabaseScope.test(`${runId}-fixed-cut-${language}`);
  const claim = JSON.stringify(["claim", "c1"]),
    coverage = JSON.stringify(["coverage", "k1"]);
  await write(scope, "04", [
    { entity: claim, field: "coverage_customer", kind: "str", value: coverage },
    { entity: claim, field: "claim_at", kind: "int", value: 50 },
  ], 1001);
  const opened = backend.openNative(scope);
  const entry = { id: "writer-between-calls", operation: "coverage_at_claim", cut: { known_at: "2", valid_at: "100" }, parameters: { claim: S("c1"), policy: S("P") } };
  let writerPosition: number | undefined;
  const pinned = await run(opened.provider, language, "04", entry, {
    afterFirst: async () => {
      // Recorded at 1002, inside the task's knowledge cut (recordedAt 1002): only the position pin hides it.
      writerPosition = (await write(scope, "04", [{ entity: coverage, field: "covers/P", kind: "bool", value: true }], 1002)).position;
    },
  });
  const after = await run(opened.provider, language, "04", entry);
  await opened.close();
  const pass =
    JSON.stringify(pinned.rows) === JSON.stringify(canonical([[false]])) &&
    JSON.stringify(after.rows) === JSON.stringify(canonical([[true]])) &&
    pinned.positions.length === 2 && pinned.positions[0] === pinned.positions[1] &&
    writerPosition !== undefined && writerPosition > pinned.positions[0] &&
    pinned.languages.length === 1 && pinned.languages[0] === language;
  report.fixedCut.push({ language, pass, writerPosition, pinned, after });
  console.log(pass ? "PASS" : "FAIL", language.padEnd(8), "writer between calls", JSON.stringify({ pinned: pinned.rows, positions: pinned.positions, writerPosition, after: after.rows }));
}
// ------------------------------------------------------------------ 5. retained hazard evidence
// SUM over DECIMAL(32,0) is exact, but DECIMAL -> BIGINT goes through a double in 2.2.0, so a
// DECIMAL sum must not be cast back to BIGINT (why xtdb-exact-sum.ts keeps checked BIGINT halves).
{
  const [fixture] = fixtures;
  const provider = scopes.get(fixture!)!.provider;
  const { TypeExpr } = await import("@triplex-build/triplex/config");
  const textRow = TypeExpr.struct({ v: TypeExpr.required(TypeExpr.text) });
  const none = TypeExpr.struct({});
  const probe = async (name: string, method: "select" | "selectSql", text: string) => {
    const exit = await Effect.runPromiseExit(provider[method]({ name: `x02/${name}`, parameters: none, row: textRow }, {}, () => text) as Effect.Effect<Row, unknown>);
    return Exit.isSuccess(exit) ? exit.value["rows"][0]?.["v"] : `ERROR ${String(exit.cause).slice(0, 200)}`;
  };
  report.hazards = {
    exactSum: "1000000000000000004",
    sqlDecimalSumText: await probe("sql-decimal-sum", "selectSql", "SELECT CAST(SUM(CAST(x AS DECIMAL(32,0))) AS TEXT) AS v FROM (VALUES (CAST(1000000000000000001 AS BIGINT)), (CAST(3 AS BIGINT))) t (x)"),
    sqlDecimalSumAsBigint: await probe("sql-decimal-sum-bigint", "selectSql", "SELECT CAST(CAST(SUM(CAST(x AS DECIMAL(32,0))) AS BIGINT) AS TEXT) AS v FROM (VALUES (CAST(1000000000000000001 AS BIGINT)), (CAST(3 AS BIGINT))) t (x)"),
    xtqlDecimalSumAsI64: await probe("xtql-decimal-sum-i64", "select", "(-> (rel [{:n 1000000000000000001} {:n 3}] [n]) (with {:d (cast n #xt/type [:decimal 32 0 128])}) (aggregate {:s (sum d)}) (return {:v (cast (cast s #xt/type :i64) #xt/type :utf8)}))"),
    sqlDecimal2pow63AsBigint: await probe("sql-decimal-2pow63-bigint", "selectSql", "SELECT CAST(CAST(SUM(CAST(x AS DECIMAL(32,0))) AS BIGINT) AS TEXT) AS v FROM (VALUES (CAST(4611686018427387905 AS BIGINT)), (CAST(4611686018427387903 AS BIGINT))) t (x)"),
  };
  console.log("hazard evidence", JSON.stringify(report.hazards));
}
for (const { close } of scopes.values()) await close();

report.endedAt = new Date().toISOString();
report.summary = {
  controls: { total: report.controls.length, pass: report.controls.filter((c: Row) => c.pass).length },
  controlScenarios: fixtures.reduce((sum, f) => sum + f.controls.length, 0),
  mutants: {
    applicable: report.mutants.filter((m: Row) => m.applicable).length,
    caught: report.mutants.filter((m: Row) => m.caught).length,
  },
  fixedCut: { total: report.fixedCut.length, pass: report.fixedCut.filter((c: Row) => c.pass).length },
};
const pass =
  report.summary.controls.pass === report.summary.controls.total &&
  report.summary.mutants.caught === report.summary.mutants.applicable &&
  report.summary.fixedCut.pass === report.summary.fixedCut.total;
report.result = pass ? "PASS" : "FAIL";
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ result: report.result, output, ...report.summary }));
if (!pass) process.exitCode = 1;
