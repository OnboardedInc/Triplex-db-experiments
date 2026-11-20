// [DX-T1-12] Why: exact byte-tested candidates need separate live ablations before promotion on this short-disk host.
// Rejected: make a CPU microbenchmark's winner the benchmark default without a traced bookended comparison.
const names = new Set((process.env["TRIPLEX_DATOMIC_FAST_PATHS"] ?? "").split(",").filter(Boolean));
const knownPaths = [
  "pack",
  "row",
  "batch",
  "body",
  "history-range",
  "demand-gzip",
  "fresh-texts",
  "save-wire",
] as const;
const knownNames = new Set<string>(knownPaths);
for (const name of names)
  if (!knownNames.has(name)) throw Error(`Unknown Datomic fast path: ${name}`);
export const fastPathEnabled = (name: (typeof knownPaths)[number]) => names.has(name);
export const enabledFastPaths = () => [...names];
