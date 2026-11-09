import { KvBackend, KvBackendService } from "./KvBackend.js";
import { Layer } from "effect";

//#region src/kv/kv/InMemoryKvBackend.d.ts
/** Layer that provides an in-memory KV backend. */
declare const InMemoryKvBackendLive: Layer.Layer<KvBackend>;
/** Create a fresh in-memory KV backend (useful for testing). */
declare const makeTestKvBackend: () => KvBackendService;
//#endregion
export { InMemoryKvBackendLive, makeTestKvBackend };
//# sourceMappingURL=InMemoryKvBackend.d.ts.map