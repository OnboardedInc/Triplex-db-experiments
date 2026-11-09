# EXP-P5N round 2 status (paused)

Branch `exp/P5N-activation`. Round 2 predictions: `PREDICTIONS-R2.json` (committed before any measurement, `3f59de97`). Paused by the coordinator; nothing was running, no store is mid-write.

## Done

1. **Profile of the publish chain** (10k, W1, direct reads, V8 CPU profile plus the broker's per-frame events): `PROFILE-R2.txt`, raw profiles in `/Users/sam/Claude/Projects/triplex-db-2/evidence/P5N-R2/prof-w1-cpu/` (hashes in `PROFILE-R2-SHA256SUMS`), receipt `evidence/P5N-R2/prof-w1/`. The profiler inflates CPU about 1.5x; blocking waits are real.
   Per page on the owner thread: blocked on synchronous writer round trips 19.6 ms, of which the watermark publication after each commit is 8.99 ms (purgeFrames 6.18 ms, a second write transaction with fsync per commit once the 64 MiB tail is full; ack file 2.81 ms), head lookups for the compare-and-set 2.7 ms (64 round trips), operation lookup 1.2 ms. Harness verification 2.2 ms (map append 2.0 ms, canonical plus hash). The broker's own per-frame split: append round trip 16.2 ms (profiled), watermark 8.9 ms, frame payload 220 KB per page. The 14.4 ms per page of `canonicalPlain` in the profile is the post-sweep oracle calls (G2, G5), not the publish chain.
   Choice by the profile: the per-commit fixed costs (fsync 5 to 9 ms, ack, purge, lookups) are about 16 ms of the 44 ms, so (a) batch purge and head lookups now, then (b) D12 group commit of several pages per frame to amortize fsync and ack. Verification is the smaller term (about 4.6 ms with its readback), and its map hashing is CPU on the same thread, so moving it later gains little; group commit already amortizes its readback.
2. **Product changes, built and tested** (commit "perf(qlever): P5N R2 ..."): batched head lookups in the broker's compare-and-set (`heads` op); purge slack (`frameRetention.purgeEveryFrames` / `purgeEveryBytes`, default unchanged; the purge round trip is skipped when no tail is configured); split sweep reads (`split` option of the sweep reader: one short read transaction per chunk of entities, each at exactly the pinned basis, marker and epoch re-checked per transaction, gate entered per transaction); checkpoint tuning (`checkpoint: { walRestartBytes, restartEveryMs, restartMinBytes }` on the broker, default unchanged). qlever package: **298 passed, 29 skipped**, typecheck clean, 4 new tests in `packages/qlever/test/p5n-r2.test.ts` (split row set equals the single transaction and old-cut bytes survive a later retirement; batched heads still conflict on a stale head; purge slack bounds the tail; a RESTART completes under tuning when no reader holds a transaction).

## Half-done (code not written)

- **Harness side, nothing started:** (1) group commit of K pages per frame for the activation publisher (`publishRecordsGroup`: one batched outbox read for all pages in the group, concurrent `T.transact`, receipts sorted by native position, one `verifyGroup`), with K = 4 first and the writer hold per group recorded; (2) world hash from the sort keys already computed (saves about 0.3 ms per subject; needs a test that it equals `sha256(canonical(world))`); (3) the direct reader passing `split` (for example 128 entities) and the host passing `purgeEveryBytes` (about 4 MiB) and `checkpoint` (walRestartBytes about 24 MiB, restartEveryMs 3000) to `HostBroker.open`; (4) G-WORLD on **all** subjects (flag `--check-world all`: compare each subject's `worldSha256` with the owner route's world hash for every page; sha256 equality, 10,000 of 10,000); (5) G-P1 fields in the receipt: RESTART completions per 10 s window during the sweep and WAL max.
- **Round 2 measurements: none yet** beyond the profile. Not run: W4 and W8 at 10k on the round 2 code, the 1k fit, the 100k decision, 100k seed and activation, G-FP at 100k, the sweep-ratio arm (only if host load stays below about 8; it was 6 to 12 this session).

## Exact next step

1. Implement the harness items above on `host-store.ts`, `sweep.ts` and `p5-host-screen.ts` (flags `--split N`, `--group K`, `--check-world all`), `tsc -p lab/bench/tsconfig.json`, run `node --test lab/bench/test/p5n.test.ts` plus a new direct-route test with `split` and `group`.
2. At 10k, one heavy step at a time, from `evidence/P5N-R2/seed-10k` (an APFS clone of the sealed seed; never open it read-write): reference W4 and W8 on the current commit, then with purge and heads batching, then with group commit, then with split reads and tuning; record per-page publisher chain, WAL max and RESTART events each time.
3. Fit with a 1k run (`evidence/P5N-R1/seed-1k`), project 100k at W4 and W8 with +20% on the slope, seed 100k only if one projects at most 85 s.

## Evidence validity

| Path (under `/Users/sam/Claude/Projects/triplex-db-2/evidence/`) | Valid for |
| --- | --- |
| `P5N-R2/prof-w1`, `P5N-R2/prof-w1-cpu` | the profile (profiler overhead applies; wall 57 s is not a speed number) |
| `P5N-R2/qlever-test-r2a.log` | the 298-test qlever run on the round 2 product code |
| `P5N-R2/seed-10k` | an unopened APFS clone of the sealed 10k seed; arms clone from it |
| `P5N-R1/*` | round 1 receipts as reported in `REPORT.md`; the `*-failed-*` directories are harness-error runs, kept, not cited |

No receipt was cut short by the pause. The disposable arm clones under `P5N-R2/prof-w1/arms` can be deleted.
