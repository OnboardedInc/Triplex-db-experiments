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
          "index-patch",
          "index-overlay",
          "reopen",
          "recovery",
          "rules",
          "save",
          "secrets",
          "store",
          "schedules.test",
          "service",
          "save-queue",
          "measure-lock",
          "fence.test",
          "fence-abandon",
          "notify-contract.test",
          "delayed.test",
          "power",
          "erasure.test",
          "recovery.test",
          "activation-recovery.test",
          ...(mode === "schedules"
            ? []
            : mode === "price"
              ? ["v3", "physical-arms"]
              : [
                  "audit",
                  "screen",
                  "traffic",
                  "bench-rung",
                  "loaded",
                  "page-control",
                  ...([
                    "solo",
                    "deep-loaded",
                    "solo-check",
                    "preflight",
                    "audit-check",
                    "audit-loaded",
                  ].includes(mode)
                    ? [
                        "solo",
                        "solo-proof",
                        "solo-reference",
                        "reference-traffic",
                        "solo-population",
                        "solo-policy",
                        "audit-solo",
                        "audit-clock",
                        "audit-cold",
                        "audit-offers",
                        "audit-reader",
                        "audit-replay",
                        "deep-inputs",
                        "bm1-collector",
                      ]
                    : []),
                  "v3",
                  ...(mode === "rungs" ? [] : ["deep", "server", "preflight", "full.test"]),
                ]),
        ].includes(path.basename(p).replace(/\.[^.]+$/, "")) ||
          path.basename(p) === mode + ".ts"),
    ),
    ...files("lab/bench/lib").filter((p) => p.endsWith(".ts")),
    ...files("lab/experiments/EXP-DX1/act1").filter((p) => p.endsWith(".ts")),
    ...["w0", "core", "qualification", "datomic"].flatMap((pkg) =>
      files("packages/" + pkg + "/dist").filter((p) => p.endsWith(".js") || p.endsWith(".json")),
    ),
    ...files("packages/datomic/gateway/src").filter((p) => p.endsWith(".clj")),
    "pnpm-lock.yaml",
    "lab/bin/lib.mjs",
    "lab/bin/heavy.mjs",
    "lab/bin/heavy-lock.mjs",
    "lab/bin/engine.mjs",
    "lab/oracles/domain/w0.py",
    "lab/oracles/domain/population.py",
    "lab/oracles/domain/jsontok.py",
    "lab/bench/lib/composition.ts",
    "lab/bench/lib/deep-activation.ts",
    "lab/world/W0/releases/index.json",
    ...([
      "preflight",
      "server",
      "solo",
      "solo-check",
      "deep-loaded",
      "audit-check",
      "audit-loaded",
    ].includes(mode)
      ? [
          "actv-delta/solo-population.json",
          "bm1/activation_clock.py",
          "scale1/bench.ts",
          "scale1/tenants.ts",
          "scale1/tenant-traffic.ts",
          "scale1/tenant-windows.json",
          "scale1/tenant-traces.json",
          "scale1/tenant-seeds.json",
          "scale1/tenant-proof.ts",
          "scale1/small-plan.ts",
          "act2/rung.ts",
          "act2/preflight.ts",
          "act2/preflight-runner.ts",
        ].map((f) => "lab/experiments/EXP-DX1/" + f)
      : []),
  ];
  return Object.fromEntries(
    names.map((f) => [path.relative(process.cwd(), f), sha256(readFileSync(f))]).sort(),
  );
}
export const stamp = () => sha256(canonical(sources()));
