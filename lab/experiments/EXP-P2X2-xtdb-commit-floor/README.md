# EXP-P2X2 harness

North star: P2. See [the report](../EXP-P2X2/REPORT.md) and the existing
[brief](../EXP-P2X2/BRIEF.md). The result is D1 under the preregistered rule;
the experiment program is partial. These helpers are research artifacts,
not a qualified runtime or a production admission gate.

`bare.mjs F1|F2|F3 N` measures one-row and R16-shaped commands. F3 emits one
socket write containing all statements. `service.mjs BUILD_ROOT C|A0 PHASE
SCOPE N` imports that build's public exports. `preload.mjs BUILD_ROOT C|A0
SCOPE` writes 10,000 public commits (C groups of eight; A0 setup groups of
64). `trace-run.mjs BUILD_ROOT SCOPE READERS SECONDS [C|A0]` offers the frozen
trace; candidate.mjs owns FIFO/grouping and duplicate resolution. The final
trace verification uses a bounded native fact pull for each returned tx;
full subject reads occur in the replay sample. It does not certify the
public SDK's no-extra-wait field, which this build does not expose.

All engine commands must use lab/bin/engine.mjs and holder CX-P2X2 on the
exclusive xtdb-s1 slot, pinned to CPUs 4,5. Every heavy command must run
through lab/bin/heavy.mjs; pnpm must pin the owned store. The helpers refuse
a different slot owner/profile. Never point them at a resident. Do not
reuse the retained experiment namespaces for a new measurement.

Run offline checks with:

```sh
node --test lab/experiments/EXP-P2X2-xtdb-commit-floor/analysis.test.mjs \
  lab/experiments/EXP-P2X2-xtdb-commit-floor/candidate.test.mjs
```

Before a new engine turn, review the failed trace attempts and heap
observations. A0 setup and all calibration rows remained in the same JVM;
no clean full-trace comparison was obtained. Do not interpret partial
latencies or reconstructed claims as passing trace gates. A new attempt
must bind a clean setup, exact builds, generator, slot and outcomes.

Large evidence is retained under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2/`.
The report's index and SHA256SUMS identify retained payloads. Measured
helper versions are in source-objects by their receipt hashes; the final
helper files contain additional offline-tested failure guards. The
historical P2X package source remains fb6681a4; only its gate/engine harness
was adapted, as recorded by historical-gate.patch and the report hashes.

Apply the retained zero-context historical harness diff from its original
fb6681a4 root with `git apply --unidiff-zero historical-gate.patch`.
