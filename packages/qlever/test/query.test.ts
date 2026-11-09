import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  EntityId,
  Triples,
  blob,
  boolean,
  datetime,
  integer,
  json,
  number,
  ref,
  string,
} from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import { compileQlever } from "../src/compiler.js";
const probePlan = process.env["QLEVER_PROBE_PLAN"];
if (probePlan !== undefined && probePlan !== "compact" && probePlan !== "persisted")
  throw new Error("Invalid isolated common-source probe plan");
const domainPlan = process.env["QLEVER_PROBE_DOMAIN_PLAN"];
if (domainPlan !== undefined && domainPlan !== "distinct" && domainPlan !== "mask")
  throw new Error("Invalid isolated domain probe plan");
const probeLimits = probePlan
  ? {
      sourcePlan: probePlan as "compact" | "persisted",
      ...(domainPlan ? { domainPlan: domainPlan as "distinct" | "mask" } : {}),
      maxPatternClauses: 32,
      timeoutMs: 6000,
      nativeTimeoutMs: 5000,
      maxResponseBytes: 4 * 1024 ** 2,
      maxResultRows: 1000,
      maxAggregateInputRows: 1000,
      maxRecursiveRows: 1000,
    }
  : undefined;
import {
  makeQleverClient,
  makeQleverQueryExecutor,
  makeQleverRuntime,
  makeQleverStorageAdapter,
} from "../src/index.js";

const traceDirectory = process.env["QLEVER_PROBE_TRACE_DIR"];
if (traceDirectory) {
  const trace = path.resolve(traceDirectory);
  if (!trace.includes(`${path.sep}qualification${path.sep}evidence${path.sep}`))
    throw new Error("Owned qualification trace directory required");
  mkdirSync(trace, { recursive: true });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== new URL(process.env["QLEVER_URL"] ?? "http://127.0.0.1:7019").origin)
      return originalFetch(input, init);
    const id = new Headers(init?.headers).get("Query-Id") ?? randomUUID();
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Unexpected native query ID");
    const body = typeof init?.body === "string" ? init.body : undefined;
    const file = body ? `${id}.rq` : undefined;
    if (file && body !== undefined) writeFileSync(path.join(trace, file), body, { flag: "wx" });
    const started = performance.now();
    const put = (event: unknown) =>
      appendFileSync(path.join(trace, "calls.jsonl"), JSON.stringify(event) + "\n");
    put({
      event: "request",
      id,
      at: new Date().toISOString(),
      url: String(url),
      method: init?.method ?? "GET",
      file,
    });
    try {
      const response = await originalFetch(input, init);
      put({
        event: "headers",
        id,
        at: new Date().toISOString(),
        durationToHeadersMs: performance.now() - started,
        status: response.status,
      });
      return response;
    } catch (error) {
      put({
        event: "client-error",
        id,
        at: new Date().toISOString(),
        durationToErrorMs: performance.now() - started,
        error: String(error),
      });
      throw error;
    }
  };
}
const probeRun = process.env["QLEVER_PROBE_RUN_ID"];
let fixtureSequence = 0;
const fixtureId = (prefix: string) =>
  `${prefix}:${probeRun ? `${probeRun}:${++fixtureSequence}` : randomUUID()}`;
const run = <A, E>(effect: Effect.Effect<A, E, Triples>) => {
  const fixture = fixtureId("qlever-query");
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(
        makeQleverRuntime({
          url: process.env["QLEVER_URL"] ?? "http://127.0.0.1:7019",
          ...(process.env["QLEVER_ACCESS_TOKEN"]
            ? { accessToken: process.env["QLEVER_ACCESS_TOKEN"] }
            : {}),
          ...(probeLimits ? { queryLimits: probeLimits } : {}),
        }).layer({
          scope: DatabaseScope.test(fixture),
          capabilities: Capabilities.none,
          ...(probeRun ? { deterministic: { startTime: 1001, seed: fixture } } : {}),
        }),
      ),
      Effect.scoped,
    ),
  );
};
describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")(
  "QLever canonical joins and aggregation",
  () => {
    it("executes the unchanged seven-field projection and main workload17 AST through compact leaves", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples;
          const values = [
            string("007"),
            number(7),
            boolean(true),
            datetime(1700000000000),
            json({ ok: true }),
            ref(EntityId.make("7")),
            blob("sha256:artifact", "application/pdf", 128, "artifact.pdf"),
          ];
          const names = ["code", "count", "enabled", "instant", "data", "owner", "blob"];
          yield* t.assertBatch(
            values.map((value, index) => ({
              entityId: EntityId.make("42"),
              attribute: `:conf/${names[index]}`,
              value,
            })),
          );
          const projection = {
            find: ["?entity", ...names.map((name) => `?${name}`)],
            where: names.map((name) => ["?entity", `:conf/${name}`, `?${name}`]),
          } as DatalogQuery;
          expect((yield* t.queryAll(projection)).results).toEqual([
            {
              "?entity": "42",
              "?code": "007",
              "?count": 7,
              "?enabled": true,
              "?instant": 1700000000000,
              "?data": '{"ok":true}',
              "?owner": "7",
              "?blob": "sha256:artifact",
            },
          ]);
          const compiled = compileQlever(projection, "offline", {
            basis: { validAt: 0, recordedPosition: 1 },
          });
          expect(compiled.sparql).not.toContain("value_integer_sum_hi");
          expect(compiled.sparql).not.toContain("value_number_native");
          const packet = JSON.parse(
            readFileSync(
              new URL("../../../qualification/workloads/temporal-workloads.json", import.meta.url),
              "utf8",
            ),
          );
          const workload = packet.workloads.find((entry: { id: string }) => entry.id === "17");
          const attribute = (field: string) => `:w17/a${Buffer.from(field).toString("hex")}`;
          const eventRows = yield* t.assertBatch(
            [...workload.events].reverse().flatMap((event: any) =>
              Object.entries(event.payload).map(([field, payload]: [string, any]) => ({
                entityId: EntityId.make(event.id),
                attribute: attribute(field),
                value: payload.tag === "i64" ? integer(payload.value) : string(payload.value),
                validFrom: 1000000 + Number(event.occurred_at),
              })),
            ),
          );
          for (const entry of workload.cases) {
            const p = entry.parameters;
            const where: unknown[] = [];
            // Identical logical shape to qualification/workloads/runner.ts family17.
            for (const [event, step, time] of [
              ["?view", "view", "?v"],
              ["?checkout", "checkout", "?c"],
              ["?payment", "payment", "?p"],
            ])
              where.push(
                [event, attribute("session"), "?session"],
                [event, attribute("step"), step],
                [event, attribute("at"), time],
                [">=", time, integer(p.from.value)],
                ["<", time, integer(p.to.value)],
              );
            where.push(["<", "?v", "?c"], ["<", "?c", "?p"]);
            if (entry.operation === "session_conversion")
              where.push(["=", "?session", p.session.value]);
            const result = yield* t.queryAll({ find: ["?session"], where } as DatalogQuery, {
              basis: { validAt: 1000050, recordedAt: eventRows[0]!.recordedAt },
            });
            expect(result.results.map((row) => row["?session"]).sort()).toEqual(
              entry.operation === "session_conversion"
                ? []
                : entry.expected_rows.map((row: any) => row[0].value).sort(),
            );
          }
        }),
      );
    }, 60000);
    it("uses the same compact typed channels for pending assertions and retractions", async () => {
      const client = makeQleverClient(process.env["QLEVER_URL"] ?? "http://127.0.0.1:7019");
      // Executor and adapter must share scope and the transaction's source view.
      const scope = fixtureId("compact-overlay");
      const storage = makeQleverStorageAdapter(client, scope);
      const query = makeQleverQueryExecutor(client, scope, {
        ...probeLimits,
        sourceView: storage.sourceView,
      });
      try {
        await Effect.runPromise(
          storage.withTransaction(
            Effect.gen(function* () {
              const position = yield* storage.nextCommitPosition();
              yield* storage.insert(
                {
                  entityId: EntityId.make("pending"),
                  attribute: ":pending",
                  value: string("old"),
                  validFrom: 0,
                },
                "old",
                100,
                "old",
                position,
              );
            }),
          ),
        );
        await Effect.runPromise(
          storage.withTransaction(
            Effect.gen(function* () {
              const position = yield* storage.nextCommitPosition();
              yield* storage.retract("old", 101, "change", position);
              yield* storage.insert(
                {
                  entityId: EntityId.make("pending"),
                  attribute: ":pending",
                  value: integer("576460752303423487"),
                  validFrom: 0,
                },
                "change",
                101,
                "new",
                position,
              );
              yield* storage.insert(
                {
                  entityId: EntityId.make("text"),
                  attribute: ":ref",
                  value: string("same"),
                  validFrom: 0,
                },
                "change",
                101,
                "text",
                position,
              );
              yield* storage.insert(
                {
                  entityId: EntityId.make("ref"),
                  attribute: ":ref",
                  value: ref(EntityId.make("same")),
                  validFrom: 0,
                },
                "change",
                101,
                "ref",
                position,
              );
              expect(
                (yield* query.execute({ find: ["?v"], where: [["pending", ":pending", "?v"]] }))
                  .results,
              ).toEqual([{ "?v": integer("576460752303423487") }]);
              expect(
                (yield* query.execute({
                  find: ["?e"],
                  where: [["?e", ":ref", ref(EntityId.make("same"))]],
                })).results,
              ).toEqual([{ "?e": "ref" }]);
              expect(
                (yield* query.execute({
                  find: ["?sum"],
                  where: [["pending", ":pending", "?v"]],
                  aggregate: [["sum", "?v", "?sum"]],
                })).results,
              ).toEqual([{ "?sum": integer("576460752303423487") }]);
            }),
          ),
        );
      } finally {
        await client.close();
      }
    }, 60000);
    it("keeps optional scalar families, null filters and mixed-family keyset order coherent", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples;
          yield* t.assertBatch(
            ["numeric", "boolean", "text", "ref", "missing"].map((id) => ({
              entityId: EntityId.make(id),
              attribute: ":type",
              value: string("Fixture"),
            })),
          );
          yield* t.assertBatch([
            { entityId: EntityId.make("numeric"), attribute: ":v", value: number(2) },
            { entityId: EntityId.make("boolean"), attribute: ":v", value: boolean(false) },
            { entityId: EntityId.make("text"), attribute: ":v", value: string("2") },
            { entityId: EntityId.make("ref"), attribute: ":v", value: ref(EntityId.make("alpha")) },
          ]);
          const inner = {
            find: ["?e", "?v"],
            where: [["?e", ":type", "Fixture"]],
            optionalProjection: { rowBinding: "?e", fields: [{ attribute: ":v", variable: "?v" }] },
          } as const;
          expect(
            (yield* t.queryPage({
              inner,
              filters: [{ column: "?v", op: "!=", value: "2" }],
            })).results.map((row) => row["?e"]),
          ).toEqual(["ref"]);
          expect(
            (yield* t.queryPage({ inner, filters: [{ column: "?v", op: "is-null" }] })).results.map(
              (row) => row["?e"],
            ),
          ).toEqual(["missing"]);
          const names: unknown[] = [];
          let cursor: string | undefined;
          do {
            const page = yield* t.queryPage({
              inner,
              orderBy: [{ variable: "?v" }],
              limit: 2,
              ...(cursor ? { cursor } : {}),
            });
            names.push(...page.results.map((row) => row["?e"]));
            cursor = page.nextCursor;
          } while (cursor);
          expect(names).toEqual(["numeric", "boolean", "text", "ref", "missing"]);
          const descending = yield* t.queryAll({
            find: ["?e", "?v"],
            where: [["?e", ":v", "?v"]],
            orderBy: [{ variable: "?v", direction: "desc" }],
          });
          expect(descending.results.map((row) => row["?e"])).toEqual([
            "numeric",
            "boolean",
            "ref",
            "text",
          ]);
        }),
      );
    }, 60000);
    it("completes bounded binary rules in server relations and preserves alternate support", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples;
          const rows = yield* t.assertBatch([
            { entityId: EntityId.make("a"), attribute: ":edge", value: ref(EntityId.make("b")) },
            { entityId: EntityId.make("a"), attribute: ":edge", value: ref(EntityId.make("c")) },
            { entityId: EntityId.make("b"), attribute: ":edge", value: ref(EntityId.make("d")) },
            { entityId: EntityId.make("c"), attribute: ":edge", value: ref(EntityId.make("d")) },
            { entityId: EntityId.make("d"), attribute: ":edge", value: ref(EntityId.make("b")) },
            { entityId: EntityId.make("numeric"), attribute: ":edge", value: number(42) },
          ]);
          const rules = [
            { name: "ancestor", body: [["?x", ":edge", "?y"]] },
            {
              name: "ancestor",
              body: [
                ["?x", ":edge", "?z"],
                ["ancestor", "?z", "?y"],
              ],
            },
          ] as const;
          const query = { find: ["?dest"], where: [["ancestor", "a", "?dest"]], rules } as const;
          expect((yield* t.queryAll(query)).results.map((row) => row["?dest"]).sort()).toEqual([
            "b",
            "c",
            "d",
          ]);
          yield* t.retract(rows[2]!.id);
          expect((yield* t.queryAll(query)).results.map((row) => row["?dest"]).sort()).toEqual([
            "b",
            "c",
            "d",
          ]);
          const first = yield* t.queryPage({ inner: query, limit: 1, includeCount: true });
          expect(first.results).toEqual([{ "?dest": "b" }]);
          expect(first.totalCount).toBe(3);
          expect(
            (yield* t.queryPage({
              inner: query,
              limit: 1,
              includeCount: true,
              cursor: first.nextCursor!,
            })).results,
          ).toEqual([{ "?dest": "c" }]);
        }),
      );
    }, 60000);
    it("preserves repeated rule endpoints as equality constraints through public queries", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples;
          yield* t.assertBatch([
            {
              entityId: EntityId.make("self"),
              attribute: ":same",
              value: ref(EntityId.make("self")),
            },
            {
              entityId: EntityId.make("different"),
              attribute: ":same",
              value: ref(EntityId.make("other")),
            },
          ]);
          const rules = [{ name: "same-node", body: [["?node", ":same", "?node"]] }] as const;
          expect(
            (yield* t.queryAll({
              find: ["?node"],
              where: [["same-node", "?node", "?node"]],
              rules,
            })).results,
          ).toEqual([{ "?node": "self" }]);
          expect(
            (yield* t.queryAll({
              find: ["?left", "?right"],
              where: [["same-node", "?left", "?right"]],
              rules,
            })).results,
          ).toEqual([{ "?left": "self", "?right": "self" }]);
        }),
      );
    }, 60000);
    it("preserves value/ref joins, typed refs, constant projection keys, grouping and AVG", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples;
          yield* t.assertBatch([
            {
              entityId: EntityId.make("grand"),
              attribute: ":child",
              value: ref(EntityId.make("parent")),
            },
            {
              entityId: EntityId.make("parent"),
              attribute: ":child",
              value: ref(EntityId.make("leaf")),
            },
            {
              entityId: EntityId.make("sibling"),
              attribute: ":child",
              value: ref(EntityId.make("leaf")),
            },
            { entityId: EntityId.make("text"), attribute: ":child", value: string("leaf") },
            {
              entityId: EntityId.make("parent"),
              attribute: ":team",
              value: ref(EntityId.make("east")),
            },
            {
              entityId: EntityId.make("sibling"),
              attribute: ":team",
              value: ref(EntityId.make("east")),
            },
            { entityId: EntityId.make("parent"), attribute: ":score", value: number(5) },
            { entityId: EntityId.make("sibling"), attribute: ":score", value: number(5) },
          ]);
          const joined = yield* t.queryAll({
            find: ["?parent"],
            where: [
              ["parent", ":child", "?leaf"],
              ["?parent", ":child", "?leaf"],
            ],
          });
          expect(joined.results.map((row) => row["?parent"]).sort()).toEqual([
            "parent",
            "sibling",
            "text",
          ]);
          const paths = yield* t.queryAll({
            find: ["?grand", "?leafParent"],
            where: [
              ["?grand", ":child", "?parent"],
              ["?parent", ":child", "?leaf"],
              ["?leafParent", ":child", "?leaf"],
            ],
          });
          expect(
            paths.results.map((row) => `${row["?grand"]}->${row["?leafParent"]}`).sort(),
          ).toEqual(["grand->parent", "grand->sibling", "grand->text"]);
          const typed = yield* t.queryAll({
            find: ["?e"],
            where: [["?e", ":child", ref(EntityId.make("leaf"))]],
          });
          expect(typed.results.map((row) => row["?e"]).sort()).toEqual(["parent", "sibling"]);
          const constant = ref(EntityId.make("constant-ref"));
          const projected = yield* t.queryAll({
            find: ["literal", 7, true, constant],
            where: [["grand", ":child", "parent"]],
          });
          expect(projected.results).toEqual([
            { literal: "literal", "7": 7, true: true, [String(constant)]: "constant-ref" },
          ]);
          const grouped = yield* t.queryAll({
            find: ["?team", "?count", "?sum", "?average"],
            where: [
              ["?e", ":team", "?team"],
              ["?e", ":score", "?score"],
            ],
            aggregate: [
              ["count", "?e", "?count"],
              ["sum", "?score", "?sum"],
              ["avg", "?score", "?average"],
            ],
            having: [[">=", "?count", 2]],
            orderBy: [{ variable: "?sum", direction: "desc" }],
          });
          expect(grouped.results).toEqual([
            { "?team": "east", "?count": 2, "?sum": 10, "?average": 5 },
          ]);
          const empty = yield* t.queryAll({
            find: ["?count", "?sum", "?average", "?min", "?max"],
            where: [["?e", ":missing", "?v"]],
            aggregate: [
              ["count", "?v", "?count"],
              ["sum", "?v", "?sum"],
              ["avg", "?v", "?average"],
              ["min", "?v", "?min"],
              ["max", "?v", "?max"],
            ],
          });
          expect(empty.results).toEqual([
            { "?count": 0, "?sum": null, "?average": null, "?min": null, "?max": null },
          ]);
        }),
      );
    }, 60000);
  },
);
describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")(
  "shared Triplex Datalog on QLever",
  () => {
    it("executes selective joins, conjunction negation, OR, sums and keyset pages natively", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples;
          yield* t.assertBatch([
            { entityId: EntityId.make("a"), attribute: ":name", value: string("Ada") },
            { entityId: EntityId.make("b"), attribute: ":name", value: string("Bert") },
            { entityId: EntityId.make("a"), attribute: ":score", value: number(5) },
            { entityId: EntityId.make("b"), attribute: ":score", value: number(5) },
            { entityId: EntityId.make("b"), attribute: ":blocked", value: string("yes") },
          ]);
          expect(
            (yield* t.queryAll({
              find: ["?name"],
              where: [
                ["?e", ":name", "?name"],
                ["?e", ":score", 5],
                ["not", ["?e", ":blocked", "yes"], ["?e", ":score", 5]],
              ],
            })).results,
          ).toEqual([{ "?name": "Ada" }]);
          const aggregate = yield* t.queryAll({
            find: ["?count", "?sum"],
            where: [["?e", ":score", "?score"]],
            aggregate: [
              ["count", "?score", "?count"],
              ["sum", "?score", "?sum"],
            ],
          });
          expect(aggregate.results).toEqual([{ "?count": 1, "?sum": 10 }]);
          const query = {
            find: ["?name"],
            where: [["?e", ":name", "?name"]],
            orderBy: [{ variable: "?name" }],
          } as const;
          const first = yield* t.query(query, { pageSize: 1 });
          expect(first.results).toEqual([{ "?name": "Ada" }]);
          expect(
            (yield* t.query(query, { pageSize: 1, cursor: first.nextCursor! })).results,
          ).toEqual([{ "?name": "Bert" }]);
        }),
      );
    }, 60000);

    it("preserves full-range comparisons/extrema and exact SUM with bounded native chunk accumulation", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples;
          yield* t.assertBatch([
            {
              entityId: EntityId.make("min"),
              attribute: ":i",
              value: integer("-576460752303423488"),
            },
            {
              entityId: EntityId.make("max"),
              attribute: ":i",
              value: integer("576460752303423487"),
            },
            {
              entityId: EntityId.make("fraction"),
              attribute: ":n",
              value: number(1.0000000000000002),
            },
            { entityId: EntityId.make("one"), attribute: ":n", value: number(1) },
          ]);
          expect(
            (yield* t.queryAll({
              find: ["?i"],
              where: [
                ["?e", ":i", "?i"],
                [">", "?i", integer("9007199254740992")],
              ],
            })).results,
          ).toEqual([{ "?i": integer("576460752303423487") }]);
          const aggregate = yield* t.queryAll({
            find: ["?min", "?max", "?sum"],
            where: [["?e", ":i", "?i"]],
            aggregate: [
              ["min", "?i", "?min"],
              ["max", "?i", "?max"],
              ["sum", "?i", "?sum"],
            ],
          });
          expect(aggregate.results).toEqual([
            {
              "?min": integer("-576460752303423488"),
              "?max": integer("576460752303423487"),
              "?sum": integer("-1"),
            },
          ]);
          expect(
            (yield* t.queryAll({
              find: ["?n"],
              where: [
                ["?e", ":n", "?n"],
                [">", "?n", 1],
              ],
            })).results,
          ).toEqual([{ "?n": 1.0000000000000002 }]);
          const unsupported = yield* t
            .queryAll({
              find: ["?sum"],
              where: [["?e", ":n", "?n"]],
              aggregate: [["sum", "?n", "?sum"]],
            })
            .pipe(Effect.flip);
          expect(String(unsupported)).toMatch(/binary64|precision/);
          yield* t.assertBatch([
            {
              entityId: EntityId.make("selected-int"),
              attribute: ":domain/value",
              value: integer("9"),
            },
            {
              entityId: EntityId.make("unrelated-float"),
              attribute: ":domain/value",
              value: number(1.5),
            },
            {
              entityId: EntityId.make("selected-int"),
              attribute: ":domain/selected",
              value: boolean(true),
            },
          ]);
          expect(
            (yield* t.queryAll({
              find: ["?v"],
              where: [
                ["selected-int", ":domain/value", "?v"],
                [">", "?v", integer("0")],
              ],
            })).results,
          ).toEqual([{ "?v": integer("9") }]);
          expect(
            (yield* t.queryAll({
              find: ["?v"],
              where: [
                ["?e", ":domain/selected", true],
                ["?e", ":domain/value", "?v"],
                [">", "?v", integer("0")],
              ],
            })).results,
          ).toEqual([{ "?v": integer("9") }]);
          const mixed = yield* t
            .queryAll({
              find: ["?v"],
              where: [
                ["?e", ":domain/value", "?v"],
                [">", "?v", integer("0")],
              ],
            })
            .pipe(Effect.flip);
          expect(String(mixed)).toMatch(/Mixed exact integer and number/);
          expect(
            (yield* t.queryAll({
              find: ["?v"],
              where: [
                ["?e", ":domain/missing", "?v"],
                [">", "?v", integer("0")],
              ],
            })).results,
          ).toEqual([]);
        }),
      );
    }, 60000);
  },
);
