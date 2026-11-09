# EXP-P2X2 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2/`.

[SHA256SUMS](SHA256SUMS) indexes 338 retained payload files
(282,539,738 logical bytes). Its own SHA256 is
`9733e569ecb43e2e936c96de79953179be84ff924901d516fce9fbce688a5adf`. Paths in the manifest are relative to the durable root.

Verify from that directory with `shasum -a 256 -c` and the absolute path to
the committed SHA256SUMS. The source/build worktrees and node_modules are
not individually indexed: original committed source is captured by the
three source archives; actual built public exports by the three
built-exports archives; Effect/postgres by dependency hash inventories.
The two adapted historical gate files are recorded by historical-gate.patch
and the report's old/new hashes. This is not a complete binary engine image
or a lossless backup of its deleted volume.

- `F1-*`, `F2-*`, `F3-*`: raw timings, metrics, original accounting failures.
- `bare-independent-audit-*`: fresh independent full-row audit of those arms.
- `F5-*`, `F6-*`: closed-loop service samples, exact-cut contents, builds and metrics.
- `history-*`: completed P2X 10k setup and interrupted A0 setup evidence.
- `F7-*`: unqualified calibration/trace attempts, offers, available ACK logs and failures.
- `aborted-*-audit-*`: recovered durable claims; these do not qualify aborted runs.
- `candidate-live-*`: real same-subject group-eight/parallel-subject/receipt checks.
- `G1-path-proof-*`: enabled/disabled G1 path witness.
- `p2x/runs/G1/` and `p2x/runs/objects/`: historical gate raw output and copied preimages.
- `source-objects/`: executed helper bytes named by SHA256 (also includes final helper revisions).
- `cleanup.json`, `engine-down.log`: owned container/volume removal and resident continuity proof.
- `heap-pressure-observation.json`: actual resource pressure before aborting the final trace.
- `final-tests.log`, `final-lint.log`: final offline checks, after measurement-only helper versions.

Large payloads remain outside git. Source/build worktrees and raw evidence
are retained for independent review. No qualified F7/F8/F9 comparison or
strict engine no-extra-wait gate is claimed.
