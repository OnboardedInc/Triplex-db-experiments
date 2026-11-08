# Contract 0.3.12 — CX-A01-0312

North star: correctness floor for P1–P5, following `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

Implementation: 37 literal pending rows compiled (Q72a-e/g, Q79e-f, Q80a-c, Q82a-e, Q83a-e, Q84a-e, Q85a-d, Q86a-f, Q87). Q78e and Q86g remain pending for Sam; Q51b, Q73a-b and Q81b-c also remain pending. The actual before/after row bytes are tested. G03 isolation requirements are compiled, but its execution/build pins remain null for 0.3.13.

O-OBS `23e2273fc6b15b92821b318acd387f5484155d8a` is merged in the same commit as its pin move (Q45a). V-O05 round 4 at `verify/O05` `3e3df9c` accepts it for **screening only**. Its standalone `observe.py` and the 29 files of its subprocess dependency O-REPLAY are all hashed in `lab/acceptance/pins/O-OBS-23e2273-SHA256SUMS`. O-REPLAY retains the independently accepted 0.4.9 `f195f30` pin; its files were not replaced by the older O05 branch's dependency tree. No oracle source was changed. Evaluator-supplied normalizers are independently pinned in the trusted context, not taken from candidate inputs.

The review record is retained verbatim as `lab/acceptance/pins/O-OBS-V-O05-round4.md`. The verifier commit has no separate BRIEF file: the registry transparently uses the existing review record containing its task and scope, with a note; no retrospective verifier brief was fabricated. This provenance limitation remains visible for the independent contract reviewer.

A screening-only pin blocks acceptance in both the Python reference admission model and the JavaScript evaluator. Hypothetical full-admission fixtures have explicit fixture-only authority; original evaluator assertion files are unchanged. Q83b/d/e supersede the old Q74b freeze interpretation: F, M and T are distinct, maintenance-only F < M needs stopped-tail proof, and resume binds to M. Observation protocols now name the trusted context/bundle, two-kind safety corroboration, exact ratios and canary controls; the protected-copy inventory includes observer outputs, old generations and freed blocks.

Validation is in progress. The initial ten contract checks and three JavaScript screening controls pass. Long gates are queued through `lab/bin/heavy.mjs`; final results and receipts will be appended before handoff. These are builder checks, not independent acceptance. No engine/container lifecycle, engine qualification, package installation, benchmark, root pnpm check, push or merge into main was performed.
