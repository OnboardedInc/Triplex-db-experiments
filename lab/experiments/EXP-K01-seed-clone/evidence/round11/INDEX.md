# Round 11 offline evidence

`run.json` binds 47 runtime/test/handoff sources and the five executed suites; logs retain all 414 tests and TypeScript. `upstream-source.json` records clean pinned XTDB source hashes and numbered excerpts. `probe-offline.json` records evaluation of the actual revised handoff assertion with captured/source-derived union sets, reproduces the old assertion failure, and records syntax checking without live execution. `changed-paths.json` records parent/new hashes and the current main acceptance reference scan.

`RAW-SHA256SUMS` identifies 4 raw reviewer case files (1426573 bytes), retained only at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round11/attempt-1/`. Run `shasum -a 256 -c RAW-SHA256SUMS` from this directory. No raw directory is committed. The new fixtures point to the unchanged committed `evidence/live-round10/wire.log`; round-10 artifacts are not overwritten.
