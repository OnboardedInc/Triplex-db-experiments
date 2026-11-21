import { VERSIONED } from "./world.ts";
// [DX-H7] Why: retain the trace and history writer's known predecessor fields independently of world rows.
// Rejected: retaining every fact in the writer's stamp budget (scope growth evicts cold subjects again).
export const NS_PREDECESSOR_ATTRIBUTES = [":placement/stamp", ":worker/address", ...VERSIONED];
// [DX-TAIL1] Why: the frozen deep workload replaces these immutable assertions by exact ID.
// Rejected: retaining every field read from deep history, including unrelated or protected values.
export const DEEP_RECEIPT_ATTRIBUTES = [
  ":task/progress",
  ":task/status",
  ":subtask/completedAt",
  ...Array.from({ length: 14 }, (_, index) => ":task/field-" + index),
  ...["proposal", "reconcile", "signal"].flatMap((family) =>
    ["sequence", "result", "input", "revision"].map((field) => ":" + family + "/" + field),
  ),
];
export const WRITER_PREDECESSOR_CACHE_MIB = 256;
// [DX-T1-12] Why: include 16 MiB entities, 8 MiB rows, 4 MiB reach keys and rounded scope-name overhead.
// Rejected: counting only reader caches against the load generator's 4 GiB cache ceiling.
export const WRITER_CACHE_BUDGET_MIB = WRITER_PREDECESSOR_CACHE_MIB + 29;
