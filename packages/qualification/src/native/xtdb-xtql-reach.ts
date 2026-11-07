/**
 * Read-only reachability in pure XTQL for the six closure operations (workloads 11, 13, 14,
 * 15 and 20's closure; 14 logical tasks).
 *
 * // [EXP-X02] interim, replaced by EXP-X03
 *
 * [EXP-X02] Why: XTDB 2.2.0 XTQL has no recursion and `union-all` cannot be planned, so
 * "x reaches t" is unrolled to an explicit depth D:
 *   REACH(src, t, D) = (or (exists? chain_1) ... (exists? chain_D)),
 * where chain_d is d self-joins of the edge view (first edge from src, last edge into t).
 * Completeness is never assumed. Before the answer query, a second XTQL query per closure
 * returns a row iff some node at hop D+1 lies outside the hop <= D set (the breadth-first
 * fixpoint test, which also holds on cycles: if every hop-(D+1) node is within D hops, so is
 * every longer walk, by induction). D rises from 1 until every closure of the task is at its
 * fixpoint; past XTQL_REACH_MAX_DEPTH the task fails with NativeRecursionDepthError and
 * returns no partial closure. Edges are the reference facts of the edge attribute, the same
 * definition as the SQL helper's (`value_type = 'ref'`). No statement writes.
 * Inspired by: R12 section 5 (design, completeness check, D^2 statement growth) and its
 * reach-xtql.ts; references/xtdb @ c6c1962 core/src/main/clojure/xtdb/xtql.clj:141-159
 * (exists? subqueries take arguments; outer variables are not visible), 611-617 (union-all
 * parses), xtql/plan.clj (no PlanQuery for UnionAll).
 * Rejected: the SQL scratch-table rounds with XTQL bodies (hybrid and mutating, R12 5.4 A);
 * host frontier iteration (C8's design, which EXP-X03 builds after R10); an unbounded loop.
 */
import { Effect } from "effect";
import { TypeExpr } from "@triplex-build/triplex/config";
import { NativeRecursionDepthError } from "./xtdb-native-errors.js";

type RecordValue = Record<string, any>;
export interface XtqlReachContext {
  readonly bind: (value: unknown) => string;
  readonly attribute: (attribute: string | { readonly key: string }) => string;
  readonly facts: () => string;
}
type Builder = (ctx: XtqlReachContext, input: RecordValue) => string;
export type XtqlReachCall = (
  name: string,
  values: Record<string, unknown>,
  resultType: TypeExpr.TypeExpr,
  build: Builder,
) => Effect.Effect<RecordValue[], unknown>;

/** Explicit depth budget. R12 measured 56 KB and 191 parameters at D = 8 (section 5.3). */
export const XTQL_REACH_MAX_DEPTH = 8;

const row = (fields: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, TypeExpr.required(type)])),
  );
/** One attribute-filtered view of the closed basis relation, joined into the enclosing unify. */
export const view = (c: XtqlReachContext, attribute: string, bind: string, where = "") =>
  `(join (-> ${c.facts()} (where (= attribute ${c.attribute(attribute)})${where ? " " + where : ""})) [${bind}])`;

/** d edge hops from `src` to `tgt` (both XTQL expressions: fn parameters or variables). */
const chain = (c: XtqlReachContext, edge: string, d: number, src: string, tgt: string) => {
  const parts: string[] = [];
  for (let k = 0; k < d; k++) {
    const where = [
      '(= value_type "ref")',
      k === 0 ? `(= entity_id ${src})` : "",
      k === d - 1 ? `(= value_string ${tgt})` : "",
    ]
      .filter(Boolean)
      .join(" ");
    parts.push(view(c, edge, `{:entity_id n${k}} {:value_string n${k + 1}}`, where));
  }
  return `(unify ${parts.join(" ")})`;
};

/** Hop 1..D membership of `t` in the closure from `src`, as an XTQL predicate. */
export const reachPredicate = (
  c: XtqlReachContext,
  edge: string,
  src: string,
  t: string,
  depth: number,
) =>
  `(or ${Array.from({ length: depth }, (_, k) => `(exists? [(fn [s t] ${chain(c, edge, k + 1, "s", "t")}) ${src} ${t}])`).join(" ")})`;

/** Returns a row iff the closure from the bound source is not at its fixpoint at `depth`. */
const incomplete =
  (edge: string, source: string, depth: number): Builder =>
  (c, input) => {
    const src = c.bind(input[source]);
    const parts: string[] = [];
    for (let k = 0; k <= depth; k++)
      parts.push(
        view(
          c,
          edge,
          `{:entity_id n${k}} {:value_string n${k + 1}}`,
          `(= value_type "ref")${k === 0 ? ` (= entity_id ${src})` : ""}`,
        ),
      );
    return `(-> (unify ${parts.join(" ")} (where (not ${reachPredicate(c, edge, src, `n${depth + 1}`, depth)}))) (limit 1) (return {:incomplete true}))`;
  };

export const evaluateXtqlReachability = (input: {
  readonly id: string;
  readonly operation: string;
  readonly p: any;
  readonly a: (field: string) => string;
  readonly call: XtqlReachCall;
  readonly maxDepth?: number;
}): Effect.Effect<unknown[][], unknown> =>
  Effect.gen(function* () {
    const { id, operation, p, a, call } = input;
    const maxDepth = input.maxDepth ?? XTQL_REACH_MAX_DEPTH;
    const flag = row({ incomplete: TypeExpr.boolean });
    // The smallest D at which every listed closure is complete, by one XTQL call per closure and D.
    const settle = (checks: readonly { edge: string; source: string }[], values: RecordValue) =>
      Effect.gen(function* () {
        for (let depth = 1; depth <= maxDepth; depth++) {
          let complete = true;
          for (const { edge, source } of checks) {
            const rows = yield* call(
              `reach-complete-${edge}-${depth}`,
              values,
              flag,
              incomplete(a(edge), source, depth),
            );
            if (rows.length) complete = false;
          }
          if (complete) return depth;
        }
        return yield* Effect.fail(
          new NativeRecursionDepthError({
            code: "recursion-depth-exceeded",
            maxDepth,
            message: `XTQL reachability is not at its fixpoint within depth ${maxDepth}; no partial closure returned`,
          }),
        );
      });
    const closureTargets = (edge: string) => (c: XtqlReachContext) =>
      view(c, a(edge), "{:value_string t}", '(= value_type "ref")');

    if (id === "20" && operation === "reachability_closure") {
      const values = { from: p.from.value };
      const depth = yield* settle([{ edge: "_support", source: "from" }], values);
      const rows = yield* call(
        "reachability-closure",
        values,
        row({ target: TypeExpr.text }),
        (c, i) =>
          `(-> (unify ${closureTargets("_support")(c)} (where ${reachPredicate(c, a("_support"), c.bind(i["from"]), "t", depth)})) (aggregate t) (return {:target t}))`,
      );
      return rows.map((value) => [value["target"]]);
    }
    if (id === "13") {
      const values = { container: p.container.value };
      const depth = yield* settle([{ edge: "_contains", source: "container" }], values);
      const rows = yield* call(
        "container-leaves",
        values,
        row({ item: TypeExpr.text }),
        (c, i) =>
          `(-> (unify ${closureTargets("_contains")(c)} (where ${reachPredicate(c, a("_contains"), c.bind(i["container"]), "t", depth)} (not (exists? [(fn [t2] (-> ${c.facts()} (where (= entity_id t2) (= attribute ${c.attribute(a("_contains"))})))) t])))) (aggregate t) (return {:item t}))`,
      );
      return rows.map((value) => [value["item"]]);
    }
    if (id === "14") {
      const values = { lot: p.contaminated_lot.value };
      const depth = yield* settle([{ edge: "_production", source: "lot" }], values);
      const rows = yield* call(
        "recalled-customers",
        values,
        row({ customer: TypeExpr.text }),
        (c, i) =>
          `(-> (unify ${view(c, a("shipped_lot"), "{:entity_id sh} {:value_string t}")} ${view(c, a("customer"), "{:entity_id sh} {:value_string cust}")} (where ${reachPredicate(c, a("_production"), c.bind(i["lot"]), "t", depth)} (exists? (-> ${c.facts()} (where (= attribute ${c.attribute(a("contaminated_lot"))}) (= value_string ${c.bind(i["lot"])})))))) (aggregate cust) (return {:customer cust}))`,
      );
      return rows.map((value) => [value["customer"]]);
    }
    if (id === "15" && operation === "dependency_closure") {
      const values = { application: p.application.value };
      const depth = yield* settle([{ edge: "_dependency", source: "application" }], values);
      const rows = yield* call(
        "dependency-closure",
        values,
        row({ answer: TypeExpr.text }),
        (c, i) =>
          `(-> (unify ${closureTargets("_dependency")(c)} (where ${reachPredicate(c, a("_dependency"), c.bind(i["application"]), "t", depth)})) (aggregate t) (return {:answer t}))`,
      );
      return rows.map((value) => [value["answer"]]);
    }
    if (id === "15") {
      // The closure source is a variable (every application in the environment), so one
      // completeness query covers all of them at once.
      const values = { environment: p.environment.value };
      const applications = (c: XtqlReachContext, i: RecordValue) =>
        `${view(c, a("environment"), "{:entity_id e}", `(= value_string ${c.bind(i["environment"])})`)} ${view(c, a("application"), "{:entity_id e} {:value_string app}")}`;
      let depth = 0;
      for (let d = 1; d <= maxDepth && depth === 0; d++) {
        const rows = yield* call(`reach-complete-environment-${d}`, values, flag, (c, i) => {
          const parts = [applications(c, i)];
          for (let k = 0; k <= d; k++)
            parts.push(
              view(
                c,
                a("_dependency"),
                `{:entity_id ${k === 0 ? "app" : `m${k}`}} {:value_string m${k + 1}}`,
                '(= value_type "ref")',
              ),
            );
          return `(-> (unify ${parts.join(" ")} (where (not ${reachPredicate(c, a("_dependency"), "app", `m${d + 1}`, d)}))) (limit 1) (return {:incomplete true}))`;
        });
        if (!rows.length) depth = d;
      }
      if (depth === 0)
        return yield* Effect.fail(
          new NativeRecursionDepthError({
            code: "recursion-depth-exceeded",
            maxDepth,
            message: `XTQL reachability is not at its fixpoint within depth ${maxDepth}; no partial closure returned`,
          }),
        );
      const rows = yield* call(
        "vulnerable-deployments",
        values,
        row({ answer: TypeExpr.text }),
        (c, i) =>
          `(-> (unify ${applications(c, i)} ${view(c, a("vulnerable_subject"), "{:entity_id v} {:value_string t}")} ${view(c, a("vulnerable"), "{:entity_id v}", "(= value_boolean 1)")} (where ${reachPredicate(c, a("_dependency"), "app", "t", depth)})) (aggregate app) (return {:answer app}))`,
      );
      return rows.map((value) => [value["answer"]]);
    }
    if (id === "11") {
      const values = { user: p.user.value, resource: p.resource.value };
      const depth = yield* settle(
        [
          { edge: "_member", source: "user" },
          { edge: "_resource", source: "resource" },
        ],
        values,
      );
      const rows = yield* call(
        "inherited-access",
        values,
        row({ allowed: TypeExpr.boolean }),
        (c, i) =>
          `(-> (unify ${view(c, a("kind"), "{:entity_id g}", '(= value_string "grant")')} ${view(c, a("subject"), "{:entity_id g} {:value_string s}")} ${view(c, a("target"), "{:entity_id g} {:value_string r}")} (where ${reachPredicate(c, a("_member"), c.bind(i["user"]), "s", depth)} ${reachPredicate(c, a("_resource"), c.bind(i["resource"]), "r", depth)})) (return {:allowed true}) (aggregate allowed))`,
      );
      return [[rows.length > 0]];
    }
    throw new Error(`UNSUPPORTED_PUBLIC_NATIVE_WORKLOAD:xtdb:${id}:${operation}`);
  });
