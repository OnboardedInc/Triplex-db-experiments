/** Shared test selection only; production backends never depend on this package. */
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Effect } from "effect";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import type {
  DatabaseScope,
  RuntimeDefinition,
  QueryContext,
} from "@triplex-build/triplex/runtime";
interface NativeTaskLibrary {
  readonly supports: (workloadId: string, operation: string) => boolean;
  readonly evaluate: (
    provider: unknown,
    workload: Record<string, any>,
    entry: Record<string, any>,
    positions: ReadonlyMap<number, number>,
    trace: unknown[],
  ) => Effect.Effect<unknown[][], unknown>;
}

export type QualificationBackendName = "duckdb" | "xtdb" | "qlever" | "datomic";
export type QualificationQueryPath =
  | "datomic-datalog"
  | "duckdb-datalog"
  | "xtdb-datalog"
  | "qlever-datalog"
  | "xtdb-native"
  | "qlever-native";

export const qualificationQueryPaths = {
  "datomic-datalog": {
    backend: "datomic",
    language: "triplex-datalog",
    foundationStatus: "implemented",
  },
  "duckdb-datalog": {
    backend: "duckdb",
    language: "triplex-datalog",
    foundationStatus: "implemented",
  },
  "xtdb-datalog": { backend: "xtdb", language: "triplex-datalog", foundationStatus: "implemented" },
  "qlever-datalog": {
    backend: "qlever",
    language: "triplex-datalog",
    foundationStatus: "implemented",
  },
  "xtdb-native": {
    backend: "xtdb",
    language: "xtql-with-native-sql",
    foundationStatus: "implemented",
  },
  "qlever-native": { backend: "qlever", language: "sparql", foundationStatus: "implemented" },
} as const;
interface TemporalOptions {
  readonly from: number;
  readonly to: number;
  readonly recordedPosition?: number;
  readonly recordedAt?: number;
  readonly maxRows?: number;
}
interface IntervalAnswer {
  readonly bindings: QueryContext;
  readonly validFrom: number;
  readonly validTo: number;
}
type Client = { readonly close: () => Promise<void> };
type TemporalProvider = {
  readonly queryIntervals: (
    query: DatalogQuery,
    options: TemporalOptions,
  ) => Effect.Effect<readonly IntervalAnswer[], unknown>;
};
type RuntimeFactory = (options: {
  readonly url: string;
  readonly accessToken?: string;
  readonly queryLimits?: {
    readonly aggregateAnswerPlan?: "bounded";
    readonly negationPlan?: "projected" | "minus";
    readonly sourcePlan?: "persisted";
    readonly retirementPlan?: "paired";
    readonly scalarOrderPlan?: "live";
  };
}) => RuntimeDefinition<unknown, never, unknown>;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const registry = {
  datomic: {
    package: "@triplex-build/triplex-datomic",
    directory: "datomic",
    factory: "makeDatomicRuntime",
    client: "",
    temporal: "",
    native: "",
    defaultUrl: "http://127.0.0.1:8470",
  },
  duckdb: {
    package: "@triplex-build/triplex-duckdb",
    directory: "duckdb",
    factory: "makeDuckDBRuntime",
    client: "makeDuckDBClient",
    temporal: "makeDuckDBTemporalQueries",
    native: "",
    defaultUrl: path.join(root, ".runtime/qualification-duckdb"),
  },
  xtdb: {
    package: "@triplex-build/triplex-xtdb",
    directory: "xtdb",
    factory: "makeXtdbRuntime",
    client: "makeXtdbClient",
    temporal: "makeXtdbTemporalQueries",
    native: "makeXtdbNativeQueries",
    defaultUrl: "postgres://xtdb:xtdb@localhost:5442/xtdb",
  },
  qlever: {
    package: "@triplex-build/triplex-qlever",
    directory: "qlever",
    factory: "makeQleverRuntime",
    client: "makeQleverClient",
    temporal: "makeQleverTemporalQueries",
    native: "makeQleverNativeQueries",
    defaultUrl: "http://127.0.0.1:7019",
  },
} as const;

export const qualificationQueryPath = (): QualificationQueryPath => {
  const backend = process.env["TRIPLEX_BACKEND"];
  const requested = process.env["TRIPLEX_QUERY_PATH"] ?? `${backend ?? "xtdb"}-datalog`;
  if (!(requested in qualificationQueryPaths))
    throw new TypeError(
      "Unknown TRIPLEX_QUERY_PATH; choose one of the five registered public surfaces",
    );
  const queryPath = requested as QualificationQueryPath;
  if (backend && qualificationQueryPaths[queryPath].backend !== backend)
    throw new TypeError("TRIPLEX_BACKEND and TRIPLEX_QUERY_PATH identify different foundations");
  return queryPath;
};

export const qualificationBackendName = (): QualificationBackendName =>
  qualificationQueryPaths[qualificationQueryPath()].backend;

/** Resolve a verified public export target, never import another package's source. */
export const loadQualificationBackend = async (name = qualificationBackendName()) => {
  const queryPath = process.env["TRIPLEX_QUERY_PATH"]
    ? qualificationQueryPath()
    : (`${name}-datalog` as QualificationQueryPath);
  if (qualificationQueryPaths[queryPath].backend !== name)
    throw new TypeError("The selected query surface differs from the requested foundation");
  const selected = registry[name];
  const directory = path.join(root, "packages", selected.directory);
  const manifest = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8")) as {
    name: string;
    exports: { ".": string | { import?: string; default?: string } };
  };
  if (manifest.name !== selected.package)
    throw new Error(`Backend package identity differs: ${selected.package}`);
  const entry = manifest.exports["."];
  const target = typeof entry === "string" ? entry : (entry.import ?? entry.default);
  if (!target?.startsWith("./dist/"))
    throw new Error(`Backend must expose built public artifacts: ${selected.package}`);
  const api = (await import(pathToFileURL(path.resolve(directory, target)).href)) as Record<
    string,
    unknown
  >;
  if (typeof api[selected.factory] !== "function")
    throw new Error(`Missing public factory ${selected.factory}`);
  const duckDirectory = process.env["DUCKDB_DATABASE_DIRECTORY"]?.replaceAll(
    "{RUN_DIRECTORY}",
    process.env["TRIPLEX_RUN_DIRECTORY"] ?? "",
  );
  const url =
    name === "duckdb"
      ? path.resolve(
          duckDirectory ??
            (process.env["TRIPLEX_RUN_DIRECTORY"]
              ? path.join(process.env["TRIPLEX_RUN_DIRECTORY"]!, "scratch/databases")
              : selected.defaultUrl),
        )
      : (process.env[
          name === "xtdb" ? "XTDB_URL" : name === "datomic" ? "DATOMIC_GATEWAY_URL" : "QLEVER_URL"
        ] ?? selected.defaultUrl);
  if (name === "duckdb" && !url.startsWith(root + path.sep))
    throw new TypeError(
      "DuckDB qualification databases must remain in the owned bounded workspace",
    );
  const factory = api[selected.factory] as RuntimeFactory;
  const tokenFile = process.env["QLEVER_ACCESS_TOKEN_FILE"];
  const accessToken =
    name === "qlever"
      ? (() => {
          if (!tokenFile) return process.env["QLEVER_ACCESS_TOKEN"];
          const actual = realpathSync(tokenFile);
          if (!actual.startsWith(realpathSync(root) + path.sep))
            throw new TypeError("Qualification token file must be owned by the bounded workspace");
          const value = readFileSync(actual, "utf8").trim();
          if (!value || /[\r\n]/.test(value))
            throw new TypeError("Invalid qualification token file");
          return value;
        })()
      : undefined;
  const aggregatePlan = process.env["QLEVER_AGGREGATE_ANSWER_PLAN"];
  if (aggregatePlan && aggregatePlan !== "bounded")
    throw new TypeError("Only the explicit bounded QLever aggregate profile is registered");
  // Explicit experimental profiles only. The pinned EXISTS control remains the
  // default; eligibility/semantics are qualified by negation-wave1.json before
  // any candidate is considered for a default change.
  const negationPlan = process.env["QLEVER_NEGATION_PLAN"];
  if (negationPlan && negationPlan !== "projected" && negationPlan !== "minus")
    throw new TypeError("Unknown explicit QLever negation experiment plan");
  const sourcePlan = process.env["QLEVER_SOURCE_PLAN"];
  if (sourcePlan && sourcePlan !== "persisted")
    throw new TypeError("Unknown explicit QLever scalar source experiment plan");
  const retirementPlan = process.env["QLEVER_RETIREMENT_PLAN"];
  if (retirementPlan && retirementPlan !== "paired")
    throw new TypeError("Unknown explicit QLever retirement experiment plan");
  const scalarOrderPlan = process.env["QLEVER_SCALAR_ORDER_PLAN"];
  if (scalarOrderPlan && scalarOrderPlan !== "live")
    throw new TypeError("Unknown explicit QLever scalar order experiment plan");
  // Select one authored task library. Foundation/translated jobs never load
  // unused native libraries, so their exact source closures stay independent.
  let nativeWorkload: NativeTaskLibrary | undefined;
  if (queryPath === "xtdb-native") {
    const tasks = await import("./native/xtdb-workloads.js");
    nativeWorkload = {
      supports: tasks.supportsXtdbNativeWorkload,
      evaluate: (provider, workload, entry, positions, trace) =>
        tasks.evaluateXtdbNativeWorkload(
          provider as Parameters<typeof tasks.evaluateXtdbNativeWorkload>[0],
          workload,
          entry,
          positions,
          trace,
        ),
    };
  } else if (queryPath === "qlever-native") {
    const tasks = await import("./native/qlever-workloads.js");
    nativeWorkload = {
      supports: tasks.supportsQleverNativeWorkload,
      evaluate: (provider, workload, entry, positions, trace) =>
        tasks.evaluateQleverNativeWorkload(
          provider as Parameters<typeof tasks.evaluateQleverNativeWorkload>[0],
          workload,
          entry,
          positions,
          trace,
        ),
    };
  }
  // The independent interval provider creates point executors too. Keep the
  // exact same explicit Q profile there as in the main runtime; otherwise a
  // full packet would silently mix candidate and default source plans.
  const qleverQueryLimits: Parameters<RuntimeFactory>[0]["queryLimits"] =
    name === "qlever" &&
    (aggregatePlan === "bounded" || negationPlan || sourcePlan || retirementPlan || scalarOrderPlan)
      ? {
          ...(aggregatePlan === "bounded" ? { aggregateAnswerPlan: "bounded" as const } : {}),
          ...(negationPlan ? { negationPlan: negationPlan as "projected" | "minus" } : {}),
          ...(sourcePlan ? { sourcePlan: "persisted" as const } : {}),
          ...(retirementPlan ? { retirementPlan: "paired" as const } : {}),
          ...(scalarOrderPlan ? { scalarOrderPlan: "live" as const } : {}),
        }
      : undefined;
  const runtime =
    name === "duckdb"
      ? await (
          api[selected.factory] as (options: {
            databaseDirectory: string;
          }) => Promise<RuntimeDefinition<unknown, never, unknown>>
        )({ databaseDirectory: url })
      : factory({
          url,
          ...(accessToken ? { accessToken } : {}),
          ...(qleverQueryLimits ? { queryLimits: qleverQueryLimits } : {}),
        });
  return {
    name,
    queryPath,
    nativeWorkload,
    url,
    artifact: path.resolve(directory, target),
    makeRuntime: () => runtime,
    openNative: (scope: DatabaseScope) => {
      const makeClient = api[selected.client],
        makeNative = api[selected.native];
      if (typeof makeClient !== "function" || typeof makeNative !== "function")
        throw new Error(`UNSUPPORTED_PUBLIC_API:${queryPath}:native provider is not built`);
      const client = (makeClient as (url: string, options?: { accessToken?: string }) => Client)(
        url,
        accessToken ? { accessToken } : {},
      );
      return {
        provider: (makeNative as (client: Client, scope: DatabaseScope) => unknown)(client, scope),
        close: () => client.close(),
      };
    },
    queryIntervals: (
      scope: DatabaseScope,
      query: DatalogQuery,
      options: TemporalOptions,
    ): Effect.Effect<readonly IntervalAnswer[], unknown> => {
      const makeClient = api[selected.client],
        makeTemporal = api[selected.temporal];
      if (typeof makeClient !== "function" || typeof makeTemporal !== "function") {
        return Effect.fail(
          new Error(`UNSUPPORTED_PUBLIC_API:${name}:queryIntervals; full goal9 remains open`),
        );
      }
      return Effect.acquireUseRelease(
        Effect.sync(() =>
          (makeClient as (url: string, options?: { accessToken?: string }) => Client)(
            url,
            accessToken ? { accessToken } : {},
          ),
        ),
        (client) =>
          (
            makeTemporal as (
              client: Client,
              scope: DatabaseScope,
              limits?: Parameters<RuntimeFactory>[0]["queryLimits"],
            ) => TemporalProvider
          )(client, scope, qleverQueryLimits).queryIntervals(query, options),
        (client) => Effect.promise(() => client.close()),
      );
    },
  };
};
