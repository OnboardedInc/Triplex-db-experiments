# DX-B7 read gateway diagnostics

North star: P1 concurrent exact pinned reads, P2 isolated commits, P3 notification feed and P4 gateway efficiency.
Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; fast-forward protocol 0b.

All results are developer diagnostics. `gates.sh` is adapted from B6 with the same split-peer topology, bounded lock window,
source/build captures and cleanup, with JFR retained outside git. Use a fresh `tx2-dxb7-*` prefix and an immutable runner copy.
No engine container exists outside the measurement lock. Offline dependencies only.

`pull-load.mjs` retains B6's 2,000-subject seeded random/sequential workload. `B7_PHASES` supplies a JSON array of pattern/concurrency
pairs, `B7_DURATION_MS` defaults to 30,000 and `B7_WORKERS` defaults to 3. Worker event-loop utilisation is retained in every sample.
`B7_MIXED=1` adds three 60-second writer/feed phases: 1/s quiet, independent Poisson 15/s quiet, Poisson 15/s with 256 random readers.
The writer uses B6's representative command generator and keeps per-subject predecessor order. Feed delivery is bound by tx ID and
position to each ACK. Negative lag means delivery preceded ACK. Long polls use the public adapter.

Bulky evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7/`.
