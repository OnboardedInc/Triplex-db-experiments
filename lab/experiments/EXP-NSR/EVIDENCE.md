# EXP-NSR evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/`.

`SHA256SUMS` binds 519 retained files (16,194,622 bytes), all read back after manifest creation.
Verify from that directory with `shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/nsr/lab/experiments/EXP-NSR/SHA256SUMS`.

- `g0-3.log`, `G0-qlever-20261109T073657Z-30e916.json`, `final-gate-summary.json`: final source-c194baf7 G0 PASS, 1220 tests, 71 expected skips, diagnostic only.
- `repository-runs/G0/`, `repository-runs/objects/`: raw outputs and copied content-addressed preimages; all 44 final receipt object references verified.
- `bundle-c194baf7/`, `bundle-c194baf7.json`: package-free evaluator bundle and source/generator hashes.
- `offline-2.log`, `attempt-2/`, `p3m-attempt-2/`: passing split parity and P3M fixture runs.
- `clock-flush-2.log`: two passing mocked Linux identity/refusal checks.
- `offline-1.log`, `clock-flush-1.log`, `g0-1.log`, `g0-2.log`: original failed attempts, retained with their original receipts and artifacts.
- `xtdb-build.log`: missing test-dependency build before final G0.
- `pack-1.log`, `pack/`: offline package-check failure on an unbuilt CLI tarball.
- `recovered-temp/`: test-owned temporary artifacts recovered from earlier G0 attempts.

See REPORT.md for the PASS audit, open integration work and unverified Linux/VM behavior. No evidence here is a qualified NS performance result.
