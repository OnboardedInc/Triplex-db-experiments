import assert from "node:assert/strict";

// [DX-HA2] Options for the time to the first protected save after a machine loss (policy B). Both are off unless set; with
// neither set every cold copy runs exactly as at `b03e806fd`. See RECOVERY-TIME.md.
//
//   TX2_HA2_COLD_CORES=<cpuset>  each cold copy and its SHA-256 check run on these cores (for example 0-11), and the
//                                PostgreSQL container is put back on its own placement once the server accepts connections.
//                                On a site without a placement (the Mac) the container's CPU quota is raised to the same
//                                number of cores instead.
//   TX2_HA2_COLD_PIPELINE=1      each copy worker checks a file's SHA-256 right after copying it, instead of copying every
//                                file first and re-reading all of them afterwards.
export type RecoveryOptions = { coldCores?: string; coldPipeline: boolean };

const cpuset = /^\d{1,3}(-\d{1,3})?(,\d{1,3}(-\d{1,3})?)*$/;

export function cpuCount(set: string) {
  assert.match(set, cpuset, "A cpuset such as 0-11 or 0,2,4-7");
  const cores = new Set<number>();
  for (const part of set.split(",")) {
    const [from, to = from] = part.split("-").map(Number) as [number, number?];
    assert(to! >= from, "Descending cpuset range " + part);
    for (let c = from; c <= to!; c++) cores.add(c);
  }
  return cores.size;
}

export function recoveryOptions(env: NodeJS.ProcessEnv = process.env): RecoveryOptions {
  const cores = env["TX2_HA2_COLD_CORES"];
  const pipeline = env["TX2_HA2_COLD_PIPELINE"] ?? "0";
  assert(pipeline === "0" || pipeline === "1", "TX2_HA2_COLD_PIPELINE must be 0 or 1");
  if (cores === undefined || cores === "") return { coldPipeline: pipeline === "1" };
  assert(cpuCount(cores) >= 2, "TX2_HA2_COLD_CORES must name at least two cores");
  return { coldCores: cores, coldPipeline: pipeline === "1" };
}

export const recoveryOptionsOn = (o: RecoveryOptions) => o.coldCores !== undefined || o.coldPipeline;
