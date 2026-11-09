// [EXP-NSR-R3] Why: retain the compatibility API while deriving the graph from actual bundler resolution. Rejected: further pattern matching of constructor or require spellings.
import path from "node:path";
import { compileDriver } from "./compile.mjs";
export function checkImports(entry, root = path.resolve(import.meta.dirname, "../../..")) {
  const { code: _code, ...graph } = compileDriver(entry, root);
  return graph;
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename)
  console.log(
    JSON.stringify(checkImports(path.resolve(process.argv[2] ?? "lab/bench/ns-driver/driver.mjs"))),
  );
