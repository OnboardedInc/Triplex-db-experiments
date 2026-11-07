/** Freeze a real public packet/foundation job; this command starts no engine. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, lstat, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (key, fallback) => (args.includes(key) ? args[args.indexOf(key) + 1] : fallback);
const queryPath = option("--query-path", "xtdb-native");
assert(
  ["duckdb-datalog", "xtdb-native", "xtdb-datalog", "qlever-native", "qlever-datalog"].includes(
    queryPath,
  ),
);
const backend = queryPath.split("-")[0];
const foundation = args.includes("--foundation");
assert(!foundation || queryPath.endsWith("-datalog"));
const id = option("--job", undefined);
assert.match(id ?? "", /^[a-z0-9][a-z0-9._-]{0,100}$/);
const packet = JSON.parse(
  await readFile(path.join(root, "qualification/workloads/temporal-workloads.json"), "utf8"),
);
const selected = option("--workloads", packet.workloads.map((item) => item.id).join(",")).split(
  ",",
);
assert(
  selected.length &&
    new Set(selected).size === selected.length &&
    selected.every((id) => packet.workloads.some((item) => item.id === id)),
);
const directory = path.join(root, "qualification/native-jobs", id);
await mkdir(directory, { recursive: true });
const oracle = path.join(directory, "expected-results.json");
// These expected values belong to the independently reviewed immutable-event
// packet. No native result, generated SQL, or engine state is consulted here.
const cases = packet.workloads
  .filter((item) => selected.includes(item.id))
  .flatMap((workload) =>
    workload.cases.flatMap((entry) =>
      [false, true].map((reopen) => ({
        logicalTaskId: `${workload.id}/${entry.id}`,
        reopen,
        rows: [...new Set(entry.expected_rows.map((row) => JSON.stringify(row)))]
          .sort()
          .map((row) => JSON.parse(row)),
      })),
    ),
  )
  .sort(
    (left, right) =>
      left.logicalTaskId.localeCompare(right.logicalTaskId, "en") ||
      Number(left.reopen) - Number(right.reopen),
  );
const expected = foundation
  ? {
      format: "triplex-public-foundation-results/1",
      backend,
      status: "PASS_COMPLETE_UNCHANGED_SUITE",
      caseNames: (await import("../../testkit/dist/index.js")).triplesConformanceCases.map(
        (entry) => entry.name,
      ),
    }
  : { format: "triplex-public-logical-results/1", queryPath, cases };
if (foundation) assert.equal(expected.caseNames.length, 44);
await writeFile(oracle, JSON.stringify(expected, null, 2) + "\n", { flag: "wx" });

const pins = new Map();
const collect = async (relative, role) => {
  const absolute = path.resolve(root, relative);
  assert(absolute.startsWith(root + path.sep));
  const stat = await lstat(absolute);
  assert(
    !stat.isSymbolicLink(),
    `Use actual package paths in the pinned dependency closure: ${relative}`,
  );
  if (stat.isDirectory()) {
    for (const child of (await readdir(absolute)).sort())
      await collect(path.join(relative, child), role);
  } else {
    assert(stat.isFile());
    pins.set(relative, {
      path: relative,
      role,
      sha256: createHash("sha256")
        .update(await readFile(absolute))
        .digest("hex"),
    });
  }
};
for (const [relative, role] of [
  ["packages/core/src", "source"],
  ["packages/core/dist", "build"],
  [`packages/${backend}/src`, "source"],
  [`packages/${backend}/dist`, "build"],
  ["packages/qualification/src/index.ts", "source"],
  ["packages/qualification/dist/index.js", "build"],
  ["packages/qualification/dist/index.d.ts", "build"],
  ["packages/core/src/native/NativeQuery.ts", "codec"],
  [
    backend === "xtdb"
      ? "packages/xtdb/src/native/Sources.ts"
      : backend === "qlever"
        ? "packages/qlever/src/rdf.ts"
        : "packages/duckdb/src/public-schema.sql",
    "mapping",
  ],
  ["packages/qualification/workloads/runner.ts", "runner"],
  ["packages/qualification/workloads/prepare-native-job.mjs", "runner"],
  ["qualification/workloads/engine_cases.mjs", "source"],
  ["qualification/workloads/temporal-workloads.json", "oracle"],
  ["qualification/workloads/event_oracles.py", "oracle"],
  ["qualification/workloads/test_event_oracles.py", "oracle"],
  ["package.json", "dependency"],
  ["pnpm-lock.yaml", "dependency"],
  ["pnpm-workspace.yaml", "dependency"],
  ["packages/core/package.json", "dependency"],
  [`packages/${backend}/package.json`, "dependency"],
  ["packages/qualification/package.json", "dependency"],
  ["tools/bootstrap/with-env.sh", "runner"],
  ["tools/bootstrap/check-storage.py", "runner"],
])
  await collect(relative, role);
if (queryPath.endsWith("-native"))
  for (const [directory, role] of [
    ["packages/qualification/src/native", "native-query"],
    ["packages/qualification/dist/native", "build"],
  ])
    for (const file of await readdir(path.join(root, directory)))
      if (file.startsWith(`${backend}-`)) await collect(`${directory}/${file}`, role);
if (foundation)
  for (const [relative, role] of [
    ["packages/testkit/src", "source"],
    ["packages/testkit/dist", "build"],
    ["packages/testkit/package.json", "dependency"],
    ["packages/qualification/workloads/foundation-entry.ts", "runner"],
  ])
    await collect(relative, role);
// Resolve workspace links once, then pin actual bytes. Effect4 and postgres
// have no runtime dependency packages; Node itself is bound by the controller.
for (const packagePath of [
  "node_modules/effect",
  ...(backend === "xtdb" ? ["packages/xtdb/node_modules/postgres"] : []),
]) {
  const actual = await realpath(path.join(root, packagePath));
  assert(actual.startsWith(path.join(root, "node_modules/.pnpm") + path.sep));
  await collect(path.relative(root, actual), "dependency");
}
const require = createRequire(path.join(root, `packages/${backend}/package.json`));
for (const name of [
  "ulidx",
  ...(backend === "duckdb"
    ? ["@duckdb/node-api", "@duckdb/node-bindings", "@duckdb/node-bindings-darwin-arm64"]
    : []),
]) {
  const apiRequire =
    backend === "duckdb" ? createRequire(require.resolve("@duckdb/node-api")) : require;
  const resolver =
    name === "ulidx"
      ? createRequire(path.join(root, "packages/core/package.json"))
      : name === "@duckdb/node-bindings-darwin-arm64"
        ? createRequire(apiRequire.resolve("@duckdb/node-bindings"))
        : name === "@duckdb/node-bindings"
          ? apiRequire
          : require;
  let location = path.dirname(
    resolver.resolve(name === "@duckdb/node-bindings-darwin-arm64" ? `${name}/duckdb.node` : name),
  );
  while (
    JSON.parse(await readFile(path.join(location, "package.json"), "utf8").catch(() => "{}"))
      .name !== name
  ) {
    const parent = path.dirname(location);
    assert(parent !== location);
    location = parent;
  }
  await collect(path.relative(root, await realpath(location)), "dependency");
}
if (backend === "duckdb") {
  await collect("packages/sql/src", "source");
  await collect("packages/sql/dist", "build");
  await collect("packages/sql/package.json", "dependency");
  await collect("vendor/duckdb-temporal/runtime/native/src", "source");
  for (const file of [
    "artifact.json",
    "temporal_datalog.duckdb_extension",
    "temporal_control.node",
    "owner_probe/artifact.json",
    "owner_probe/temporal_owner_probe.duckdb_extension",
    "owner_probe/temporal_writer.node",
  ])
    await collect(`vendor/duckdb-temporal/runtime/build/${file}`, "build");
}
await collect(path.relative(root, oracle), "oracle");
const environment = {
  TRIPLEX_BACKEND: backend,
  TRIPLEX_QUERY_PATH: queryPath,
  NODE_OPTIONS: "--max-old-space-size=384",
};
if (backend === "xtdb") environment.XTDB_URL = "postgresql://xtdb:xtdb@127.0.0.1:15442/xtdb";
else if (backend === "duckdb")
  environment.DUCKDB_DATABASE_DIRECTORY = "{RUN_DIRECTORY}/scratch/databases";
else {
  environment.QLEVER_URL = "http://127.0.0.1:17019";
  const tokenFile = path.join(root, ".runtime/engines/qlever-main/access-token");
  environment.QLEVER_ACCESS_TOKEN_FILE = tokenFile;
  await collect(path.relative(root, tokenFile), "credential-file");
  if (process.env.QLEVER_AGGREGATE_ANSWER_PLAN)
    environment.QLEVER_AGGREGATE_ANSWER_PLAN = process.env.QLEVER_AGGREGATE_ANSWER_PLAN;
}
const checkKey = foundation ? "upstream-44-unchanged" : "logical-current-reopen";
const manifest = {
  format: "triplex-devloop-job/1",
  id,
  kind: "verification",
  queryPath,
  backend,
  author: option("--author", "xtdb-native-provider-owner"),
  problemId: foundation ? "unchanged-foundation-conformance" : "public-current-reopen-conformance",
  logicalTaskId: foundation ? "upstream-44-unchanged" : `temporal-packet-${selected.join("-")}`,
  hypothesis: foundation
    ? "The built public runtime passes the complete unchanged44-case Triplex foundation contract"
    : "The declared public query surface over shared Triplex assertion history returns the frozen logical answers before and after reopening",
  goals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  dependsOn: [],
  requiredOwners: backend === "duckdb" ? [] : [`foundation-${backend}`],
  inspiration: [
    {
      reference: "qualification/workloads/event_oracles.py",
      mechanism: "Immutable business-event replay supplies the independent temporal oracle",
      adaptation:
        "Compare complete consumed native public results; preserve unsupported/failure keys and native trace instead of claiming Datalog equivalence",
    },
    {
      reference: "https://github.com/xtdb/xtdb/blob/v2.2.0/core/src/main/clojure/xtdb/sql.clj",
      mechanism: "Native XTQL and SQL query planning over server-resident relations",
      adaptation:
        "Fixed-cut native basis fragments; bounded relational rounds where the pinned engine lacks recursive CTEs",
    },
  ],
  command: {
    argv: [
      process.execPath,
      foundation
        ? "packages/qualification/workloads/foundation-entry.ts"
        : "packages/qualification/workloads/runner.ts",
      ...(!foundation ? ["--workloads", selected.join(",")] : []),
      "--output",
      "{RUN_ARTIFACTS}/report.json",
      "--results-output",
      "{RUN_ARTIFACTS}/results.json",
    ],
    cwd: ".",
    env: environment,
  },
  resources: {
    heavy: true,
    memoryBytes: (backend === "duckdb" ? 2048 : 896) * 1024 ** 2,
    cpuUnits: backend === "duckdb" ? 2 : 1,
    diskBytes: (backend === "duckdb" ? 512 : 128) * 1024 ** 2,
    timeoutMilliseconds: 15 * 60_000,
    maximumLogBytes: 8 * 1024 ** 2,
  },
  inputs: [...pins.values()].sort((left, right) => left.path.localeCompare(right.path, "en")),
  evidence: {
    checks: [
      {
        key: checkKey,
        expectedInput: path.relative(root, oracle),
        actual: "artifacts/results.json",
      },
    ],
    requiredCheckKeys: [checkKey],
  },
  retention: {
    scratch: "retain-forensic",
    meaning:
      "Fresh UUID-scoped engine facts and full native traces retained; no engine fixture or backend history cleanup is implied",
  },
};
const output = path.join(directory, "manifest.json");
await writeFile(output, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    manifest: path.relative(root, output),
    ...(foundation
      ? { foundationCases: 44 }
      : { logicalCases: cases.length / 2, currentReopenChecks: cases.length }),
    pinnedFiles: pins.size,
  }),
);
