/**
 * EXP-X02 unit checks of the XTDB native task library (no engine).
 *
 * The live checks (controls with hand-derived answers, mutants, a writer between calls,
 * int64 boundaries) are in workloads/xtdb-native-x02.ts and need an engine.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Cause, Effect, Exit } from "effect";
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
import { loadQualificationBackend } from "../src/index.js";
import { XTQL_REACH_MAX_DEPTH } from "../src/native/xtdb-xtql-reach.js";

const root = path.resolve(import.meta.dirname, "../../..");
const packet = JSON.parse(
  readFileSync(path.join(root, "qualification/workloads/temporal-workloads.json"), "utf8"),
);
const PIN = 7;

interface Call {
  readonly method: "select" | "selectSql" | "selectSqlWithReachability";
  readonly name: string;
  readonly text: string;
  readonly recordedPosition: number | undefined;
}
/** A session that runs every builder against placeholder relations and returns canned rows. */
const mockSession = (
  entry: Record<string, any>,
  rowsFor: (name: string) => unknown[] = () => [],
): { session: XtdbNativeTaskSession; calls: Call[] } => {
  const calls: Call[] = [];
  const make =
    (method: Call["method"]) =>
    (contract: any, input: unknown, ...rest: any[]) => {
      const build = method === "selectSqlWithReachability" ? rest[1] : rest[0];
      const options = method === "selectSqlWithReachability" ? rest[2] : rest[1];
      let n = 0;
      const ctx = {
        basis: {},
        bind: () => (method === "select" ? `triplex_param_${++n}` : `$${++n}`),
        attribute: () => (method === "select" ? `triplex_param_${++n}` : `$${++n}`),
        identifier: (name: string) => name,
        facts: () => (method === "select" ? "(-> FACTS)" : "(SELECT * FROM FACTS)"),
        recordedFacts: () => (method === "select" ? "(-> RECORDED)" : "(SELECT * FROM RECORDED)"),
        history: () => "HISTORY",
        relation: () => "(SELECT source, target FROM WORKING)",
      };
      const name = String(contract.name).split("/").slice(2).join("/");
      const text = build(ctx, input);
      calls.push({ method, name, text, recordedPosition: options?.basis?.recordedPosition });
      return Effect.succeed({
        rows: rowsFor(name),
        basis: { recordedPosition: options?.basis?.recordedPosition ?? PIN },
        trace: { language: method === "select" ? "xtql" : "xtdb-sql", steps: [] },
      } as any);
    };
  void entry;
  return {
    calls,
    session: {
      select: make("select"),
      selectSql: make("selectSql"),
      selectSqlWithReachability: make("selectSqlWithReachability"),
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
        if (language === "xtql") {
          expect([...methods]).toEqual(["select"]);
          for (const call of calls) {
            expect(call.text.startsWith("(")).toBe(true);
            expect(call.text).not.toMatch(/\bSELECT\b/);
          }
        } else {
          expect(methods.has("select")).toBe(false);
          for (const call of calls) expect(call.text).toMatch(/\bSELECT\b/);
        }
        expect(calls[0]!.recordedPosition).toBeUndefined();
        for (const call of calls.slice(1)) expect(call.recordedPosition).toBe(PIN);
        if (calls.length > 1) multiCall++;
      }
      expect(multiCall).toBeGreaterThanOrEqual(language === "xtql" ? 25 : 10);
    });
  it("keeps the unset library's XTQL point reads and SQL recursive path", async () => {
    for (const { workload, entry } of cases) {
      const { session, calls } = mockSession(entry, canned(entry));
      const exit = await Effect.runPromiseExit(
        evaluateXtdbNativeWorkload(session, workload, entry, new Map([[0, 0]]), []),
      );
      expect(Exit.isSuccess(exit), `${workload.id}/${entry.id}: ${String(exit)}`).toBe(true);
      for (const call of calls) {
        if (call.name === "state-at") expect(call.method).toBe("select");
        else expect(call.method).not.toBe("select");
        expect(call.name.startsWith("reach-complete")).toBe(false);
      }
      if (entry.operation === "reachability_closure")
        expect(calls.some((call) => call.method === "selectSqlWithReachability")).toBe(true);
    }
  });
  it("leaves nativeLanguage unset unless explicitly selected", async () => {
    const previousPath = process.env.TRIPLEX_QUERY_PATH;
    const previousLanguage = process.env.TRIPLEX_XTDB_NATIVE_LANGUAGE;
    try {
      process.env.TRIPLEX_QUERY_PATH = "xtdb-native";
      delete process.env.TRIPLEX_XTDB_NATIVE_LANGUAGE;
      expect((await loadQualificationBackend()).nativeLanguage).toBeUndefined();
      for (const language of ["xtql", "xtdb-sql"]) {
        process.env.TRIPLEX_XTDB_NATIVE_LANGUAGE = language;
        expect((await loadQualificationBackend()).nativeLanguage).toBe(language);
      }
    } finally {
      if (previousPath === undefined) delete process.env.TRIPLEX_QUERY_PATH;
      else process.env.TRIPLEX_QUERY_PATH = previousPath;
      if (previousLanguage === undefined) delete process.env.TRIPLEX_XTDB_NATIVE_LANGUAGE;
      else process.env.TRIPLEX_XTDB_NATIVE_LANGUAGE = previousLanguage;
    }
  });
  for (const language of ["xtql", "xtdb-sql"] as const)
    it(`inventory overflow is Fail and catchTag recovers in ${language}`, async () => {
      const { workload, entry } = cases.find(({ workload }: any) => workload.id === "07");
      const run = () => {
        const { session } = mockSession(entry, () => [
          { ledger: "physical", total: "9223372036854775807" },
          { ledger: "reservation", total: "-1" },
        ]);
        return evaluateXtdbNativeWorkload(session, workload, entry, new Map(), [], language);
      };
      const exit = await Effect.runPromiseExit(run());
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(Cause.hasDies(exit.cause)).toBe(false);
        expect(String(exit.cause)).toContain("NativeIntegerOverflowError");
      }
      expect(
        await Effect.runPromise(
          run().pipe(
            Effect.catchTag("NativeIntegerOverflowError" as never, () => Effect.succeed("handled")),
          ),
        ),
      ).toBe("handled");
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
  it("fails typed, with no partial closure, when the XTQL fixpoint is not reached", async () => {
    const workload = packet.workloads.find((w: any) => w.id === "20");
    const entry = workload.cases.find((c: any) => c.operation === "reachability_closure");
    const { session, calls } = mockSession(entry, (name) =>
      name.startsWith("reach-complete") ? [{ incomplete: true }] : [{ target: "x" }],
    );
    const exit = await Effect.runPromiseExit(
      evaluateXtdbNativeWorkload(session, workload, entry, new Map(), [], "xtql"),
    );
    expect(String(exit)).toContain("NativeRecursionDepthError");
    expect(calls.filter((call) => call.name === "reachability-closure")).toHaveLength(0);
    expect(calls).toHaveLength(XTQL_REACH_MAX_DEPTH + 1); // edge-count guard + one check per depth
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
    empty: [],
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
        Effect.fail(
          new Error("XTDB native query failed", {
            cause: new Error("data exception - overflow error"),
          }),
        ),
      ),
    );
    expect(String(overflow)).toContain("NativeIntegerOverflowError");
    const other = await Effect.runPromiseExit(typedSumOverflow(Effect.fail(new Error("timeout"))));
    expect(String(other)).not.toContain("NativeIntegerOverflowError");
    expect(() => checkedInt64(2n ** 63n)).toThrow(NativeIntegerOverflowError);
    expect(checkedInt64(-(2n ** 63n))).toEqual({ type: "integer", value: String(-(2n ** 63n)) });
  });
});
