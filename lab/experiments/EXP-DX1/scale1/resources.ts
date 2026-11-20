import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
const counter = (body: string, name: string) =>
  Number(body.match(new RegExp(`^${name} (\\d+)$`, "m"))?.[1] ?? 0);
const bytes = (n: string, unit: string) => Number(n) * 1024 ** ({ K: 1, M: 2, G: 3 }[unit] ?? 0);
export async function resources(dir: string, prefix: string, source: string) {
  const file = path.join(dir, "resources.jsonl"),
    logs = path.join(dir, "engines", prefix, "trace/raw");
  const roles: Record<
    string,
    {
      n: number;
      maxBytes: number;
      maxCPUPercent: number;
      maxBusyThreeSamples: number;
      oomKills: number;
      highEvents: number;
      previousCPU: number;
      recent: number[];
    }
  > = {};
  let previousAt = 0,
    leastFree = Infinity,
    firstOom: null | { at: number; role: string } = null;
  if (fs.existsSync(file))
    for await (const line of createInterface({
      input: fs.createReadStream(file),
      crlfDelay: Infinity,
    })) {
      if (!line) continue;
      const row = JSON.parse(line);
      assert.equal(row.prefix, prefix);
      leastFree = Math.min(leastFree, row.freeBytes);
      for (const [role, o] of Object.entries(row.members) as [string, any][]) {
        const m = (roles[role] ??= {
            n: 0,
            maxBytes: 0,
            maxCPUPercent: 0,
            maxBusyThreeSamples: 0,
            oomKills: 0,
            highEvents: 0,
            previousCPU: 0,
            recent: [],
          }),
          cpu = counter(o.cpu, "usage_usec");
        if (previousAt && row.at > previousAt) {
          const load = (cpu - m.previousCPU) / ((row.at - previousAt) * 10);
          m.maxCPUPercent = Math.max(m.maxCPUPercent, load);
          m.recent.push(load);
          if (m.recent.length > 3) m.recent.shift();
          if (m.recent.length === 3)
            m.maxBusyThreeSamples = Math.max(m.maxBusyThreeSamples, Math.min(...m.recent));
        }
        m.n++;
        m.maxBytes = Math.max(m.maxBytes, o.peak);
        m.previousCPU = cpu;
        m.oomKills = counter(o.events, "oom_kill");
        m.highEvents = counter(o.events, "high");
        if (m.oomKills && !firstOom) firstOom = { at: row.at, role };
      }
      previousAt = row.at;
    }
  const jvms: Record<string, unknown> = {};
  for (const role of ["gw-w", "gw-r", "tx"]) {
    let collections = 0,
      heapBefore = 0,
      heapAfter = 0,
      heapCommitted = 0,
      requests = 0,
      hits = 0,
      callbacks = 0;
    const gc = path.join(logs, `${role}-gc.log`);
    if (fs.existsSync(gc))
      for await (const l of createInterface({ input: fs.createReadStream(gc) })) {
        const m = l.match(/\b(\d+)([KMG])->(\d+)([KMG])\((\d+)([KMG])\)/);
        if (!m) continue;
        collections++;
        heapBefore = Math.max(heapBefore, bytes(m[1]!, m[2]!));
        heapAfter = Math.max(heapAfter, bytes(m[3]!, m[4]!));
        heapCommitted = Math.max(heapCommitted, bytes(m[5]!, m[6]!));
      }
    const trace = path.join(logs, `${role}.jsonl`);
    if (fs.existsSync(trace))
      for await (const l of createInterface({ input: fs.createReadStream(trace) })) {
        if (!l.includes('"metrics"')) continue;
        const m = JSON.parse(l);
        if (m.type !== "metrics") continue;
        assert(m.run === prefix && m.slot === prefix && m.source === source);
        const c = m.counters?.objectCache;
        if (c && c.requests > 0) {
          assert(Number.isFinite(c.hits) && c.hits >= 0 && c.hits <= c.requests);
          requests += c.requests;
          hits += c.hits;
          callbacks++;
        }
      }
    jvms[role] = {
      gcEvents: collections,
      peakHeapBeforeGC: collections ? heapBefore : null,
      peakHeapAfterGC: collections ? heapAfter : null,
      largestCommittedHeap: collections ? heapCommitted : null,
      cacheCallbacks: callbacks,
      cacheRequests: requests || null,
      cacheHits: requests ? hits : null,
      cacheHitShare: requests ? hits / requests : null,
    };
  }
  return {
    firstObservedEngineOOM: firstOom,
    minimumFreeFilesystemBytes: Number.isFinite(leastFree) ? leastFree : null,
    engines: Object.fromEntries(
      Object.entries(roles).map(([k, { previousCPU, recent, ...metrics }]) => [k, metrics]),
    ),
    jvms,
  };
}
