// @ts-nocheck -- [DX-T1-7] Why: heterogeneous recorded bytes are validated at this boundary. Rejected: unchecked source/slot/time or denominator assumptions.
import { observedRunEnd } from "./anatomy.mjs";

// [DX-T1-8] Why: the denominator must use this arm's actual CPU, heap, JVM and storage settings.
// Rejected: matching workload and source alone (a different runtime can manufacture a writer ratio).
export function stressRuntime({ manifest, traceStartAbsMs, containers, driver, properties, sourceHashes, writerHeap }) {
  if (!Number.isFinite(manifest.startedAt) || !Number.isFinite(traceStartAbsMs) || traceStartAbsMs <= manifest.startedAt)
    throw Error("Stress baseline runtime clock missing");
  const all = [...containers, ...driver];
  const roles = ["pg", "tx", "gw-w", "gw-r", "driver"];
  if (all.length !== roles.length) throw Error("Stress baseline runtime containers missing");
  const normalize = (s) => {
    let result = String(s).split(manifest.tag).join("{run}");
    for (const c of all) result = result.split(c.Id).join("{container:" + c.Name.slice(manifest.tag.length + 2) + "}");
    return result;
  };
  const runtime = roles.map((role) => {
    const c = all.find((c) => c.Name === "/" + manifest.tag + "-" + role);
    if (!c || !Number.isFinite(Date.parse(c.Created)) || Date.parse(c.Created) < manifest.startedAt || Date.parse(c.Created) > traceStartAbsMs || !/^[a-f0-9]{64}$/.test(c.Id) ||
        (role === "driver" ? c.State.Status !== "created" : !c.State.Running || !Number.isFinite(Date.parse(c.State.StartedAt)) || Date.parse(c.State.StartedAt) < manifest.startedAt || Date.parse(c.State.StartedAt) > traceStartAbsMs))
      throw Error("Stress baseline foreign/stale runtime readback");
    const h = c.HostConfig;
    return { role, image: c.Image,
      limits: Object.fromEntries(["Memory", "MemorySwap", "MemoryReservation", "CpuShares", "NanoCpus", "CpuPeriod", "CpuQuota", "CpusetCpus", "CpusetMems"].map((k) => [k, h[k]])),
      env: c.Config.Env.map(normalize).sort() };
  });
  return { runtime, properties: normalize(properties), sourceHashes, writerHeap: writerHeap ? { writer: writerHeap.writer, workers: writerHeap.workers, node: writerHeap.node, v8: writerHeap.v8 } : null };
}

export function validateStressRuntime(baseline, loaded) {
  if (JSON.stringify(baseline) !== JSON.stringify(loaded)) throw Error("Stress baseline runtime differs from loaded arm");
}

// [DX-T1-7] Why: stress ratios need the actual completed denominator from this source-frozen lease.
// Rejected: a copied ratio, matching tag alone, or a baseline from another attempt with similar percentiles.
export function validateStressBaseline({
  source,
  prefix,
  bench,
  manifest,
  baseline,
  baselineManifest,
  hash,
  baselinePath,
  candidate = false,
}) {
  if (
    baseline.status !== "DONE" ||
    !baseline.config.zeroReaders ||
    baseline.config.matchDurationS !== 450 ||
    baseline.writer.pendingAtEnd !== 0 ||
    baseline.writer.expired !== 0 ||
    baseline.correctness.errors !== 0 ||
    baseline.correctness.violations !== 0 ||
    baseline.trace.digest !== bench.trace.digest ||
    baselineManifest.tag !== prefix + (candidate ? "-candidate-zero" : "-zero") ||
    baselineManifest.slot !== baselineManifest.tag ||
    baselineManifest.source !== source ||
    baselineManifest.session !== prefix ||
    !Number.isFinite(baselineManifest.startedAt) ||
    observedRunEnd(baseline.endedAt) <= baselineManifest.startedAt ||
    observedRunEnd(baseline.endedAt) >= manifest.startedAt ||
    baseline.config.readerBasisWire !== bench.config.readerBasisWire ||
    baseline.config.expectedStateRetention !== bench.config.expectedStateRetention ||
    JSON.stringify(Object.entries(baseline.config).filter(([k]) => !["zeroReaders", "maxReaders", "baselineWrites"].includes(k))) !==
      JSON.stringify(Object.entries(bench.config).filter(([k]) => !["zeroReaders", "maxReaders", "baselineWrites"].includes(k))) ||
    bench.config.maxReaders !== 1024 ||
    bench.config.baselineWrites !== baselinePath ||
    !/^[a-f0-9]{64}$/.test(hash) ||
    bench.matchedBaseline?.sha256 !== hash ||
    JSON.stringify(baseline.benchSources) !== JSON.stringify(bench.benchSources)
  )
    throw Error("Stress baseline binding/content/freshness mismatch");
}
