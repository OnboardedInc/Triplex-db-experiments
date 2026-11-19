import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { sha256, canonical } from "../../../bench/lib/w0-world.ts";
export const headSha = () =>
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
export function sources(mode = process.env.DELTA_GATE ?? "schedules") {
  const here = import.meta.dirname,
    files = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(path.join(d, e.name)) : e.isFile() ? [path.join(d, e.name)] : [],
      );
  const names = [
    ...files(here).filter(
      (p) =>
        /\.(ts|py|mjs)$/.test(p) &&
        ([
          "account",
          "binding",
          "dispatch",
          "local",
          "lookup",
          "model",
          "native",
          "oracle",
          "pages",
          "reopen",
          "rules",
          "save",
          "secrets",
          "store",
          "schedules.test",
          ...(mode === "schedules"
            ? []
            : mode === "price"
              ? ["v3"]
              : ["audit", "deep", "traffic", "bench-rung", "v3"]),
        ].includes(path.basename(p).replace(/\.[^.]+$/, "")) ||
          path.basename(p) === mode + ".ts"),
    ),
    ...files("lab/bench/lib").filter((p) => p.endsWith(".ts")),
    ...files("lab/experiments/EXP-DX1/act1").filter((p) => p.endsWith(".ts")),
    ...files("packages/w0/dist").filter((p) => p.endsWith(".js")),
    "lab/bin/engine.mjs",
    "lab/oracles/domain/w0.py",
    "lab/oracles/domain/jsontok.py",
    "lab/bench/lib/composition.ts",
    "lab/bench/lib/deep-activation.ts",
    "lab/world/W0/releases/index.json",
  ];
  return Object.fromEntries(
    names.map((f) => [path.relative(process.cwd(), f), sha256(readFileSync(f))]).sort(),
  );
}
export const stamp = () => sha256(canonical(sources()));
