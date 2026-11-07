import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { NativeDuckDBPort } from "./native-duckdb-port.mjs";
import { PublicDuckDBBackend } from "./public-backend.mjs";
import type { GranularBackend, GranularSession, ReadQueueAdmissionOptions, TransactionAdmissionOptions } from "./effect-storage.js";

export interface DuckDBRuntimeOptions {
  readonly database?: string;
  /** One scope-bound native file per logical database; no source fact copies. */
  readonly databaseDirectory?: string;
  readonly threads?: number;
  readonly memoryLimit?: string;
  readonly maxTempDirectorySize?: string;
  readonly tempDirectory?: string;
  /** Directory containing the paired CPP build manifests, extensions and addons. */
  readonly nativeArtifactsDirectory?: string;
  /** Development invocation guard, not a production latency SLA. */
  readonly queryTimeoutMs?: number;
  readonly recursionMode?: "legacy" | "depth-set" | "keyed-set";
}
export interface DuckDBClient {
  readonly close: () => Promise<void>;
}
interface Entry {
  readonly scope: string;
  readonly settings: string;
  readonly ready: Promise<PublicDuckDBBackend>;
  references: number;
  closing?: Promise<void>;
}
const entries = new Map<string, Entry>();
const schema = readFile(new URL("./public-schema.sql", import.meta.url), "utf8");
export const readProjectionSchema = () => schema;

// SDK and interval reads share one real C++ instance/transaction queue for a
// scope-bound file. Leases copy no facts and close the owner after its final
// scoped consumer. Inspiration: archived ownership lifecycle, SOURCE-ADAPTATION
// and wiki/research.md. Concurrency/scale acceptance is still a separate gate.
export const acquireDuckDBBackend = async (
  options: DuckDBRuntimeOptions,
  scope: string,
  memoryIdentity: string,
): Promise<GranularBackend> => {
  if (options.database !== undefined && options.databaseDirectory !== undefined)
    throw new TypeError("Choose database or databaseDirectory");
  const database =
    options.databaseDirectory === undefined
      ? (options.database ?? ":memory:")
      : join(
          resolve(options.databaseDirectory),
          createHash("sha256").update(scope).digest("hex") + ".duckdb",
        );
  const key = database === ":memory:" ? "memory:" + memoryIdentity : resolve(database);
  const settings = JSON.stringify({
    threads: options.threads ?? 1,
    memoryLimit: options.memoryLimit ?? "128MB",
    maxTempDirectorySize: options.maxTempDirectorySize ?? "64MB",
    tempDirectory: options.tempDirectory ?? null,
    nativeArtifactsDirectory: options.nativeArtifactsDirectory ?? null,
  });
  let entry = entries.get(key);
  if (entry?.closing) {
    await entry.closing;
    return acquireDuckDBBackend(options, scope, memoryIdentity);
  }
  if (entry && (entry.scope !== scope || entry.settings !== settings))
    throw new TypeError("Concurrent DuckDB consumers must share scope and resource settings");
  if (!entry) {
    const ready = (async () => {
      if (database !== ":memory:") await mkdir(dirname(database), { recursive: true });
      const backend = new PublicDuckDBBackend(
        await NativeDuckDBPort.openWithOwner({ ...options, database }),
        scope,
      );
      try {
        await backend.initialize(await schema);
        return backend;
      } catch (primary) {
        try {
          await backend.close();
        } catch (cleanup) {
          throw new AggregateError([primary, cleanup], "DuckDB initialization and cleanup failed");
        }
        throw primary;
      }
    })();
    entry = { scope, settings, ready, references: 0 };
    entries.set(key, entry);
  }
  const held = entry;
  held.references++;
  let backend: PublicDuckDBBackend;
  try {
    backend = await held.ready;
  } catch (error) {
    if (--held.references === 0 && entries.get(key) === held) entries.delete(key);
    throw error;
  }
  let close: Promise<void> | undefined;
  return Object.freeze({
    initialize: async (projection: string) => {
      if (projection !== (await schema)) throw new TypeError("Unexpected DuckDB projection bytes");
    },
    withTransaction: <A>(work: (session: GranularSession) => Promise<A>, admission?: ReadQueueAdmissionOptions) =>
      backend.withTransaction(work, admission),
    read: <A>(work: (session: GranularSession) => Promise<A>) => backend.read(work),
    startTransaction: <A>(admission?: TransactionAdmissionOptions) => backend.startTransaction<A>(admission),
    close: () =>
      (close ??= (async () => {
        if (--held.references === 0) {
          held.closing = backend.close();
          try {
            await held.closing;
          } finally {
            if (entries.get(key) === held) entries.delete(key);
          }
        }
      })()),
  });
};

interface ClientState {
  readonly options: DuckDBRuntimeOptions;
  readonly identity: string;
  readonly leases: Map<string, Promise<GranularBackend>>;
  closed: boolean;
}
const clients = new WeakMap<DuckDBClient, ClientState>();
export const makeDuckDBClient = (
  directoryOrOptions: string | DuckDBRuntimeOptions,
  overrides: Omit<DuckDBRuntimeOptions, "database" | "databaseDirectory"> = {},
): DuckDBClient => {
  const state: ClientState = {
    options:
      typeof directoryOrOptions === "string"
        ? { ...overrides, databaseDirectory: directoryOrOptions }
        : directoryOrOptions,
    identity: randomUUID(),
    leases: new Map(),
    closed: false,
  };
  let closing: Promise<void> | undefined;
  const client: DuckDBClient = Object.freeze({
    close: () =>
      (closing ??= (async () => {
        state.closed = true;
        const results = await Promise.allSettled(
          [...state.leases.values()].map(async (lease) => (await lease).close()),
        );
        const failures = results.filter(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        if (failures.length)
          throw new AggregateError(
            failures.map((result) => result.reason),
            "DuckDB client cleanup failed",
          );
      })()),
  });
  clients.set(client, state);
  return client;
};
export const withDuckDBClientBackend = async <A>(
  client: DuckDBClient,
  scope: string,
  work: (backend: GranularBackend) => Promise<A>,
): Promise<A> => {
  const state = clients.get(client);
  if (!state || state.closed) throw new TypeError("DuckDB client is closed or foreign");
  let lease = state.leases.get(scope);
  if (!lease) {
    lease = acquireDuckDBBackend(state.options, scope, state.identity);
    state.leases.set(scope, lease);
  }
  const backend = await lease;
  if (state.closed) throw new TypeError("DuckDB client closed before acquisition");
  return work(backend);
};
