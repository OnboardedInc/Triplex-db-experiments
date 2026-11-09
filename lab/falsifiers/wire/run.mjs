// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-F02 falsifier: exactness of every Triplex value kind on every wire path, both engines.
//
// Usage: node lab/falsifiers/wire/run.mjs [--out lab/experiments/EXP-F02-wire-exactness/results.json]
// Env: XTDB_URL (default dev slot 5470), QLEVER_URL (default dev slot 7070).
//
// Paths per engine:
//   ledger                 Triplex public transact, then entity() read from a second, fresh runtime.
//   projection-scalar/*    candidate projection encodings: XTDB typed columns through makeXtdbClient,
//                          QLever typed literals by SPARQL UPDATE, read back as JSON results.
//   projection-list/*      XTDB card-many columns (JSON parameter, ARRAY[CAST(...)]), read by the
//                          driver and by UNNEST; QLever card-many as several triples.
//   native-decode          the native query providers (makeXtdbNativeQueries / makeQleverNativeQueries)
//                          over the projection, with decodeNativeRows on the declared row type.
//   native-param           a bound (XTDB) or literal (QLever) equality parameter: which rows match.
//   order                  ORDER BY and range filters vs Triplex comparison on spec-exact values.
// Every measured outcome is compared with ProjectionSpec.isExact for that engine and attribute.
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { domain, orderedKinds, validTimes } from "./domain.mjs";
import {
  compare,
  firstInversion,
  isoToMs,
  keyOrder,
  msToIso,
  parseRdfNumber,
  render,
  same,
  xsdDouble,
} from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const req = createRequire(resolve(repo, "packages/xtdb/package.json"));
const { Effect, Exit, Cause } = await import(pathToFileURL(req.resolve("effect")).href);
const core = await import(pathToFileURL(resolve(repo, "packages/core/dist/index.js")).href);
const { Capabilities, DatabaseScope } = await import(
  pathToFileURL(resolve(repo, "packages/core/dist/runtime/index.js")).href
);
const { TypeExpr, CanonicalJson } = await import(
  pathToFileURL(resolve(repo, "packages/core/dist/config/index.js")).href
);
const { ProjectionSpec, PhysicalNames } = await import(
  pathToFileURL(resolve(repo, "packages/core/dist/entity/index.js")).href
);
const xtdbPkg = await import(pathToFileURL(resolve(repo, "packages/xtdb/dist/index.js")).href);
const qleverPkg = await import(pathToFileURL(resolve(repo, "packages/qlever/dist/index.js")).href);
const qleverRdf = await import(pathToFileURL(resolve(repo, "packages/qlever/dist/rdf.js")).href);
const sparqlString = qleverRdf.literal;

const args = process.argv.slice(2);
const outPath = resolve(
  repo,
  args.includes("--out")
    ? args[args.indexOf("--out") + 1]
    : "lab/experiments/EXP-F02-wire-exactness/results.json",
);
const XTDB_URL = process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5470/xtdb";
const QLEVER_URL = process.env.QLEVER_URL ?? "http://127.0.0.1:7070";
const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}${randomUUID().slice(0, 6)}`;
const XSD = "http://www.w3.org/2001/XMLSchema#";
const RDF_JSON = "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON";

// ---------------------------------------------------------------------------------------------
// Spec: compile one entity type per cardinality with one attribute per kind.
// ---------------------------------------------------------------------------------------------

const kindType = {
  text: TypeExpr.text,
  enum: TypeExpr.enumOf(domain.enum.map((c) => c.value)),
  ref: TypeExpr.ref("F02Target"),
  number: TypeExpr.number,
  integer: TypeExpr.integer,
  int64: TypeExpr.int64,
  boolean: TypeExpr.boolean,
  date: TypeExpr.date,
  instant: TypeExpr.instant,
  json: TypeExpr.list(TypeExpr.number),
};
const kinds = Object.keys(kindType);
const specInputs = [
  {
    entityType: "F02One",
    attributes: kinds.map((k) => ({ key: `:f02one/${k}`, type: kindType[k], required: false, cardinality: "one" })),
  },
  {
    entityType: "F02Many",
    attributes: kinds.map((k) => ({ key: `:f02many/${k}`, type: kindType[k], required: false, cardinality: "many" })),
  },
  { entityType: "F02Target", attributes: [] },
];
const spec = await Effect.runPromise(ProjectionSpec.compile(specInputs));
const attrSpec = (kind, many) => ProjectionSpec.attribute(spec, many ? "F02Many" : "F02One", `:f02${many ? "many" : "one"}/${kind}`);

/** The Triplex TripleValue a ledger write and the spec's isExact see for a kind's JS value. */
const tripleValue = (kind, value) => {
  switch (kind) {
    case "text":
    case "enum":
    case "date":
      return { type: "string", value };
    case "ref":
      return { type: "ref", value };
    case "number":
    case "integer":
      return { type: "number", value };
    case "int64":
      return { type: "integer", value };
    case "boolean":
      return { type: "boolean", value };
    case "instant":
      return { type: "datetime", value };
    case "json":
      return { type: "json", value };
    case "blob":
      return value;
  }
};

const specVerdict = (engine, kind, many, value) => {
  const attribute = attrSpec(kind, many);
  if (attribute === undefined) return { exact: null, rule: null };
  const rules = engine === "xtdb" ? attribute.xtdb.exactness : attribute.rdf.exactness;
  const violated = ProjectionSpec.firstViolation(rules, tripleValue(kind, value));
  return { exact: violated === undefined, rule: violated?._tag ?? null };
};

// ---------------------------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------------------------

const results = [];
const errorText = (error) => {
  if (error === undefined || error === null) return String(error);
  const name = error._tag ?? error.constructor?.name ?? "Error";
  const message = error.message ?? String(error);
  const cause = error.cause && error.cause !== error ? ` <- ${errorText(error.cause)}` : "";
  return `${name}: ${String(message).slice(0, 300)}${cause}`.slice(0, 600);
};

/**
 * outcome: exact | changed | rejected. verdict compares it with the spec claim:
 *   ok | critical-silent-change | spec-claims-exact-but-rejected | spec-conservative | n/a
 */
const record = (entry) => {
  const { outcome, spec: claim, path } = entry;
  let verdict;
  if (entry.outsideDomain && path !== "ledger") {
    // The Triplex codec refuses the value before any lane sees it; the lane result is informative.
    verdict = "n/a-outside-triplex-domain";
  } else if (entry.outsideDomain && outcome === "rejected") {
    verdict = "ok";
  } else if (path === "ledger" || claim === undefined || claim.exact === null) {
    verdict = outcome === "changed" ? "critical-silent-change" : "ok";
  } else if (claim.exact) {
    verdict =
      outcome === "changed"
        ? "critical-silent-change"
        : outcome === "rejected"
          ? "spec-claims-exact-but-rejected"
          : "ok";
  } else {
    verdict = outcome === "exact" ? "spec-conservative" : "ok";
  }
  results.push({ ...entry, verdict });
};

const measure = (expected, actual, how) =>
  same(expected, actual)
    ? { outcome: "exact", readBack: render(actual) }
    : { outcome: "changed", readBack: render(actual), how: how ?? `${render(expected)} -> ${render(actual)}` };

const run = (effect) => Effect.runPromise(Effect.exit(effect));
const failureOf = (exit) => {
  const squashed = Cause.squash(exit.cause);
  return errorText(squashed);
};

// ---------------------------------------------------------------------------------------------
// Path (a): ledger through the public Triplex API, both engines
// ---------------------------------------------------------------------------------------------

const ledgerCases = () => {
  const cases = [];
  for (const kind of kinds) for (const c of domain[kind]) cases.push({ kind, ...c });
  cases.push(
    {
      kind: "blob",
      id: "plain",
      value: { type: "blob", value: "sha256:00ff", mimeType: "application/pdf", size: 12345, filename: "a\u{1F600}.pdf" },
    },
    { kind: "blob", id: "unsafe-size", value: { type: "blob", value: "sha256:01", mimeType: "x/y", size: 2 ** 53 + 2 }, expectReject: true },
  );
  return cases;
};

const ledgerPath = async (engine, makeLayer) => {
  const scope = DatabaseScope.test(`f02-wire:${engine}:${runId}`);
  const cases = ledgerCases();
  const writes = new Map();
  // Write with one runtime ...
  await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* core.Triples;
      for (const [index, c] of cases.entries()) {
        const entityId = `f02:${c.kind}:${index}`;
        const exit = yield* Effect.exit(
          triples.transact([
            { op: "assert", entityId, attribute: `:f02/${c.kind}`, value: tripleValue(c.kind, c.value), validFrom: 1 },
          ]),
        );
        writes.set(index, Exit.isSuccess(exit) ? { ok: true } : { ok: false, error: failureOf(exit) });
      }
    }).pipe(Effect.provide(makeLayer(scope)), Effect.scoped),
  );
  // ... read with a second, fresh runtime on the same scope.
  await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* core.Triples;
      for (const [index, c] of cases.entries()) {
        const base = {
          engine,
          path: "ledger",
          kind: c.kind,
          caseId: c.id,
          outsideDomain: Boolean(c.expectReject),
          input: render(c.kind === "blob" ? c.value : c.value),
          spec: { exact: null, rule: null },
        };
        const written = writes.get(index);
        if (!written.ok) {
          record({ ...base, outcome: "rejected", error: written.error });
          continue;
        }
        const exit = yield* Effect.exit(triples.entity(`f02:${c.kind}:${index}`, { validAt: 2 }));
        if (!Exit.isSuccess(exit)) {
          record({ ...base, outcome: "rejected", error: `read failed: ${failureOf(exit)}` });
          continue;
        }
        const facts = exit.value.filter((t) => t.attribute === `:f02/${c.kind}`);
        if (facts.length !== 1) {
          record({ ...base, outcome: "changed", readBack: `${facts.length} facts`, how: "fact count changed" });
          continue;
        }
        const expected = tripleValue(c.kind, c.value);
        const actual = facts[0].value;
        const m = measure(
          c.kind === "json" ? { ...expected, value: JSON.parse(JSON.stringify(expected.value ?? null)) } : expected,
          actual,
        );
        // JSON: judge against the input value, not the JSON.stringify image.
        const exact = same(expected.value, actual.value) && expected.type === actual.type;
        const note =
          c.kind === "json" && exact && JSON.stringify(keyOrder(expected.value)) !== JSON.stringify(keyOrder(actual.value))
            ? "key order changed (same JSON value)"
            : undefined;
        record({
          ...base,
          outcome: exact ? "exact" : "changed",
          readBack: render(actual.value),
          ...(exact ? {} : { how: `${render(expected.value)} -> ${render(actual.value)}` }),
          ...(note ? { note } : {}),
        });
        void m;
      }
    }).pipe(Effect.provide(makeLayer(scope)), Effect.scoped),
  );
  await nativeOverLedger(engine, scope, cases);
};

/**
 * Native queries over the ledger's own number and datetime columns (XTDB facts(), QLever lexical
 * payload and the admitted `_native` shadow), decoded with the declared row type `number`.
 */
const nativeOverLedger = async (engine, scope, cases) => {
  const channels =
    engine === "xtdb"
      ? [
          { kind: "number", column: "value_number" },
          { kind: "instant", column: "value_datetime" },
        ]
      : [
          { kind: "number", column: "value_number" },
          { kind: "number", column: "value_number_native" },
          { kind: "instant", column: "value_datetime" },
          { kind: "instant", column: "value_datetime_native" },
        ];
  const contract = {
    name: "f02/native-ledger",
    parameters: TypeExpr.struct({}),
    row: TypeExpr.struct({ e: TypeExpr.required(TypeExpr.text), n: TypeExpr.required(TypeExpr.number) }),
  };
  const client = engine === "xtdb" ? xtdbPkg.makeXtdbClient(XTDB_URL) : qleverPkg.makeQleverClient(QLEVER_URL);
  try {
    for (const { kind, column } of channels) {
      const attribute = `:f02/${kind}`;
      const exit =
        engine === "xtdb"
          ? await run(
              xtdbPkg
                .makeXtdbNativeQueries(client, scope)
                .selectSql(contract, {}, (ctx) => `SELECT f.entity_id AS e, f.${column} AS n FROM ${ctx.facts()} f WHERE f.attribute = ${ctx.bind(attribute)}`, { maxRows: 1000 }),
            )
          : await run(
              qleverPkg.makeQleverNativeQueries(client, scope).select(
                contract,
                {},
                () =>
                  `SELECT ?e ?n WHERE { GRAPH ${qleverRdf.graphIri(scope)} { ?a ${qleverRdf.fieldIri("entity_id")} ?e ; ${qleverRdf.fieldIri("attribute")} ${qleverRdf.literal(attribute)} ; ${qleverRdf.fieldIri(column)} ?n } }`,
                { maxRows: 1000 },
              ),
            );
      const path = `native-ledger/${column}`;
      if (!Exit.isSuccess(exit)) {
        record({ engine, path, kind, caseId: "*", input: "*", outcome: "rejected", error: failureOf(exit), spec: { exact: null, rule: null } });
        continue;
      }
      const byEntity = new Map(exit.value.rows.map((r) => [r.e, r.n]));
      for (const [index, c] of cases.entries()) {
        if (c.kind !== kind) continue;
        const base = { engine, path, kind, caseId: c.id, outsideDomain: Boolean(c.expectReject), input: render(c.value), spec: { exact: null, rule: null } };
        const entityId = `f02:${c.kind}:${index}`;
        if (!byEntity.has(entityId)) {
          // Rejected at write, or (for `_native`) a shadow the adapter did not admit.
          record({ ...base, outcome: "rejected", error: "no row (value not written or channel not admitted)" });
          continue;
        }
        record({ ...base, ...measure(c.value, byEntity.get(entityId)) });
      }
    }
  } finally {
    await client.close();
  }
};

// ---------------------------------------------------------------------------------------------
// XTDB projection, native and order paths
// ---------------------------------------------------------------------------------------------

/** Scalar SQL expression and parameter for writing `value` into the declared column type. */
const xtdbScalar = (kind, value) => {
  switch (kind) {
    case "text":
    case "enum":
    case "ref":
    case "boolean":
      return { expr: "?", param: value };
    case "number":
      return { expr: "CAST(? AS DOUBLE PRECISION)", param: value };
    case "integer":
      return { expr: "CAST(? AS BIGINT)", param: value };
    case "int64":
      return { expr: "CAST(? AS BIGINT)", param: BigInt(value) };
    case "date":
      return { expr: "CAST(? AS DATE)", param: value };
    case "instant":
      return { expr: "CAST(? AS TIMESTAMP WITH TIME ZONE)", param: msToIso(value, "java") };
    case "json":
      return { expr: "?", param: CanonicalJson.encodeOrThrow(value) };
  }
};

/** Decode a driver-default value (postgres.js defaults as configured in XtdbClient). */
/** Integer text to a JS number only when the number is that exact integer. */
const exactIntegerText = (text) => {
  const n = Number(text);
  return /^-?\d+$/.test(text) && BigInt(text) === BigInt(n) ? n : `<int ${text}>`;
};

/**
 * Decode a driver-default value (postgres.js defaults as configured in XtdbClient). List elements
 * travel inside JSON text: BIGINT elements arrive as strings, TIMESTAMPTZ elements as ISO strings.
 */
const xtdbDecodeDriver = (kind, raw) => {
  if (raw === null || raw === undefined) return raw;
  switch (kind) {
    case "number":
      return typeof raw === "string" && /^-?\d+$/.test(raw) ? exactIntegerText(raw) : raw;
    case "integer":
      return typeof raw === "string" ? exactIntegerText(raw) : raw;
    case "int64":
      return typeof raw === "string" ? raw : typeof raw === "bigint" ? raw.toString() : `<${typeof raw}:${raw}>`;
    case "date":
      return raw instanceof Date ? raw.toISOString().slice(0, 10) : raw;
    case "instant":
      return raw instanceof Date ? raw.getTime() : typeof raw === "string" ? isoToMs(raw) : raw;
    case "json":
      return JSON.parse(raw);
    default:
      return raw;
  }
};

/** Decode `CAST(v AS VARCHAR)` text. */
const xtdbDecodeText = (kind, text) => {
  if (text === null || text === undefined) return text;
  switch (kind) {
    case "number":
      return text === "Infinity" ? Infinity : text === "-Infinity" ? -Infinity : Number(text);
    case "integer":
      return exactIntegerText(text);
    case "boolean":
      return text === "true" ? true : text === "false" ? false : `<${text}>`;
    case "instant":
      return isoToMs(text);
    case "json":
      return JSON.parse(text);
    default:
      return text;
  }
};

const xtdbPaths = async () => {
  const client = xtdbPkg.makeXtdbClient(XTDB_URL);
  const prefix = `f02w_${runId}`;
  const table = (kind, suffix = "") => `${prefix}_${kind}${suffix}`;
  const scope = DatabaseScope.test(`f02-wire:xtdb-native:${runId}`);
  const native = xtdbPkg.makeXtdbNativeQueries(client, scope);
  const stored = new Map(); // kind -> [{ id, case, ok }]

  try {
    // ---- (b1) scalar typed columns ----
    for (const kind of kinds) {
      const rows = [];
      for (const [index, c] of domain[kind].entries()) {
        const id = `c${index}`;
        const claim = specVerdict("xtdb", kind, false, c.value);
        const base = { engine: "xtdb", kind, caseId: c.id, outsideDomain: Boolean(c.expectReject), input: render(c.value), spec: claim };
        let encoded;
        try {
          encoded = xtdbScalar(kind, c.value);
          await client.submit([{ sql: `INSERT INTO ${table(kind)} (_id, v) VALUES (?, ${encoded.expr})`, params: [id, encoded.param] }]);
        } catch (error) {
          for (const p of ["projection-scalar/driver", "projection-scalar/text"])
            record({ ...base, path: p, outcome: "rejected", error: errorText(error) });
          rows.push({ id, c, ok: false });
          continue;
        }
        rows.push({ id, c, ok: true });
        let driver, text;
        try {
          [driver] = await client.query(`SELECT v FROM ${table(kind)} WHERE _id = ?`, [id]);
          [text] = await client.query(`SELECT CAST(v AS VARCHAR) AS v FROM ${table(kind)} WHERE _id = ?`, [id]);
        } catch (error) {
          for (const p of ["projection-scalar/driver", "projection-scalar/text"])
            record({ ...base, path: p, outcome: "rejected", error: `write accepted, read failed: ${errorText(error)}` });
          continue;
        }
        if (driver === undefined) {
          record({ ...base, path: "projection-scalar/driver", outcome: "changed", how: "row lost" });
          continue;
        }
        const driverValue = xtdbDecodeDriver(kind, driver.v);
        record({
          ...base,
          path: "projection-scalar/driver",
          ...measure(c.value, driverValue),
          driverType: driver.v instanceof Date ? "Date" : typeof driver.v,
          rawDriver: render(driver.v),
        });
        let textValue;
        try {
          textValue = xtdbDecodeText(kind, text.v);
        } catch (error) {
          textValue = `<unparsed ${text.v}: ${errorText(error)}>`;
        }
        record({ ...base, path: "projection-scalar/text", ...measure(c.value, textValue), rawText: render(text.v) });
      }
      stored.set(kind, rows);
    }

    // ---- column types actually created (does a value-typed INSERT give the declared type?) ----
    const columnTypes = {};
    for (const kind of kinds) {
      const cols = await client.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name = ? AND column_name = 'v'`,
        [table(kind)],
      );
      columnTypes[kind] = cols.map((r) => r.data_type);
    }
    // Uncast numeric parameters: what type does a bare JS number parameter create?
    const bare = table("bare");
    await client.submit([{ sql: `INSERT INTO ${bare} (_id, v) VALUES ('a', ?), ('b', ?), ('c', ?)`, params: [16, 16.5, -0] }]);
    const bareCols = await client.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = ? AND column_name = 'v'`,
      [bare],
    );
    const bareRows = await client.query(`SELECT _id, v FROM ${bare} ORDER BY _id`);
    results.push({
      engine: "xtdb",
      path: "column-types",
      kind: "*",
      caseId: "declared-vs-created",
      outcome: "info",
      verdict: "info",
      columnTypes,
      bareNumberParam: { dataType: bareCols.map((r) => r.data_type), rows: bareRows.map((r) => [r._id, render(r.v)]) },
    });

    // ---- (b2) card-many lists ----
    for (const kind of kinds) {
      for (const variant of ["json-param", "array-cast"]) {
        if (variant === "json-param" && ["date", "instant", "json"].includes(kind)) continue;
        const t = table(kind, `_l${variant === "json-param" ? "j" : "a"}`);
        const listCases = [
          ...domain[kind].map((c, index) => ({ id: `c${index}`, caseId: c.id, values: [c.value], outsideDomain: Boolean(c.expectReject) })),
          ...(kind === "number" ? [{ id: "pair", caseId: "set{0,-0}", values: [0, -0] }] : []),
          {
            id: "all",
            caseId: "all-spec-exact",
            values: domain[kind]
              .filter((c) => !c.expectReject && specVerdict("xtdb", kind, true, c.value).exact)
              .map((c) => c.value),
          },
        ];
        for (const lc of listCases) {
          const claim = lc.values
            .map((v) => specVerdict("xtdb", kind, true, v))
            .reduce((acc, v) => (acc.exact && !v.exact ? v : acc), { exact: true, rule: null });
          const base = { engine: "xtdb", kind, caseId: lc.caseId, outsideDomain: Boolean(lc.outsideDomain), input: render(lc.values), spec: claim };
          try {
            if (variant === "json-param") {
              const param = lc.values.map((v) => (kind === "int64" ? BigInt(v) : v));
              await client.submit([{ sql: `INSERT INTO ${t} (_id, v) VALUES (?, ?)`, params: [lc.id, param] }]);
            } else {
              const encoded = lc.values.map((v) => xtdbScalar(kind, v));
              const array = encoded.length === 0 ? "ARRAY[]" : `ARRAY[${encoded.map((e) => e.expr).join(", ")}]`;
              await client.submit([
                { sql: `INSERT INTO ${t} (_id, v) VALUES (?, ${array})`, params: [lc.id, ...encoded.map((e) => e.param)] },
              ]);
            }
          } catch (error) {
            for (const r of ["driver", "unnest-text"])
              record({ ...base, path: `projection-list/${variant}/${r}`, outcome: "rejected", error: errorText(error) });
            continue;
          }
          try {
            const [driver] = await client.query(`SELECT v FROM ${t} WHERE _id = ?`, [lc.id]);
            const driverList = Array.isArray(driver?.v) ? driver.v.map((x) => xtdbDecodeDriver(kind, x)) : driver?.v;
            record({
              ...base,
              path: `projection-list/${variant}/driver`,
              ...measure(lc.values, driverList),
              rawDriver: render(driver?.v),
            });
          } catch (error) {
            record({ ...base, path: `projection-list/${variant}/driver`, outcome: "rejected", error: `write accepted, read failed: ${errorText(error)}` });
          }
          let unnested;
          try {
            unnested = await client.query(
              `SELECT CAST(u.x AS VARCHAR) AS x, u.o AS o FROM ${t} AS t, UNNEST(t.v) WITH ORDINALITY AS u (x, o) WHERE t._id = ? ORDER BY u.o`,
              [lc.id],
            );
          } catch (error) {
            record({ ...base, path: `projection-list/${variant}/unnest-text`, outcome: "rejected", error: `write accepted, read failed: ${errorText(error)}` });
            continue;
          }
          let decoded;
          try {
            decoded = unnested.map((r) => xtdbDecodeText(kind, r.x));
          } catch (error) {
            decoded = `<unparsed: ${errorText(error)}>`;
          }
          record({
            ...base,
            path: `projection-list/${variant}/unnest-text`,
            ...measure(lc.values, decoded),
            rawText: render(unnested.map((r) => r.x)),
          });
        }
      }
    }

    // ---- (c) native provider: decode on the declared row type, and bound equality parameters ----
    const nativeCast = {
      number: (b) => `CAST(${b} AS DOUBLE PRECISION)`,
      integer: (b) => `CAST(${b} AS BIGINT)`,
      int64: (b) => b,
      date: (b) => `CAST(${b} AS DATE)`,
    };
    const nativeInput = (kind, value) => (kind === "int64" ? { type: "integer", value } : value);
    for (const kind of kinds) {
      if (kind === "json") continue; // VARCHAR carrier: a native read returns the JSON text itself.
      const rows = stored.get(kind) ?? [];
      for (const { id, c, ok } of rows) {
        if (!ok) continue;
        const claim = specVerdict("xtdb", kind, false, c.value);
        const base = { engine: "xtdb", kind, caseId: c.id, outsideDomain: Boolean(c.expectReject), input: render(c.value), spec: claim };
        // native-decode
        const contract = {
          name: `f02/decode/${kind}`,
          parameters: TypeExpr.struct({ id: TypeExpr.required(TypeExpr.text) }),
          row: TypeExpr.struct({ v: TypeExpr.required(kindType[kind]) }),
        };
        const decoded = await run(
          native.selectSql(contract, { id }, (ctx, p) => `SELECT v FROM ${table(kind)} WHERE _id = ${ctx.bind(p.id)}`, {
            includeRaw: true,
          }),
        );
        if (Exit.isSuccess(decoded)) {
          const value = decoded.value.rows[0]?.v;
          const triplex = kind === "int64" && value?.type === "integer" ? value.value : value;
          record({ ...base, path: "native-decode", ...measure(c.value, triplex), rawDriver: render(decoded.value.rawRows?.[0]?.v) });
        } else record({ ...base, path: "native-decode", outcome: "rejected", error: failureOf(decoded) });

        // native-param: equality with a bound parameter; expected ids are the Triplex-equal values.
        if (kind === "instant") continue; // no ms -> TIMESTAMPTZ binding exists in the native context
        const cast = nativeCast[kind] ?? ((b) => b);
        const paramContract = {
          name: `f02/param/${kind}`,
          parameters: TypeExpr.struct({ v: TypeExpr.required(kindType[kind]) }),
          row: TypeExpr.struct({ id: TypeExpr.required(TypeExpr.text) }),
        };
        const matched = await run(
          native.selectSql(paramContract, { v: nativeInput(kind, c.value) }, (ctx, p) =>
            `SELECT _id AS id FROM ${table(kind)} WHERE v = ${cast(ctx.bind(p.v))}`,
          ),
        );
        if (!Exit.isSuccess(matched)) {
          record({ ...base, path: "native-param", outcome: "rejected", error: failureOf(matched) });
        } else {
          // Only rows the spec would project (exact, in domain) take part; others are ledger-only.
          const projectable = new Set(
            rows.filter((r) => r.ok && !r.c.expectReject && specVerdict("xtdb", kind, false, r.c.value).exact).map((r) => r.id),
          );
          const allGot = matched.value.rows.map((r) => r.id).sort();
          const got = allGot.filter((id) => projectable.has(id));
          const want = rows
            .filter((r) => projectable.has(r.id) && (kind === "int64" ? BigInt(r.c.value) === BigInt(c.value) : r.c.value === c.value))
            .map((r) => r.id)
            .sort();
          record({
            ...base,
            path: "native-param",
            unprojectedMatches: allGot.filter((id) => !projectable.has(id)).map((id) => rows.find((r) => r.id === id).c.id),
            ...(JSON.stringify(got) === JSON.stringify(want)
              ? { outcome: "exact", readBack: render(got) }
              : { outcome: "changed", readBack: render(got), how: `matched ${render(got)}, Triplex-equal ${render(want)}` }),
          });
        }
        // native-echo: the bound parameter returned as a value (-0, int64 and text identity).
        if (!["number", "integer", "int64", "text", "boolean"].includes(kind)) continue;
        const echoContract = {
          name: `f02/echo/${kind}`,
          parameters: TypeExpr.struct({ v: TypeExpr.required(kindType[kind]) }),
          row: TypeExpr.struct({ v: TypeExpr.required(kindType[kind]) }),
        };
        const echoed = await run(
          native.selectSql(echoContract, { v: nativeInput(kind, c.value) }, (ctx, p) =>
            `SELECT ${cast(ctx.bind(p.v))} AS v FROM ${table(kind)} WHERE _id = 'c0'`,
          ),
        );
        if (Exit.isSuccess(echoed)) {
          const value = echoed.value.rows[0]?.v;
          record({ ...base, path: "native-echo", ...measure(c.value, kind === "int64" ? value?.value : value) });
        } else record({ ...base, path: "native-echo", outcome: "rejected", error: failureOf(echoed) });
      }
    }

    // ---- order: ORDER BY and range filters on spec-exact values ----
    for (const kind of orderedKinds) {
      const rows = (stored.get(kind) ?? []).filter((r) => r.ok && !r.c.expectReject && specVerdict("xtdb", kind, false, r.c.value).exact);
      const values = new Map(rows.map((r) => [r.id, r.c.value]));
      const attribute = attrSpec(kind, false);
      const cmp = compare[kind];
      const ordered = (await client.query(`SELECT _id FROM ${table(kind)} ORDER BY v`)).map((r) => r._id).filter((id) => values.has(id));
      const inversion = firstInversion(ordered, values, cmp);
      const codePointInversion = kind === "text" ? firstInversion(ordered, values, compare.textCodePoint) : undefined;
      const rangeMismatches = [];
      for (const pivot of rows) {
        const encoded = xtdbScalar(kind, pivot.c.value);
        const got = (await client.query(`SELECT _id FROM ${table(kind)} WHERE v < ${encoded.expr}`, [encoded.param]))
          .map((r) => r._id)
          .filter((id) => values.has(id))
          .sort();
        const want = rows.filter((r) => cmp(r.c.value, pivot.c.value) < 0).map((r) => r.id).sort();
        if (JSON.stringify(got) !== JSON.stringify(want))
          rangeMismatches.push({
            pivot: pivot.c.id,
            extra: got.filter((id) => !want.includes(id)).map((id) => rows.find((r) => r.id === id).c.id),
            missing: want.filter((id) => !got.includes(id)).map((id) => rows.find((r) => r.id === id).c.id),
          });
      }
      const nativeOk = inversion === undefined && rangeMismatches.length === 0;
      results.push({
        engine: "xtdb",
        path: "order",
        kind,
        caseId: "order-by-and-range",
        values: rows.length,
        outcome: nativeOk ? "exact" : "changed",
        specOrdering: attribute.xtdb.ordering,
        inversion: inversion && { before: rows.find((r) => r.id === inversion.before).c.id, after: rows.find((r) => r.id === inversion.after).c.id },
        ...(kind === "text" ? { matchesCodePointOrder: codePointInversion === undefined } : {}),
        rangeMismatches,
        verdict:
          attribute.xtdb.ordering === "native" && !nativeOk
            ? "critical-spec-says-native-order-but-differs"
            : attribute.xtdb.ordering !== "native" && nativeOk
              ? "spec-conservative"
              : "ok",
      });
    }

    // ---- coordinates: native valid time and _id ----
    const vt = table("validtime");
    for (const [index, c] of validTimes.entries()) {
      const claim = { exact: ProjectionSpec.isExact(spec.coordinates.xtdb.validTime, c.value), rule: ProjectionSpec.firstViolation(spec.coordinates.xtdb.validTime, c.value)?._tag ?? null };
      const base = { engine: "xtdb", path: "coordinate/valid-from", kind: "valid-time", caseId: c.id, outsideDomain: Boolean(c.expectReject), input: render(c.value), spec: claim };
      try {
        await client.submit([
          { sql: `INSERT INTO ${vt} (_id, _valid_from, k) VALUES (?, CAST(? AS TIMESTAMP WITH TIME ZONE), 1)`, params: [`c${index}`, msToIso(c.value, "java")] },
        ]);
        const [row] = await client.query(`SELECT CAST(_valid_from AS VARCHAR) AS vf FROM ${vt} FOR ALL VALID_TIME WHERE _id = ?`, [`c${index}`]);
        record({ ...base, ...measure(c.value, isoToMs(row.vf)), rawText: row.vf });
      } catch (error) {
        record({ ...base, outcome: "rejected", error: errorText(error) });
      }
    }
    const ids = table("ids");
    for (const [index, c] of [...domain.ref, ...domain.text.filter((t) => t.id !== "long-64k")].entries()) {
      const claim = { exact: ProjectionSpec.isExact(spec.coordinates.xtdb.entityId, c.value), rule: ProjectionSpec.firstViolation(spec.coordinates.xtdb.entityId, c.value)?._tag ?? null };
      const base = { engine: "xtdb", path: "coordinate/_id", kind: "entity-id", caseId: c.id, outsideDomain: Boolean(c.expectReject), input: render(c.value), spec: claim };
      try {
        await client.submit([{ sql: `INSERT INTO ${ids} (_id, k) VALUES (?, ?)`, params: [c.value, index] }]);
        const [row] = await client.query(`SELECT _id FROM ${ids} WHERE k = ?`, [index]);
        record({ ...base, ...measure(c.value, row?._id) });
      } catch (error) {
        record({ ...base, outcome: "rejected", error: errorText(error) });
      }
    }
  } finally {
    await client.close();
  }
};

// ---------------------------------------------------------------------------------------------
// QLever projection, native and order paths
// ---------------------------------------------------------------------------------------------

const rdfBase = spec.rdfBase;
const qleverLiteral = (kind, value) => {
  switch (kind) {
    case "text":
    case "enum":
      return `${sparqlString(value)}^^<${XSD}string>`;
    case "ref":
      return `<${PhysicalNames.rdfEntity(value, rdfBase)}>`;
    case "number":
      return `"${xsdDouble(value)}"^^<${XSD}double>`;
    case "integer":
      if (!Number.isInteger(value)) throw new TypeError(`Not an integer: ${value}`);
      return `"${BigInt(value).toString()}"^^<${XSD}integer>`;
    case "int64":
      return `"${value}"^^<${XSD}integer>`;
    case "boolean":
      return `"${value}"^^<${XSD}boolean>`;
    case "date":
      return `"${value}"^^<${XSD}date>`;
    case "instant":
      return `"${msToIso(value, "xsd")}"^^<${XSD}dateTime>`;
    case "json":
      return `${sparqlString(CanonicalJson.encodeOrThrow(value))}^^<${RDF_JSON}>`;
  }
};

/** A declared row type for one JSON case: list(any) for arrays, a struct of optional any fields. */
const jsonType = (value) =>
  Array.isArray(value)
    ? TypeExpr.list(TypeExpr.any)
    : TypeExpr.struct(Object.fromEntries(Object.keys(value).map((k) => [k, TypeExpr.optional(TypeExpr.any)])));

const entityPrefix = `${rdfBase}entity:`;
const qleverDecode = (kind, term) => {
  switch (kind) {
    case "text":
    case "enum":
      return term.datatype === undefined || term.datatype === `${XSD}string` ? term.value : `<${term.datatype}>${term.value}`;
    case "ref":
      return term.type === "uri" && term.value.startsWith(entityPrefix)
        ? PhysicalNames.decodeEntityId(term.value.slice(entityPrefix.length))
        : `<${term.type}>${term.value}`;
    case "number":
    case "integer":
      return parseRdfNumber(term.value);
    case "int64":
      return /^[+-]?\d+$/.test(term.value) ? BigInt(term.value).toString() : `<${term.datatype}>${term.value}`;
    case "boolean":
      return term.value === "true" || term.value === "1" ? true : term.value === "false" || term.value === "0" ? false : `<${term.value}>`;
    case "date":
      return term.datatype === `${XSD}date` ? term.value : `<${term.datatype ?? "plain"}>${term.value}`;
    case "instant":
      return term.datatype === `${XSD}dateTime` ? isoToMs(term.value) : `<${term.datatype ?? "plain"}>${term.value}`;
    case "json":
      return JSON.parse(term.value);
  }
};

const qleverPaths = async () => {
  const client = qleverPkg.makeQleverClient(QLEVER_URL);
  const graph = `<urn:f02wire:${runId}>`;
  const subject = (kind, id) => `<urn:f02wire:${runId}:${kind}:${id}>`;
  const predicate = (kind) => `<${PhysicalNames.rdfAttribute(`:f02one/${kind}`, rdfBase)}>`;
  const scope = DatabaseScope.test(`f02-wire:qlever-native:${runId}`);
  const native = qleverPkg.makeQleverNativeQueries(client, scope);
  const stored = new Map();

  // ---- (b) typed literals, one INSERT DATA per value ----
  for (const kind of kinds) {
    const rows = [];
    for (const [index, c] of domain[kind].entries()) {
      const id = `c${index}`;
      const claim = specVerdict("rdf", kind, false, c.value);
      try {
        const lit = qleverLiteral(kind, c.value);
        await client.update(`INSERT DATA { GRAPH ${graph} { ${subject(kind, id)} ${predicate(kind)} ${lit} . } }`);
        rows.push({ id, c, ok: true, lit, claim });
      } catch (error) {
        record({ engine: "qlever", path: "projection-literal", kind, caseId: c.id, outsideDomain: Boolean(c.expectReject), input: render(c.value), spec: claim, outcome: "rejected", error: errorText(error) });
        rows.push({ id, c, ok: false, claim });
      }
    }
    stored.set(kind, rows);
    const bindings = await client.query(`SELECT ?s ?o WHERE { GRAPH ${graph} { ?s ${predicate(kind)} ?o } }`);
    for (const { id, c, ok, claim } of rows) {
      if (!ok) continue;
      const base = { engine: "qlever", path: "projection-literal", kind, caseId: c.id, outsideDomain: Boolean(c.expectReject), input: render(c.value), spec: claim };
      const terms = bindings.filter((b) => b.s.value === subject(kind, id).slice(1, -1)).map((b) => b.o);
      if (terms.length !== 1) {
        record({ ...base, outcome: "changed", how: `${terms.length} objects returned`, readBack: render(terms) });
        continue;
      }
      let decoded;
      try {
        decoded = qleverDecode(kind, terms[0]);
      } catch (error) {
        decoded = `<unparsed: ${errorText(error)}>`;
      }
      record({ ...base, ...measure(c.value, decoded), rawTerm: terms[0] });
    }
  }

  // ---- card-many sets: several values on one subject ----
  const sets = [
    { kind: "number", caseId: "set{0,-0}", values: [0, -0] },
    { kind: "number", caseId: "set{1,1+2^-52}", values: [1, 1.0000000000000002] },
    { kind: "number", caseId: "set{1+2^-40,1+2^-40+2^-52}", values: [1 + 2 ** -40, 1 + 2 ** -40 + 2 ** -52] },
    { kind: "text", caseId: "set{e+combining,precomposed}", values: ["é", "é"] },
    { kind: "int64", caseId: "set{2^59,-2^59}", values: ["576460752303423488", "-576460752303423488"] },
    { kind: "instant", caseId: "set{ms,ms+0.5}", values: [1_731_000_000_123, 1_731_000_000_123.5] },
  ];
  for (const [index, s] of sets.entries()) {
    const subj = subject(`${s.kind}-set`, index);
    const claim = s.values
      .map((v) => specVerdict("rdf", s.kind, true, v))
      .reduce((acc, v) => (acc.exact && !v.exact ? v : acc), { exact: true, rule: null });
    const base = { engine: "qlever", path: "projection-set", kind: s.kind, caseId: s.caseId, input: render(s.values), spec: claim };
    await client.update(
      `INSERT DATA { GRAPH ${graph} { ${s.values.map((v) => `${subj} ${predicate(s.kind)} ${qleverLiteral(s.kind, v)} .`).join(" ")} } }`,
    );
    const terms = (await client.query(`SELECT ?o WHERE { GRAPH ${graph} { ${subj} ${predicate(s.kind)} ?o } }`)).map((b) => b.o);
    const decoded = terms.map((t) => qleverDecode(s.kind, t));
    const want = [...s.values];
    const exact = decoded.length === want.length && want.every((v) => decoded.some((d) => same(d, v)));
    record({ ...base, outcome: exact ? "exact" : "changed", readBack: render(decoded), ...(exact ? {} : { how: `${render(want)} -> ${render(decoded)}` }) });
  }

  // ---- (c) native provider decode and literal equality ----
  for (const kind of kinds) {
    const rows = stored.get(kind) ?? [];
    for (const { id, c, ok, lit, claim } of rows) {
      if (!ok) continue;
      const base = { engine: "qlever", kind, caseId: c.id, outsideDomain: Boolean(c.expectReject), input: render(c.value), spec: claim };
      const contract = {
        name: `f02/decode/${kind}`,
        parameters: TypeExpr.struct({}),
        row: TypeExpr.struct({ o: TypeExpr.required(kind === "json" ? jsonType(c.value) : kindType[kind]) }),
      };
      const decoded = await run(
        native.select(contract, {}, () => `SELECT ?o WHERE { GRAPH ${graph} { ${subject(kind, id)} ${predicate(kind)} ?o } }`, {
          includeRaw: true,
        }),
      );
      if (Exit.isSuccess(decoded)) {
        let value = decoded.value.rows[0]?.o;
        if (kind === "int64" && value?.type === "integer") value = value.value;
        if (kind === "ref" && typeof value === "string" && value.startsWith(entityPrefix))
          value = PhysicalNames.decodeEntityId(value.slice(entityPrefix.length));
        record({ ...base, path: "native-decode", ...measure(c.value, value), rawTerm: decoded.value.rawRows?.[0]?.o });
      } else record({ ...base, path: "native-decode", outcome: "rejected", error: failureOf(decoded) });

      const matched = await client.query(`SELECT ?s WHERE { GRAPH ${graph} { ?s ${predicate(kind)} ?o FILTER(?o = ${lit}) } }`).catch((e) => e);
      if (matched instanceof Error) {
        record({ ...base, path: "native-param", outcome: "rejected", error: errorText(matched) });
        continue;
      }
      // Only rows the spec would project (exact, in domain) take part; others are ledger-only.
      const projectable = new Set(rows.filter((r) => r.ok && !r.c.expectReject && r.claim.exact).map((r) => r.id));
      const idOf = new Map(rows.map((r) => [subject(kind, r.id).slice(1, -1), r.id]));
      const allGot = matched
        .map((b) => idOf.get(b.s.value))
        .filter((s) => s !== undefined)
        .sort();
      const got = allGot.filter((rowId) => projectable.has(rowId));
      const want = rows
        .filter(
          (r) =>
            projectable.has(r.id) &&
            (kind === "int64" ? BigInt(r.c.value) === BigInt(c.value) : kind === "json" ? same(r.c.value, c.value) : r.c.value === c.value),
        )
        .map((r) => r.id)
        .sort();
      record({
        ...base,
        path: "native-param",
        unprojectedMatches: allGot.filter((rowId) => !projectable.has(rowId)).map((rowId) => rows.find((r) => r.id === rowId).c.id),
        ...(JSON.stringify(got) === JSON.stringify(want)
          ? { outcome: "exact", readBack: render(got) }
          : { outcome: "changed", readBack: render(got), how: `matched ${render(got)}, Triplex-equal ${render(want)}` }),
      });
    }
  }

  // ---- order ----
  for (const kind of orderedKinds) {
    const rows = (stored.get(kind) ?? []).filter((r) => r.ok && !r.c.expectReject && r.claim.exact);
    const values = new Map(rows.map((r) => [subject(kind, r.id).slice(1, -1), r.c.value]));
    const attribute = attrSpec(kind, false);
    const cmp = compare[kind];
    const ordered = (await client.query(`SELECT ?s WHERE { GRAPH ${graph} { ?s ${predicate(kind)} ?o } } ORDER BY ?o`))
      .map((b) => b.s.value)
      .filter((s) => values.has(s));
    const inversion = firstInversion(ordered, values, cmp);
    const codePointInversion = kind === "text" ? firstInversion(ordered, values, compare.textCodePoint) : undefined;
    const caseOf = (s) => rows.find((r) => subject(kind, r.id).slice(1, -1) === s)?.c.id;
    const rangeMismatches = [];
    for (const pivot of rows) {
      const got = (await client.query(`SELECT ?s WHERE { GRAPH ${graph} { ?s ${predicate(kind)} ?o FILTER(?o < ${pivot.lit}) } }`))
        .map((b) => b.s.value)
        .filter((s) => values.has(s))
        .sort();
      const want = rows.filter((r) => cmp(r.c.value, pivot.c.value) < 0).map((r) => subject(kind, r.id).slice(1, -1)).sort();
      if (JSON.stringify(got) !== JSON.stringify(want))
        rangeMismatches.push({
          pivot: pivot.c.id,
          extra: got.filter((s) => !want.includes(s)).map(caseOf),
          missing: want.filter((s) => !got.includes(s)).map(caseOf),
        });
    }
    const nativeOk = inversion === undefined && rangeMismatches.length === 0;
    results.push({
      engine: "qlever",
      path: "order",
      kind,
      caseId: "order-by-and-range",
      values: rows.length,
      outcome: nativeOk ? "exact" : "changed",
      specOrdering: attribute.rdf.ordering,
      inversion: inversion && { before: caseOf(inversion.before), after: caseOf(inversion.after) },
      ...(kind === "text" ? { matchesCodePointOrder: codePointInversion === undefined } : {}),
      rangeMismatches,
      verdict:
        attribute.rdf.ordering === "native" && !nativeOk
          ? "critical-spec-says-native-order-but-differs"
          : attribute.rdf.ordering !== "native" && nativeOk
            ? "spec-conservative"
            : "ok",
    });
  }
  await client.close();
};

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

// Compile-time checks the measurements depend on (no engine I/O).
const specChecks = async () => {
  for (const [caseId, type] of [
    ["number", TypeExpr.number],
    ["list(number)", TypeExpr.list(TypeExpr.number)],
    ["struct{amount:number}", TypeExpr.struct({ amount: TypeExpr.required(TypeExpr.number) })],
  ]) {
    const exit = await run(
      ProjectionSpec.compile(
        [{ entityType: "F02Check", attributes: [{ key: ":f02check/v", type, required: false, cardinality: "one" }] }],
        { approximateNumbers: "reject" },
      ),
    );
    results.push({
      engine: "spec",
      path: "compile/approximateNumbers=reject",
      kind: "number",
      caseId,
      outcome: Exit.isSuccess(exit) ? "accepted" : "rejected",
      verdict: caseId === "number" ? (Exit.isSuccess(exit) ? "spec-wrong" : "ok") : Exit.isSuccess(exit) ? "spec-gap-binary64-inside-json-accepted" : "ok",
      ...(Exit.isSuccess(exit) ? {} : { error: failureOf(exit) }),
    });
  }
  const json = attrSpec("json", false);
  results.push({
    engine: "spec",
    path: "rules/json",
    kind: "json",
    caseId: "exactness-rules",
    outcome: "info",
    verdict: json.xtdb.exactness.length === 0 && json.rdf.exactness.length === 0 ? "spec-gap-json-has-no-rules" : "ok",
    xtdb: json.xtdb.exactness,
    rdf: json.rdf.exactness,
    canonicalNegativeZero: CanonicalJson.encodeOrThrow({ v: -0 }),
    jsonStringifyNegativeZero: JSON.stringify({ v: -0 }),
  });
};

const started = new Date().toISOString();
await specChecks();
const sections = process.env.F02_SECTIONS?.split(",") ?? ["xtdb-ledger", "qlever-ledger", "xtdb", "qlever"];
const xtdbLayer = (scope) => xtdbPkg.makeXtdbRuntime({ url: XTDB_URL }).layer({ scope, capabilities: Capabilities.none });
const qleverLayer = (scope) =>
  qleverPkg.makeQleverRuntime({ url: QLEVER_URL, maxRetries: 32 }).layer({ scope, capabilities: Capabilities.none });
for (const section of sections) {
  const t0 = performance.now();
  if (section === "xtdb-ledger") await ledgerPath("xtdb", xtdbLayer);
  if (section === "qlever-ledger") await ledgerPath("qlever", qleverLayer);
  if (section === "xtdb") await xtdbPaths();
  if (section === "qlever") await qleverPaths();
  console.error(`${section}: ${Math.round(performance.now() - t0)} ms`);
}

// --keep-from FILE: keep that file's results for engines this invocation did not run (for example
// after a shared slot was restarted by another agent mid-run, rerun only that engine).
const engineOf = (section) => (section.startsWith("xtdb") ? "xtdb" : section.startsWith("qlever") ? "qlever" : section);
const kept = [];
let keptRunId;
if (args.includes("--keep-from")) {
  const previous = JSON.parse(readFileSync(resolve(repo, args[args.indexOf("--keep-from") + 1]), "utf8"));
  keptRunId = previous.runId;
  const rerun = new Set([...sections.map(engineOf), "spec"]);
  for (const r of previous.results) if (!rerun.has(r.engine)) kept.push({ ...r, runId: r.runId ?? previous.runId });
}
for (const r of results) r.runId = runId;
results.unshift(...kept);

const counts = {};
for (const r of results) {
  const key = `${r.engine} ${r.path}`;
  counts[key] ??= {};
  counts[key][r.verdict] = (counts[key][r.verdict] ?? 0) + 1;
}
const output = {
  format: "triplex-f02-wire-exactness/1",
  experiment: "EXP-F02",
  runId,
  ...(keptRunId === undefined ? {} : { keptFromRunId: keptRunId, sectionsThisRun: sections }),
  started,
  finished: new Date().toISOString(),
  engines: { xtdb: { url: XTDB_URL.replace(/\/\/[^@]*@/, "//<credentials>@"), image: "ghcr.io/xtdb/xtdb:2.2.0" }, qlever: { url: QLEVER_URL, image: "adfreiburg/qlever:0.6.0" } },
  spec: { id: spec.id, layout: spec.layout, inexactPolicy: spec.inexactPolicy },
  rule: "lab/SCOPE.md 2.4 (Sam's corrected numeric rule): exact round trip; order-preserving range comparison; hard error, never silent conversion; integers >= 2^53",
  verdicts: {
    ok: "measured outcome agrees with the spec (exact where claimed exact, or caught by a rule)",
    "critical-silent-change": "a value came back different with no error, where the spec claims exact (or on the ledger, always)",
    "spec-claims-exact-but-rejected": "spec claims exact; the engine refused the value with an error (not silent, but a valid write fails)",
    "spec-conservative": "spec marks inexact; the engine held the value exactly",
    "critical-spec-says-native-order-but-differs": "spec says native ordering; engine order or range filter differs from Triplex order",
  },
  counts,
  results,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.error(`wrote ${results.length} results to ${outPath}`);
for (const [key, value] of Object.entries(counts)) console.error(key.padEnd(48), JSON.stringify(value));
