// [DX-T1-12] Why: the measured compiler policy changes no workload, storage layout or durability setting. Rejected: a 5,000-write prefix with unfinished readbacks crossing its boundary.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
export function compilerPolicy(env, profile = "smoke") {
  const policy = env.DX_COMPILER_POLICY ?? (profile === "v3" ? "early" : "default");
  if (!["default", "early"].includes(policy)) throw Error("Unknown compiler policy");
  const values = {};
  if (policy === "early")
    for (const key of ["DX_TX_JAVA_OPTS", "DX_GW_WRITE_JAVA_OPTS", "DX_GW_READ_JAVA_OPTS"]) {
      const prior = env[key];
      if (typeof prior !== "string" || !prior)
        throw Error("Population JVM options must be resolved first");
      const existing = [...prior.matchAll(/(?:^|\s)-XX:CompileThresholdScaling=([^\s]+)/g)];
      if (existing.length > 1 || existing.some((m) => Number(m[1]) !== 0.1))
        throw Error("Compiler option conflicts with early policy");
      values[key] = existing.length ? prior : prior + " -XX:CompileThresholdScaling=0.1";
    }
  return {
    schema: "triplex.compiler-policy/1",
    policy,
    profile,
    oneTimeWarmupCommits: 0,
    env: { ...values, DX_COMPILER_POLICY: policy },
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const p = compilerPolicy(process.env, process.env.DX_NS_PROFILE ?? "smoke");
  if (process.argv.includes("--shell"))
    for (const [k, v] of Object.entries(p.env))
      console.log(`export ${k}='${v.replaceAll("'", "'\\''")}'`);
  else fs.writeFileSync(process.argv[2], JSON.stringify(p, null, 2) + "\n", { flag: "wx" });
}
