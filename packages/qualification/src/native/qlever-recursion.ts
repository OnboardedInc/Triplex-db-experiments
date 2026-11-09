/** Native property-path and interval tasks; no Datalog or host source relations. */
import { Effect } from "effect";
import { integer } from "@triplex-build/triplex";
import { TypeExpr } from "@triplex-build/triplex/config";
import type {
  NativeQueryContract,
  NativeReadBasis,
  NativeReadOptions,
  NativeReadResult,
} from "@triplex-build/triplex/runtime";

type RecordValue = Record<string, any>;
interface Context {
  readonly basis: NativeReadBasis;
  readonly graph: string;
  readonly literal: (value: string) => string;
  readonly numberOrder: (value: number) => string;
  readonly nativeNumber: (value: number) => string;
  readonly fact: (
    entity: string,
    attribute: { readonly key: string; readonly type: TypeExpr.TypeExpr },
    value: string,
    options?: { readonly assertion?: string },
  ) => string;
  readonly recordedFact: (
    entity: string,
    attribute: { readonly key: string; readonly type: TypeExpr.TypeExpr },
    value: string,
    options?: {
      readonly assertion?: string;
      readonly validFrom?: string;
      readonly validTo?: string;
    },
  ) => string;
}
interface RelationContext extends Context {
  readonly relation: (name: string, source: string, target: string) => string;
}
interface Session {
  readonly select: (
    contract: NativeQueryContract,
    input: unknown,
    build: (ctx: Context, parameters: unknown) => string,
    options?: NativeReadOptions,
  ) => Effect.Effect<NativeReadResult, unknown>;
  readonly selectWithRelations: (
    contract: NativeQueryContract,
    input: unknown,
    definitions: readonly {
      readonly name: string;
      readonly edges: (ctx: Context, parameters: unknown) => string;
      readonly seeds?: (
        ctx: Context,
        parameters: unknown,
      ) => readonly string[] | { readonly query: string };
    }[],
    build: (ctx: RelationContext, parameters: unknown) => string,
    options?: NativeReadOptions & { readonly maxRelationRows?: number },
  ) => Effect.Effect<NativeReadResult, unknown>;
}
const row = (fields: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(
      Object.entries(fields).map(([name, type]) => [name, TypeExpr.required(type)]),
    ),
  );
const basisOf = (entry: RecordValue) => ({
  recordedAt: 1000 + Number(entry["cut"].known_at),
  validAt: Number(BigInt(entry["cut"].valid_at ?? 0) + 1_000_000n),
});
const fieldIri = (field: string) => `<urn:triplex:field:${field}>`;
export const supportsQleverNativeRecursiveWorkload = (id: string, operation: string) =>
  (
    ({
      "11": ["inherited_access"],
      "13": ["container_items"],
      "14": ["recalled_customers"],
      "15": ["dependency_closure", "vulnerable_deployments"],
      "18": ["uptime_duration"],
      "20": ["reachability_closure"],
    }) as Readonly<Record<string, readonly string[]>>
  )[id]?.includes(operation) ?? false;

export const evaluateQleverNativeRecursiveWorkload = (
  provider: unknown,
  workload: RecordValue,
  entry: RecordValue,
  trace: unknown[],
): Effect.Effect<unknown[][], unknown> =>
  Effect.gen(function* () {
    const native = provider as Session,
      id = String(workload["id"]),
      p = entry["parameters"];
    const attribute = (field: string) => ({
      key: `:w${id}/a${Buffer.from(field).toString("hex")}`,
      type: field.startsWith("_")
        ? TypeExpr.ref("NativeWorkloadIdentity")
        : field === "vulnerable"
          ? TypeExpr.boolean
          : TypeExpr.text,
    });
    const f = (ctx: Context, entity: string, field: string, value: string) =>
      `{ SELECT ${[entity, value].filter((term) => term.startsWith("?")).join(" ")} WHERE { ${ctx.fact(entity, attribute(field), value)} } }`;
    const equal = (ctx: Context, variable: string, value: string) =>
      `FILTER(${variable} = ${ctx.literal(value)})`;
    const record = (result: NativeReadResult) => {
      trace.push({
        operation: "public-native-query",
        logicalTaskId: `${id}/${entry["id"]}`,
        ...result.trace,
      });
      return result.rows as RecordValue[];
    };
    // [EXP-C8] Every relation names its seeds (the bound start), so the native API answers each
    // closure with read-only frontier rounds from those seeds instead of materializing the
    // all-pairs closure in a scratch graph (R10 finding 2, 6.3 Tier 2).
    type Seeds = (ctx: Context, input: RecordValue) => readonly string[] | { readonly query: string };
    const closure = (
      name: string,
      parameters: RecordValue,
      fields: readonly (readonly [string, string, Seeds])[],
      answer: TypeExpr.TypeExpr,
      build: (ctx: RelationContext, input: RecordValue) => string,
    ) =>
      native
        .selectWithRelations(
          {
            name: `workload/${id}/${name}`,
            parameters: row(
              Object.fromEntries(Object.keys(parameters).map((key) => [key, TypeExpr.text])),
            ),
            row: answer,
          },
          parameters,
          fields.map(([name, field, seeds]) => ({
            name,
            edges: (ctx: Context) =>
              `SELECT DISTINCT ?source ?target WHERE { ${f(ctx, "?source", field, "?target")} }`,
            seeds: (ctx: Context, input: unknown) => seeds(ctx, input as RecordValue),
          })),
          (ctx, input) => build(ctx, input as RecordValue),
          { basis: basisOf(entry), timeoutMs: 30_000, maxRows: 1000, maxRelationRows: 100_000 },
        )
        .pipe(Effect.map(record));

    if (id === "11") {
      const rows = yield* closure(
        "inherited-access",
        { user: p.user.value, resource: p.resource.value },
        [
          ["member", "_member", (_c, i) => [String(i["user"])]],
          ["resource", "_resource", (_c, i) => [String(i["resource"])]],
        ],
        row({ allowed: TypeExpr.boolean }),
        (ctx, input) =>
          `SELECT DISTINCT (true AS ?allowed) WHERE { ${ctx.relation("member", "?user", "?principal")} ${equal(ctx, "?user", input["user"])} ${ctx.relation("resource", "?resource", "?grantResource")} ${equal(ctx, "?resource", input["resource"])} ${f(ctx, "?grant", "kind", "?kind")} ${equal(ctx, "?kind", "grant")} ${f(ctx, "?grant", "subject", "?principal")} ${f(ctx, "?grant", "target", "?grantResource")} }`,
      );
      return [[rows.length > 0]];
    }
    if (id === "13") {
      const rows = yield* closure(
        "container-leaves",
        { container: p.container.value },
        [["contains", "_contains", (_c, i) => [String(i["container"])]]],
        row({ item: TypeExpr.text }),
        (ctx, input) =>
          `SELECT DISTINCT ?item WHERE { ${ctx.relation("contains", "?container", "?item")} ${equal(ctx, "?container", input["container"])} FILTER NOT EXISTS { ${f(ctx, "?item", "_contains", "?child")} } }`,
      );
      return rows.map((value) => [value["item"]]);
    }
    if (id === "14") {
      const rows = yield* closure(
        "recalled-customers",
        { lot: p.contaminated_lot.value },
        [["production", "_production", (_c, i) => [String(i["lot"])]]],
        row({ customer: TypeExpr.text }),
        (ctx, input) =>
          `SELECT DISTINCT ?customer WHERE { ${f(ctx, "?contamination", "contaminated_lot", "?contaminatedLot")} ${equal(ctx, "?contaminatedLot", input["lot"])} ${ctx.relation("production", "?sourceLot", "?lot")} ${equal(ctx, "?sourceLot", input["lot"])} ${f(ctx, "?shipment", "shipped_lot", "?lot")} ${f(ctx, "?shipment", "customer", "?customer")} }`,
      );
      return rows.map((value) => [value["customer"]]);
    }
    if (id === "15") {
      const requestedClosure = entry["operation"] === "dependency_closure";
      const rows = yield* closure(
        requestedClosure ? "dependency-closure" : "vulnerable-deployments",
        requestedClosure
          ? { application: p.application.value }
          : { environment: p.environment.value },
        [
          [
            "dependency",
            "_dependency",
            requestedClosure
              ? (_c, i) => [String(i["application"])]
              : (ctx, i) => ({
                  // Every application deployed in the environment: a few-source closure.
                  query: `SELECT DISTINCT ?seed WHERE { ${f(ctx, "?deployment", "environment", "?environment")} ${equal(ctx, "?environment", i["environment"])} ${f(ctx, "?deployment", "application", "?seed")} }`,
                }),
          ],
        ],
        row({ answer: TypeExpr.text }),
        (ctx, input) =>
          requestedClosure
            ? `SELECT DISTINCT (?dependency AS ?answer) WHERE { ${ctx.relation("dependency", "?application", "?dependency")} ${equal(ctx, "?application", input["application"])} }`
            : `SELECT DISTINCT (?application AS ?answer) WHERE { ${f(ctx, "?deployment", "environment", "?environment")} ${equal(ctx, "?environment", input["environment"])} ${f(ctx, "?deployment", "application", "?application")} ${ctx.relation("dependency", "?application", "?dependency")} ${f(ctx, "?vulnerability", "vulnerable_subject", "?dependency")} ${f(ctx, "?vulnerability", "vulnerable", "?vulnerable")} FILTER(?vulnerable = "1") }`,
      );
      return rows.map((value) => [value["answer"]]);
    }
    if (id === "20") {
      const rows = yield* closure(
        "reachability-closure",
        { from: p.from.value },
        [["support", "_support", (_c, i) => [String(i["from"])]]],
        row({ target: TypeExpr.text }),
        (ctx, input) =>
          `SELECT DISTINCT ?target WHERE { ${ctx.relation("support", "?source", "?target")} ${equal(ctx, "?source", input["from"])} }`,
      );
      return rows.map((value) => [value["target"]]);
    }
    if (id === "18") {
      const values = {
        machine: p.machine.value,
        from: Number(BigInt(p.from.value) + 1_000_000n),
        to: Number(BigInt(p.to.value) + 1_000_000n),
      };
      const parameters = row({
        machine: TypeExpr.text,
        from: TypeExpr.number,
        to: TypeExpr.number,
      });
      const source = (ctx: Context, input: RecordValue, prefix = "proof") => {
        const n = (key: string) => `?${prefix}_${key}`;
        const recorded = ctx.recordedFact(n("event"), attribute("machine"), n("machine"), {
          assertion: n("assertion"),
          validFrom: n("fromLexical"),
          validTo: n("toLexical"),
        });
        return `${recorded} ${equal(ctx, n("machine"), input["machine"])} GRAPH ${ctx.graph} { ${n("assertion")} ${fieldIri("valid_from_order")} ${n("fromOrder")} . OPTIONAL { ${n("assertion")} ${fieldIri("valid_to_order")} ${n("toOrder")} } } FILTER(${n("fromOrder")} < ${ctx.numberOrder(input["to"])} && (!BOUND(${n("toOrder")}) || ${n("toOrder")} > ${ctx.numberOrder(input["from"])}))`;
      };
      const proof = yield* native.select(
        {
          name: "workload/18/native-time-channel-proof",
          parameters,
          row: row({ invalid: TypeExpr.int64 }),
        },
        values,
        (ctx, input) => {
          const v = input as RecordValue;
          return `SELECT (COUNT(*) AS ?invalid) WHERE { ${source(ctx, v)} FILTER(NOT EXISTS { GRAPH ${ctx.graph} { ?proof_assertion ${fieldIri("valid_from_exact")} "true" } } || (BOUND(?proof_toLexical) && NOT EXISTS { GRAPH ${ctx.graph} { ?proof_assertion ${fieldIri("valid_to_exact")} "true" } })) }`;
        },
        { basis: basisOf(entry), maxRows: 1, timeoutMs: 30_000 },
      );
      const invalid = (record(proof)[0]!["invalid"] as { value: string }).value;
      if (BigInt(invalid) !== 0n)
        throw new RangeError(
          "Native uptime arithmetic lacks exact relevant time channels; no partial answer",
        );
      const positive = yield* native.select(
        {
          name: "workload/18/positive-clipped-span-count",
          parameters,
          row: row({ count: TypeExpr.int64 }),
        },
        values,
        (ctx, input) => {
          const v = input as RecordValue,
            from = ctx.nativeNumber(v["from"]),
            to = ctx.nativeNumber(v["to"]);
          return `SELECT (COUNT(*) AS ?count) WHERE { ${source(ctx, v, "positive")} GRAPH ${ctx.graph} { ?positive_assertion ${fieldIri("valid_from_native")} ?rawLo . OPTIONAL { ?positive_assertion ${fieldIri("valid_to_native")} ?rawHi } } BIND(IF(?rawLo > ${from}, ?rawLo, ${from}) AS ?lo) BIND(IF(!BOUND(?rawHi) || ?rawHi > ${to}, ${to}, ?rawHi) AS ?hi) FILTER(?lo < ?hi) }`;
        },
        {
          basis: { ...basisOf(entry), recordedPosition: proof.basis.recordedPosition },
          maxRows: 1,
          timeoutMs: 30_000,
        },
      );
      // Observed in helper v3/v4: QLever0.6 GroupByImpl.cpp509 rejects empty
      // SUM, even SUM(boundVariable). The native COUNT proves an empty set
      // of positive clipped spans at the SAME cut; only its declared scalar
      // identity is normalized. No interval/source relation leaves QLever.
      if (BigInt((record(positive)[0]!["count"] as { value: string }).value) === 0n) {
        trace.push({
          normalization:
            "Native fixed-cut positive-span COUNT0 supplies the declared empty-duration identity",
          sourcePosition: proof.basis.recordedPosition,
        });
        return [[integer(0n)]];
      }
      const answer = yield* native.select(
        {
          name: "workload/18/endpoint-segmentation",
          parameters,
          row: row({ duration: TypeExpr.int64 }),
        },
        values,
        (ctx, input) => {
          const v = input as RecordValue,
            from = ctx.nativeNumber(v["from"]),
            to = ctx.nativeNumber(v["to"]);
          let sequence = 0;
          // QLever0.6 asserts on leaked common variables in Cartesian subquery
          // products (helper-interval-v1). Alpha-rename every private source
          // and endpoint; retain only intentional outer correlations.
          const clipped = () => {
            const prefix = `clip_${sequence++}`,
              n = (key: string) => `?${prefix}_${key}`;
            return {
              lo: n("lo"),
              hi: n("hi"),
              body: `{ SELECT DISTINCT ${n("lo")} ${n("hi")} WHERE { ${source(ctx, v, prefix)} GRAPH ${ctx.graph} { ${n("assertion")} ${fieldIri("valid_from_native")} ${n("rawLo")} . OPTIONAL { ${n("assertion")} ${fieldIri("valid_to_native")} ${n("rawHi")} } } BIND(IF(${n("rawLo")} > ${from}, ${n("rawLo")}, ${from}) AS ${n("lo")}) BIND(IF(!BOUND(${n("rawHi")}) || ${n("rawHi")} > ${to}, ${to}, ${n("rawHi")}) AS ${n("hi")}) } }`,
            };
          };
          const points = (variable: string) => {
            const low = clipped(),
              high = clipped();
            return `{ SELECT DISTINCT ${variable} WHERE { { ${low.body} BIND(${low.lo} AS ${variable}) } UNION { ${high.body} BIND(${high.hi} AS ${variable}) } } }`;
          };
          const left = points("?left"),
            candidate = points("?candidate"),
            covering = clipped();
          // MIN supplies the next greater endpoint without correlated negation.
          // A positive coverage join plus DISTINCT counts overlapping intervals
          // once. The earlier anti-correlated form triggers native planner53.
          return `SELECT (COALESCE(SUM(?span), 0) AS ?duration) WHERE { { SELECT DISTINCT ?left ?right WHERE { { SELECT ?left (MIN(?candidate) AS ?right) WHERE { ${left} ${candidate} FILTER(?candidate > ?left) } GROUP BY ?left } ${covering.body} FILTER(${covering.lo} <= ?left && ${covering.hi} >= ?right) } } BIND(?right - ?left AS ?span) }`;
        },
        {
          basis: { ...basisOf(entry), recordedPosition: proof.basis.recordedPosition },
          maxRows: 1,
          timeoutMs: 30_000,
        },
      );
      trace.push({
        normalization:
          "Native interval endpoint union; exact-shadow proof and answer share one source position; no source intervals leave QLever",
      });
      return record(answer).map((value) => [value["duration"]]);
    }
    throw new Error(`UNSUPPORTED_PUBLIC_NATIVE_WORKLOAD:qlever:${id}:${entry["operation"]}`);
  });
