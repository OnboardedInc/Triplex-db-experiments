import fs from "node:fs";
import path from "node:path";
import { filesUnder, records } from "./report.mjs";
// [DX-T1-13] Why: routine reports expose quiet callback hits and actual processor adoption boundaries from this attempt.
// Rejected: interpreting absent telemetry as zero misses/adoptions or index-job completion as adoption.
export function nativeCounterSummary(manifest, rows) {
  let requests = 0,
    hits = 0,
    intervals = 0,
    unsupported = 0;
  const adoptions = [],
    states = [];
  for (const r of rows) {
    if (
      r.run !== manifest.tag ||
      r.slot !== manifest.slot ||
      r.source !== manifest.source ||
      r.process !== "tx"
    )
      throw Error("Foreign native counter");
    const at = r.start ?? r.at;
    if (!Number.isFinite(at) || at < manifest.startedAt - 1000) throw Error("Stale native counter");
    if (r.type === "metrics" || r.type === "native-counter-state") {
      const c = r.counters?.objectCache,
        s = r.counters?.indexAdoptions;
      if (s) states.push(s);
      if (
        r.type === "metrics" &&
        c &&
        [c.requests, c.hits, c.misses, c.hitRate].every(Number.isFinite) &&
        c.requests > 0 &&
        c.hits >= 0 &&
        c.hits <= c.requests &&
        c.misses === c.requests - c.hits &&
        Math.abs(c.hitRate - c.hits / c.requests) < 1e-12
      ) {
        requests += c.requests;
        hits += c.hits;
        intervals++;
      } else if (r.type === "metrics") unsupported++;
    } else if (r.type === "index-adoption") {
      if (
        !Number.isFinite(r.end) ||
        r.end < r.start ||
        !Number.isSafeInteger(r.thread) ||
        !/^[0-9a-f]{64}$/.test(r.databaseHash ?? "") ||
        typeof r.completed !== "boolean"
      )
        throw Error("Invalid adoption boundary");
      adoptions.push({
        databaseHash: r.databaseHash,
        start: r.start,
        end: r.end,
        durationMs: r.end - r.start,
        indexBasisBefore: r.indexBasisBefore,
        indexBasisAfter: r.indexBasisAfter,
        completed: r.completed,
        thread: r.thread,
      });
    }
  }
  return {
    schema: "triplex.native-counters/1",
    tag: manifest.tag,
    source: manifest.source,
    slot: manifest.slot,
    objectCache: {
      intervals,
      unsupportedIntervals: unsupported,
      requests: intervals ? requests : null,
      hits: intervals ? hits : null,
      misses: intervals ? requests - hits : null,
      hitRate: intervals ? hits / requests : null,
      scope: "callback intervals, process-wide including setup; no per-request attribution",
    },
    indexAdoptions: {
      observer: states.at(-1) ?? { status: "unavailable: no callback status" },
      observed: adoptions.length,
      events: adoptions,
      scope:
        "processor entry/return, including setup and all database hashes; missing observer status never means zero adoptions",
    },
  };
}
export async function buildNativeCounters(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "trace-run.json"), "utf8")),
    rows = [];
  for (const file of filesUnder(path.join(dir, "trace/raw")).filter(
    (f) => path.basename(f) === "tx.jsonl.gz",
  ))
    for await (const row of records(file))
      if (["metrics", "index-adoption", "native-counter-state"].includes(row.type)) rows.push(row);
  return nativeCounterSummary(manifest, rows);
}
export function nativeCountersMarkdown(c) {
  const cache = c.objectCache,
    a = c.indexAdoptions;
  return `\n## Quiet transactor counters\n\nObject-cache hit rate: ${cache.hitRate === null ? "unavailable" : (100 * cache.hitRate).toFixed(3) + "%"}; ${cache.hits ?? "unknown"}/${cache.requests ?? "unknown"} hits/requests over ${cache.intervals} callback intervals (${cache.unsupportedIntervals} empty/unsupported). ${cache.scope}.\n\nIndex observer: ${a.observer.status}; dropped events ${a.observer.dropped ?? "unknown"}; ${a.observed} observed processor adoption calls (including setup). Exact timestamps, basis changes and durations: NATIVE-COUNTERS.json. No vendor INFO logging enabled.\n`;
}
