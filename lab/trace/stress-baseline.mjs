import { observedRunEnd } from "./anatomy.mjs";

// [DX-T1-7] Why: stress ratios need the actual completed denominator from this source-frozen lease.
// Rejected: a copied ratio, matching tag alone, or a baseline from another attempt with similar percentiles.
export function validateStressBaseline({ source, prefix, bench, manifest, baseline, baselineManifest, hash, baselinePath }) {
  if (baseline.status !== "DONE" || !baseline.config.zeroReaders || baseline.config.matchDurationS !== 450 ||
      baseline.writer.pendingAtEnd !== 0 || baseline.writer.expired !== 0 ||
      baseline.correctness.errors !== 0 || baseline.correctness.violations !== 0 ||
      baseline.trace.digest !== bench.trace.digest || baselineManifest.tag !== prefix+"-zero" ||
      baselineManifest.slot !== baselineManifest.tag || baselineManifest.source !== source ||
      baselineManifest.session !== prefix || !Number.isFinite(baselineManifest.startedAt) ||
      observedRunEnd(baseline.endedAt) <= baselineManifest.startedAt ||
      observedRunEnd(baseline.endedAt) >= manifest.startedAt ||
      bench.config.maxReaders !== 1024 || bench.config.baselineWrites !== baselinePath ||
      !/^[a-f0-9]{64}$/.test(hash) || bench.matchedBaseline?.sha256 !== hash ||
      JSON.stringify(baseline.benchSources) !== JSON.stringify(bench.benchSources))
    throw Error("Stress baseline binding/content/freshness mismatch");
}
