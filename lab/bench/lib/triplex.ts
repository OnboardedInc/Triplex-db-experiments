/** Loads the built public Triplex packages (dist) for the bench driver.
 *
 * [EXP-N01] Why: lab/bench is not a workspace package, so bare specifiers do not resolve here. We import
 * the same dist files the gates hash (packages/<pkg>/dist) by file URL, and the lane runtime through the
 * qualification loader (`loadQualificationBackend`), which reads XTDB_URL / QLEVER_URL. `effect` resolves to
 * the one pnpm copy (root node_modules/effect and packages/core/node_modules/effect are the same realpath).
 * Rejected: adding lab/bench to the pnpm workspace (lockfile change); importing packages' src (unbuilt bytes).
 */
import path from "node:path";
import fs from "node:fs";
import { isMainThread, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import { Context, Effect, ManagedRuntime } from "effect";

export const REPO = path.resolve(import.meta.dirname, "../../..");
const dist = (pkg: string, file: string) =>
  pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;

export const core: any = await import(dist("core", "index.js"));
export const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const qualification: any = await import(dist("qualification", "index.js"));
export { Effect };

export type Lane = "xtdb" | "qlever" | "datomic";

export interface TriplesHandle {
  readonly backend: { name: string; url: string; queryPath: string };
  readonly scope: unknown;
  readonly triples: any;
  readonly storage?: any;
  run<A>(effect: any): Promise<A>;
  runExit(effect: any): Promise<any>;
  close(): Promise<void>;
}

/**
 * One runtime opening on a named scope; `run` executes an Effect from the service.
 * `xtdbOptions` (XTDB only) builds the runtime from the public `makeXtdbRuntime` export with explicit
 * adapter options (for example `admissionQueue: true`) instead of the qualification default.
 */
export async function openTriples(
  lane: Lane,
  scopeName: string,
  xtdbOptions?: Record<string, unknown>,
): Promise<TriplesHandle> {
  process.env["TRIPLEX_QUERY_PATH"] ??= `${lane}-datalog`;
  // [EXP-W02-R2] Why: D uses its own public runtime and endpoint even before the shared qualification registry merges. Rejected: routing an unknown lane through the X/Q default.
  const backend = lane === "datomic" ? await (async () => {
    // [DX-H1] Why: writer/feed stay on W; each reader thread selects a read peer. Rejected: one shared endpoint (CPU attribution).
    const readUrls = process.env["DATOMIC_READ_URLS"]?.split(",").map(s => s.trim()).filter(Boolean);
    const url = !isMainThread && readUrls?.length
      ? readUrls[Number(workerData?.worker ?? 0) % readUrls.length]
      : process.env["DATOMIC_URL"];
    if (!url) throw new Error("DATOMIC_URL is required for the Datomic GS lane");
    const api = await import(dist("datomic", "index.js"));
    if (typeof api.makeDatomicRuntime !== "function") throw Error("Datomic public runtime unavailable");
    return { name: lane, url, queryPath: "datomic-datalog", makeRuntime: () => api.makeDatomicRuntime({ url, ...(xtdbOptions && fs.readFileSync(path.join(REPO, "packages/datomic/dist/index.d.ts"), "utf8").includes("admissionQueue") ? xtdbOptions : {}) }) };
  })() : await qualification.loadQualificationBackend(lane);
  if (lane === "qlever" && process.env["QLEVER_COMMIT_PATH"] === "broker") {
    const api = await import(dist("qlever", "index.js"));
    if (typeof api.HostBroker !== "function") throw Error("QLever public package does not include the selected broker path");
  }
  const scope = runtimeApi.DatabaseScope.test(scopeName);
  let definition = backend.makeRuntime();
  if (xtdbOptions && lane === "xtdb") {
    const xtdb: any = await import(dist("xtdb", "index.js"));
    definition = xtdb.makeXtdbRuntime({ url: backend.url, ...xtdbOptions });
  }
  const clock = process.env["TX2_P5_CLOCK_START"];
  const layer = definition.layer({
    scope,
    // [DX-H1] Why: Runtime.layer exports only installed capability services; portable W0 helpers need its adapter.
    // Rejected: asking the finished runtime for a private service (Service not found before seed).
    capabilities: { build: Effect.map(Effect.service(runtimeApi.StorageAdapter), (adapter: any) => ({
      capabilities: [], services: Context.make(runtimeApi.StorageAdapter, adapter),
    })) },
    ...(clock === undefined ? {} : { deterministic: { startTime: Number(clock), seed: scope } }),
  });
  const managed: any = (ManagedRuntime as any).make(layer);
  const triples = await managed.runPromise(Effect.service(core.Triples));
  return {
    backend: { name: backend.name, url: backend.url, queryPath: backend.queryPath },
    scope,
    triples,
    storage: await managed.runPromise(Effect.service(runtimeApi.StorageAdapter)),
    run: (effect: any) => managed.runPromise(effect),
    runExit: (effect: any) => managed.runPromiseExit(effect),
    close: () => managed.dispose(),
  };
}
