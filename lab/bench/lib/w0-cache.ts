// [DX-H6] Why: Datomic's supported per-client byte budgets now bound both caches (DX-B6).
// Rejected: the benchmark-only session-reset wrapper, which bypasses the package's cache policy.
export const W0_CACHE_MAX_ENTITIES = 0;
if (Number(process.env.TX2_W0_CACHE_MAX_ENTITIES ?? "0") !== 0)
  throw Error("W0 entity-count wrapper retired; use Datomic package byte budgets");
