import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { W0, canonical } from "./w0-world.ts";

// [DX-ACT1] Why: the frozen oracle validates release files against their content hashes on startup. Rejected: checking a custom release against the standard three-edit R2, or deriving expected bytes with the TS evaluator.
export function selectorOracle(parent: string, next: W0.CompiledRelease) {
  const dir = mkdtempSync(join(parent, "oracle-"));
  const scripts = join(dir, "bench/lib"), releases = join(dir, "world/W0/releases");
  mkdirSync(scripts, { recursive: true }); mkdirSync(releases, { recursive: true });
  symlinkSync(resolve("lab/oracles"), join(dir, "oracles"), "dir");
  const entry = join(scripts, "w0-oracle.py");
  copyFileSync("lab/bench/lib/w0-oracle.py", entry);
  const index = JSON.parse(readFileSync("lab/world/W0/releases/index.json", "utf8"));
  for (const name of ["R1", "R3"])
    copyFileSync("lab/world/W0/releases/" + name + ".json", join(releases, name + ".json"));
  writeFileSync(join(releases, "R2.json"), canonical(next.doc), { flag: "wx" });
  writeFileSync(join(releases, "index.json"), canonical({ ...index, R2: next.hash }), { flag: "wx" });
  return entry;
}
