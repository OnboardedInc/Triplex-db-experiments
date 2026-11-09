# CX-A01-040 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-040`.

`SHA256SUMS` contains 772 exact files (19,263,943 bytes), re-read after index creation. Verify from the durable root with `shasum -a 256 -c <worktree>/lab/experiments/EXP-A01-acceptance-contract/evidence-0.4.0/SHA256SUMS`.

- `final-artifact-audit.json`: actual terminal results, source revision, contract hash, object counts and content/grant checks.
- `contract-final3/`: separate `--verify`, 13 contract tests and 34 mutations; 280 input hashes unchanged, actual heavy-owner snapshot, commands and raw outputs.
- `evaluator-attempt3.tap`: required 108-test evaluator on the final source commit.
- `focused-final-binding.json`, `focused-final-result.json`, `merge-check-attempt4.tap`: source-bound 60-test parser/reader/CHECKJS suite.
- `pack-final/triplex-pack-5tkCq5/`: final 12-package gate receipt, command records/logs, tarballs, consumer inputs and CLI results.
- `gates/`: retained raw G0 directories, content-addressed objects and receipts, including first failures. Original relative paths are preserved beneath this directory.
- Earlier attempts, static diagnostics, aborted optional mutation source and queue-only pack log remain distinct; no earlier failure was relabeled.
- Collector `.py` files are exact local collector preimages. They require their stated source checkout and retained data, and make no engine/acceptance qualification claim.

Installed dependencies and package-manager caches remain in the durable attempt directories but are excluded from this evidence manifest. Lockfiles, source hashes, command logs and tarball hashes are included. No raw evidence was removed from the worktree.
