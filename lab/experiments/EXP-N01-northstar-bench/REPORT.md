# EXP-N01 north-star benchmark driver: report (saved by the orchestrator, 2026-11-08)

**Result: PROGRESSED.** The driver and NS gate are built to TARGETS v2 and Q31; no measured A0 numbers yet (no exclusive slot was free).
Branch `exp/N01-northstar-bench` at 6d2dda2, merged to main as 31ad7d1.

- `lab/bench/`: driver, reader worker threads, the frozen trace (TARGETS 2.1), world, valid-time model, a durable feed consumer with
  three crash points, histogram, an O-REPLAY sample check, README with the API for W01. Compositions: `public`, `public-queued` (XTDB
  `admissionQueue: true`), `memory` (in-process reference store for offline checks). `gate.mjs NS` with receipts binding the four
  assignments, generator hash and seed, oracle commit.
- Measured per priority: open-loop latency from the scheduled offer; P1 hot set, split reads that straddle existing trace commands (no added
  writes), writer latency against a separate zero-reader run (`--baseline`), route and language per read; P2 full accounting, queue depth
  over time, burst drain; P3 durable consumer with keyed effects; P4 weighted buckets and history grown in place on a matched 1,000-subject
  sample; P5 one shared basis, coverage hash, post-capture mutations.
- Receipts: G0 xtdb PASS 1,013 tests including 9 bench tests (`G0-xtdb-20261107T221614Z-286cfc`); NS-xtdb functional smokes FAIL on the
  shared xtdb-dev at 150-205% CPU (about 1.6 s per 10-fact commit, 0.3 commits/s); an offline `memory` run with 143,417 reads, 0
  violations, O-REPLAY checking 24 sampled reads (1,446 entity queries, 0 mismatches) (diagnostic: lab/runs/NS-dev-memory/).
- Incident: a 5,000-fact probe most likely OOM-killed xtdb-dev at 19:33:17Z.
- Findings: XTDB concurrent transacts in one runtime collide on the scope position CAS (`triplex-cas-conflict`; `public-queued` works
  around it; EXP-P2X targets the root cause). QLever with today's adapter: 0.7-1.5 s per commit, about 30 facts/s, a 2,000-fact command
  timed out, so seeding the 10k rung (about 380k facts) would take hours: seeding must use a bulk path rather than transacts.
- Seams that make their bars fail closed: P5 evaluate and outbox publish (W0 kernel), the P5 sweep overlapping compaction, forced
  maintenance (only read from engine logs), engine bytes read, QLever broker wait, O-DOMAIN affected sets, fallback routing in the
  one-engine composition.
