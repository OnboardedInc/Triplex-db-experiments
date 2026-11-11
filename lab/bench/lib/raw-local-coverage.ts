// [DX-R3] Why: a ladder level must certify actual local payloads against the gateway in this run.
// Rejected: a global sample budget that can be exhausted by fallback reads or earlier levels.
export function rawLocalCoverage(
  phases: readonly { idx: number; name: string; readers: number }[],
  samples: readonly any[],
  minimum = 1,
) {
  return phases
    .filter((p) => p.readers > 0 && /^L[0-9]+$/.test(p.name))
    .map((p) => {
      const selected = samples.filter((s) => s.phase === p.idx && s.route === "replica");
      const compared = selected.filter(
        (s) => typeof s.fullCanonical === "string" && s.fullCanonical === s.gatewayCanonical,
      ).length;
      return {
        phase: p.name,
        minimum,
        samples: selected.length,
        compared,
        ok: compared >= minimum && compared === selected.length,
      };
    });
}
