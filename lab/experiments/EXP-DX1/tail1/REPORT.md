# DX-TAIL1
The write gateway stopped for garbage collection in all fifty of the slowest saves in the original deep run.
Some stops happened during the benchmark's history work. Long stops also happened in ordinary traffic.
The original write gateway used Serial GC. The read gateway and transactor used G1.
The Mac replay checks the same offers in the same order with the same gaps.
The short run covers the first four minutes, including the first burst and 5,110 saves.
The full schedule takes 98.5 minutes at its original pace.
One Mac attempt verified all 10,000 people and 1,604,464 seed facts. A denied host clock read stopped it before the first offer.

North star P2 scheduled offer to durable ACK, including the 10 ms p50 and 50 ms p99 bars at the rated reader load, and P6 quiet-account p99 / alone p99 ≤1.25. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Archived run

The archive and its ledger match their published hashes. All 58,138 scheduled events, including 1,633 resends, match the frozen generator. A fresh database assigns new assertion IDs to the same logical predecessors. The replay retains the original valid times.

| JVM | Whole-process pauses | Young / mixed / full / other | p50 / p99 / max ms |
| --- | ---: | ---: | ---: |
| Write gateway | 1,464 | 1,424 / 0 / 40 / 0 | 5.55 / 104.51 / 454.27 |
| Read gateway | 198 | 45 / 79 / 0 / 74 | 25.23 / 131.77 / 169.25 |
| Transactor | 1,397 | 292 / 543 / 0 / 562 | 12.90 / 107.97 / 251.10 |

The writer clock fit puts 237 pauses outside known overlays, including eight full collections with a 449.37 ms maximum. The five history windows contain 27 pauses, including two full collections and a 454.27 ms maximum. Seven young pauses overlap other explicit index requests. The full collections report allocation failure. The archived reader and transactor totals span startup through shutdown.
The writer heap grew about 21.36 MiB/s between Serial pauses, or 2.21 MiB per primary offer across 55,795 covered offers. This estimate uses rounded heap occupancy and includes feed and maintenance traffic. Archived maximum heaps were 3.87/4/5 GiB for writer/reader/transactor in 6 GiB containers.
Archived ACK p50/p99/p99.9/max was 5.10/86.74/447.17/602.04 ms by exact rank, and 4.62/39.43/152.68/191.82 ms in the first 240 seconds. The analyst found a `/begin` on 21,130 of 56,505 primary saves (37.4%).

## Collector arms

Serial is the archived write collector. Tuned G1 has a 25 ms target, 2 MiB regions, a 1 MiB humongous-object threshold and a 5–25% adaptive young generation. The Java 21 ZGC peer arm is diagnostic. Datomic documents ZGC support on Java 25 and recommends G1 at 50 ms for the transactor. Every arm uses that same transactor, SQL durability and role caps. [G1](https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-garbage-collector-tuning.html) · [Datomic defaults](https://docs.datomic.com/operation/transactor.html#running-the-transactor) · [Datomic ZGC support](https://docs.datomic.com/changes/pro.html#1-0-7705)

The allocation arm keeps Serial and decodes the existing positional row vector into a transient map. It reuses the exact row wire format and removes per-prefix Formatter allocation. Speculative transaction hints stay off in these controls.

The first Mac launch found the Datomic tag missing. The retained SCALE1 build passed image and peer JAR readback. Serial attempt C released its slot after the host clock error. The next attempt preflights that permission and gives the write peer 128 MiB more container headroom after C restarted once during seeding.

## Receipt reuse

The TypeScript write adapter already skips `/begin` when every hinted live row is cached. The new opt-in keeps the deep fields eligible for that path only after a bound receipt settles. Known retirement evicts their cache entries. Datomic rechecks the exact live IDs at the serial point, and unsupported reads and conflicts use the existing snapshot path.

Sixteen native gateway tests and the protected-value erasure fixture passed. The eligible save used one request after a different writer committed. An intervening retirement caused the stale save to retry through `/begin` and return a typed conflict. All five pinned reads matched O-REPLAY. Replay-wide request and latency deltas are pending.

## Measurement audit

- The archive extractor checks the compressed SHA-256, ledger identity and each primary ACK. The replay checks the frozen source, population, offers and spacing, and checks the newly populated seed before releasing the driver.
- The Mac measurement requires the attempt's source, slot and nonce, PostgreSQL durability readback, all primary and resend offers, unique ACK positions, exact receipt coverage and a fresh independent replay check. It binds resource samples to the same four containers and records their cleanup.
- The receipt oracle compares actual assertion IDs and values at five fresh pinned cuts against its hashed case, along with the observed conflict and receipt order. Captures are created in the newly allocated attempt directory.
- The archive results are historical. The replay is a diagnostic, and the acceptance contract is unchanged.
Image source pin changes under `packages/datomic/gateway/src/triplex/gateway/`, SHA-256 before → after.
- `lean.clj` `bafa5d00aaaf87321396674f16d6ffc03faa664100a75ce0024de7287ce58ca2` → `115812796134acf278ec30d71eabd9710fb121e7759475b28df97a43ed815fee`.
- `storage.clj` `341f45cf51ea1f785292b72eca34951d7fe10c9ace55e69af8fbe9df71234b60` → `144e4ecd3742f1323669e67ddaa14dfd3bd69e22b9366ac5d02bcad1bb2bff66`.

Pre-run ranges for all four arms and the bounded server replay command. [Forecasts](PREDICTIONS.md)
