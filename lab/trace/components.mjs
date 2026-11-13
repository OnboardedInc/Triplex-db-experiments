// @ts-nocheck -- Validated environment boundary; the lab binding checker checks references.
import { pathToFileURL } from "node:url";
import path from "node:path";

export const COMPONENTS = ["node", "gateway", "tx-jfr", "gw-jfr", "postgres", "native-logs"];
// [DX-T1-2] Why: an ablation changes exactly the named recorder; resource sampling remains common to controls.
// Rejected: one enabled flag that confounds spans, JVM profiling and SQL logging.
export function configuration(env = process.env) {
  const level = env.TRIPLEX_TRACE_LEVEL ?? "off";
  if (!["off", "summary", "full"].includes(level)) throw Error("Invalid trace level");
  const requested =
    env.TRIPLEX_TRACE_COMPONENTS === undefined
      ? level === "off"
        ? []
        : level === "summary"
          ? ["node", "gateway"]
          : COMPONENTS
      : env.TRIPLEX_TRACE_COMPONENTS.split(",").filter(Boolean);
  if (
    requested.some((c) => !COMPONENTS.includes(c)) ||
    new Set(requested).size !== requested.length
  )
    throw Error("Unknown or duplicate trace component");
  if (level === "off" && requested.length) throw Error("Off cannot enable a recorder");
  const components = [...requested].sort();
  const has = (name) => components.includes(name);
  const system = !!env.TRIPLEX_TRACE_SESSION || level !== "off";
  return {
    level,
    components,
    nodeEnabled: has("node"),
    gatewayEnabled: has("gateway"),
    requiredJfr: [...(has("tx-jfr") ? ["tx"] : []), ...(has("gw-jfr") ? ["gw-w", "gw-r"] : [])],
    requireSystem: system,
    requirePostgres: has("postgres"),
    session: env.TRIPLEX_TRACE_SESSION ?? null,
    queueExpected: has("node"),
    requireClockBinding: has("node") && has("gateway"),
    flags: Object.fromEntries(
      [
        ["NODE", has("node")],
        ["GATEWAY", has("gateway")],
        ["TX_JFR", has("tx-jfr")],
        ["GW_JFR", has("gw-jfr")],
        ["POSTGRES", has("postgres")],
        ["NATIVE_LOGS", has("native-logs")],
        ["SYSTEM", system],
      ].map(([key, value]) => [`TRIPLEX_TRACE_${key}`, value ? "1" : "0"]),
    ),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const cfg = configuration();
  if (process.argv.includes("--shell"))
    console.log(
      Object.entries(cfg.flags)
        .map(([k, v]) => `export ${k}=${v}`)
        .join("\n"),
    );
  else console.log(JSON.stringify(cfg));
}
