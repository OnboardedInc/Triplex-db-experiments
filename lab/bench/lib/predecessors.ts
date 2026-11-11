import { VERSIONED } from "./world.ts";
// [DX-H7] Why: retain the trace and history writer's known predecessor fields independently of world rows.
// Rejected: retaining every fact in the writer's stamp budget (scope growth evicts cold subjects again).
export const NS_PREDECESSOR_ATTRIBUTES = [":placement/stamp", ":worker/address", ...VERSIONED];
export const WRITER_PREDECESSOR_CACHE_MIB = 256;
// [DX-H7] Why: include 128 MiB entities, 32 MiB rows, 32 MiB reach keys and rounded scope-name overhead.
// Rejected: counting only reader caches against the load generator's 4 GiB cache ceiling.
export const WRITER_CACHE_BUDGET_MIB = WRITER_PREDECESSOR_CACHE_MIB + 193;
