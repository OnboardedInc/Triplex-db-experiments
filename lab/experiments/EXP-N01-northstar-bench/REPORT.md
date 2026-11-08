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

## A0 XTDB zero-reader run and the stopped 10k ladder (branch 7ed77c6, merged 49d726d; saved by the orchestrator 2026-11-08 01:52Z; the harness refused the agent's own REPORT.md write)
**Bottom line:** the default XTDB write path cannot carry the TARGETS 2.1 trace at 10k subjects even with no readers, so a reader ladder at
10k would show nothing about P1; the ladder was stopped before its driver started (it was still waiting on the heavy lock for its build;
no partial receipt), s1 was taken down with its volume and released.
- Receipt lab/runs/NS/NS-xtdb-20261108T001701Z-6f67e0.json, MEASURED; 10k rung, smoke profile, `public-queued`, exclusive s1.
  - Seed: 384,785 assertions (equals the closed form) in 2,282 s; about 400 falling to 170 facts/s as the scope grew.
  - P2: 112 of 15,617 background commands published; 17,965 offered commands expired unsent; 5-10 band p50 22 s, p99 45 s; steady queue
    6,707 commands; no burst drained. Read-your-own-write 110 of 112 correct, 2 errors.
  - P1, P4: no reads at zero readers; writer max wait 45 s; 0 correctness violations.
  - P3: 0 order violations, 0 visible duplicates, all 3 crash points fired with exact replay; lag p99 41.6 s.
- Feed gaps were a driver artifact: positions 1146-1160 are dense in the journal; the consumer's last checkpoint was 1148 because the
  driver fixed the feed target at 1146 while 32 commands still sat in XTDB's admission queue (t1 committed about 40 min after its offer:
  the 30 s deadline only stops a command from starting). Fixed in 7ed77c6: wind-down waits up to 300 s for in-flight commands; the target
  is the engine's current position; positions acknowledged after the consumer stops are `notReachedAtStop`, not gaps. The adapter's queue
  looks non-FIFO (likely, not confirmed).
- Probes on the idle seeded scope (about 770k rows; query text from packages/xtdb/src/XtdbStorageAdapter.ts):
  | Call | Time | What it sends |
  | --- | --- | --- |
  | entities() round trip | 1.3-2.3 s | `SELECT ... FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key=? AND entity_id IN (...) AND <cut> AND valid_from<=? AND (valid_to IS NULL OR valid_to>?)`; over all valid time, no sign of an entity_id index |
  | pull, 4 hops (120 facts) | 5.4 s | entities() per hop |
  | pull, 7 hops (142 / 1,187 facts) | 16.4 / 15.5 s | entities() per hop |
  | transactions(after 0, limit 1) | 13.5 s | `adapter.query({entityType:"_Transaction"})`: the whole journal, then position > after and the limit applied in JS (packages/core/src/store/TriplesLive.ts:650) |
  | transactions(after 1145, limit 100) | 21.2 s | the same full journal read |
  | 1-fact transact | 3.0 s | `ASSERT (SELECT COALESCE(MAX(position),0) FROM tx_meta FOR ALL VALID_TIME WHERE scope_key=?)=?`, then `ASSERT NOT EXISTS` on tx_attempts, tx_claims and tx_assertions `WHERE id IN (...)`, all over all valid time |
- Proposed rung for an informative A0 P1 ladder (estimate, not run): cost about 0.1 s fixed per commit plus about 3.8 µs per stored row;
  the trace needs about 2.1 commands/s, so at most about 0.25 s per commit, which allows about 40k rows; shared accounts take about 24k and
  each subject about 74. Result: about 300 subjects with the probe on, 500-900 with `--probe10-per-s 0`; recommendation `--subjects 500
  --probe10-per-s 0` (a development override), about +-2x. No rung drains a burst within 60 s (that needs about 35 ms per commit).
- QLever bulk seed for 10k is built (384,785 assertions, 24.55M quads, 150 MB gzipped) at runs/qlever-seed/ns-v2-10k/, not yet indexed:
  engine.mjs needs a build-index-from-seed step (`gunzip -c seed.nq.gz | qlever-index -f - -F nq`), then the gate runs with
  `--seed-manifest`.
