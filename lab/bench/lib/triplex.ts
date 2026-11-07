/** Loads the built public Triplex packages (dist) for the bench driver.
 *
 * [EXP-N01] Why: lab/bench is not a workspace package, so bare specifiers do not resolve here. We import
 * the same dist files the gates hash (packages/<pkg>/dist) by file URL, and the lane runtime through the
 * qualification loader (`loadQualificationBackend`), which reads XTDB_URL / QLEVER_URL. `effect` resolves to
 * the one pnpm copy (root node_modules/effect and packages/core/node_modules/effect are the same realpath).
 * Rejected: adding lab/bench to the pnpm workspace (lockfile change); importing packages' src (unbuilt bytes).
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, ManagedRuntime } from "effect";

export const REPO = path.resolve(import.meta.dirname, "../../..");
const dist = (pkg: string, file: string) =>
  pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;

export const core: any = await import(dist("core", "index.js"));
export const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const qualification: any = await import(dist("qualification", "index.js"));
export { Effect };

export type Lane = "xtdb" | "qlever";

export interface TriplesHandle {
  readonly backend: { name: string; url: string; queryPath: string };
  readonly scope: unknown;
  readonly triples: any;
  run<A>(effect: any): Promise<A>;
  runExit(effect: any): Promise<any>;
  close(): Promise<void>;
}

/** One runtime opening on a named scope; `run` executes an Effect from the service. */
export async function openTriples(lane: Lane, scopeName: string): Promise<TriplesHandle> {
  process.env["TRIPLEX_QUERY_PATH"] ??= `${lane}-datalog`;
  const backend = await qualification.loadQualificationBackend(lane);
  const scope = runtimeApi.DatabaseScope.test(scopeName);
  const layer = backend.makeRuntime().layer({ scope, capabilities: runtimeApi.Capabilities.none });
  const managed: any = (ManagedRuntime as any).make(layer);
  const triples = await managed.runPromise(Effect.service(core.Triples));
  return {
    backend: { name: backend.name, url: backend.url, queryPath: backend.queryPath },
    scope,
    triples,
    run: (effect: any) => managed.runPromise(effect),
    runExit: (effect: any) => managed.runPromiseExit(effect),
    close: () => managed.dispose(),
  };
}
