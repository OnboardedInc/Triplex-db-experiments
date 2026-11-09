import { Triples } from "../../store/Triples.js";
import { KvBackend } from "../kv/KvBackend.js";
import { TripleStoreRuntime } from "../../store/TripleStoreRuntime.js";
import { Layer } from "effect";

//#region src/kv/layers/KvTriplesLive.d.ts
/**
 * Layer providing the merged `Triples` service backed by the KV hexastore.
 * Requires a `KvBackend` (in-memory, FoundationDB, Cloudflare, …) and a
 * `TripleStoreRuntime` (clock + id generation).
 */
declare const KvTriplesLive: Layer.Layer<Triples, never, KvBackend | TripleStoreRuntime>;
/**
 * Convenience namespace for wiring KV-backed `Triples`.
 */
declare const KvTriples: {
  /**
   * `Triples` over the KV hexastore, requiring only a `KvBackend` and
   * `TripleStoreRuntime`. Use this to reuse a real KV backend (e.g. FDB).
   */
  readonly layerBackend: Layer.Layer<Triples, never, KvBackend | TripleStoreRuntime>;
  /**
   * Fully self-contained in-memory `Triples` — bundles a **fresh** in-memory KV
   * backend and the default runtime. One line to a working store:
   *
   * ```ts
   * program.pipe(Effect.provide(KvTriples.layer))
   * ```
   *
   * Each instantiation gets its own isolated store (unlike the shared
   * `InMemoryKvBackendLive` singleton), which is what you want for tests and
   * ephemeral workloads.
   */
  readonly layer: Layer.Layer<Triples, never, never>; /** Fresh in-memory store with an explicit opaque-cursor scope identity. */
  readonly layerWithScope: (scope: string) => Layer.Layer<Triples, never, never>;
};
//#endregion
export { KvTriples, KvTriplesLive };
//# sourceMappingURL=KvTriplesLive.d.ts.map