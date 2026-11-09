# EXP-NSR round 2 evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round2/`.

`SHA256SUMS` binds 268 read-back files (7,950,747 bytes).
Verify from that root using `shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/nsr/lab/experiments/EXP-NSR/round2/SHA256SUMS`.

- `final-1.log`: changed host build; four source/refusal controls; copied reviewer probes; 12 passing NSR/P3M tests.
- `final-probes/`: fresh TCP runs and retained HR chunks, input keys and candidate captures; independent canonical recomputation rejects one unsampled loop-1 mutation; runtime loader refusal controls; copied bundle and graph.
- `final-nsr/`, `final-p3m/`: fresh parity/cap/canonical and planted-delay attempts, including their intentional failure-control receipts.
- `source-hashes.json`: tested source and host dist hashes, review provenance, and byte equality to the final probe bundle.
- `import-graph.json`: nine-file package-free closure at final source.
- `offline-1.log`, `probes/`, `nsr-1/`, `p3m-1/`, `host-1.log`: earlier passing controls before the final added target/sidecar test and host rebuild.

Exact review source probes/tests are copied beside this index as `review-probes.original.mjs` and `review-durability.original.ts`.
The runnable adapted probe is `lab/verify/NSR/probes.mjs`. See REPORT.md round 2 for the PASS audit and boundaries.
No actual Linux startup, full G0 rerun, release consumer, engine slot or NS qualification is claimed.
