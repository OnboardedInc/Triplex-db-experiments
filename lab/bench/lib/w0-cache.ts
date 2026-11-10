import { randomUUID } from "node:crypto";
import { DatomicClient } from "../../../packages/datomic/dist/index.js";
// [DX-H5] Why: 8 independent live-reader caches exceeded the fixed 8 GiB client limit before activation.
// Rejected: raising memory, dropping readers, or clearing only local entries while the peer still sends references.
// Adaptation: use the client's existing session-reset mechanism at a smaller explicit entity budget.
export const W0_CACHE_MAX_ENTITIES = Number(process.env.TX2_W0_CACHE_MAX_ENTITIES ?? "0");
if (!Number.isSafeInteger(W0_CACHE_MAX_ENTITIES) || W0_CACHE_MAX_ENTITIES < 0)
  throw Error("invalid W0 cache entity budget");
if (W0_CACHE_MAX_ENTITIES > 0) {
  const original = DatomicClient.prototype.reachEntities;
  DatomicClient.prototype.reachEntities = function (...args: any[]) {
    const entries = [...this.reachCache.values()].reduce((n, cache) => n + cache.size, 0);
    if (entries > W0_CACHE_MAX_ENTITIES) {
      this.reachSession = randomUUID();
      this.reachCache.clear();
    }
    // Original decoding, revision/basis checks and full-response repair remain authoritative.
    return (original as any).apply(this, args);
  };
}
