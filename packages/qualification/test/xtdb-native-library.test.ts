/**
 * EXP-X02 unit checks of the XTDB native task library (no engine).
 *
 * The live checks (controls with hand-derived answers, mutants, a writer between calls,
 * int64 boundaries) are in workloads/xtdb-native-x02.ts and need an engine.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Effect, Exit } from "effect";
import {
  evaluateXtdbNativeWorkload,
  type XtdbNativeLanguage,
  type XtdbNativeTaskSession,
} from "../src/native/xtdb-workloads.js";
import { simulateExactSum, sqlExactTotal, xtqlExactTotal } from "../src/native/xtdb-exact-sum.js";
import {
  NativeIntegerOverflowError,
  checkedInt64,
  typedSumOverflow,
} from "../src/native/xtdb-native-errors.js";

const root = path.resolve(import.meta.dirname, "../../..");
const packet = JSON.parse(
  readFileSync(path.join(root, "qualification/workloads/temporal-workloads.json"), "utf8"),
);
const PIN = 7;

interface Call {
  readonly method: "select" | "selectSql" | "selectSqlWithReachability" | "selectWithReachability";
  readonly name: string;
  readonly text: string;
  readonly recordedPosition: number | undefined;
  /** [EXP-C8] Relation edge and seed texts, built against the same placeholder context. */
  readonly relations?: readonly { name: string; edges: string; seeds: unknown }[];
}
const withRelations = (method: Call["method"]) =>
  method === "selectSqlWithReachability" || method === "selectWithReachability";
const xtqlMethod = (method: Call["method"]) =>
  method === "select" || method === "selectWithReachability";
/** A session that runs every builder against placeholder relations and returns canned rows. */
const mockSession = (
  entry: Record<string, any>,
  rowsFor: (name: string) => unknown[] = () => [],
): { session: XtdbNativeTaskSession; calls: Call[] } => {
  const calls: Call[] = [];
  const make =
    (method: Call["method"]) =>
    (contract: any, input: unknown, ...rest: any[]) => {
      const build = withRelations(method) ? rest[1] : rest[0];
      const options = withRelations(method) ? rest[2] : rest[1];
      const xtql = xtqlMethod(method);
      let n = 0;
      const ctx = {
        basis: {},
        bind: () => (xtql ? `triplex_param_${++n}` : `$${++n}`),
        attribute: () => (xtql ? `triplex_param_${++n}` : `$${++n}`),
        identifier: (name: string) => name,
        facts: () => (xtql ? "(-> FACTS)" : "(SELECT * FROM FACTS)"),
        recordedFacts: () => (xtql ? "(-> RECORDED)" : "(SELECT * FROM RECORDED)"),
        history: () => "HISTORY",
        relation: () => (xtql ? "(rel WORKING [source target])" : "(SELECT source, target FROM WORKING)"),
      };
      const name = String(contract.name).split("/").slice(2).join("/");
      const relations = withRelations(method)
        ? (rest[0] as any[]).map((relation) => ({
            name: relation.name,
            edges: relation.edges(ctx, input),
            seeds: relation.seeds?.(ctx, input),
          }))
        : undefined;
      const text = build(ctx, input);
      calls.push({
        method,
        name,
        text,
        recordedPosition: options?.basis?.recordedPosition,
        ...(relations ? { relations } : {}),
      });
      return Effect.succeed({
        rows: rowsFor(name),
        basis: { recordedPosition: options?.basis?.recordedPosition ?? PIN },
        trace: { language: xtql ? "xtql" : "xtdb-sql", steps: [] },
      } as any);
    };
  void entry;
  return {
    calls,
    session: {
      select: make("select"),
      selectSql: make("selectSql"),
      selectSqlWithReachability: make("selectSqlWithReachability"),
      selectWithReachability: make("selectWithReachability"),
    } as unknown as XtdbNativeTaskSession,
  };
};
// Canned rows that drive every multi-call branch (so later calls exist and can be checked).
const canned = (entry: Record<string, any>) => (name: string) => {
  const purchase = entry["parameters"]?.purchase_ids?.[0]?.value;
  if (name === "purchase-times") return [{ purchase, at: "5" }];
  if (name === "claim-coordinate") return [{ coverage: "c", at: "5" }];
  if (["accepted-events"].includes(name) || name.startsWith("bounded-dag")) return [{ count: "0" }];
  if (name === "account-balance" || name === "net-revenue") return [{ total: "0" }];
  if (name === "workflow-start") return [{ deadline: "5", feed: "f" }];
  if (name === "first-completion") return [{ first: null }];
  if (name === "source-watermark") return [{ through: null }];
  if (name === "uptime-interval-union") return [{ duration: 0 }];
  if (name === "prediction-label-cut") return [{ customer: "c", at: "5", known: "0", label: true }];
  return [];
};
const cases = packet.workloads.flatMap((workload: any) =>
  workload.cases.map((entry: any) => ({ workload, entry })),
);

describe("XTDB native task library: one language and one cut per task (EXP-X02)", () => {
  it("covers all 71 logical tasks", () => expect(cases).toHaveLength(71));
  for (const language of ["xtql", "xtdb-sql"] as XtdbNativeLanguage[])
    it(`runs every task and substep in ${language} and pins later calls to the first cut`, async () => {
      let multiCall = 0;
      for (const { workload, entry } of cases) {
        const { session, calls } = mockSession(entry, canned(entry));
        const exit = await Effect.runPromiseExit(
          evaluateXtdbNativeWorkload(session, workload, entry, new Map([[0, 0]]), [], language),
        );
        expect(Exit.isSuccess(exit), `${workload.id}/${entry.id}: ${String(exit)}`).toBe(true);
        expect(calls.length).toBeGreaterThan(0);
        const methods = new Set(calls.map((call) => call.method));
        // [EXP-C8] Closure tasks use the language's read-only reachability call; every edge and
        // seed text a relation declares must be in the same language as the answer.
        if (language === "xtql") {
          for (const method of methods) expect(xtqlMethod(method)).toBe(true);
          for (const call of calls) {
            for (const text of [
              call.text,
              ...(call.relations ?? []).flatMap((r) => [r.edges, (r.seeds as any)?.query ?? "("]),
            ]) {
              expect(text.startsWith("(")).toBe(true);
              expect(text).not.toMatch(/\bSELECT\b/);
            }
          }
        } else {
          for (const method of methods) expect(xtqlMethod(method)).toBe(false);
          for (const call of calls) {
            expect(call.text).toMatch(/\bSELECT\b/);
            for (const relation of call.relations ?? []) {
              expect(relation.edges).toMatch(/\bSELECT\b/);
              const query = (relation.seeds as any)?.query;
              if (query !== undefined) expect(query).toMatch(/\bSELECT\b/);
            }
          }
        }
        for (const call of calls)
          for (const relation of call.relations ?? []) expect(relation.seeds).toBeDefined();
        expect(calls[0]!.recordedPosition).toBeUndefined();
        for (const call of calls.slice(1)) expect(call.recordedPosition).toBe(PIN);
        if (calls.length > 1) multiCall++;
      }
      // [EXP-C8] XTQL closure tasks are now one call each (the depth-unrolled completeness
      // checks are gone), so fewer XTQL tasks are multi-call than under EXP-X02's 25.
      expect(multiCall).toBeGreaterThanOrEqual(language === "xtql" ? 20 : 10);
    });
  it("rejects an unknown language", async () => {
    const { workload, entry } = cases[0];
    const { session } = mockSession(entry);
    await expect(
      Effect.runPromise(
        evaluateXtdbNativeWorkload(session, workload, entry, new Map(), [], "sparql" as never),
      ),
    ).rejects.toThrow();
  });
  it("[EXP-C8] answers each closure task with one read-only closure call that names its seeds", async () => {
    const closures = cases.filter(
      ({ workload, entry }: any) =>
        ["11", "13", "14", "15"].includes(workload.id) ||
        (workload.id === "20" && entry.operation === "reachability_closure"),
    );
    expect(closures).toHaveLength(14);
    for (const language of ["xtql", "xtdb-sql"] as XtdbNativeLanguage[])
      for (const { workload, entry } of closures) {
        const { session, calls } = mockSession(entry, canned(entry));
        const exit = await Effect.runPromiseExit(
          evaluateXtdbNativeWorkload(session, workload, entry, new Map(), [], language),
        );
        expect(Exit.isSuccess(exit), String(exit)).toBe(true);
        const closureCalls = calls.filter((call) => call.relations);
        expect(closureCalls).toHaveLength(1);
        expect(closureCalls[0]!.method).toBe(
          language === "xtql" ? "selectWithReachability" : "selectSqlWithReachability",
        );
        // Workload 13's XTQL leaf test keeps the #6345 mark-join build-size refusal (R14 H03).
        const guards = calls.filter((call) => call.name.startsWith("mark-join-build-count"));
        expect(guards).toHaveLength(workload.id === "13" && language === "xtql" ? 1 : 0);
      }
  });
  it("[EXP-C8] refuses the XTQL leaf test, typed, above the mark-join build limit", async () => {
    const workload = packet.workloads.find((w: any) => w.id === "13");
    const entry = workload.cases[0];
    const { session, calls } = mockSession(entry, (name) =>
      name.startsWith("mark-join-build-count") ? [{ edges: "100001" }] : [],
    );
    const exit = await Effect.runPromiseExit(
      evaluateXtdbNativeWorkload(session, workload, entry, new Map(), [], "xtql"),
    );
    expect(String(exit)).toContain("NativeEngineHazardError");
    expect(String(exit)).toContain("#6345");
    expect(calls.filter((call) => call.relations)).toHaveLength(0);
  });
});

describe("exact int64 sums (EXP-X02, RULINGS Q8a)", () => {
  const MAX = 2n ** 63n - 1n,
    MIN = -(2n ** 63n);
  const boundary: Record<string, bigint[]> = {
    // R12 section 7.3's seven cases
    "three-2^62": [2n ** 62n, 2n ** 62n, 2n ** 62n],
    "int64max-plus-1": [MAX, 1n],
    "int64max-plus-min": [MAX, MIN],
    "min-plus-minus1": [MIN, -1n],
    "exact-int64max": [2n ** 62n, 2n ** 62n - 1n],
    "exact-int64min": [-(2n ** 62n), -(2n ** 62n)],
    "mixed-wrap-cancels": [MAX, MAX, -MAX, -MAX, 5n],
    // the brief's +/-(2^63-1) totals
    "total+(2^63-1)": [MAX - 10n, 4n, 6n],
    "total-(2^63-1)": [-MAX + 10n, -4n, -6n],
    // R12's recombination overflows here although the total fits (xtdb-exact-sum.ts)
    "carry-counterexample": [MAX, 2n ** 32n, -(2n ** 32n - 1n), -(2n ** 32n - 1n)],
    "empty": [],
  };
  for (const [name, values] of Object.entries(boundary))
    it(`is exact or overflows iff the total is outside int64: ${name}`, () => {
      const total = values.reduce((sum, value) => sum + value, 0n);
      if (total < MIN || total > MAX) expect(() => simulateExactSum(values)).toThrow(RangeError);
      else expect(simulateExactSum(values)).toBe(total);
    });
  it("shows why the floor normalization is needed", () => {
    expect(() => simulateExactSum(boundary["carry-counterexample"]!, true)).toThrow(RangeError);
  });
  it("is exact on random int64 addends near the boundaries", () => {
    let seed = 12345n;
    const next = () => {
      seed = (seed * 6364136223846793005n + 1442695040888963407n) & (2n ** 64n - 1n);
      return BigInt.asIntN(64, seed);
    };
    for (let round = 0; round < 2000; round++) {
      const values = Array.from({ length: 1 + (round % 7) }, () => next() >> BigInt(round % 3));
      const total = values.reduce((sum, value) => sum + value, 0n);
      if (total < MIN || total > MAX) expect(() => simulateExactSum(values)).toThrow(RangeError);
      else expect(simulateExactSum(values)).toBe(total);
    }
  });
  it("emits the same recombination in both languages", () => {
    const xtql = xtqlExactTotal(["chi", "rhi"], ["clo", "rlo"], "total");
    expect(xtql).toContain("(- (coalesce chi 0) (coalesce rhi 0))");
    expect(xtql).toContain("(if (< x02_r 0) (- x02_q 1) x02_q)");
    expect(xtql).toContain("#xt/type :utf8");
    const sql = sqlExactTotal("SELECT 1 AS x02_h, 2 AS x02_l", "total", ["ledger"]);
    expect(sql).toContain("CASE WHEN x02_r < 0 THEN x02_q - 1 ELSE x02_q END");
    expect(sql).toContain("SELECT ledger, CAST(");
    expect(() => xtqlExactTotal(["a b"], ["c"], "t")).toThrow();
  });
  it("maps only the engine's overflow error to the typed integer-overflow error", async () => {
    const overflow = await Effect.runPromiseExit(
      typedSumOverflow(
        Effect.fail(new Error("XTDB native query failed", { cause: new Error("data exception - overflow error") })),
      ),
    );
    expect(String(overflow)).toContain("NativeIntegerOverflowError");
    const other = await Effect.runPromiseExit(typedSumOverflow(Effect.fail(new Error("timeout"))));
    expect(String(other)).not.toContain("NativeIntegerOverflowError");
    expect(() => checkedInt64(2n ** 63n)).toThrow(NativeIntegerOverflowError);
    expect(checkedInt64(-(2n ** 63n))).toEqual({ type: "integer", value: String(-(2n ** 63n)) });
  });
});
