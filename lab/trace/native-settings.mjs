// @ts-nocheck -- [DX-T1-4] Why: validate native wire records at this boundary; binding checks remain active. Rejected: trusting parsed JSON types.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Histogram } from "../bench/lib/hist.ts";

export const QUIET_LOGGERS = [
  "datomic.transaction",
  "datomic.kv-cluster",
  "datomic.peer",
  "datomic.update",
  "datomic.log",
];
// [DX-T1-4] Why: the bounded continuation can bracket one native-setting candidate with two fresh controls.
// Rejected: reusing an old control, duplicating a candidate as a fake repeat, or claiming a saving inside drift.
export function nativeBookendComparison(controls, candidates) {
  if (
    controls.length !== 2 ||
    ![1, 2].includes(candidates.length) ||
    [...controls, ...candidates].some((v) => !Number.isFinite(v) || v < 0)
  )
    throw Error("Invalid native comparison denominator");
  const baseline = (controls[0] + controls[1]) / 2;
  const candidate = candidates.reduce((a, b) => a + b, 0) / candidates.length;
  const benefit = baseline - candidate,
    drift = Math.abs(controls[1] - controls[0]);
  return {
    baseline,
    candidate,
    benefit,
    drift,
    candidateRuns: candidates.length,
    lowerBeyondBookendDrift: benefit > drift && Math.max(...candidates) < Math.min(...controls),
  };
}
// [DX-T1-4] Why: an affinity receipt must describe this attempt's running threads, not a copied placement log.
// Rejected: checking requested masks without source/slot/time and actual kernel readbacks.
export function validateNativeAffinity(rows, manifest, endedAt) {
  if (
    !Number.isFinite(manifest.startedAt) ||
    !Number.isFinite(endedAt) ||
    endedAt < manifest.startedAt
  )
    throw Error("Invalid affinity attempt clock");
  if (!rows.some((r) => r.thread === 0) || rows.filter((r) => r.thread !== 0).length < 4)
    throw Error("Native writer/worker affinity evidence absent");
  const expand = (s) =>
    s
      .split(",")
      .flatMap((p) => {
        const [a, b] = p.split("-").map(Number);
        return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i);
      })
      .sort((a, b) => a - b)
      .join(",");
  for (const r of rows) {
    if (
      r.run !== manifest.tag ||
      r.source !== manifest.source ||
      r.slot !== manifest.slot ||
      !Number.isFinite(r.at) ||
      r.at < manifest.startedAt ||
      r.at > endedAt ||
      !Number.isSafeInteger(r.pid) ||
      r.pid < 1
    )
      throw Error("Foreign/stale native affinity receipt");
    if (
      r.main !== "3" ||
      r.workers !== "4,5,6,7" ||
      expand(r.allowed) !== (r.thread === 0 ? "3" : "4,5,6,7") ||
      (r.background ?? []).some((b) => expand(b.allowed) !== "4,5,6,7")
    )
      throw Error("Native kernel affinity mismatch");
  }
  return true;
}
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
  if (!Number.isFinite(manifest.startedAt)) throw Error("Missing native attempt start");
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
// [DX-T1-4] Why: L256 gains must match fresh primary writer bytes, not a cached summary table.
// Rejected: accepting a reported percentile without its exact settled-window population and histogram rule.
export function validateNativeBands(bench, writes) {
  const phase = bench.phases.find((p) => p.name === "L256");
  if (
    !phase ||
    !Number.isFinite(phase.start) ||
    !Number.isFinite(phase.end) ||
    !Number.isFinite(bench.config.settleS)
  )
    throw Error("Missing L256 clock window");
  const selected = writes.filter(
    (w) => w.scheduledAt >= phase.start + 1000 * bench.config.settleS && w.scheduledAt < phase.end,
  );
  for (const [lo, hi, name] of [
    [5, 10, "5-10"],
    [11, 25, "11-25"],
    [26, 50, "26-50"],
  ]) {
    const histogram = new Histogram();
    for (const w of selected) {
      if (
        !Number.isSafeInteger(w.facts) ||
        w.facts < 5 ||
        w.facts > 50 ||
        !Number.isFinite(w.latencyMs) ||
        w.latencyMs < 0
      )
        throw Error("Invalid L256 writer content");
      if (w.facts >= lo && w.facts <= hi) histogram.recordMs(w.latencyMs);
    }
    for (const [key, value] of Object.entries(histogram.summary()))
      if (bench.priorities?.P2?.bandsAtL256?.[name]?.[key] !== value)
        throw Error("L256 summary differs from writer bytes");
  }
  return true;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  fs.writeFileSync(process.argv[3], quietLogback(fs.readFileSync(process.argv[2], "utf8")), {
    flag: "wx",
  });
