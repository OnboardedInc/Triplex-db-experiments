/**
 * Authored native SPARQL business tasks. No Datalog compiler, expected answers,
 * or host materialization of an ordinary source relation enters this module.
 */
import { Effect } from "effect";
import { integer } from "@triplex-build/triplex";
import { TypeExpr } from "@triplex-build/triplex/config";
import type {
  NativeQueryContract,
  NativeReadBasis,
  NativeReadOptions,
  NativeReadResult,
} from "@triplex-build/triplex/runtime";
import {
  supportsQleverNativeRecursiveWorkload,
  evaluateQleverNativeRecursiveWorkload,
} from "./qlever-recursion.js";

type RecordValue = Record<string, any>;
type EntityLiteral = { readonly _tag: "QleverNativeEntity"; readonly value: string };
interface Context {
  readonly basis: NativeReadBasis;
  readonly graph: string;
  readonly entity: (value: string) => EntityLiteral;
  readonly literal: (value: string) => string;
  readonly integerOrder: (value: string | bigint) => string;
  readonly numberOrder: (value: number) => string;
  readonly fact: (
    entity: string | EntityLiteral,
    attribute: { readonly key: string; readonly type: TypeExpr.TypeExpr },
    value: string,
    options?: { readonly assertion?: string; readonly order?: string },
  ) => string;
}
export interface QleverNativeTaskSession {
  readonly select: (
    contract: NativeQueryContract,
    input: unknown,
    build: (ctx: Context, parameters: unknown) => string,
    options?: NativeReadOptions,
  ) => Effect.Effect<NativeReadResult, unknown>;
}

/** Authored inventory; every true entry still needs its real native gate. */
export const supportsQleverNativeWorkload = (id: string, operation: string): boolean =>
  supportsQleverNativeRecursiveWorkload(id, operation) ||
  ((
    {
      "01": ["state_at"],
      "02": ["state_at"],
      "03": ["price_at_purchase", "state_at"],
      "04": ["coverage_at_claim", "relation_exists"],
      "05": ["accepted_event_count", "state_at"],
      "06": ["account_balance"],
      "07": ["inventory_balance"],
      "08": ["customer_net_revenue"],
      "09": ["paid_without_entitlement"],
      "10": ["workflow_status"],
      "12": ["access_with_deny"],
      "16": ["output_lineage"],
      "17": ["conversion_funnel", "session_conversion"],
      "19": ["training_example", "state_at"],
      "20": ["reachability_supports"],
    } as Record<string, readonly string[]>
  )[id]?.includes(operation) ??
    false);

const row = (fields: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, TypeExpr.required(type)])),
  );
const inputType = (value: unknown): TypeExpr.TypeExpr =>
  typeof value === "string"
    ? TypeExpr.text
    : typeof value === "boolean"
      ? TypeExpr.boolean
      : typeof value === "number"
        ? TypeExpr.number
        : TypeExpr.int64;
const exact = (value: any): bigint => {
  if (value?.type === "integer") return BigInt(value["value"]);
  if (
    typeof value === "string" ||
    typeof value === "bigint" ||
    (typeof value === "number" && Number.isSafeInteger(value))
  )
    return BigInt(value);
  throw new TypeError("A native task returned an inexact integer");
};
const basisOf = (entry: RecordValue) => ({
  recordedAt: 1000 + Number(entry["cut"].known_at),
  validAt: Number(BigInt(entry["cut"].valid_at ?? 0) + 1_000_000n),
});
const intFields = new Set([
  "price",
  "purchased_at",
  "claim_at",
  "revision",
  "amount",
  "delta",
  "deadline",
  "completed_at",
  "through",
  "code_version",
  "at",
  "predicted_at",
  "feature_known_at",
  "balance",
]);
const textFields = new Set([
  "status",
  "address",
  "product",
  "coverage_customer",
  "webhook_object",
  "account",
  "currency",
  "sku",
  "ledger",
  "customer",
  "capture",
  "subject",
  "subscription",
  "source",
  "kind",
  "target",
  "principal",
  "output",
  "input",
  "input_a",
  "input_b",
  "session",
  "step",
]);
// Authority: qualification/workloads/engine_cases.mjs schemaFor and
// interval_join_cases.mjs coverageFields/nativeIntervalJoinWrite. In particular
// claim_at is declared int64 and written as i64, despite its time-like name.
// Keep this workload mapping closed so a missing field cannot silently use a
// text payload predicate. Public native callers pass real schema TypeExprs.
const typeOf = (field: string): TypeExpr.TypeExpr => {
  if (intFields.has(field)) return TypeExpr.int64;
  if (["paid", "entitled", "fraud"].includes(field) || field.startsWith("covers/"))
    return TypeExpr.boolean;
  if (field === "_support") return TypeExpr.ref("NativeWorkloadIdentity");
  if (textFields.has(field)) return TypeExpr.text;
  throw new TypeError(`Undeclared native workload attribute type: ${field}`);
};
const fieldIri = (field: string) => `<urn:triplex:field:${field}>`;

export const evaluateQleverNativeWorkload = (
  native: QleverNativeTaskSession,
  workload: RecordValue,
  entry: RecordValue,
  positionToLogical: ReadonlyMap<number, number>,
  trace: unknown[],
): Effect.Effect<unknown[][], unknown> =>
  Effect.gen(function* () {
    const id = String(workload["id"]),
      p = entry["parameters"];
    if (supportsQleverNativeRecursiveWorkload(id, entry["operation"]))
      return yield* evaluateQleverNativeRecursiveWorkload(native, workload, entry, trace);
    const attribute = (field: string) => ({
      key: `:w${id}/a${Buffer.from(field).toString("hex")}`,
      type: typeOf(field),
    });
    // Project each typed assertion leaf before joining business relations. This
    // follows QLever's subquery boundary mechanism (ScalarSource.ts), but has no
    // Datalog AST/payload pivot and retains authored native SPARQL composition.
    const f = (
      ctx: Context,
      entity: string | EntityLiteral,
      field: string,
      value: string,
      options: { assertion?: string; order?: string } = {},
    ) => {
      const variables = [
        ...new Set(
          [entity, value, options.order, options.assertion].filter(
            (name): name is string => typeof name === "string" && name.startsWith("?"),
          ),
        ),
      ];
      return `{ SELECT ${variables.join(" ")} WHERE { ${ctx.fact(entity, attribute(field), value, options)} } }`;
    };
    const eq = (ctx: Context, variable: string, value: string) =>
      `FILTER(${variable} = ${ctx.literal(value)})`;
    // The retained writer-interleaving control used [P1,P1,P2,P2] inside one
    // capture/refund task. Capture its first returned upper P once, then use
    // that cut for later calls even when the writer commits between calls.
    // Deliberate earlier subcut P (training features) remains earlier; R and V
    // may also differ. This bounds a task, not a global application snapshot.
    let taskUpperPosition: number | undefined;
    const queryAnswer = (
      name: string,
      parameters: RecordValue,
      result: TypeExpr.TypeExpr,
      build: (ctx: Context, input: RecordValue) => string,
      at = entry,
      sourceBasis?: Pick<NativeReadBasis, "recordedPosition">,
    ) => {
      const position = sourceBasis?.recordedPosition ?? taskUpperPosition;
      if (taskUpperPosition !== undefined && position !== undefined && position > taskUpperPosition)
        throw new RangeError("Native subcut cannot exceed the captured task source position");
      return native
        .select(
          {
            name: `workload/${id}/${name}`,
            parameters: row(
              Object.fromEntries(
                Object.entries(parameters).map(([key, value]) => [key, inputType(value)]),
              ),
            ),
            row: result,
          },
          parameters,
          (ctx, input) => build(ctx, input as RecordValue),
          {
            basis: {
              ...basisOf(at),
              ...(position === undefined ? {} : { recordedPosition: position }),
            },
            maxRows: 1000,
            timeoutMs: 20_000,
          },
        )
        .pipe(
          Effect.map((answer) => {
            taskUpperPosition ??= answer.basis.recordedPosition;
            if (answer.basis.recordedPosition > taskUpperPosition)
              throw new RangeError("Native provider returned a position beyond the task cut");
            trace.push({
              operation: "public-native-query",
              logicalTaskId: `${id}/${entry["id"]}`,
              ...answer.trace,
              taskUpperRecordedPosition: taskUpperPosition,
            });
            return answer;
          }),
        );
    };
    const query = (...args: Parameters<typeof queryAnswer>) =>
      queryAnswer(...args).pipe(Effect.map((answer) => answer.rows as RecordValue[]));
    const stateAt = (entity: string, field: string, at = entry, subcutPosition?: number) =>
      query(
        "state-at",
        { entity },
        row({ value: typeOf(field) }),
        (ctx, input) =>
          `SELECT DISTINCT ?value WHERE { ${f(ctx, ctx.entity(input["entity"]), field, "?value")} }`,
        at,
        subcutPosition === undefined ? undefined : { recordedPosition: subcutPosition },
      ).pipe(Effect.map((rows) => rows.map((value) => value["value"])));
    const sumPlan = process.env["TRIPLEX_QLEVER_NATIVE_SUM_PLAN"] ?? "count-first";
    if (sumPlan !== "count-first" && sumPlan !== "sentinel")
      throw new TypeError("Unknown explicit native QLever SUM experiment plan");
    const sum = (
      name: string,
      parameters: RecordValue,
      body: (ctx: Context, input: RecordValue) => string,
      group = false,
    ) =>
      Effect.gen(function* () {
        const relation = (ctx: Context, input: RecordValue) =>
          `{ SELECT DISTINCT ?event ${group ? "?ledger" : ""} ?hiPart ?loPart WHERE { ${body(ctx, input)} GRAPH ${ctx.graph} { ?amountAssertion ${fieldIri("value_integer_sum_hi")} ?hiPart ; ${fieldIri("value_integer_sum_lo")} ?loPart } } }`;
        let sourceBasis: NativeReadBasis | undefined;
        // Inspiration: the independently authored uptime count proof in
        // qlever-recursion.ts and the retained native packet GroupByImpl509
        // failure. Only a declared final scalar identity is normalized here;
        // source joins, contribution DISTINCT and every nonempty SUM stay native.
        // qualification/qlever-live/native-sum-wave1.json predeclares both arms.
        if (!group && sumPlan === "count-first") {
          const proof = yield* queryAnswer(
            `${name}/contribution-count`,
            parameters,
            row({ count: TypeExpr.int64 }),
            (ctx, input) => `SELECT (COUNT(*) AS ?count) WHERE { ${relation(ctx, input)} }`,
          );
          sourceBasis = proof.basis;
          const count = exact((proof.rows as RecordValue[])[0]!["count"]);
          if (count > 100_000n)
            throw new RangeError("Native exact sum exceeds its100000contribution proof");
          if (count === 0n) {
            trace.push({
              normalization:
                "Native fixed-cut COUNT0 supplies the declared empty global SUM identity; grouped-empty behavior is unchanged",
              plan: sumPlan,
              sourcePosition: sourceBasis.recordedPosition,
            });
            return [{ ledger: undefined, total: integer(0n) }];
          }
        }
        const rows = yield* query(
          name,
          parameters,
          row({
            ...(group ? { ledger: TypeExpr.text } : {}),
            hi: TypeExpr.int64,
            lo: TypeExpr.int64,
            count: TypeExpr.int64,
          }),
          (ctx, input) => {
            // The sentinel is native VALUES with an unbound event, so it adds
            // zero to both SUM channels and COUNT(?event) excludes it. Apply it
            // only to global aggregation: empty grouped input must stay no rows.
            const sentinel = !group && sumPlan === "sentinel";
            const source = sentinel
              ? `{ ${relation(ctx, input)} } UNION { VALUES (?hiPart ?loPart) { (0 0) } }`
              : relation(ctx, input);
            return `SELECT ${group ? "?ledger" : ""} (SUM(?hiPart) AS ?hi) (SUM(?loPart) AS ?lo) (COUNT(${sentinel ? "?event" : "*"}) AS ?count) WHERE { ${source} } ${group ? "GROUP BY ?ledger" : ""}`;
          },
          entry,
          sourceBasis,
        );
        return rows.map((value) => {
          if (exact(value["count"]) > 100_000n)
            throw new RangeError("Native exact sum exceeds its100000contribution proof");
          trace.push({
            normalization:
              "Reconstruct two bounded native32bit SUM contribution scalars; signed64 overflow checked; no source rows leave QLever",
            plan: group ? "grouped-native" : sumPlan,
            ...(sourceBasis ? { sourcePosition: sourceBasis.recordedPosition } : {}),
          });
          return {
            ledger: value["ledger"],
            total: integer((exact(value["hi"]) << 32n) + exact(value["lo"])),
          };
        });
      });

    if (entry["operation"] === "state_at" && id !== "05")
      return (yield* stateAt(p["entity"]["value"], p.attribute["value"])).map((value) => [value]);
    if (id === "03") {
      const purchases = yield* query(
        "purchase-coordinate",
        { product: p["product"]["value"] },
        row({ purchase: TypeExpr.text, at: TypeExpr.int64 }),
        (ctx, input) =>
          `SELECT DISTINCT ?purchase ?at WHERE { ${f(ctx, "?purchase", "product", "?product")} ${eq(ctx, "?product", input["product"])} ${f(ctx, "?purchase", "purchased_at", "?at")} }`,
      );
      const answer: unknown[][] = [];
      for (const purchase of purchases)
        if (
          p.purchase_ids.some(
            (requested: RecordValue) => requested["value"] === purchase["purchase"],
          )
        )
          for (const price of yield* stateAt(p["product"]["value"], "price", {
            ...entry,
            cut: { ...entry["cut"], valid_at: exact(purchase["at"]).toString() },
          }))
            answer.push([purchase["purchase"], price]);
      return answer;
    }
    if (id === "04") {
      let coverage: string,
        at = entry;
      if (entry["operation"] === "relation_exists")
        coverage = JSON.stringify(["coverage", p.target["value"]]);
      else {
        const coordinates = yield* query(
          "claim-coordinate",
          { claim: JSON.stringify(["claim", p["claim"]["value"]]) },
          row({ coverage: TypeExpr.text, at: TypeExpr.int64 }),
          (ctx, input) =>
            `SELECT DISTINCT ?coverage ?at WHERE { ${f(ctx, ctx.entity(input["claim"]), "coverage_customer", "?coverage")} ${f(ctx, ctx.entity(input["claim"]), "claim_at", "?at")} }`,
        );
        if (!coordinates.length) return [[false]];
        coverage = coordinates[0]!["coverage"];
        at = {
          ...entry,
          cut: { ...entry["cut"], valid_at: exact(coordinates[0]!["at"]).toString() },
        };
      }
      const rows = yield* query(
        "coverage",
        { coverage },
        row({ covered: TypeExpr.boolean }),
        (ctx, input) =>
          `SELECT (true AS ?covered) WHERE { ${f(ctx, ctx.entity(input["coverage"]), `covers/${p.policy?.value ?? p["entity"]["value"]}`, "?coveredValue")} FILTER(?coveredValue = "1") } LIMIT 1`,
        at,
      );
      return [[rows.length > 0]];
    }
    if (id === "05") {
      const object = p.subject?.value ?? p["entity"]["value"];
      if (entry["operation"] === "accepted_event_count") {
        const rows = yield* query(
          "accepted-events",
          { object },
          row({ count: TypeExpr.int64 }),
          (ctx, input) =>
            `SELECT (COUNT(DISTINCT ?event) AS ?count) WHERE { ${f(ctx, "?event", "webhook_object", "?object")} ${eq(ctx, "?object", input["object"])} }`,
        );
        return [[rows[0]!["count"]]];
      }
      const rows = yield* query(
        "highest-revision",
        { object },
        row({ status: TypeExpr.text }),
        (ctx, input) =>
          // Positive grouped MAX avoids the observed correlated EXISTS answer
          // mismatch. Its exact lexical integer order key is joined back to
          // every tied maximum row; no LIMIT1 tie truncation or native cast.
          // Empty input has no object group. See native-latest-wave1.json.
          `SELECT DISTINCT ?status WHERE { { SELECT ?object (MAX(?candidateOrder) AS ?revisionOrder) WHERE { ${f(ctx, "?candidate", "webhook_object", "?object")} ${eq(ctx, "?object", input["object"])} ${f(ctx, "?candidate", "revision", "?candidateRevision", { order: "?candidateOrder" })} } GROUP BY ?object } ${f(ctx, "?event", "webhook_object", "?object")} ${f(ctx, "?event", "revision", "?revision", { order: "?revisionOrder" })} ${f(ctx, "?event", "status", "?status")} }`,
      );
      return rows.map((value) => [value["status"]]);
    }
    if (id === "06") {
      const rows = yield* sum(
        "account-balance",
        { account: p["account"]["value"], currency: p["currency"]["value"] },
        (ctx, input) =>
          `${f(ctx, "?event", "account", "?account")} ${eq(ctx, "?account", input["account"])} ${f(ctx, "?event", "currency", "?currency")} ${eq(ctx, "?currency", input["currency"])} ${f(ctx, "?event", "amount", "?amount", { assertion: "?amountAssertion" })}`,
      );
      return [[rows[0]!.total]];
    }
    if (id === "07") {
      const rows = yield* sum(
        "inventory-ledgers",
        { sku: p["sku"]["value"] },
        (ctx, input) =>
          `${f(ctx, "?event", "sku", "?sku")} ${eq(ctx, "?sku", input["sku"])} ${f(ctx, "?event", "ledger", "?ledger")} ${f(ctx, "?event", "delta", "?amount", { assertion: "?amountAssertion" })}`,
        true,
      );
      const totals = new Map(rows.map((value) => [value["ledger"], exact(value.total)])),
        physical = totals.get("physical") ?? 0n,
        reserved = totals.get("reservation") ?? 0n;
      return [[integer(physical), integer(reserved), integer(physical - reserved)]];
    }
    if (id === "08") {
      const captures = yield* sum(
        "captures",
        { customer: p["customer"]["value"], currency: p["currency"]["value"] },
        (ctx, input) =>
          `${f(ctx, "?event", "customer", "?customer")} ${eq(ctx, "?customer", input["customer"])} ${f(ctx, "?event", "currency", "?currency")} ${eq(ctx, "?currency", input["currency"])} ${f(ctx, "?event", "amount", "?amount", { assertion: "?amountAssertion" })}`,
      );
      const refunds = yield* sum(
        "refunds",
        { customer: p["customer"]["value"], currency: p["currency"]["value"] },
        (ctx, input) =>
          `${f(ctx, "?capture", "customer", "?customer")} ${eq(ctx, "?customer", input["customer"])} ${f(ctx, "?event", "capture", "?capture")} ${f(ctx, "?event", "currency", "?currency")} ${eq(ctx, "?currency", input["currency"])} ${f(ctx, "?event", "amount", "?amount", { assertion: "?amountAssertion" })}`,
      );
      return [[integer(exact(captures[0]!.total) - exact(refunds[0]!.total))]];
    }
    if (id === "09") {
      const rows = yield* query(
        "paid-without-entitlement",
        {},
        row({ subscription: TypeExpr.text }),
        (ctx) =>
          `SELECT DISTINCT ?subscription WHERE { ${f(ctx, "?paidEvent", "paid", "?paid")} FILTER(?paid = "1") ${f(ctx, "?paidEvent", "subscription", "?subscription")} FILTER NOT EXISTS { ${f(ctx, "?entitlement", "subject", "?subscription")} ${f(ctx, "?entitlement", "entitled", "?entitled")} FILTER(?entitled = "1") } }`,
      );
      return rows.map((value) => [value["subscription"]]);
    }
    if (id === "10") {
      const starts = yield* query(
        "workflow-coordinate",
        { workflow: p["workflow"]["value"] },
        row({ deadline: TypeExpr.int64, feed: TypeExpr.text }),
        (ctx, input) =>
          `SELECT DISTINCT ?deadline ?feed WHERE { ${f(ctx, "?start", "subject", "?subject")} ${eq(ctx, "?subject", input["workflow"])} ${f(ctx, "?start", "deadline", "?deadline")} ${f(ctx, "?start", "source", "?feed")} }`,
      );
      if (!starts.length) return [];
      const deadline = exact(starts[0]!["deadline"]),
        feed = starts[0]!["feed"];
      const completed = yield* query(
        "first-completion",
        { workflow: p["workflow"]["value"], feed },
        row({ at: TypeExpr.int64 }),
        (ctx, input) =>
          `SELECT DISTINCT ?at WHERE { ${f(ctx, "?event", "subject", "?subject")} ${eq(ctx, "?subject", input["workflow"])} ${f(ctx, "?event", "source", "?feed")} ${eq(ctx, "?feed", input["feed"])} ${f(ctx, "?event", "completed_at", "?at", { order: "?atOrder" })} } ORDER BY ?atOrder LIMIT 1`,
      );
      if (completed.length)
        return [[exact(completed[0]!["at"]) > deadline ? "completed_late" : "completed"]];
      const watermarks = yield* query(
        "source-watermark",
        { feed },
        row({ through: TypeExpr.int64 }),
        (ctx, input) =>
          `SELECT DISTINCT ?through WHERE { ${f(ctx, "?event", "subject", "?feed")} ${eq(ctx, "?feed", input["feed"])} ${f(ctx, "?event", "through", "?through", { order: "?throughOrder" })} } ORDER BY DESC(?throughOrder) LIMIT 1`,
      );
      trace.push({
        normalization: "Classify three final native deadline/completion/watermark scalars",
      });
      return [
        [
          BigInt(entry["cut"].valid_at) < deadline
            ? "in_progress"
            : watermarks.length && exact(watermarks[0]!["through"]) >= deadline
              ? "overdue"
              : "pending_knowledge",
        ],
      ];
    }
    if (id === "12") {
      const rows = yield* query(
        "deny-revocation",
        { user: p["user"]["value"], resource: p["resource"]["value"] },
        row({ allowed: TypeExpr.boolean }),
        (ctx, input) =>
          `SELECT DISTINCT (true AS ?allowed) WHERE { ${f(ctx, "?support", "kind", "?kind")} ${eq(ctx, "?kind", "support")} ${f(ctx, "?support", "subject", "?user")} ${eq(ctx, "?user", input["user"])} ${f(ctx, "?support", "target", "?resource")} ${eq(ctx, "?resource", input["resource"])} ${f(ctx, "?support", "principal", "?principal")} FILTER NOT EXISTS { ${f(ctx, "?block", "kind", "?blockKind")} ${eq(ctx, "?blockKind", "block")} ${f(ctx, "?block", "subject", "?user")} ${f(ctx, "?block", "target", "?resource")} } FILTER NOT EXISTS { ${f(ctx, "?revoke", "kind", "?revokeKind")} ${eq(ctx, "?revokeKind", "revoke")} ${f(ctx, "?revoke", "subject", "?principal")} ${f(ctx, "?revoke", "target", "?resource")} } }`,
      );
      return [[rows.length > 0]];
    }
    if (id === "16") {
      const answers: unknown[][] = [];
      for (const field of ["input_a", "input_b"]) {
        const rows = yield* query(
          `lineage-${field}`,
          { output: p["output"]["value"] },
          row({ input: TypeExpr.text, version: TypeExpr.int64 }),
          (ctx, input) =>
            `SELECT DISTINCT ?input ?version WHERE { ${f(ctx, "?run", "output", "?output")} ${eq(ctx, "?output", input["output"])} ${f(ctx, "?run", field, "?input")} ${f(ctx, "?run", "code_version", "?version")} }`,
        );
        answers.push(...rows.map((value) => [value["input"], value["version"]]));
      }
      const rows = yield* query(
        "lineage-metadata",
        { output: p["output"]["value"] },
        row({ input: TypeExpr.text, version: TypeExpr.int64 }),
        (ctx, input) =>
          `SELECT DISTINCT ?input ?version WHERE { ${f(ctx, "?run", "output", "?output")} ${eq(ctx, "?output", input["output"])} ${f(ctx, "?run", "subject", "?runId")} ${f(ctx, "?run", "code_version", "?version")} ${f(ctx, "?metadata", "subject", "?runId")} ${f(ctx, "?metadata", "input", "?input")} }`,
      );
      return [...answers, ...rows.map((value) => [value["input"], value["version"]])];
    }
    if (id === "17") {
      const parameters = {
        from: integer(p["from"]["value"]),
        to: integer(p["to"]["value"]),
        ...(entry["operation"] === "session_conversion" ? { session: p["session"]["value"] } : {}),
      };
      const rows = yield* query(
        "ordered-conversion",
        parameters,
        row({ session: TypeExpr.text }),
        (ctx, input) => {
          const patterns = ["view", "checkout", "payment"].map(
            (step, index) =>
              `${f(ctx, `?event${index}`, "session", "?session")} ${f(ctx, `?event${index}`, "step", `?step${index}`)} ${eq(ctx, `?step${index}`, step)} ${f(ctx, `?event${index}`, "at", `?at${index}`, { order: `?atOrder${index}` })} FILTER(?atOrder${index} >= ${ctx.integerOrder(input["from"]["value"])} && ?atOrder${index} < ${ctx.integerOrder(input["to"]["value"])})`,
          );
          return `SELECT DISTINCT ?session WHERE { ${patterns.join("\n")} FILTER(?atOrder0 < ?atOrder1 && ?atOrder1 < ?atOrder2) ${input["session"] === undefined ? "" : eq(ctx, "?session", input["session"])} }`;
        },
      );
      return entry["operation"] === "session_conversion"
        ? [[rows.length > 0]]
        : rows.map((value) => [value["session"]]);
    }
    if (id === "19") {
      const rows = yield* query(
        "prediction-coordinate",
        { prediction: p["prediction"]["value"] },
        row({
          customer: TypeExpr.text,
          at: TypeExpr.int64,
          known: TypeExpr.int64,
          label: TypeExpr.boolean,
        }),
        (ctx, input) =>
          `SELECT DISTINCT ?customer ?at ?known ?label WHERE { ${f(ctx, ctx.entity(input["prediction"]), "customer", "?customer")} ${f(ctx, ctx.entity(input["prediction"]), "predicted_at", "?at")} ${f(ctx, ctx.entity(input["prediction"]), "feature_known_at", "?known")} ${f(ctx, ctx.entity(input["prediction"]), "fraud", "?label")} }`,
      );
      const answers: unknown[][] = [];
      for (const prediction of rows) {
        const known = positionToLogical.get(Number(exact(prediction["known"])));
        if (known === undefined) throw new Error("Unmapped committed prediction source cut");
        for (const feature of yield* stateAt(
          prediction["customer"],
          p.feature["value"],
          {
            ...entry,
            cut: { known_at: String(known), valid_at: exact(prediction["at"]).toString() },
          },
          Number(exact(prediction["known"])),
        ))
          answers.push([p["prediction"]["value"], feature, prediction["label"]]);
      }
      return answers;
    }
    if (id === "20" && entry["operation"] === "reachability_supports") {
      let count = 0n;
      for (let length = 1; length <= 3; length++) {
        const rows = yield* query(
          `bounded-dag-witnesses-${length}`,
          { from: p["from"]["value"], to: p["to"]["value"] },
          row({ count: TypeExpr.int64 }),
          (ctx, input) => {
            const edges = Array["from"]({ length }, (_, index) =>
              f(
                ctx,
                index ? `?node${index}` : ctx.entity(input["from"]),
                "_support",
                index === length - 1 ? "?target" : `?node${index + 1}`,
              ),
            );
            return `SELECT (COUNT(*) AS ?count) WHERE { { SELECT DISTINCT ${length === 1 ? "?target" : Array["from"]({ length: length - 1 }, (_, index) => `?node${index + 1}`).join(" ")} WHERE { ${edges.join("\n")} ${eq(ctx, "?target", input["to"])} } } }`;
          },
        );
        count += exact(rows[0]!["count"]);
      }
      trace.push({
        normalization:
          "Add three final native witness counts for the frozen four-node DAG; not general path counting",
      });
      return [[count > 0n, integer(count)]];
    }
    throw new Error(`UNSUPPORTED_PUBLIC_NATIVE_WORKLOAD:qlever:${id}:${entry["operation"]}`);
  });
