/** Execute the copied business-event packet through public Triplex APIs.
 * No expected rows or event-oracle output are used to seed storage or queries.
 */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Exit } from "effect";
import {
  EntityId,
  Triples,
  boolean,
  integer,
  string,
  ref,
  type TripleValue,
  type TripleId,
  type TriplesService,
} from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";

type JsonRecord = Record<string, any>;
type Fact = {
  owner: string;
  entity: string;
  field: string;
  value: TripleValue;
  from: number;
  to?: number;
  id?: TripleId;
};
const root = path.resolve(import.meta.dirname, "../../..");
const { nativeWrite, eventGroups } = await import(
  pathToFileURL(path.join(root, "qualification/workloads/engine_cases.mjs")).href
);
const packetBytes = readFileSync(
  path.join(root, "qualification/workloads/temporal-workloads.json"),
);
const packet = JSON.parse(packetBytes.toString());
const arguments_ = process.argv.slice(2);
const option = (key: string, fallback: string) =>
  arguments_.includes(key) ? arguments_[arguments_.indexOf(key) + 1]! : fallback;
const selected = option(
  "--workloads",
  packet.workloads.map((workload: JsonRecord) => workload.id).join(","),
).split(",");
assert.ok(
  selected.every((id) => packet.workloads.some((workload: JsonRecord) => workload.id === id)),
);
const runId = randomUUID();
const backend = await loadQualificationBackend();
const output = path.resolve(
  option(
    "--output",
    path.join(root, "qualification/evidence", backend.name, `public-workloads-${runId}.json`),
  ),
);
// [EXP-000] Why: a third admission path for the triplex-db-2 lab. TRIPLEX_LAB_SLOT_OWNER names
// a lab slot lock (lab/locks/<lane>-<slot>/owner.json, written by lab/bin/engine.mjs). It must be
// a held lock for this backend whose endpoint equals the URL the loader will contact, and output
// must go under <repo>/runs/ (gitignored raw output; lab/bin/gate.mjs writes the receipt).
// The homebase branches below (devloop admission file, scripts/triplex-resources.mjs) are kept
// unchanged so archived receipts stay reproducible as provenance.
// Rejected: TRIPLEX_ADMISSION=off (R4 suggestion), because an unchecked run could reach an
// engine nobody owns; reusing the homebase controller (built for another machine).
const labAdmission = (() => {
  const file = process.env["TRIPLEX_LAB_SLOT_OWNER"];
  if (!file) return undefined;
  const actualPath = realpathSync(file);
  assert.ok(
    /\/lab\/locks\/(xtdb|qlever)-(dev|s[1-9])\/owner\.json$/.test(actualPath),
    "TRIPLEX_LAB_SLOT_OWNER must be a lab slot lock owner.json",
  );
  const bytes = readFileSync(actualPath);
  const owner = JSON.parse(bytes.toString("utf8"));
  assert.equal(owner.format, "tx2-slot-owner/1");
  assert.equal(owner.lane, backend.name, "Slot lane differs from the selected backend");
  assert.equal(owner.endpoint, backend.url, "Backend URL differs from the held slot's endpoint");
  return {
    policy: "triplex-db-2-lab-slot/1",
    path: actualPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    owner,
  };
})();
const resourceBefore = labAdmission ?? (() => {
  const file = process.env["TRIPLEX_RESOURCE_ADMISSION"];
  if (file) {
    const actualPath = realpathSync(file);
    assert.ok(
      actualPath.startsWith(realpathSync(root) + path.sep),
      "Admission must be an owned artifact",
    );
    const bytes = readFileSync(actualPath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    assert.equal(
      sha256,
      process.env["TRIPLEX_RESOURCE_ADMISSION_SHA256"],
      "Admission bytes differ",
    );
    const admission = JSON.parse(bytes.toString("utf8"));
    assert.equal(admission.format, "triplex-devloop-resource-admission/1");
    assert.equal(admission.proofPolicy, "portable-export-devloop-v1");
    assert.equal(admission.state, "ADMITTED");
    assert.equal(admission.localResourcesOnly, true);
    assert.equal(path.resolve(admission.root), root);
    assert.equal(admission.backend, backend.name);
    assert.equal(admission.queryPath, backend.queryPath);
    assert.ok(Number.isSafeInteger(admission.controller?.pid) && admission.controller.pid > 0);
    process.kill(admission.controller.pid, 0); // Liveness observation; never signal or stop the controller.
    return {
      policy: "portable-export-devloop-v1",
      path: path.relative(root, actualPath),
      sha256,
      admission,
    };
  }
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        path.join(root, "scripts/triplex-resources.mjs"),
        "--planned-bytes",
        String(128 * 1024 ** 2),
        "--require-server",
      ],
      { encoding: "utf8" },
    ),
  );
})();
// The portable controller owns an explicit artifacts directory. The archived
// qualification directory remains the only destination without that admission.
const outputRoot = labAdmission
  ? path.join(root, "runs")
  : resourceBefore.policy === "portable-export-devloop-v1"
    ? path.join(path.resolve(root, resourceBefore.admission.directory), "artifacts")
    : path.join(root, "qualification");
assert.ok(
  output.startsWith(outputRoot + path.sep),
  "Output must remain in the admitted artifacts directory",
);
mkdirSync(path.dirname(output), { recursive: true });
const report: JsonRecord = {
  format: "triplex-public-workload-packet/3",
  backend: backend.name,
  queryPath: backend.queryPath,
  // [EXP-X02] The XTDB native language this run used for every task (xtql | xtdb-sql).
  nativeLanguage: backend.nativeLanguage ?? null,
  runId,
  status: "RUNNING",
  timestampUtc: new Date().toISOString(),
  packetSha256: createHash("sha256").update(packetBytes).digest("hex"),
  resourceBefore,
  implementationInventory: backend.queryPath.endsWith("-native")
    ? {
        scope: "Authored implementation only; native execution below determines qualification",
        implemented: packet.workloads.flatMap((workload: JsonRecord) =>
          workload.cases
            .filter((entry: JsonRecord) =>
              backend.nativeWorkload!.supports(workload.id, entry.operation),
            )
            .map((entry: JsonRecord) => `${workload.id}/${entry.id}`),
        ),
        pending: packet.workloads.flatMap((workload: JsonRecord) =>
          workload.cases
            .filter(
              (entry: JsonRecord) =>
                !backend.nativeWorkload!.supports(workload.id, entry.operation),
            )
            .map((entry: JsonRecord) => `${workload.id}/${entry.id}`),
        ),
      }
    : undefined,
  workloads: [],
  expectedCaseExecutions: packet.workloads
    .filter((entry: JsonRecord) => selected.includes(entry.id))
    .reduce((total: number, entry: JsonRecord) => total + entry.cases.length * 2, 0),
  mapping: {
    source:
      "Copied pure nativeWrite event-to-record projections; never oracle answers or packet assertions.",
    validTime:
      "Fixture ticks map to nonnegative Triplex milliseconds by adding1000000; unbounded beginning sentinel maps0 and end sentinel remains unbounded. Domain fixture cuts are preserved exactly.",
    recordedTime:
      "Logical fixture knowledge groups map to deterministic recordedAt=1000+group; each group is one atomic Triplex transact. Native XTDB system time remains independent.",
    attributes:
      "Fixture attributes become :w<id>/a<UTF8hex>; generated direct-reference edge facts are charged in the same transaction.",
    projection:
      "Put/interval-local patch projections use small fixture write overlays with explicit retract/assert operations. No database or ordinary query is evaluated in the host.",
    queries: backend.queryPath.endsWith("-native")
      ? "Independently authored backend-native task queries, typed parameter/result contracts and closed basis relations. No Datalog compilation. Final scalar/result normalization is explicitly charged."
      : "Existing structured Triplex Datalog; interval API reuses the same AST. Bounded business-operation normalization of final aggregate/boolean/interval results is explicitly charged.",
    languageClaim:
      "Multi-query business operations and bounded four-node path witnesses do not establish broad rule composition, query arithmetic, general path counting or incremental maintenance.",
  },
  limitations: [
    "Functional fixture execution only, not scaled comparison, latency qualification, complete schema delegation or all ten goals.",
    "Some business operations use multiple public Datalog queries at the same fixed knowledge cut; normalization cost is included.",
    "Rule closure uses public constrained binary rules over explicitly stored direct-reference edges; additional projected facts are included in write counts.",
    "Schemas are not silently imported from DuckDB's DSL; this runner tests facts/queries and leaves complete Triplex schema acceptance to separate tests.",
    "Five public query surfaces share three Triplex foundations. Native public providers compete; raw probes remain diagnostics and event replay remains the independent oracle.",
    "Upstream44 qualifies the foundation runtime separately; it does not certify arbitrary native queries or every native query-surface feature.",
  ],
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const beginning = -9223372036854775808n,
  infinity = 9223372036854775807n;
const tick = (value: string | bigint | number) => {
  const exact = BigInt(value);
  if (exact === beginning) return 0;
  const shifted = exact + 1_000_000n;
  assert.ok(shifted >= 0n && shifted <= BigInt(Number.MAX_SAFE_INTEGER));
  return Number(shifted);
};
const attribute = (id: string, field: string) => `:w${id}/a${Buffer.from(field).toString("hex")}`;
const valueOf = (value: JsonRecord): TripleValue =>
  value.tag === "i64"
    ? integer(String(value.value))
    : value.tag === "bool"
      ? boolean(value.value)
      : string(value.value);
const integerOf = (value: unknown): bigint => {
  if (typeof value === "object" && value && (value as JsonRecord).type === "integer")
    return BigInt((value as JsonRecord).value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  throw new TypeError(`Expected exact integer result: ${JSON.stringify(value)}`);
};
const wire = (value: unknown) =>
  typeof value === "boolean"
    ? { tag: "bool", value }
    : typeof value === "string"
      ? { tag: "str", value }
      : { tag: "i64", value: integerOf(value).toString() };
const canonicalRows = (rows: unknown[][]) =>
  [...new Set(rows.map((row) => JSON.stringify(row.map(wire))))].sort();
const keyOf = (fact: Fact) =>
  JSON.stringify([fact.owner, fact.entity, fact.field, fact.value, fact.from, fact.to ?? null]);
const basisOf = (entry: JsonRecord) => ({
  recordedAt: 1000 + Number(entry.cut.known_at),
  validAt: tick(entry.cut.valid_at ?? 0),
});
const q = (triples: TriplesService, query: unknown, entry: JsonRecord, trace: unknown[]) => {
  trace.push({ query, basis: basisOf(entry) });
  return triples
    .queryAll(query as DatalogQuery, { basis: basisOf(entry) })
    .pipe(Effect.map((result) => result.results));
};
const rules = (id: string, name: string, edge: string) => [
  { name, body: [["?x", attribute(id, edge), "?y"]] },
  {
    name,
    body: [
      ["?x", attribute(id, edge), "?z"],
      [name, "?z", "?y"],
    ],
  },
];

function supplemented(base: readonly Fact[]): Fact[] {
  const result = [...base];
  const windows = new Map<string, Fact[]>();
  for (const fact of base) {
    const key = JSON.stringify([fact.from, fact.to]);
    windows.set(key, [...(windows.get(key) ?? []), fact]);
  }
  for (const facts of windows.values()) {
    const first = facts[0]!;
    const fields = new Map(facts.map((fact) => [fact.field, fact.value.value]));
    const add = (entity: string, field: string, target: string) =>
      result.push({
        owner: first.owner,
        entity,
        field,
        value: ref(EntityId.make(target)),
        from: first.from,
        ...(first.to === undefined ? {} : { to: first.to }),
      });
    for (const [source, target, edge] of [
      ["parent", "child", "_contains"],
      ["input_lot", "output_lot", "_production"],
      ["dependency_source", "dependency_target", "_dependency"],
      ["edge_source", "edge_target", "_support"],
    ]) {
      if (fields.has(source!) && fields.has(target!))
        add(String(fields.get(source!)), edge!, String(fields.get(target!)));
    }
    const kind = fields.get("kind"),
      subject = String(fields.get("subject")),
      target = String(fields.get("target"));
    if (kind === "membership") {
      add(subject, "_member", target);
      add(subject, "_member", subject);
      add(target, "_member", target);
    }
    if (kind === "resource_parent") {
      add(subject, "_resource", target);
      add(subject, "_resource", subject);
      add(target, "_resource", target);
    }
    if (kind === "grant") {
      add(subject, "_member", subject);
      add(target, "_resource", target);
    }
  }
  return [...new Map(result.map((fact) => [keyOf(fact), fact])).values()];
}

function projectRecord(state: Map<string, Fact[]>, member: JsonRecord, operation: string) {
  const owner = member.entityId,
    from = tick(member.validFrom);
  const to = BigInt(member.validTo) === infinity ? undefined : tick(member.validTo);
  const original = state.get(owner) ?? [];
  const retained: Fact[] = [];
  if (operation === "patch")
    for (const fact of original) {
      if ((fact.to !== undefined && fact.to <= from) || (to !== undefined && fact.from >= to))
        retained.push(fact);
      else {
        if (fact.from < from) retained.push({ ...fact, to: from });
        if (to !== undefined && (fact.to === undefined || fact.to > to))
          retained.push({ ...fact, from: to });
      }
    }
  const added = member.fields.map((field: JsonRecord) => ({
    owner,
    entity: owner,
    field: field.attribute,
    value: valueOf(field.value),
    from,
    ...(to === undefined ? {} : { to }),
  }));
  state.set(owner, [...retained, ...added]);
}

const evaluate = (
  triples: TriplesService,
  workload: JsonRecord,
  entry: JsonRecord,
  scope: DatabaseScope,
  positionToLogical: Map<number, number>,
  trace: unknown[],
) =>
  Effect.gen(function* () {
    const id = workload.id,
      p = entry.parameters,
      a = (name: string) => attribute(id, name);
    const run = (query: unknown, at: JsonRecord = entry) => q(triples, query, at, trace);
    const exists = (query: unknown) => run(query).pipe(Effect.map((rows) => rows.length > 0));
    const sum = (where: unknown[]) =>
      run({ find: ["?sum"], where, aggregate: [["sum", "?amount", "?sum"]] }).pipe(
        Effect.map((rows) => (rows[0]?.["?sum"] == null ? 0n : integerOf(rows[0]?.["?sum"]))),
      );
    if (entry.operation === "state_at" && id !== "05") {
      const rows = yield* run({
        find: ["?v"],
        where: [[p.entity.value, a(p.attribute.value), "?v"]],
      });
      return rows.map((row) => [row["?v"]]);
    }
    if (id === "03") {
      const answer: unknown[][] = [];
      const purchases = yield* run({
        find: ["?purchase", "?at"],
        where: [
          ["?purchase", a("product"), p.product.value],
          ["?purchase", a("purchased_at"), "?at"],
        ],
      });
      for (const purchase of purchases)
        if (p.purchase_ids.some((value: JsonRecord) => value.value === purchase["?purchase"])) {
          const rows = yield* run(
            { find: ["?price"], where: [[p.product.value, a("price"), "?price"]] },
            { ...entry, cut: { ...entry.cut, valid_at: integerOf(purchase["?at"]).toString() } },
          );
          for (const row of rows) answer.push([purchase["?purchase"], row["?price"]]);
        }
      return answer;
    }
    if (id === "04") {
      let coverage: string,
        at = entry;
      if (entry.operation === "relation_exists")
        coverage = JSON.stringify(["coverage", p.target.value]);
      else {
        const driver = yield* run({
          find: ["?coverage", "?at"],
          where: [
            [JSON.stringify(["claim", p.claim.value]), a("coverage_customer"), "?coverage"],
            [JSON.stringify(["claim", p.claim.value]), a("claim_at"), "?at"],
          ],
        });
        if (!driver.length) return [[false]];
        coverage = String(driver[0]!["?coverage"]);
        at = { ...entry, cut: { ...entry.cut, valid_at: integerOf(driver[0]!["?at"]).toString() } };
      }
      const policy = p.policy?.value ?? p.entity.value;
      const found = yield* run(
        { find: [true], where: [[coverage, a(`covers/${policy}`), true]] },
        at,
      );
      return [[found.length > 0]];
    }
    if (id === "05") {
      const object = p.subject?.value ?? p.entity.value;
      if (entry.operation === "accepted_event_count") {
        const rows = yield* run({
          find: ["?count"],
          where: [["?event", a("webhook_object"), object]],
          aggregate: [["count", "?event", "?count"]],
        });
        return [[rows[0]?.["?count"] ?? 0]];
      }
      const latest = yield* run({
        find: ["?revision"],
        where: [
          ["?event", a("webhook_object"), object],
          ["?event", a("revision"), "?v"],
        ],
        aggregate: [["max", "?v", "?revision"]],
      });
      if (latest[0]?.["?revision"] == null) return [];
      const rows = yield* run({
        find: ["?status"],
        where: [
          ["?event", a("webhook_object"), object],
          ["?event", a("revision"), latest[0]!["?revision"]],
          ["?event", a("status"), "?status"],
        ],
      });
      return rows.map((row) => [row["?status"]]);
    }
    if (id === "06")
      return [
        [
          integer(
            (yield* sum([
              ["?event", a("account"), p.account.value],
              ["?event", a("currency"), p.currency.value],
              ["?event", a("amount"), "?amount"],
            ])).toString(),
          ),
        ],
      ];
    if (id === "07") {
      const rows = yield* run({
        find: ["?ledger", "?sum"],
        where: [
          ["?event", a("sku"), p.sku.value],
          ["?event", a("ledger"), "?ledger"],
          ["?event", a("delta"), "?amount"],
        ],
        aggregate: [["sum", "?amount", "?sum"]],
      });
      const totals = new Map(rows.map((row) => [row["?ledger"], integerOf(row["?sum"])]));
      const physical = totals.get("physical") ?? 0n,
        reserved = totals.get("reservation") ?? 0n;
      return [[integer(physical), integer(reserved), integer(physical - reserved)]];
    }
    if (id === "08") {
      const captures = yield* sum([
        ["?capture", a("customer"), p.customer.value],
        ["?capture", a("currency"), p.currency.value],
        ["?capture", a("amount"), "?amount"],
      ]);
      const refunds = yield* sum([
        ["?capture", a("customer"), p.customer.value],
        ["?refund", a("capture"), "?capture"],
        ["?refund", a("currency"), p.currency.value],
        ["?refund", a("amount"), "?amount"],
      ]);
      return [[integer(captures - refunds)]];
    }
    if (id === "09") {
      const rows = yield* run({
        find: ["?subscription"],
        where: [
          ["?payment", a("paid"), true],
          ["?payment", a("subscription"), "?subscription"],
          [
            "not",
            ["?entitlement", a("subject"), "?subscription"],
            ["?entitlement", a("entitled"), true],
          ],
        ],
      });
      return rows.map((row) => [row["?subscription"]]);
    }
    if (id === "10") {
      const starts = yield* run({
        find: ["?deadline", "?feed"],
        where: [
          ["?start", a("subject"), p.workflow.value],
          ["?start", a("deadline"), "?deadline"],
          ["?start", a("source"), "?feed"],
        ],
      });
      if (!starts.length) return [];
      const deadline = integerOf(starts[0]!["?deadline"]),
        feed = starts[0]!["?feed"];
      const completions = yield* run({
        find: ["?first"],
        where: [
          ["?event", a("subject"), p.workflow.value],
          ["?event", a("source"), feed],
          ["?event", a("completed_at"), "?at"],
        ],
        aggregate: [["min", "?at", "?first"]],
      });
      const first = completions[0]?.["?first"];
      if (first != null) return [[integerOf(first) > deadline ? "completed_late" : "completed"]];
      const watermark = yield* run({
        find: ["?through"],
        where: [
          ["?event", a("subject"), feed],
          ["?event", a("through"), "?at"],
        ],
        aggregate: [["max", "?at", "?through"]],
      });
      const through = watermark[0]?.["?through"];
      return [
        [
          BigInt(entry.cut.valid_at) < deadline
            ? "in_progress"
            : through != null && integerOf(through) >= deadline
              ? "overdue"
              : "pending_knowledge",
        ],
      ];
    }
    if (id === "11")
      return [
        [
          yield* exists({
            find: [true],
            rules: [...rules(id, "member", "_member"), ...rules(id, "resource", "_resource")],
            where: [
              ["member", p.user.value, "?principal"],
              ["resource", p.resource.value, "?resource"],
              ["?grant", a("kind"), "grant"],
              ["?grant", a("subject"), "?principal"],
              ["?grant", a("target"), "?resource"],
            ],
          }),
        ],
      ];
    if (id === "12")
      return [
        [
          yield* exists({
            find: [true],
            where: [
              ["?support", a("kind"), "support"],
              ["?support", a("subject"), p.user.value],
              ["?support", a("target"), p.resource.value],
              ["?support", a("principal"), "?principal"],
              [
                "not",
                ["?block", a("kind"), "block"],
                ["?block", a("subject"), p.user.value],
                ["?block", a("target"), p.resource.value],
              ],
              [
                "not",
                ["?revoke", a("kind"), "revoke"],
                ["?revoke", a("subject"), "?principal"],
                ["?revoke", a("target"), p.resource.value],
              ],
            ],
          }),
        ],
      ];
    if (id === "13") {
      const rows = yield* run({
        find: ["?item"],
        rules: rules(id, "contains", "_contains"),
        where: [
          ["contains", p.container.value, "?item"],
          ["not", ["?item", a("_contains"), "?child"]],
        ],
      });
      return rows.map((row) => [row["?item"]]);
    }
    if (id === "14") {
      const rows = yield* run({
        find: ["?customer"],
        rules: rules(id, "production", "_production"),
        where: [
          ["?contamination", a("contaminated_lot"), p.contaminated_lot.value],
          ["production", p.contaminated_lot.value, "?lot"],
          ["?shipment", a("shipped_lot"), "?lot"],
          ["?shipment", a("customer"), "?customer"],
        ],
      });
      return rows.map((row) => [row["?customer"]]);
    }
    if (id === "15") {
      const closure = entry.operation === "dependency_closure";
      const rows = yield* run({
        find: [closure ? "?dependency" : "?application"],
        rules: rules(id, "dependency", "_dependency"),
        where: closure
          ? [["dependency", p.application.value, "?dependency"]]
          : [
              ["?deployment", a("environment"), p.environment.value],
              ["?deployment", a("application"), "?application"],
              ["dependency", "?application", "?dependency"],
              ["?vulnerability", a("vulnerable_subject"), "?dependency"],
              ["?vulnerability", a("vulnerable"), true],
            ],
      });
      return rows.map((row) => [row[closure ? "?dependency" : "?application"]]);
    }
    if (id === "16") {
      const result: unknown[][] = [];
      for (const field of ["input_a", "input_b"]) {
        const rows = yield* run({
          find: ["?input", "?version"],
          where: [
            ["?run", a("output"), p.output.value],
            ["?run", a(field), "?input"],
            ["?run", a("code_version"), "?version"],
          ],
        });
        result.push(...rows.map((row) => [row["?input"], row["?version"]]));
      }
      const extra = yield* run({
        find: ["?input", "?version"],
        where: [
          ["?run", a("output"), p.output.value],
          ["?run", a("subject"), "?runId"],
          ["?run", a("code_version"), "?version"],
          ["?metadata", a("subject"), "?runId"],
          ["?metadata", a("input"), "?input"],
        ],
      });
      return [...result, ...extra.map((row) => [row["?input"], row["?version"]])];
    }
    if (id === "17") {
      const where: unknown[] = [];
      for (const [event, step, time] of [
        ["?view", "view", "?v"],
        ["?checkout", "checkout", "?c"],
        ["?payment", "payment", "?p"],
      ])
        where.push(
          [event, a("session"), "?session"],
          [event, a("step"), step],
          [event, a("at"), time],
          [">=", time, integer(p.from.value)],
          ["<", time, integer(p.to.value)],
        );
      where.push(["<", "?v", "?c"], ["<", "?c", "?p"]);
      if (entry.operation === "session_conversion") where.push(["=", "?session", p.session.value]);
      const rows = yield* run({ find: ["?session"], where });
      return entry.operation === "session_conversion"
        ? [[rows.length > 0]]
        : rows.map((row) => [row["?session"]]);
    }
    if (id === "18") {
      const spans = yield* backend.queryIntervals(
        scope,
        {
          find: ["?machine"],
          where: [
            ["?e", a("machine"), "?machine"],
            ["=", "?machine", p.machine.value],
          ],
        },
        { from: tick(p.from.value), to: tick(p.to.value), recordedAt: basisOf(entry).recordedAt },
      );
      const duration = spans.reduce((sum, span) => sum + BigInt(span.validTo - span.validFrom), 0n);
      trace.push({
        operation: "public-queryIntervals",
        spans: spans.length,
        normalization: "sum final coalesced interval durations",
      });
      return [[integer(duration)]];
    }
    if (id === "19") {
      const predictions = yield* run({
        find: ["?customer", "?at", "?known", "?label"],
        where: [
          [p.prediction.value, a("customer"), "?customer"],
          [p.prediction.value, a("predicted_at"), "?at"],
          [p.prediction.value, a("feature_known_at"), "?known"],
          [p.prediction.value, a("fraud"), "?label"],
        ],
      });
      const result: unknown[][] = [];
      for (const prediction of predictions) {
        const logical = positionToLogical.get(Number(integerOf(prediction["?known"])));
        assert.notEqual(logical, undefined);
        const features = yield* run(
          {
            find: ["?feature"],
            where: [[prediction["?customer"], a(p.feature.value), "?feature"]],
          },
          {
            ...entry,
            cut: { known_at: String(logical), valid_at: integerOf(prediction["?at"]).toString() },
          },
        );
        for (const feature of features)
          result.push([p.prediction.value, feature["?feature"], prediction["?label"]]);
      }
      return result;
    }
    if (id === "20") {
      if (entry.operation === "reachability_closure") {
        const rows = yield* run({
          find: ["?node"],
          rules: rules(id, "support", "_support"),
          where: [["support", p.from.value, "?node"]],
        });
        return rows.map((row) => [row["?node"]]);
      }
      let paths = 0n;
      for (let length = 1; length <= 3; length++) {
        const nodes = [
          p.from.value,
          ...Array.from({ length: length - 1 }, (_, index) => `?interior${index}`),
          p.to.value,
        ];
        const rows = yield* run({
          find: length === 1 ? [true] : nodes.slice(1, -1),
          where: Array.from({ length }, (_, index) => [
            nodes[index],
            a("_support"),
            nodes[index + 1],
          ]),
        });
        paths += BigInt(rows.length);
      }
      trace.push({
        normalization:
          "count bounded final path witnesses up to3edges, exact four-node DAG fixture only",
      });
      return [[paths > 0n, integer(paths)]];
    }
    throw new Error(`UNSUPPORTED_PUBLIC_WORKLOAD:${id}:${entry.operation}`);
  });

for (const workload of packet.workloads.filter((entry: JsonRecord) =>
  selected.includes(entry.id),
)) {
  const scope = DatabaseScope.test(`${backend.name}-workload-${runId}-${workload.id}`);
  const record: JsonRecord = {
    id: workload.id,
    title: workload.title,
    scope,
    status: "INGESTING",
    stage: "INGESTION",
    expectedCaseExecutions: workload.cases.length * 2,
    groups: [],
    cases: [],
  };
  report.workloads.push(record);
  save();
  let state = new Map<string, Fact[]>();
  let stored = new Map<string, Fact>();
  const positions = new Map<number, number>([[0, 0]]),
    reverse = new Map<number, number>([[0, 0]]);
  try {
    for (const [logicalBig, events] of eventGroups(workload)) {
      const logical = Number(logicalBig);
      const staged = new Map(
        [...state].map(([owner, facts]) => [owner, facts.map((fact) => ({ ...fact }))]),
      );
      for (const event of events) {
        const command = nativeWrite(workload, event, (cut: bigint) =>
          BigInt(positions.get(Number(cut)) ?? 0),
        );
        for (const member of command.method === "batch"
          ? command.request.members
          : [{ ...command.request, operation: command.method }])
          projectRecord(staged, member, member.operation);
      }
      const proposed = new Map(
        [...staged.values()]
          .flatMap((facts) => supplemented(facts))
          .map((fact) => [keyOf(fact), fact]),
      );
      const removed = [...stored].filter(([key]) => !proposed.has(key)).map(([, fact]) => fact);
      const added = [...proposed].filter(([key]) => !stored.has(key)).map(([, fact]) => fact);
      const operations = [
        ...removed.map((fact) => ({ op: "retract" as const, id: fact.id! })),
        ...added.map((fact) => ({
          op: "assert" as const,
          entityId: EntityId.make(fact.entity),
          attribute: attribute(workload.id, fact.field),
          value: fact.value,
          validFrom: fact.from,
          ...(fact.to === undefined ? {} : { validTo: fact.to }),
        })),
      ];
      const started = performance.now();
      if (workload.id === "05")
        assert.equal(
          events.length,
          1,
          "Webhook fixture has one accepted source event per knowledge group",
        );
      const commandId =
        workload.id === "05" ? `event-${events[0].id}` : `${runId}:${workload.id}:group:${logical}`;
      const receipt = await Effect.runPromise(
        Effect.gen(function* () {
          const triples = yield* Triples;
          return yield* triples.transact(operations, { commandId });
        }).pipe(
          Effect.provide(
            backend.makeRuntime().layer({
              scope,
              capabilities: Capabilities.none,
              deterministic: {
                startTime: 1000 + logical,
                seed: `${runId}-${workload.id}-${logical}`,
              },
            }),
          ),
          Effect.scoped,
        ),
      );
      assert.equal(receipt.triples.length, added.length);
      for (const [key, fact] of proposed) if (stored.has(key)) proposed.set(key, stored.get(key)!);
      added.forEach((fact, index) =>
        proposed.set(keyOf(fact), { ...fact, id: receipt.triples[index]!.id }),
      );
      state = staged;
      stored = proposed;
      positions.set(logical, receipt.position);
      reverse.set(receipt.position, logical);
      record.groups.push({
        logical,
        actualPosition: receipt.position,
        events: events.length,
        assertions: added.length,
        retractions: removed.length,
        commandId,
        acknowledgedMs: performance.now() - started,
      });
      save();
      if (workload.id === "05") {
        const { webhookDeliveries } = await import(
          pathToFileURL(path.join(root, "qualification/workloads/webhook_cases.mjs")).href
        );
        const deliveries = webhookDeliveries(workload).filter(
          (item: JsonRecord) => item.event.id === events[0].id,
        );
        record.deliveries ??= [];
        for (const [index, item] of deliveries.entries()) {
          const verification = await Effect.runPromise(
            Effect.gen(function* () {
              const triples = yield* Triples;
              const before = yield* triples.currentPosition();
              if (index > 0) {
                const replay = yield* triples.transact(operations, { commandId }).pipe(
                  Effect.match({
                    onFailure: (error) => ({ status: "rejected" as const, tag: error._tag }),
                    onSuccess: () => ({ status: "committed" as const, tag: "unexpected" }),
                  }),
                );
                assert.equal(replay.status, "rejected");
                assert.equal(replay.tag, "CommandAlreadyCommittedError");
              }
              const durable = yield* triples.transactionByCommand(commandId);
              assert.equal(durable?.txId, receipt.txId);
              assert.equal(durable?.position, receipt.position);
              assert.equal(yield* triples.currentPosition(), before);
              return {
                deliveryId: item.delivery.id,
                sourceEventId: item.event.id,
                receivedOrder: item.delivery.received_order,
                requestedCommandId: commandId,
                actualPosition: durable?.position,
                originalTransactionId: durable?.txId,
                duplicateSubmitted: index > 0,
                status: "PASS",
              };
            }).pipe(
              Effect.provide(
                backend.makeRuntime().layer({ scope, capabilities: Capabilities.none }),
              ),
              Effect.scoped,
            ),
          );
          record.deliveries.push(verification);
          save();
        }
      }
    }
    const checkCases = (reopen: boolean) =>
      Effect.gen(function* () {
        const triples = yield* Triples;
        const nativeSession = backend.queryPath.endsWith("-native")
          ? yield* Effect.acquireRelease(
              Effect.sync(() => backend.openNative(scope)),
              (session) => Effect.promise(() => session.close()),
            )
          : undefined;
        for (const entry of workload.cases) {
          const trace: unknown[] = [],
            started = performance.now();
          const result = yield* Effect.exit(
            nativeSession
              ? backend.nativeWorkload!.evaluate(
                  nativeSession.provider,
                  workload,
                  entry,
                  reverse,
                  trace,
                )
              : evaluate(triples, workload, entry, scope, reverse, trace),
          );
          const test: JsonRecord = {
            id: entry.id,
            queryPath: backend.queryPath,
            logicalTaskId: `${workload.id}/${entry.id}`,
            operation: entry.operation,
            cut: entry.cut,
            reopen,
            elapsedMsDiagnostic: performance.now() - started,
            queryTrace: trace,
          };
          if (Exit.isSuccess(result)) {
            test.actualRows = result.value.map((row) => row.map(wire));
            try {
              assert.deepEqual(
                canonicalRows(result.value),
                [
                  ...new Set(entry.expected_rows.map((row: unknown[]) => JSON.stringify(row))),
                ].sort(),
              );
              test.status = "PASS";
            } catch (error) {
              test.status = "FAIL_ANSWER";
              test.error = String(error);
            }
          } else {
            test.status = String(result.cause).includes("UNSUPPORTED_PUBLIC_NATIVE_WORKLOAD")
              ? "UNSUPPORTED_PUBLIC_API"
              : "FAIL_PUBLIC_API";
            test.error = String(result.cause);
          }
          record.cases.push(test);
          save();
        }
      });
    record.stage = "QUERY_CURRENT";
    save();
    await Effect.runPromise(
      checkCases(false).pipe(
        Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
    record.stage = "QUERY_REOPENED";
    save();
    await Effect.runPromise(
      checkCases(true).pipe(
        Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
    record.status = record.cases.every((entry: JsonRecord) => entry.status === "PASS")
      ? "PASS_FUNCTIONAL_ONLY"
      : "FAIL";
    record.stage = "COMPLETE";
  } catch (error) {
    record.status = `FAIL_${record.stage}`;
    record.error = String(error);
  }
  record.unexecutedCaseExecutions = record.expectedCaseExecutions - record.cases.length;
  save();
  console.log(
    JSON.stringify({ workload: workload.id, status: record.status, cases: record.cases.length }),
  );
}
report.caseExecutions = report.workloads.reduce(
  (sum: number, workload: JsonRecord) => sum + workload.cases.length,
  0,
);
report.passedCaseExecutions = report.workloads.reduce(
  (sum: number, workload: JsonRecord) =>
    sum + workload.cases.filter((entry: JsonRecord) => entry.status === "PASS").length,
  0,
);
report.unexecutedCaseExecutions = report.expectedCaseExecutions - report.caseExecutions;
report.status = report.workloads.every(
  (entry: JsonRecord) => entry.status === "PASS_FUNCTIONAL_ONLY",
)
  ? "PASS_FUNCTIONAL_ONLY"
  : "FAIL";
save();
const resultsOutput = option("--results-output", "");
if (resultsOutput) {
  const target = path.resolve(resultsOutput);
  assert.ok(target.startsWith(outputRoot + path.sep), "Results must remain in admitted artifacts");
  // Only consumed public result rows enter this deterministic artifact. Expected
  // packet answers are a separately pinned oracle input; no status flag is proof.
  const cases = report.workloads
    .flatMap((workload: JsonRecord) =>
      workload.cases.map((entry: JsonRecord) => ({
        logicalTaskId: entry.logicalTaskId,
        reopen: entry.reopen,
        rows: entry.actualRows
          ? [...new Set(entry.actualRows.map((row: unknown[]) => JSON.stringify(row)))]
              .sort()
              .map((row) => JSON.parse(row as string))
          : null,
      })),
    )
    .sort(
      (left: JsonRecord, right: JsonRecord) =>
        left.logicalTaskId.localeCompare(right.logicalTaskId, "en") ||
        Number(left.reopen) - Number(right.reopen),
    );
  writeFileSync(
    target,
    JSON.stringify(
      { format: "triplex-public-logical-results/1", queryPath: backend.queryPath, cases },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}
console.log(
  JSON.stringify({
    result: report.status,
    output,
    caseExecutions: report.caseExecutions,
    passedCaseExecutions: report.passedCaseExecutions,
  }),
);
if (report.status !== "PASS_FUNCTIONAL_ONLY") process.exitCode = 1;
