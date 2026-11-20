// [DX-T1-12] Why: exact byte-tested candidates need separate live ablations before promotion on this short-disk host.
// Rejected: make a CPU microbenchmark's winner the benchmark default without a traced bookended comparison.
const names = new Set((process.env["TRIPLEX_DATOMIC_FAST_PATHS"] ?? "").split(",").filter(Boolean));
for (const name of names)
  if (!["pack", "row", "batch", "body", "history-range", "save-wire"].includes(name))
    throw Error(`Unknown Datomic fast path: ${name}`);
export const fastPathEnabled = (
  name: "pack" | "row" | "batch" | "body" | "history-range" | "save-wire",
) => names.has(name);
export const enabledFastPaths = () => [...names];
