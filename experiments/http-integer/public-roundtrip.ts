/** Real public HTTP/Triplex APIs. Run one backend at a time under its qualification lease. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect, Layer, Option } from "effect";
import { HttpRouter } from "effect/http";
import { EntityId, Triples, integer } from "../../packages/core/dist/index.js";
import { Attribute, ConfigStore, EntityType } from "../../packages/core/dist/config/index.js";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "../../packages/core/dist/runtime/index.js";
import { EntityHttp, HttpAuthorizationAllowAll } from "../../packages/http/dist/index.js";
import {
  makeXtdbClient,
  makeXtdbQueryExecutor,
  makeXtdbStorageAdapter,
  resolveXtdbOperation,
  type XtdbClient,
} from "../../packages/xtdb/dist/index.js";
import {
  makeQleverClient,
  makeQleverQueryExecutor,
  makeQleverStorageAdapter,
  resolveQleverOperation,
  type QleverClient,
} from "../../packages/qlever/dist/index.js";

assert.ok(
  process.argv.includes("--execute"),
  "Explicit --execute and a backend lease are required",
);
const arg = (key: string) => process.argv[process.argv.indexOf(key) + 1];
const backend = arg("--backend");
assert.ok(backend === "xtdb" || backend === "qlever", "Choose --backend xtdb or qlever");
const root = path.resolve(import.meta.dirname, "../..");
const runId = randomUUID();
const scope = DatabaseScope.test(`http-exact-integer:${backend}:${runId}`);
const output = path.join(root, "qualification/evidence", `http-integer-${backend}-${runId}.json`);
const walk = (relative: string): string[] =>
  readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(relative, entry.name)) : [path.join(relative, entry.name)],
  );
const sourceFiles = [
  ...walk("packages/core/dist"),
  ...walk("packages/http/dist"),
  ...walk(`packages/${backend}/dist`),
  "experiments/http-integer/public-roundtrip.ts",
];
const hashes = () =>
  Object.fromEntries(
    sourceFiles.map((file) => [
      file,
      createHash("sha256")
        .update(readFileSync(path.join(root, file)))
        .digest("hex"),
    ]),
  );
const report: any = {
  format: "triplex-public-http-integer/1",
  runId,
  backend,
  scope,
  startedAt: new Date().toISOString(),
  status: "RUNNING",
  sourceSha256: hashes(),
  requests: [],
  checks: [],
  limitations: [
    "In-process Effect HttpRouter Web Request/Response handler; no HTTP ingress or network performance claim",
    "Real database transport and durable data; simulated lost acknowledgement and marker-lookup partition",
    "No crash or server partial-write atomicity claim; all test data and operation receipts retained",
  ],
};
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const faults = { armed: false, partition: false, ackLost: false, lookupFaults: 0, publications: 0 };
const url = process.argv.includes("--url")
  ? arg("--url")!
  : backend === "xtdb"
    ? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb"
    : "http://127.0.0.1:7019";
const real = backend === "xtdb" ? makeXtdbClient(url) : makeQleverClient(url);
const runtime = (() => {
  if (backend === "xtdb") {
    const client = real as XtdbClient;
    const wrapped: XtdbClient = {
      ...client,
      submit: async (statements) => {
        const result = await client.submit(statements);
        if (faults.armed) {
          faults.armed = false;
          faults.partition = true;
          faults.ackLost = true;
          faults.publications++;
          throw new Error("Injected acknowledgement loss after successful native commit");
        }
        return result;
      },
      query: (sql, params, basis, options) =>
        faults.partition && /\bFROM\s+tx_attempts\b/i.test(sql)
          ? (faults.lookupFaults++,
            Promise.reject(new Error("Injected operation-marker lookup partition")))
          : client.query(sql, params, basis, options),
    };
    return Runtime.define({
      name: "http-exact-xtdb",
      storage: Layer.succeed(
        StorageAdapter,
        makeXtdbStorageAdapter(wrapped, scope, { resolutionTimeoutMs: 5000 }),
      ),
      queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(wrapped, scope)),
    });
  }
  const client = real as QleverClient;
  const wrapped: QleverClient = {
    ...client,
    update: async (sparql, options) => {
      const result = await client.update(sparql, options);
      if (faults.armed) {
        faults.armed = false;
        faults.partition = true;
        faults.ackLost = true;
        faults.publications++;
        throw new Error("Injected acknowledgement loss after successful native commit");
      }
      return result;
    },
    query: (sparql, options) =>
      faults.partition &&
      /SELECT\s+\?attempt\b/.test(sparql) &&
      sparql.includes("urn:triplex:operation:")
        ? (faults.lookupFaults++,
          Promise.reject(new Error("Injected operation-marker lookup partition")))
        : client.query(sparql, options),
  };
  const storage = makeQleverStorageAdapter(wrapped, scope, { resolutionTimeoutMs: 5000 });
  return Runtime.define({
    name: "http-exact-qlever",
    storage: Layer.succeed(StorageAdapter, storage),
    queries: Layer.succeed(
      QueryExecutor,
      makeQleverQueryExecutor(wrapped, scope, { sourceView: storage.sourceView }),
    ),
  });
})();
const MAX = "9223372036854775807",
  MIN = "-9223372036854775808",
  ABOVE_SAFE = "9007199254740993";
const Ledger = EntityType.make("ExactLedger", {
  attributes: {
    amount: Attribute.use(Attribute.int64(":ledger/amount"), { required: true }),
    changes: Attribute.use(Attribute.int64(":ledger/change"), {
      cardinality: "many",
      required: true,
    }),
  },
});
try {
  await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      const config = yield* ConfigStore.ConfigStore;
      // The persisted public API calls releases `commit`, and moves `live` atomically.
      const release = yield* config.commit({
        label: `http-exact:${runId}`,
        objects: yield* Ledger.nodes,
        ref: "live",
      });
      assert.equal((yield* config.resolveRef("live"))?.id, release.snapshot.id);
      report.release = {
        snapshot: release.snapshot.id,
        position: release.transaction.position,
        txId: release.transaction.txId,
      };
      const web = yield* Effect.acquireRelease(
        Effect.sync(() =>
          HttpRouter.toWebHandler(
            EntityHttp.layer({
              basePath: "/api",
              docs: true,
              exposure: { collections: { ExactLedger: "exact-ledgers" } },
            }).pipe(
              Layer.provide(HttpAuthorizationAllowAll),
              Layer.provide(Layer.succeed(Triples, triples)),
              Layer.provide(Layer.succeed(ConfigStore.ConfigStore, config)),
            ),
            { disableLogger: true },
          ),
        ),
        (web) => Effect.promise(() => web.dispose()),
      );
      const request = (method: string, route: string, body?: unknown) =>
        Effect.promise(async () => {
          const started = performance.now();
          const response = await web.handler(
            new Request(`http://triplex.test/api/rest/latest/${route}`, {
              method,
              ...(body === undefined
                ? {}
                : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
            }),
          );
          const text = await response.text();
          const value = text ? JSON.parse(text) : undefined;
          report.requests.push({
            method,
            route,
            ...(body === undefined ? {} : { body }),
            status: response.status,
            snapshot: response.headers.get("x-triplex-config-snapshot"),
            location: response.headers.get("location"),
            durationMs: performance.now() - started,
            response: value,
          });
          save();
          return { response, value };
        });
      const schema = yield* request("GET", "schema");
      assert.equal(schema.response.status, 200);
      assert.equal(schema.value.entities[0].collection, "exact-ledgers");
      assert.ok(
        schema.value.entities[0].attributes.every(
          (attribute: any) => attribute.storage === "integer",
        ),
      );
      const openapi = yield* request("GET", "openapi.json");
      assert.equal(openapi.response.status, 200);
      const amountSchema =
        openapi.value.components.schemas.ExactLedgerAttributes.properties[":ledger/amount"];
      assert.equal(amountSchema.properties.value.type, "string");
      assert.match(amountSchema.description, /canonical decimal text/);
      assert.match(amountSchema.description, /-9223372036854775808/);
      assert.match(amountSchema.description, /9223372036854775807/);
      assert.equal(
        openapi.value.components.schemas.TriplexHttpError.properties.operationId.type,
        "string",
      );
      const body = {
        attributes: {
          ":ledger/amount": integer(MAX),
          ":ledger/change": [integer(MIN), integer(ABOVE_SAFE), integer(ABOVE_SAFE)],
        },
      };
      const created = yield* request("POST", "exact-ledgers", body);
      assert.equal(created.response.status, 201);
      assert.deepEqual(created.value.attributes, {
        ":ledger/amount": integer(MAX),
        ":ledger/change": [integer(MIN), integer(ABOVE_SAFE)],
      });
      assert.equal(created.response.headers.get("x-triplex-config-snapshot"), release.snapshot.id);
      const id = created.value.id as string;
      const item = `exact-ledgers/${encodeURIComponent(id)}`;
      assert.equal(created.value.type, "ExactLedger");
      assert.ok(created.response.headers.get("location")?.endsWith(encodeURIComponent(id)));
      const createK = yield* triples.currentPosition();
      assert.equal(createK, release.transaction.position + 1);
      const got = yield* request("GET", item);
      assert.equal(got.response.status, 200);
      assert.deepEqual(got.value, created.value);
      const listed = yield* request("GET", "exact-ledgers?limit=1");
      assert.equal(listed.response.status, 200);
      assert.deepEqual(listed.value.items, [created.value]);
      const bindings = (yield* triples.queryAll({
        find: ["?amount", "?change"],
        where: [
          [id, ":ledger/amount", "?amount"],
          [id, ":ledger/change", "?change"],
        ],
      })).results;
      assert.deepEqual(
        bindings.map((row) => JSON.stringify(row)).sort(),
        [
          { "?amount": integer(MAX), "?change": integer(MIN) },
          { "?amount": integer(MAX), "?change": integer(ABOVE_SAFE) },
        ]
          .map((row) => JSON.stringify(row))
          .sort(),
      );
      report.datalogAfterCreate = bindings;
      const replaced = yield* request("PUT", item, {
        attributes: {
          ":ledger/amount": integer(MIN),
          ":ledger/change": [integer(MAX), integer(ABOVE_SAFE)],
        },
      });
      assert.equal(replaced.response.status, 200);
      assert.deepEqual(replaced.value.attributes[":ledger/amount"], integer(MIN));
      assert.deepEqual((yield* request("GET", item)).value, replaced.value);
      const putK = yield* triples.currentPosition();
      assert.equal(putK, createK + 1);
      const history = yield* triples.history(EntityId.make(id));
      const amountHistory = history.filter((fact) => fact.attribute === ":ledger/amount");
      assert.equal(amountHistory.length, 2);
      assert.deepEqual(
        amountHistory.map((fact) => fact.value),
        [integer(MAX), integer(MIN)],
      );
      assert.ok(Option.isSome(amountHistory[0]!.retractedAt));
      assert.ok(Option.isNone(amountHistory[1]!.retractedAt));
      report.amountHistory = amountHistory;
      const invalid = [
        9007199254740992,
        ABOVE_SAFE,
        { type: "integer", value: "01" },
        { type: "integer", value: "-0" },
        { type: "integer", value: "9223372036854775808" },
        { type: "integer", value: "-9223372036854775809" },
      ];
      for (const value of invalid) {
        for (const [method, route] of [
          ["POST", "exact-ledgers"],
          ["PUT", item],
        ]) {
          const bad = yield* request(method!, route!, {
            attributes: { ":ledger/amount": value, ":ledger/change": [integer("0")] },
          });
          assert.equal(bad.response.status, 400);
          assert.equal(bad.value.code, "invalid_request");
          assert.equal(yield* triples.currentPosition(), putK);
        }
      }
      const receipts = yield* triples.transactions({
        after: release.transaction.position,
        limit: 20,
      });
      assert.equal(receipts.transactions.length, 2);
      assert.deepEqual(
        receipts.transactions.map((receipt) => receipt.position),
        [createK, putK],
      );
      for (const receipt of receipts.transactions) {
        assert.equal(receipt.configSnapshot, release.snapshot.id);
        assert.ok(
          receipt.changes
            .filter((change) => change.attribute.startsWith(":ledger/"))
            .every((change) => change.value?.type === "integer"),
        );
      }
      report.receipts = receipts.transactions;
      faults.armed = true;
      const unknown = yield* request("POST", "exact-ledgers", {
        attributes: { ":ledger/amount": integer(ABOVE_SAFE), ":ledger/change": [integer(MIN)] },
      });
      assert.equal(unknown.response.status, 500);
      assert.equal(unknown.value.code, "transaction_outcome_unknown");
      assert.equal(typeof unknown.value.operationId, "string");
      assert.ok(unknown.value.operationId);
      assert.equal(typeof unknown.value.attemptId, "string");
      assert.ok(unknown.value.attemptId);
      assert.equal(faults.ackLost, true);
      assert.equal(faults.publications, 1);
      assert.ok(faults.lookupFaults > 0);
      faults.partition = false;
      const recoveryClient = yield* Effect.acquireRelease(
        Effect.sync(() => (backend === "xtdb" ? makeXtdbClient(url) : makeQleverClient(url))),
        (client) => Effect.promise(() => client.close()),
      );
      const recovered = yield* backend === "xtdb"
        ? resolveXtdbOperation(recoveryClient as XtdbClient, scope, unknown.value.operationId)
        : resolveQleverOperation(recoveryClient as QleverClient, scope, unknown.value.operationId);
      assert.equal(recovered.status, "committed");
      if (recovered.status !== "committed") throw new Error("Durable operation did not resolve");
      assert.equal(recovered.attemptId, unknown.value.attemptId);
      assert.equal(recovered.position, putK + 1);
      const recoveryReceipts = yield* triples.transactions({ after: putK, limit: 10 });
      assert.equal(recoveryReceipts.transactions.length, 1);
      const receipt = recoveryReceipts.transactions[0]!;
      assert.equal(receipt.position, recovered.position);
      const amount = receipt.changes.find(
        (change) => change.op === "assert" && change.attribute === ":ledger/amount",
      );
      assert.deepEqual(amount?.value, integer(ABOVE_SAFE));
      assert.ok(amount?.entityId);
      const recoveredGet = yield* request(
        "GET",
        `exact-ledgers/${encodeURIComponent(amount!.entityId)}`,
      );
      assert.equal(recoveredGet.response.status, 200);
      assert.deepEqual(recoveredGet.value.attributes, {
        ":ledger/amount": integer(ABOVE_SAFE),
        ":ledger/change": [integer(MIN)],
      });
      assert.equal(yield* triples.currentPosition(), recovered.position);
      report.recovery = {
        httpError: unknown.value,
        resolution: recovered,
        freshConnection: true,
        receipt,
        document: recoveredGet.value,
        faults: { ...faults },
      };
      report.checks = [
        "real ConfigStore release and live ref",
        "OpenAPI exact signed decimal text contract",
        "POST/GET/PUT lossless tags and cardinality-many deduplication",
        "native Datalog exact payload joins",
        "history and typed transaction receipts",
        "invalid numeric/noncanonical/overflow HTTP400 with no commit advance",
        "actual committed write with simulated lost ACK and marker query fault",
        "HTTP500 operation/attempt identity recovered through unwrapped native client",
        "durable anonymous operation recovered without replay",
      ];
    }).pipe(
      Effect.provide(
        ConfigStore.layer.pipe(
          Layer.provideMerge(runtime.layer({ scope, capabilities: Capabilities.none })),
        ),
      ),
      Effect.scoped,
    ),
  );
  assert.deepEqual(hashes(), report.sourceSha256, "Public dist changed during HTTP qualification");
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.error = String(error);
  report.stack = error instanceof Error ? error.stack : undefined;
  process.exitCode = 1;
} finally {
  await real.close();
  report.finishedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify({ status: report.status, backend, scope, artifact: output }));
}
