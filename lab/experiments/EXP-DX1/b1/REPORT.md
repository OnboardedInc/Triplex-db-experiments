# DX-B1 report

North star: P1/P4 subject pulls and P2 commits; targets are lab/TARGETS.md.

## M0

Implemented DATOMIC_BASE_URI with the requested default. Offline install reused 600 packages, downloaded zero. Built the Datomic dependency graph. Isolated container tx2-dxb1-dev, image tx2-datomic:1.0.7745-da00, CPUs 6/7, memory/swap 3g, port 8490, owned volume tx2-dxb1-data.

Baseline: 7 files, 135 tests passed, 1 failed (136). Existing failure: adapter.test.ts “preserves signed zero and int64 bounds and rejects noncanonical integers” raises InvalidTripleError for a value outside the declared Datomic domain. Not changed or chased.

Raw baseline and build logs: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B1/{baseline.log,build-baseline.log}. No acceptance or scorecard PASS claimed.
