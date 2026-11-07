/**
 * Independently authored native task library. No Datalog AST, compiler, expected
 * answer, or host-loaded relation enters this module. Small scalar/result
 * normalization is explicit and included in the task's measured call.
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

type RecordValue = Record<string, any>;
interface Context {
  readonly basis: NativeReadBasis;
  readonly bind: (value: unknown) => string;
  readonly attribute: (attribute: string | { readonly key: string }) => string;
  readonly identifier: (name: string) => string;
  readonly facts: () => string;
  readonly recordedFacts: () => string;
  readonly history: () => string;
}
interface ReachabilityContext extends Context {
  readonly relation: (name: string) => string;
}
interface Reachability {
  readonly name: string;
  readonly edges: (context: Context, parameters: unknown) => string;
}
type Select = (
  contract: NativeQueryContract,
  input: unknown,
  build: (context: Context, parameters: unknown) => string,
  options?: NativeReadOptions,
) => Effect.Effect<NativeReadResult, unknown>;
export interface XtdbNativeTaskSession {
  readonly select: Select;
  readonly selectSql: Select;
  readonly selectSqlWithReachability: (
    contract: NativeQueryContract,
    input: unknown,
    relations: readonly Reachability[],
    build: (context: ReachabilityContext, parameters: unknown) => string,
    options?: NativeReadOptions & {
      readonly maxRecursiveRows?: number;
      readonly maxRounds?: number;
    },
  ) => Effect.Effect<NativeReadResult, unknown>;
}

/** Implementation inventory only; a true entry still needs native qualification. */
const operations: Readonly<Record<string, readonly string[]>> = {
  "01": ["state_at"],
  "02": ["state_at"],
  "03": ["state_at", "price_at_purchase"],
  "04": ["coverage_at_claim", "relation_exists"],
  "05": ["state_at", "accepted_event_count"],
  "06": ["account_balance"],
  "07": ["inventory_balance"],
  "08": ["customer_net_revenue"],
  "09": ["paid_without_entitlement"],
  "10": ["workflow_status"],
  "11": ["inherited_access"],
  "12": ["access_with_deny"],
  "13": ["container_items"],
  "14": ["recalled_customers"],
  "15": ["dependency_closure", "vulnerable_deployments"],
  "16": ["output_lineage"],
  "17": ["conversion_funnel", "session_conversion"],
  "18": ["uptime_duration"],
  "19": ["training_example", "state_at"],
  "20": ["reachability_supports", "reachability_closure"],
};
export const supportsXtdbNativeWorkload = (workloadId: string, operation: string): boolean =>
  operations[workloadId]?.includes(operation) ?? false;

const row = (fields: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, TypeExpr.required(type)])),
  );
const inputType = (value: unknown): TypeExpr.TypeExpr => {
  if (typeof value === "string") return TypeExpr.text;
  if (typeof value === "boolean") return TypeExpr.boolean;
  if (typeof value === "number") return TypeExpr.number;
  if (typeof value === "object" && value !== null && "type" in value && value["type"] === "integer")
    return TypeExpr.int64;
  throw new TypeError("Native workload inputs must declare an admitted scalar");
};
const exact = (value: unknown): bigint => {
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value["type"] === "integer" &&
    "value" in value
  )
    return BigInt(String(value["value"]));
  if (typeof value === "string" || typeof value === "bigint") return BigInt(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  throw new TypeError(`A native workload returned a non-exact integer: ${String(value)}`);
};
const tick = (value: string | number) => Number(BigInt(value) + 1_000_000n);
// Native optimizers may evaluate casts before an attribute/scope predicate.
// Guard the lexical carrier itself so unrelated string families cannot throw.
const integerChannel = (alias: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) throw new TypeError("Invalid authored SQL alias");
  return `CAST(CASE WHEN ${alias}.value_type = 'integer' THEN ${alias}.value_string ELSE NULL END AS BIGINT)`;
};
const basisOf = (entry: RecordValue) => ({
  recordedAt: 1000 + Number(entry["cut"].known_at),
  validAt: tick(entry["cut"].valid_at ?? 0),
});
const valueOf = (value: RecordValue): unknown => {
  switch (value["type"]) {
    case "integer":
      return integer(String(value["text"]));
    case "number":
      return Number(value["numeric"]);
    case "boolean":
      return [true, 1, "1"].includes(value["flag"]);
    case "string":
    case "ref":
    case "blob":
    case "json":
      return String(value["text"]);
    default:
      throw new TypeError(`Unexpected native value family ${String(value["type"])}`);
  }
};

export const evaluateXtdbNativeWorkload = (
  native: XtdbNativeTaskSession,
  workload: RecordValue,
  entry: RecordValue,
  positionToLogical: ReadonlyMap<number, number>,
  trace: unknown[],
): Effect.Effect<unknown[][], unknown> =>
  Effect.gen(function* () {
    const id = String(workload["id"]),
      p = entry["parameters"];
    const a = (field: string) => `:w${id}/a${Buffer.from(field).toString("hex")}`;
    const execute = (
      language: "xtql" | "xtdb-sql",
      name: string,
      values: Record<string, unknown>,
      resultType: TypeExpr.TypeExpr,
      build: (ctx: Context, params: RecordValue) => string,
      at = entry,
    ) => {
      const contract: NativeQueryContract = {
        name: `workload/${id}/${name}`,
        parameters: row(
          Object.fromEntries(Object.entries(values).map(([key, value]) => [key, inputType(value)])),
        ),
        row: resultType,
      };
      return (language === "xtql" ? native.select : native.selectSql)(
        contract,
        values,
        (ctx, input) => build(ctx, input as RecordValue),
        { basis: basisOf(at), maxRows: 1000 },
      ).pipe(
        Effect.map((result) => {
          trace.push({
            operation: "public-native-query",
            logicalTaskId: `${id}/${entry["id"]}`,
            ...result.trace,
          });
          return result.rows as RecordValue[];
        }),
      );
    };
    const sql = (
      name: string,
      values: Record<string, unknown>,
      resultType: TypeExpr.TypeExpr,
      build: (ctx: Context, params: RecordValue) => string,
      at = entry,
    ) => execute("xtdb-sql", name, values, resultType, build, at);
    const recursive = (
      name: string,
      values: Record<string, unknown>,
      resultType: TypeExpr.TypeExpr,
      edges: readonly [string, string][],
      build: (ctx: ReachabilityContext, params: RecordValue) => string,
    ) =>
      native
        .selectSqlWithReachability(
          {
            name: `workload/${id}/${name}`,
            parameters: row(
              Object.fromEntries(
                Object.entries(values).map(([key, value]) => [key, inputType(value)]),
              ),
            ),
            row: resultType,
          },
          values,
          edges.map(([name, field]) => ({
            name,
            edges: (ctx: Context) =>
              `SELECT DISTINCT entity_id AS source, value_string AS target FROM ${ctx.facts()} f WHERE attribute = ${ctx.attribute(a(field))} AND value_type = 'ref'`,
          })),
          (ctx, input) => build(ctx, input as RecordValue),
          {
            basis: basisOf(entry),
            maxRows: 1000,
            maxRecursiveRows: 100_000,
            maxRounds: 100,
          },
        )
        .pipe(
          Effect.map((result) => {
            trace.push({
              operation: "public-native-query",
              logicalTaskId: `${id}/${entry["id"]}`,
              ...result.trace,
            });
            return result.rows as RecordValue[];
          }),
        );
    const stateAt = (entity: string, field: string, at = entry) =>
      execute(
        "xtql",
        "state-at",
        {
          entity,
          attribute: a(field),
        },
        row({ type: TypeExpr.text, text: TypeExpr.any, numeric: TypeExpr.any, flag: TypeExpr.any }),
        (ctx, input) =>
          `(-> ${ctx.facts()} (where (= entity_id ${ctx.bind(input["entity"])}) (= attribute ${ctx.attribute(input["attribute"])})) (return {:type value_type :text (coalesce value_string value_json) :numeric (coalesce value_number value_datetime) :flag value_boolean}))`,
        at,
      ).pipe(Effect.map((rows) => rows.map(valueOf)));

    if (entry["operation"] === "state_at" && id !== "05")
      return (yield* stateAt(p.entity.value, p.attribute.value)).map((value) => [value]);

    if (id === "03") {
      const purchases = yield* sql(
        "purchase-times",
        { product: p.product.value },
        row({ purchase: TypeExpr.text, at: TypeExpr.int64 }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT DISTINCT product.entity_id AS purchase, ${integerChannel("at")} AS at FROM f product JOIN f at ON product.entity_id = at.entity_id WHERE product.attribute = ${ctx.attribute(a("product"))} AND product.value_string = ${ctx.bind(input["product"])} AND at.attribute = ${ctx.attribute(a("purchased_at"))}`,
      );
      const answer: unknown[][] = [];
      for (const purchase of purchases)
        if (
          p.purchase_ids.some(
            (requested: RecordValue) => requested["value"] === purchase["purchase"],
          )
        ) {
          const at = {
            ...entry,
            cut: { ...entry["cut"], valid_at: exact(purchase["at"]).toString() },
          };
          for (const price of yield* stateAt(p.product.value, "price", at))
            answer.push([purchase["purchase"], price]);
        }
      return answer;
    }
    if (id === "04") {
      let coverage: string,
        at = entry;
      if (entry["operation"] === "relation_exists")
        coverage = JSON.stringify(["coverage", p.target.value]);
      else {
        const drivers = yield* sql(
          "claim-coordinate",
          { claim: JSON.stringify(["claim", p.claim.value]) },
          row({ coverage: TypeExpr.text, at: TypeExpr.int64 }),
          (ctx, input) =>
            `WITH f AS ${ctx.facts()} SELECT DISTINCT customer.value_string AS coverage, ${integerChannel("at")} AS at FROM f customer JOIN f at ON customer.entity_id = at.entity_id WHERE customer.entity_id = ${ctx.bind(input["claim"])} AND customer.attribute = ${ctx.attribute(a("coverage_customer"))} AND at.attribute = ${ctx.attribute(a("claim_at"))}`,
        );
        if (!drivers.length) return [[false]];
        coverage = String(drivers[0]!["coverage"]);
        at = { ...entry, cut: { ...entry["cut"], valid_at: exact(drivers[0]!["at"]).toString() } };
      }
      const covered = yield* sql(
        "coverage-exists",
        { coverage, policy: p.policy?.value ?? p.entity.value },
        row({ covered: TypeExpr.boolean }),
        (ctx, input) =>
          `SELECT TRUE AS covered FROM ${ctx.facts()} f WHERE entity_id = ${ctx.bind(input["coverage"])} AND attribute = ${ctx.attribute(a(`covers/${input["policy"]}`))} AND value_boolean = 1 LIMIT 1`,
        at,
      );
      return [[covered.length > 0]];
    }
    if (id === "05") {
      const object = p.subject?.value ?? p.entity.value;
      if (entry["operation"] === "accepted_event_count") {
        const rows = yield* sql(
          "accepted-events",
          { object },
          row({ count: TypeExpr.int64 }),
          (ctx, input) =>
            `SELECT COUNT(DISTINCT entity_id) AS count FROM ${ctx.facts()} f WHERE attribute = ${ctx.attribute(a("webhook_object"))} AND value_string = ${ctx.bind(input["object"])}`,
        );
        return [[rows[0]!["count"]]];
      }
      const rows = yield* sql(
        "highest-source-revision",
        { object },
        row({ status: TypeExpr.text }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()}, revisions AS (SELECT object.entity_id AS event, ${integerChannel("revision")} AS revision FROM f object JOIN f revision ON object.entity_id = revision.entity_id WHERE object.attribute = ${ctx.attribute(a("webhook_object"))} AND object.value_string = ${ctx.bind(input["object"])} AND revision.attribute = ${ctx.attribute(a("revision"))}) SELECT DISTINCT status.value_string AS status FROM revisions r JOIN f status ON status.entity_id = r.event WHERE status.attribute = ${ctx.attribute(a("status"))} AND r.revision = (SELECT MAX(revision) FROM revisions)`,
      );
      return rows.map((value) => [value["status"]]);
    }
    if (id === "06") {
      const rows = yield* sql(
        "account-balance",
        { account: p.account.value, currency: p.currency.value },
        row({ total: TypeExpr.int64 }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT CAST(COALESCE(SUM(${integerChannel("amount")}), 0) AS TEXT) AS total FROM f account JOIN f currency ON account.entity_id = currency.entity_id JOIN f amount ON account.entity_id = amount.entity_id WHERE account.attribute = ${ctx.attribute(a("account"))} AND account.value_string = ${ctx.bind(input["account"])} AND currency.attribute = ${ctx.attribute(a("currency"))} AND currency.value_string = ${ctx.bind(input["currency"])} AND amount.attribute = ${ctx.attribute(a("amount"))}`,
      );
      return [[rows[0]!["total"]]];
    }
    if (id === "07") {
      const rows = yield* sql(
        "inventory-ledgers",
        { sku: p.sku.value },
        row({ ledger: TypeExpr.text, total: TypeExpr.int64 }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT ledger.value_string AS ledger, CAST(SUM(${integerChannel("delta")}) AS TEXT) AS total FROM f sku JOIN f ledger ON sku.entity_id = ledger.entity_id JOIN f delta ON sku.entity_id = delta.entity_id WHERE sku.attribute = ${ctx.attribute(a("sku"))} AND sku.value_string = ${ctx.bind(input["sku"])} AND ledger.attribute = ${ctx.attribute(a("ledger"))} AND delta.attribute = ${ctx.attribute(a("delta"))} GROUP BY ledger.value_string`,
      );
      const totals = new Map(rows.map((value) => [value["ledger"], exact(value["total"])]));
      const physical = totals.get("physical") ?? 0n,
        reserved = totals.get("reservation") ?? 0n;
      trace.push({
        normalization: "subtract final exact ledger totals; no source relation leaves XTDB",
      });
      return [[integer(physical), integer(reserved), integer(physical - reserved)]];
    }
    if (id === "08") {
      const rows = yield* sql(
        "net-revenue",
        { customer: p.customer.value, currency: p.currency.value },
        row({ total: TypeExpr.int64 }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()}, captures AS (SELECT customer.entity_id AS capture, ${integerChannel("amount")} AS amount FROM f customer JOIN f currency ON customer.entity_id = currency.entity_id JOIN f amount ON customer.entity_id = amount.entity_id WHERE customer.attribute = ${ctx.attribute(a("customer"))} AND customer.value_string = ${ctx.bind(input["customer"])} AND currency.attribute = ${ctx.attribute(a("currency"))} AND currency.value_string = ${ctx.bind(input["currency"])} AND amount.attribute = ${ctx.attribute(a("amount"))}), refunds AS (SELECT ${integerChannel("amount")} AS amount FROM captures c JOIN f reference ON reference.value_string = c.capture JOIN f currency ON reference.entity_id = currency.entity_id JOIN f amount ON reference.entity_id = amount.entity_id WHERE reference.attribute = ${ctx.attribute(a("capture"))} AND currency.attribute = ${ctx.attribute(a("currency"))} AND currency.value_string = ${ctx.bind(input["currency"])} AND amount.attribute = ${ctx.attribute(a("amount"))}) SELECT CAST(COALESCE((SELECT SUM(amount) FROM captures), 0) - COALESCE((SELECT SUM(amount) FROM refunds), 0) AS TEXT) AS total`,
      );
      return [[rows[0]!["total"]]];
    }
    if (id === "09") {
      const rows = yield* sql(
        "paid-without-entitlement",
        {},
        row({ subscription: TypeExpr.text }),
        (ctx) =>
          `WITH f AS ${ctx.facts()} SELECT DISTINCT subscription.value_string AS subscription FROM f paid JOIN f subscription ON paid.entity_id = subscription.entity_id WHERE paid.attribute = ${ctx.attribute(a("paid"))} AND paid.value_boolean = 1 AND subscription.attribute = ${ctx.attribute(a("subscription"))} AND NOT EXISTS (SELECT 1 FROM f subject JOIN f entitled ON subject.entity_id = entitled.entity_id WHERE subject.attribute = ${ctx.attribute(a("subject"))} AND subject.value_string = subscription.value_string AND entitled.attribute = ${ctx.attribute(a("entitled"))} AND entitled.value_boolean = 1)`,
      );
      return rows.map((value) => [value["subscription"]]);
    }
    if (id === "10") {
      const starts = yield* sql(
        "workflow-start",
        { workflow: p.workflow.value },
        row({ deadline: TypeExpr.int64, feed: TypeExpr.text }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT DISTINCT ${integerChannel("deadline")} AS deadline, source.value_string AS feed FROM f subject JOIN f deadline ON subject.entity_id = deadline.entity_id JOIN f source ON subject.entity_id = source.entity_id WHERE subject.attribute = ${ctx.attribute(a("subject"))} AND subject.value_string = ${ctx.bind(input["workflow"])} AND deadline.attribute = ${ctx.attribute(a("deadline"))} AND source.attribute = ${ctx.attribute(a("source"))}`,
      );
      if (!starts.length) return [];
      const deadline = exact(starts[0]!["deadline"]),
        feed = String(starts[0]!["feed"]);
      const completed = yield* sql(
        "first-completion",
        { workflow: p.workflow.value, feed },
        row({ first: TypeExpr.any }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT CAST(MIN(${integerChannel("at")}) AS TEXT) AS first FROM f subject JOIN f source ON subject.entity_id = source.entity_id JOIN f at ON subject.entity_id = at.entity_id WHERE subject.attribute = ${ctx.attribute(a("subject"))} AND subject.value_string = ${ctx.bind(input["workflow"])} AND source.attribute = ${ctx.attribute(a("source"))} AND source.value_string = ${ctx.bind(input["feed"])} AND at.attribute = ${ctx.attribute(a("completed_at"))}`,
      );
      if (completed[0]?.["first"] != null)
        return [[exact(completed[0]["first"]) > deadline ? "completed_late" : "completed"]];
      const watermark = yield* sql(
        "source-watermark",
        { feed },
        row({ through: TypeExpr.any }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT CAST(MAX(${integerChannel("at")}) AS TEXT) AS through FROM f subject JOIN f at ON subject.entity_id = at.entity_id WHERE subject.attribute = ${ctx.attribute(a("subject"))} AND subject.value_string = ${ctx.bind(input["feed"])} AND at.attribute = ${ctx.attribute(a("through"))}`,
      );
      const through = watermark[0]?.["through"];
      trace.push({ normalization: "classify final deadline/completion/watermark scalars" });
      return [
        [
          BigInt(entry["cut"].valid_at) < deadline
            ? "in_progress"
            : through != null && exact(through) >= deadline
              ? "overdue"
              : "pending_knowledge",
        ],
      ];
    }
    if (id === "11") {
      const rows = yield* recursive(
        "inherited-access",
        { user: p.user.value, resource: p.resource.value },
        row({ allowed: TypeExpr.boolean }),
        [
          ["member", "_member"],
          ["resource", "_resource"],
        ],
        (ctx, input) =>
          `WITH f AS ${ctx.facts()}, members AS ${ctx.relation("member")}, resources AS ${ctx.relation("resource")} SELECT DISTINCT TRUE AS allowed FROM members m CROSS JOIN resources r CROSS JOIN f kind CROSS JOIN f subject CROSS JOIN f target WHERE kind.attribute = ${ctx.attribute(a("kind"))} AND kind.value_string = 'grant' AND kind.entity_id = subject.entity_id AND subject.attribute = ${ctx.attribute(a("subject"))} AND subject.value_string = m.target AND kind.entity_id = target.entity_id AND target.attribute = ${ctx.attribute(a("target"))} AND target.value_string = r.target AND m.source = ${ctx.bind(input["user"])} AND r.source = ${ctx.bind(input["resource"])}`,
      );
      return [[rows.length > 0]];
    }
    if (id === "12") {
      const rows = yield* sql(
        "deny-and-revocation",
        { user: p.user.value, resource: p.resource.value },
        row({ allowed: TypeExpr.boolean }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT DISTINCT TRUE AS allowed FROM f kind JOIN f subject ON kind.entity_id = subject.entity_id JOIN f target ON kind.entity_id = target.entity_id JOIN f principal ON kind.entity_id = principal.entity_id WHERE kind.attribute = ${ctx.attribute(a("kind"))} AND kind.value_string = 'support' AND subject.attribute = ${ctx.attribute(a("subject"))} AND subject.value_string = ${ctx.bind(input["user"])} AND target.attribute = ${ctx.attribute(a("target"))} AND target.value_string = ${ctx.bind(input["resource"])} AND principal.attribute = ${ctx.attribute(a("principal"))} AND NOT EXISTS (SELECT 1 FROM f k JOIN f s ON k.entity_id = s.entity_id JOIN f t ON k.entity_id = t.entity_id WHERE k.attribute = ${ctx.attribute(a("kind"))} AND k.value_string = 'block' AND s.attribute = ${ctx.attribute(a("subject"))} AND s.value_string = subject.value_string AND t.attribute = ${ctx.attribute(a("target"))} AND t.value_string = target.value_string) AND NOT EXISTS (SELECT 1 FROM f k JOIN f s ON k.entity_id = s.entity_id JOIN f t ON k.entity_id = t.entity_id WHERE k.attribute = ${ctx.attribute(a("kind"))} AND k.value_string = 'revoke' AND s.attribute = ${ctx.attribute(a("subject"))} AND s.value_string = principal.value_string AND t.attribute = ${ctx.attribute(a("target"))} AND t.value_string = target.value_string)`,
      );
      return [[rows.length > 0]];
    }
    if (id === "13") {
      const rows = yield* recursive(
        "container-leaves",
        { container: p.container.value },
        row({ item: TypeExpr.text }),
        [["contains", "_contains"]],
        (ctx, input) =>
          `WITH f AS ${ctx.facts()}, closure AS ${ctx.relation("contains")} SELECT DISTINCT c.target AS item FROM closure c WHERE c.source = ${ctx.bind(input["container"])} AND NOT EXISTS (SELECT 1 FROM f child WHERE child.entity_id = c.target AND child.attribute = ${ctx.attribute(a("_contains"))})`,
      );
      return rows.map((value) => [value["item"]]);
    }
    if (id === "14") {
      const rows = yield* recursive(
        "recalled-customers",
        { lot: p.contaminated_lot.value },
        row({ customer: TypeExpr.text }),
        [["production", "_production"]],
        (ctx, input) =>
          `WITH f AS ${ctx.facts()}, closure AS ${ctx.relation("production")} SELECT DISTINCT customer.value_string AS customer FROM closure c JOIN f shipment ON shipment.attribute = ${ctx.attribute(a("shipped_lot"))} AND shipment.value_string = c.target JOIN f customer ON customer.entity_id = shipment.entity_id AND customer.attribute = ${ctx.attribute(a("customer"))} WHERE c.source = ${ctx.bind(input["lot"])} AND EXISTS (SELECT 1 FROM f contamination WHERE contamination.attribute = ${ctx.attribute(a("contaminated_lot"))} AND contamination.value_string = ${ctx.bind(input["lot"])})`,
      );
      return rows.map((value) => [value["customer"]]);
    }
    if (id === "15") {
      const closure = entry["operation"] === "dependency_closure";
      const rows = yield* recursive(
        closure ? "dependency-closure" : "vulnerable-deployments",
        closure ? { application: p.application.value } : { environment: p.environment.value },
        row({ answer: TypeExpr.text }),
        [["dependency", "_dependency"]],
        (ctx, input) =>
          closure
            ? `SELECT DISTINCT target AS answer FROM ${ctx.relation("dependency")} c WHERE source = ${ctx.bind(input["application"])}`
            : `WITH f AS ${ctx.facts()}, closure AS ${ctx.relation("dependency")} SELECT DISTINCT application.value_string AS answer FROM f environment JOIN f application ON environment.entity_id = application.entity_id JOIN closure c ON c.source = application.value_string JOIN f subject ON subject.value_string = c.target AND subject.attribute = ${ctx.attribute(a("vulnerable_subject"))} JOIN f vulnerable ON subject.entity_id = vulnerable.entity_id WHERE environment.attribute = ${ctx.attribute(a("environment"))} AND environment.value_string = ${ctx.bind(input["environment"])} AND application.attribute = ${ctx.attribute(a("application"))} AND vulnerable.attribute = ${ctx.attribute(a("vulnerable"))} AND vulnerable.value_boolean = 1`,
      );
      return rows.map((value) => [value["answer"]]);
    }
    if (id === "16") {
      const answer: unknown[][] = [];
      for (const field of ["input_a", "input_b"]) {
        const rows = yield* sql(
          `lineage-${field}`,
          { output: p.output.value },
          row({ input: TypeExpr.text, version: TypeExpr.int64 }),
          (ctx, input) =>
            `WITH f AS ${ctx.facts()} SELECT DISTINCT source.value_string AS input, version.value_string AS version FROM f output JOIN f source ON output.entity_id = source.entity_id JOIN f version ON output.entity_id = version.entity_id WHERE output.attribute = ${ctx.attribute(a("output"))} AND output.value_string = ${ctx.bind(input["output"])} AND source.attribute = ${ctx.attribute(a(field))} AND version.attribute = ${ctx.attribute(a("code_version"))}`,
        );
        answer.push(...rows.map((value) => [value["input"], value["version"]]));
      }
      const rows = yield* sql(
        "lineage-metadata",
        { output: p.output.value },
        row({ input: TypeExpr.text, version: TypeExpr.int64 }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT DISTINCT extra.value_string AS input, version.value_string AS version FROM f output JOIN f subject ON output.entity_id = subject.entity_id JOIN f version ON output.entity_id = version.entity_id JOIN f metadata ON metadata.value_string = subject.value_string JOIN f extra ON metadata.entity_id = extra.entity_id WHERE output.attribute = ${ctx.attribute(a("output"))} AND output.value_string = ${ctx.bind(input["output"])} AND subject.attribute = ${ctx.attribute(a("subject"))} AND version.attribute = ${ctx.attribute(a("code_version"))} AND metadata.attribute = ${ctx.attribute(a("subject"))} AND extra.attribute = ${ctx.attribute(a("input"))}`,
      );
      return [...answer, ...rows.map((value) => [value["input"], value["version"]])];
    }
    if (id === "17") {
      const values: Record<string, unknown> = {
        from: integer(p.from.value),
        to: integer(p.to.value),
      };
      if (entry["operation"] === "session_conversion") values["session"] = p.session.value;
      const rows = yield* sql(
        "ordered-conversion",
        values,
        row({ session: TypeExpr.text }),
        (ctx, input) => {
          const conditions: string[] = [],
            sources: string[] = [];
          for (const [index, step] of ["view", "checkout", "payment"].entries()) {
            sources.push(`f s${index}`, `f k${index}`, `f t${index}`);
            conditions.push(
              `s${index}.entity_id = k${index}.entity_id`,
              `s${index}.entity_id = t${index}.entity_id`,
              `s${index}.attribute = ${ctx.attribute(a("session"))}`,
              `k${index}.attribute = ${ctx.attribute(a("step"))}`,
              `k${index}.value_string = ${ctx.bind(step)}`,
              `t${index}.attribute = ${ctx.attribute(a("at"))}`,
              `${integerChannel(`t${index}`)} >= ${ctx.bind(input["from"])}`,
              `${integerChannel(`t${index}`)} < ${ctx.bind(input["to"])}`,
            );
          }
          conditions.push(
            "s0.value_string = s1.value_string",
            "s1.value_string = s2.value_string",
            `${integerChannel("t0")} < ${integerChannel("t1")}`,
            `${integerChannel("t1")} < ${integerChannel("t2")}`,
          );
          if (input["session"] !== undefined)
            conditions.push(`s0.value_string = ${ctx.bind(input["session"])}`);
          return `WITH f AS ${ctx.facts()} SELECT DISTINCT s0.value_string AS "session" FROM ${sources.join(" CROSS JOIN ")} WHERE ${conditions.join(" AND ")}`;
        },
      );
      return entry["operation"] === "session_conversion"
        ? [[rows.length > 0]]
        : rows.map((value) => [value["session"]]);
    }
    if (id === "18") {
      const rows = yield* sql(
        "uptime-interval-union",
        { machine: p.machine.value, from: tick(p.from.value), to: tick(p.to.value) },
        row({ duration: TypeExpr.int64 }),
        (ctx, input) =>
          // The pinned2.2 image reports AbstractMethodError for aggregate window
          // visitors. Native endpoint segmentation needs no window operator and
          // counts each covered elementary interval once, including duplicates.
          // Explicit binary64 endpoints also avoid the observed LongVector
          // union/join bug; Triplex valid-time coordinates are binary64 numbers.
          `WITH source AS ${ctx.recordedFacts()}, clipped AS (SELECT DISTINCT CAST(GREATEST(valid_from, ${ctx.bind(input["from"])}) AS DOUBLE PRECISION) AS lo, CAST(LEAST(COALESCE(valid_to, ${ctx.bind(input["to"])}), ${ctx.bind(input["to"])}) AS DOUBLE PRECISION) AS hi FROM source WHERE attribute = ${ctx.attribute(a("machine"))} AND value_string = ${ctx.bind(input["machine"])} AND valid_from < ${ctx.bind(input["to"])} AND (valid_to IS NULL OR valid_to > ${ctx.bind(input["from"])})), points AS (SELECT lo AS boundary FROM clipped UNION SELECT hi AS boundary FROM clipped), segments AS (SELECT l.boundary AS lo, r.boundary AS hi FROM points l CROSS JOIN points r WHERE l.boundary < r.boundary AND NOT EXISTS (SELECT 1 FROM points middle WHERE middle.boundary > l.boundary AND middle.boundary < r.boundary)) SELECT COALESCE(SUM(hi - lo), 0) AS duration FROM segments s WHERE EXISTS (SELECT 1 FROM clipped c WHERE c.lo <= s.lo AND c.hi >= s.hi)`,
      );
      return [[rows[0]!["duration"]]];
    }
    if (id === "19") {
      const predictions = yield* sql(
        "prediction-label-cut",
        { prediction: p.prediction["value"] },
        row({
          customer: TypeExpr.text,
          at: TypeExpr.int64,
          known: TypeExpr.int64,
          label: TypeExpr.boolean,
        }),
        (ctx, input) =>
          `WITH f AS ${ctx.facts()} SELECT DISTINCT customer.value_string AS customer, ${integerChannel("at")} AS at, ${integerChannel("known")} AS known, label.value_boolean = 1 AS label FROM f customer JOIN f at ON customer.entity_id = at.entity_id JOIN f known ON customer.entity_id = known.entity_id JOIN f label ON customer.entity_id = label.entity_id WHERE customer.entity_id = ${ctx.bind(input["prediction"])} AND customer.attribute = ${ctx.attribute(a("customer"))} AND at.attribute = ${ctx.attribute(a("predicted_at"))} AND known.attribute = ${ctx.attribute(a("feature_known_at"))} AND label.attribute = ${ctx.attribute(a("fraud"))}`,
      );
      const answer: unknown[][] = [];
      for (const prediction of predictions) {
        const logical = positionToLogical.get(Number(exact(prediction["known"])));
        if (logical === undefined)
          throw new Error("A prediction refers to an unmapped committed source cut");
        const at = {
          ...entry,
          cut: { known_at: String(logical), valid_at: exact(prediction["at"]).toString() },
        };
        for (const feature of yield* stateAt(prediction["customer"], p.feature.value, at))
          answer.push([p.prediction["value"], feature, prediction["label"]]);
      }
      return answer;
    }
    if (id === "20" && entry["operation"] === "reachability_closure") {
      const rows = yield* recursive(
        "reachability-closure",
        { from: p.from.value },
        row({ target: TypeExpr.text }),
        [["support", "_support"]],
        (ctx, input) =>
          `SELECT DISTINCT target FROM ${ctx.relation("support")} c WHERE source = ${ctx.bind(input["from"])}`,
      );
      return rows.map((value) => [value["target"]]);
    }
    if (id === "20" && entry["operation"] === "reachability_supports") {
      let paths = 0n;
      for (let length = 1; length <= 3; length++) {
        const rows = yield* sql(
          `bounded-dag-witnesses-${length}`,
          { from: p.from.value, to: p.to.value },
          row({ count: TypeExpr.int64 }),
          (ctx, input) => {
            const conditions = Array.from(
              { length },
              (_, index) => `e${index}.attribute = ${ctx.attribute(a("_support"))}`,
            );
            conditions.push(
              `e0.entity_id = ${ctx.bind(input["from"])}`,
              `e${length - 1}.value_string = ${ctx.bind(input["to"])}`,
            );
            for (let index = 1; index < length; index++)
              conditions.push(`e${index}.entity_id = e${index - 1}.value_string`);
            const projected =
              length === 1
                ? "TRUE AS witness"
                : Array.from(
                    { length: length - 1 },
                    (_, index) => `e${index}.value_string AS node${index}`,
                  ).join(", ");
            return `WITH f AS ${ctx.facts()} SELECT COUNT(*) AS count FROM (SELECT DISTINCT ${projected} FROM ${Array.from({ length }, (_, index) => `f e${index}`).join(" CROSS JOIN ")} WHERE ${conditions.join(" AND ")}) paths`;
          },
        );
        paths += exact(rows[0]!["count"]);
      }
      trace.push({
        normalization: "add three final native witness counts for the frozen four-node DAG fixture",
      });
      return [[paths > 0n, integer(paths)]];
    }
    throw new Error(`UNSUPPORTED_PUBLIC_NATIVE_WORKLOAD:xtdb:${id}:${entry["operation"]}`);
  });
