import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const QUIET_LOGGERS = [
  "datomic.transaction",
  "datomic.kv-cluster",
  "datomic.peer",
  "datomic.update",
  "datomic.log",
];
// [DX-T1-4] Why: preserve the distribution's exact appenders and unrelated levels in a single-variable logging arm.
// Rejected: a replacement console appender (would confound logger levels with logging transport).
export function quietLogback(xml) {
  if ((xml.match(/<\/configuration>/g) ?? []).length !== 1)
    throw Error("Expected one Logback configuration");
  const active = xml.replace(/<!--[\s\S]*?-->/g, "");
  for (const name of QUIET_LOGGERS)
    if (active.includes(`name="${name}"`))
      throw Error("Vendor already overrides target logger " + name);
  return xml.replace(
    "</configuration>",
    QUIET_LOGGERS.map((name) => `  <logger name="${name}" level="WARN"/>`).join("\n") +
      "\n</configuration>",
  );
}
// [DX-T1-4] Why: a setting comparison needs content, startup freshness and the exact source/slot binding.
// Rejected: accepting requested environment variables as evidence that a running JVM loaded them.
export function validateNativeSettings({ manifest, rows, expected, properties }) {
  if (rows.length !== 3 || new Set(rows.map((r) => r.process)).size !== 3)
    throw Error("Missing/duplicate running JVM settings");
  const quiet = expected.DX_QUIET_LOGS === "1";
  for (const r of rows) {
    if (
      !["tx", "gw-w", "gw-r"].includes(r.process) ||
      r.type !== "native-settings" ||
      r.run !== manifest.tag ||
      r.slot !== manifest.slot ||
      r.source !== manifest.source ||
      !Number.isFinite(r.at) ||
      r.at < manifest.startedAt ||
      r.at > manifest.startedAt + 240000
    )
      throw Error("Foreign/stale running JVM settings");
    if (
      (r.configuration === "/dxh1/quiet-logback.xml") !== quiet ||
      QUIET_LOGGERS.some((name) => r.loggers?.[name] !== (quiet ? "WARN" : "INFO"))
    )
      throw Error("Running JVM logger level mismatch");
  }
  const props = Object.fromEntries(
    properties
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  for (const [name, value] of Object.entries({
    "encrypt-channel": expected.DX_ENCRYPT_CHANNEL,
    "memory-index-threshold": expected.DX_INDEX_THRESHOLD,
    "memory-index-max": expected.DX_INDEX_MAX,
    "object-cache-max": "1g",
  }))
    if (props[name] !== value) throw Error("Native property mismatch " + name);
  return true;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  fs.writeFileSync(process.argv[3], quietLogback(fs.readFileSync(process.argv[2], "utf8")), {
    flag: "wx",
  });
