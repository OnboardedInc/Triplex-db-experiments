import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const publishPackageNames = new Set([
  "@triplex-build/triplex",
  "@triplex-build/triplex-sql",
  "@triplex-build/triplex-sqlite",
  "@triplex-build/triplex-postgres",
  "@triplex-build/triplex-testkit",
  "@triplex-build/triplex-cli",
  "@triplex-build/triplex-http",
]);
const heldPackageNames = new Set([
  "@triplex-build/triplex-xtdb",
  "@triplex-build/triplex-qlever",
  "@triplex-build/triplex-cloudflare",
  "@triplex-build/triplex-host",
  "@triplex-build/triplex-foundationdb",
]);

const artifactRoot = process.env["TRIPLEX_PACK_ARTIFACT_ROOT"]
  ? resolve(root, process.env["TRIPLEX_PACK_ARTIFACT_ROOT"])
  : join(root, ".experiments", "lab-pack");
mkdirSync(artifactRoot, { recursive: true });
const workDir = mkdtempSync(join(artifactRoot, "triplex-pack-"));
const tarDir = join(workDir, "tarballs");
const consumerDir = join(workDir, "consumer");
const packedManifests = [];
mkdirSync(tarDir);
mkdirSync(consumerDir);
// Keep dependency caches inside this owned artifact tree as well.
writeFileSync(join(consumerDir, ".npmrc"), `cache=${join(workDir, "npm-cache")}\n`);

// [EXP-PACK] Why: retain the original checker while making every workspace's scope
// decision explicit. Rejected: a fixed include list (silently omits new packages).
const exclusionsPath = "lab/config/pack-exclusions.json";
const store = "/Users/sam/projects/triplex-db-2/.pnpm-store";
const commands = [];
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const run = (command, args, cwd = root) => {
  const record = { command, args, cwd, startedAt: new Date().toISOString() };
  commands.push(record);
  const log = join(workDir, `command-${commands.length}.log`);
  record.log = log;
  process.stdout.write(`[lab-pack] ${command} ${args.join(" ")}\n`);
  try {
    const output = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 64 * 1024 * 1024,
      timeout: command === "node" && args.includes("--eval") ? 30_000 : undefined,
    });
    writeFileSync(log, output);
    record.exit = 0;
    record.outputSha256 = digest(output);
    return output;
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    writeFileSync(log, output);
    record.exit = error.status ?? null;
    record.outputSha256 = digest(output);
    process.stderr.write(output);
    throw error;
  } finally {
    record.finishedAt = new Date().toISOString();
    writeFileSync(join(workDir, "commands.json"), JSON.stringify(commands, null, 2));
  }
};
let workspacePaths = [];
const snapshot = () => {
  const paths = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      "packages",
      "examples",
      "test",
      ...workspacePaths,
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "turbo.json",
      "tsconfig.json",
      "scripts",
      "lab/bin/check-packages.mjs",
      exclusionsPath,
    ],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  return Object.fromEntries(
    [...new Set(paths)].sort().map((path) => [path, digest(readFileSync(join(root, path)))]),
  );
};
let inputs = snapshot();
const receipt = {
  kind: "lab-pack-diagnostic/1",
  startedAt: new Date().toISOString(),
  root,
  pid: process.pid,
  parentPid: process.ppid,
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  inputs,
  packages: [],
  workspace: [],
  exclusions: {},
  imports: [],
  engines: "none",
  status: "RUNNING",
};
writeFileSync(join(workDir, "receipt.json"), JSON.stringify(receipt, null, 2));
try {
  const disk = statfsSync(root);
  if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw new Error("Less than 5 GiB host disk free");
  const exclusions = JSON.parse(readFileSync(join(root, exclusionsPath), "utf8"));
  const workspace = JSON.parse(
    run("pnpm", [`--config.store-dir=${store}`, "--recursive", "list", "--depth", "-1", "--json"]),
  );
  if (!Array.isArray(workspace) || workspace.length === 0)
    throw new Error("Empty pnpm workspace inventory");
  receipt.workspace = workspace;
  receipt.exclusions = exclusions;
  const names = new Set();
  const selected = [];
  for (const item of workspace) {
    if (typeof item.name !== "string" || names.has(item.name))
      throw new Error("Unnamed or duplicate workspace package");
    names.add(item.name);
    const dir = relative(root, item.path);
    if (resolve(root, dir) !== item.path || dir.startsWith("..") || dir.startsWith("/"))
      throw new Error(`Workspace outside checkout: ${item.path}`);
    const manifest = JSON.parse(readFileSync(join(item.path, "package.json"), "utf8"));
    if (manifest.name !== item.name) throw new Error(`Workspace manifest mismatch: ${item.name}`);
    if (Object.hasOwn(exclusions, item.name)) {
      const reason = exclusions[item.name];
      if (typeof reason !== "string" || reason.trim().length === 0)
        throw new Error(`Exclusion requires a reason: ${item.name}`);
      process.stdout.write(
        `${item.name === "@triplex-build/triplex-duckdb" ? "DuckDB" : item.name}: ${item.name === "@triplex-build/triplex-duckdb" ? "" : "EXCLUDED: "}${reason}\n`,
      );
    } else {
      if (
        !manifest.scripts?.build ||
        !manifest.exports ||
        typeof manifest.exports !== "object" ||
        Array.isArray(manifest.exports) ||
        !Object.keys(manifest.exports).length
      )
        throw new Error(
          `Unclassified workspace package ${item.name}: requires build and exports, or a reason in ${exclusionsPath}`,
        );
      selected.push({ name: item.name, dir });
    }
  }
  for (const name of Object.keys(exclusions))
    if (!names.has(name)) throw new Error(`Stale workspace exclusion: ${name}`);
  if (selected.length === 0) throw new Error("No checked workspace packages");
  workspacePaths = workspace.map((item) => relative(root, item.path)).filter(Boolean);
  inputs = snapshot();
  receipt.inputs = inputs;
  const packageNames = selected.map((item) => item.name);
  const packageDirs = selected.map((item) => item.dir);
  writeFileSync(join(workDir, "receipt.json"), JSON.stringify(receipt, null, 2));
  // [EXP-PACK] Why: remove only the selected generated outputs so old dist files
  // cannot satisfy this attempt. Rejected: turbo cache hits (fresh build is the gate).
  for (const dir of packageDirs) rmSync(join(root, dir, "dist"), { recursive: true, force: true });
  run("pnpm", [
    `--config.store-dir=${store}`,
    "--recursive",
    "--workspace-concurrency=1",
    ...packageNames.flatMap((name) => ["--filter", name]),
    "run",
    "build",
  ]);
  for (const packageName of packageNames) {
    run("pnpm", [
      `--config.store-dir=${store}`,
      "--filter",
      packageName,
      "pack",
      "--pack-destination",
      tarDir,
    ]);
  }

  const tarballs = readdirSync(tarDir)
    .filter((file) => file.endsWith(".tgz"))
    .map((file) => join(tarDir, file));

  if (tarballs.length !== packageNames.length) {
    throw new Error(`Expected ${packageNames.length} tarballs, found ${tarballs.length}`);
  }

  for (const tarball of tarballs) {
    const entries = run("tar", ["-tzf", tarball]).trim().split("\n").filter(Boolean);

    for (const required of [
      "package/package.json",
      "package/README.md",
      "package/LICENSE",
      "package/dist/index.js",
      "package/dist/index.d.ts",
    ]) {
      if (!entries.includes(required)) {
        throw new Error(`${tarball} is missing ${required}`);
      }
    }

    const unexpected = entries.filter(
      (entry) =>
        entry !== "package/package.json" &&
        entry !== "package/README.md" &&
        entry !== "package/LICENSE" &&
        !entry.startsWith("package/dist/"),
    );
    if (unexpected.length > 0) {
      throw new Error(`${tarball} contains unexpected files:\n${unexpected.join("\n")}`);
    }

    const manifest = JSON.parse(run("tar", ["-xOzf", tarball, "package/package.json"]));
    packedManifests.push(manifest);
    if (
      !packageNames.includes(manifest.name) ||
      packedManifests.filter((item) => item.name === manifest.name).length !== 1
    )
      throw new Error(`Unexpected or duplicate package ${manifest.name}`);
    // [EXP-PACK] Why: every declared export and executable must exist in the actual
    // tarball. Rejected: checking only dist/index (misses broken public subpaths).
    const targets = (value) =>
      typeof value === "string" ? [value] : Object.values(value ?? {}).flatMap(targets);
    for (const target of [
      ...targets(manifest.exports),
      manifest.main,
      manifest.types,
      ...targets(manifest.bin),
    ].filter(Boolean)) {
      if (
        !target.startsWith("./dist/") ||
        target.includes("..", 2) ||
        !entries.includes(`package/${target.slice(2)}`)
      )
        throw new Error(`${manifest.name}: missing or non-dist export/bin target ${target}`);
    }
    receipt.packages.push({
      name: manifest.name,
      version: manifest.version,
      tarball,
      sha256: digest(readFileSync(tarball)),
      entries,
    });

    if (publishPackageNames.has(manifest.name)) {
      if (manifest.private === true) {
        throw new Error(`${manifest.name} is part of the release set but is private`);
      }
      if (manifest.publishConfig?.access !== "public") {
        throw new Error(`${manifest.name} must publish with public access`);
      }
    }
    if (heldPackageNames.has(manifest.name) && manifest.private !== true) {
      throw new Error(`${manifest.name} must remain private until its backend is promoted`);
    }
    if (publishPackageNames.has(manifest.name)) {
      for (const dependencyName of Object.keys({
        ...manifest.dependencies,
        ...manifest.optionalDependencies,
        ...manifest.peerDependencies,
      })) {
        if (heldPackageNames.has(dependencyName)) {
          throw new Error(`${manifest.name} must not depend on held package ${dependencyName}`);
        }
      }
    }
    if (manifest.dependencies?.effect !== undefined) {
      throw new Error(`${manifest.name} must not install a private Effect runtime`);
    }
    if (manifest.peerDependencies?.effect === undefined) {
      throw new Error(`${manifest.name} must declare Effect as a peer dependency`);
    }
  }

  const dependencies = Object.fromEntries(
    packageNames.map((name) => {
      const manifest = packedManifests.find((candidate) => candidate.name === name);
      if (!manifest) throw new Error(`Could not locate packed manifest for ${name}`);
      const prefix = `${name.replace(/^@/, "").replaceAll("/", "-")}-${manifest.version}.tgz`;
      const tarball = tarballs.find((file) => file.endsWith(prefix));
      if (!tarball) throw new Error(`Could not locate tarball for ${name}`);
      return [name, `file:${tarball}`];
    }),
  );
  const coreManifest = packedManifests.find(
    (manifest) => manifest.name === "@triplex-build/triplex",
  );
  if (!coreManifest) throw new Error("Could not locate the packed core manifest");
  const effectVersion = coreManifest.peerDependencies.effect;
  const effectPeerVersions = new Set(
    packedManifests.map((manifest) => manifest.peerDependencies.effect),
  );
  if (effectPeerVersions.size !== 1) {
    throw new Error(`Effect peer versions are not aligned: ${[...effectPeerVersions].join(", ")}`);
  }

  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify(
      {
        name: "triplex-package-consumer",
        private: true,
        type: "module",
        dependencies: {
          ...dependencies,
          effect: effectVersion,
          typescript: "6.0.2",
          "@types/node": "25.9.1",
        },
      },
      null,
      2,
    ),
  );

  for (const manifest of packedManifests) {
    if (
      Object.keys(manifest.exports).some(
        (key) => key !== "." && (!key.startsWith("./") || key.includes("*")),
      )
    )
      throw new Error(`Cannot enumerate public export map for ${manifest.name}`);
  }
  const specifiers = packedManifests.flatMap((manifest) =>
    Object.keys(manifest.exports).map((key) =>
      key === "." ? manifest.name : manifest.name + key.slice(1),
    ),
  );
  writeFileSync(
    join(consumerDir, "exports.ts"),
    specifiers
      .map(
        (specifier, index) =>
          `import * as Export${index} from ${JSON.stringify(specifier)};\nvoid Export${index};`,
      )
      .join("\n"),
  );
  writeFileSync(
    join(consumerDir, "exports.mjs"),
    specifiers.map((specifier) => `await import(${JSON.stringify(specifier)});`).join("\n"),
  );

  writeFileSync(
    join(consumerDir, "consumer.ts"),
    `import { DatabaseId, DatalogValidationError, EntityId, TransactionId, TripleId, type TripleInput, type TriplesService, type QueryOptions, type QueryResponse } from "@triplex-build/triplex";
import { validateDatalogQuery, type DatalogQuery } from "@triplex-build/triplex/datalog";
import { Attribute, ConfigRuntime, ConfigStore, EntityType, EntityValidation, Evaluate, GraphConstraint, TypeExpr } from "@triplex-build/triplex/config";
import { Runtime, DatabaseScope, Capabilities, type ReadBasis, type NativeQueryContract } from "@triplex-build/triplex/runtime";
import * as Derivation from "@triplex-build/triplex/derivation";
import * as Cloudflare from "@triplex-build/triplex-cloudflare";
import * as FoundationDb from "@triplex-build/triplex-foundationdb";
import * as Host from "@triplex-build/triplex-host";
import * as Postgres from "@triplex-build/triplex-postgres";
import { PgTriples } from "@triplex-build/triplex-postgres";
import * as Sql from "@triplex-build/triplex-sql";
import { makeSqliteLayer } from "@triplex-build/triplex-sqlite";
import * as Testkit from "@triplex-build/triplex-testkit";
import { EntityHttp, HttpAuthorizationAllowAll } from "@triplex-build/triplex-http";
import { makeXtdbRuntime, makeXtdbClient, makeXtdbNativeQueries } from "@triplex-build/triplex-xtdb";
import { makeQleverRuntime, makeQleverClient, makeQleverNativeQueries } from "@triplex-build/triplex-qlever";

const temporalBackends = [
  makeXtdbRuntime({ url: "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb" }),
  makeQleverRuntime({ url: "http://127.0.0.1:7019" }),
];
void temporalBackends;
declare const xtdbClient: ReturnType<typeof makeXtdbClient>;
declare const qleverClient: ReturnType<typeof makeQleverClient>;
const nativeFacades = [makeXtdbNativeQueries(xtdbClient, DatabaseScope.test("packed-types")), makeQleverNativeQueries(qleverClient, DatabaseScope.test("packed-types"))];
const nativeContract: NativeQueryContract = { name: "packed-types", parameters: TypeExpr.struct({}), row: TypeExpr.struct({}) };
void nativeFacades;
void nativeContract;

const triple: TripleInput = {
  entityId: EntityId.make("person:alice"),
  attribute: ":person/name",
  value: { type: "string", value: "Alice" },
};
const transactionId = TransactionId.make("_tx/00000000000000000000000000");
const tripleId = TripleId.make("00000000000000000000000000");
const transactionEntity: EntityId = transactionId;
declare const triplesService: TriplesService;
const timeline = triplesService.transactionsForEntity(triple.entityId, { limit: 20 });
const ambientPostgres = PgTriples.layerFromSqlClient({ scope: "host/database" });
const scopedPostgres = PgTriples.layerForDatabase(
  { database: "application" },
  DatabaseId.make("tenant-a"),
);
const query: DatalogQuery = {
  find: ["?name"],
  where: [["?person", ":person/name", "?name"]],
};
// New read metadata stays additive and must survive real packed export maps.
// Inspiration: packages/core/test/runtime/read-basis.test.ts and the load oracle.
const readOptions: QueryOptions = { includeBasis: true };
const readWithBasis = triplesService.queryAll(query, readOptions);
declare const response: QueryResponse;
const resolvedBasis: ReadBasis | undefined = response.basis;
const EmployerName = Attribute.text(":employer/name");
const Employer = EntityType.make("Employer", {
  attributes: {
    name: Attribute.use(EmployerName, { required: true }),
  },
});
const nameAssertion = Employer.attributes.name.assertion("Acme");
void triple;
void transactionId;
void tripleId;
void transactionEntity;
void timeline;
void ambientPostgres;
void scopedPostgres;
void query;
void readWithBasis;
void resolvedBasis;
void validateDatalogQuery;
void DatalogValidationError;
void nameAssertion;
void ConfigStore;
void ConfigRuntime;
void Runtime;
void DatabaseScope;
void Capabilities;
void EntityValidation;
void Evaluate;
void GraphConstraint;
void TypeExpr;
void Derivation;
void Derivation.Materialization;
void Derivation.Overlay;
void makeSqliteLayer;
void Cloudflare;
void FoundationDb;
void Host;
void Postgres;
void Sql;
void Testkit;
void EntityHttp;
void HttpAuthorizationAllowAll;
`,
  );

  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "ESNext.Disposable"],
          types: ["node"],
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ["consumer.ts", "exports.ts"],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    join(consumerDir, "smoke.mjs"),
    `import { Effect } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Runtime, DatabaseScope } from "@triplex-build/triplex/runtime";
import * as Derivation from "@triplex-build/triplex/derivation";
import { SqliteTriples } from "@triplex-build/triplex-sqlite";

if (typeof Runtime.define !== "function" || typeof DatabaseScope.test("packed") !== "string") {
  throw new Error("Public runtime entry point is unavailable");
}

const result = await Effect.runPromise(
  Effect.gen(function* () {
    const triples = yield* Triples;
    const alice = EntityId.make("person:alice");
    const bob = EntityId.make("person:bob");
    yield* triples.assert({
      entityId: alice,
      attribute: ":person/name",
      value: string("Alice"),
      validFrom: 0,
      validTo: 5,
    });
    const query = {
      find: ["?name"],
      where: [["?person", ":person/name", "?name"]],
    };
    const definition = yield* Derivation.make({
      name: "person.names",
      query,
      identity: ["?name"],
      configSnapshot: "config:consumer-smoke",
    });
    yield* Derivation.Materialization.materialize(triples, definition, {
      basis: { validAt: 1 },
    });
    const preview = yield* Derivation.Overlay.evaluateOverlay(triples, definition, {
      basis: { validAt: 1 },
      overlay: {
        assertions: [{
          entityId: bob,
          attribute: ":person/name",
          value: string("Bob"),
        }],
      },
    });
    return {
      query: yield* triples.query(query, { basis: { validAt: 1 } }),
      withBasis: yield* triples.queryAll(query, { basis: { validAt: 1 }, includeBasis: true }),
      preview,
      materialization: yield* Derivation.Materialization.current(triples, definition, {
        basis: { validAt: 1 },
      }),
    };
  }).pipe(Effect.provide(SqliteTriples.layerMemory)),
);

if (
  result.query.results.length !== 1 ||
  result.query.results[0]?.["?name"] !== "Alice" ||
  Object.hasOwn(result.query, "basis") ||
  result.withBasis.results[0]?.["?name"] !== "Alice" ||
  result.withBasis.basis?.validAt !== 1 ||
  !Number.isSafeInteger(result.withBasis.basis?.recordedPosition) ||
  typeof result.withBasis.basis?.scope !== "string" ||
  result.preview.candidates.length !== 2 ||
  result.preview.nextTemporalBoundary !== 5 ||
  !result.preview.candidates.some((candidate) =>
    candidate.sources.some((source) => source.hypothetical === true)
  ) ||
  result.materialization.status !== "current" ||
  result.materialization.nextTemporalBoundary !== 5 ||
  result.materialization.candidates.length !== 1
) {
  throw new Error("Unexpected packaged SQLite/Datalog result: " + JSON.stringify(result));
}
`,
  );

  // Skip FoundationDB's native addon install so the type-level check is portable.
  // Effect 4 stable's SQLite driver uses node:sqlite for the runtime smoke test.
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], consumerDir);
  run("npx", ["tsc", "--project", "tsconfig.json"], consumerDir);
  // [EXP-PACK] Why: evaluate each installed entry point in a fresh module graph.
  // Rejected: import.meta.resolve (accepts modules that throw when evaluated).
  for (const specifier of specifiers) {
    run(
      "node",
      ["--input-type=module", "--eval", `await import(${JSON.stringify(specifier)});`],
      consumerDir,
    );
    receipt.imports.push(specifier);
  }
  run("node", ["smoke.mjs"], consumerDir);

  const cliManifest = packedManifests.find(
    (manifest) => manifest.name === "@triplex-build/triplex-cli",
  );
  if (!cliManifest) throw new Error("Could not locate the packed CLI manifest");
  if (cliManifest.bin?.triplex !== "./dist/cli.js") {
    throw new Error("The packed CLI must expose dist/cli.js as the triplex executable");
  }
  const cli = join(consumerDir, "node_modules", ".bin", "triplex");
  run(cli, ["--help"], consumerDir);
  const version = run(cli, ["--version"], consumerDir);
  if (!version.includes(cliManifest.version)) {
    throw new Error(
      `Packed CLI version mismatch: expected ${cliManifest.version}, received ${version.trim()}`,
    );
  }
  const described = JSON.parse(
    run(cli, ["--sqlite", join(consumerDir, "agent.sqlite"), "describe"], consumerDir),
  );
  if (described.ok !== true || described.command !== "describe") {
    throw new Error(`Unexpected packed CLI description: ${JSON.stringify(described)}`);
  }

  // [EXP-PACK] Why: a successful diagnostic binds unchanged input bytes and fresh
  // tarballs to this attempt. Rejected: command exit alone (does not check content).
  if (JSON.stringify(snapshot()) !== JSON.stringify(inputs))
    throw new Error("Source inputs changed during pack gate");
  receipt.status = "PASS";
  receipt.finishedAt = new Date().toISOString();
  writeFileSync(join(workDir, "receipt.json"), JSON.stringify(receipt, null, 2));
  process.stdout.write(
    `Verified ${tarballs.length} package tarballs and a clean consumer install.\n`,
  );
  process.stdout.write(`Package verification artifacts retained at ${workDir}\n`);
} catch (error) {
  receipt.status = "FAIL";
  receipt.error = String(error);
  receipt.finishedAt = new Date().toISOString();
  writeFileSync(join(workDir, "receipt.json"), JSON.stringify(receipt, null, 2));
  process.stderr.write(`Package verification artifacts retained at ${workDir}\n`);
  throw error;
}
