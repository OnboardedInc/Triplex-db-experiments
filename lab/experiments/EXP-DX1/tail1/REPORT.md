# DX-TAIL1
Tonight's server test saw a 170–179 ms deep p99 after startup, against 19 ms thin.
Forty-nine of the fifty slowest deep saves spent most of their time waiting for a reply outside their own transaction work.
The write gateway kept working during those waits. Its longest gap in the trace was 29 ms.
One deep save spent 151 ms reading from SQL. The three slowest saves were already waiting when that earlier write's reply arrived.
Each subject was written once. The sender and the read gateway account for none of the slowest saves.
A transactor pause could have contributed. Its log has minute totals, so individual waits remain unresolved.
All 7,092 receipts join to their original traces. [Rankings and method](OVERNIGHT.md)

North star P2 scheduled offer to durable ACK, including the 10 ms p50 and 50 ms p99 bars at the rated reader load, and P6 quiet-account p99 / alone p99 ≤1.25. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Archived run

The archive and its ledger match their published hashes. All 58,138 scheduled events, including 1,633 resends, match the frozen generator. A fresh database assigns new assertion IDs to the same logical predecessors. The replay retains the original valid times.

| JVM | Whole-process pauses | Young / mixed / full / other | Humongous triggers | p50 / p99 / max ms |
| --- | ---: | ---: | ---: | ---: |
| Write gateway | 1,464 | 1,424 / 0 / 40 / 0 | 0 | 5.55 / 104.51 / 454.27 |
| Read gateway | 198 | 82 / 42 / 0 / 74 | 16 | 25.23 / 131.77 / 169.25 |
| Transactor | 1,397 | 560 / 275 / 0 / 562 | 181 | 12.90 / 107.97 / 251.10 |

The writer clock fit puts 237 pauses outside known overlays, including eight full collections with a 449.37 ms maximum. The five history windows contain 27 pauses, including two full collections and a 454.27 ms maximum. Seven young pauses overlap other explicit index requests. The full collections report allocation failure. The archived reader and transactor totals span startup through shutdown.
The writer heap grew about 21.36 MiB/s between Serial pauses, or 2.21 MiB per primary offer across 55,795 covered offers. This estimate uses rounded heap occupancy and includes feed and maintenance traffic. Archived maximum heaps were 3.87/4/5 GiB for writer/reader/transactor in 6 GiB containers.
Archived ACK p50/p99/p99.9/max was 5.10/86.74/447.17/602.04 ms by exact rank, and 4.62/39.43/152.68/191.82 ms in the first 240 seconds. That prefix contains 58 writer pauses, including two full collections, and tops out at 154.05 ms. The analyst found `/begin` on 21,130 of 56,505 primary saves (37.4%).

## Collector arms

Serial is the archived write collector. Tuned G1 has a 25 ms target, 2 MiB regions, a 1 MiB humongous-object threshold and a 5–25% adaptive young generation. The Java 21 ZGC peer arm is diagnostic. Datomic documents ZGC support on Java 25 and recommends G1 at 50 ms for the transactor. Every arm uses that same transactor, SQL durability and role caps. [G1](https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-garbage-collector-tuning.html) · [Datomic defaults](https://docs.datomic.com/operation/transactor.html#running-the-transactor) · [Datomic ZGC support](https://docs.datomic.com/changes/pro.html#1-0-7705)

The allocation arm keeps Serial, decodes the positional row vector into a transient map and removes per-prefix Formatter allocation. Two-core G1 holds tuning fixed. Mac Serial was explicit. Both BM1 peers started on one core without a collector flag, so Serial is the expected choice even for the reader expanded after launch. The BM1 transactor specified G1. [Collector evidence and readback](COLLECTORS.md)

Mac Serial F retained 4,926 receipts in 240 s (20.53/s). Completed ACK p50/p99/p99.9/max was 2.14/29.81/30.25/32.20 s. All fifty slowest completed saves spent their largest interval queued before dispatch. Writer/reader/transactor logged 150/342/241 pauses with maximums of 338.54/502.65/227.88 ms. Rounded writer heap growth was 59.05 MiB/s and 2.55 MiB per covered ACK. Final analysis aborted on absent later phases. [Evidence manifest](SHA256SUMS)

## Receipt reuse

The TypeScript write adapter already skips `/begin` when every hinted live row is cached. The new opt-in keeps the deep fields eligible for that path only after a bound receipt settles. Known retirement evicts their cache entries. Datomic rechecks the exact live IDs at the serial point, and unsupported reads and conflicts use the existing snapshot path.

Sixteen native gateway tests and the protected-value erasure fixture passed. The eligible save used one request after a different writer committed. An intervening retirement sent the stale save through `/begin` and returned a typed conflict. All five pinned reads matched O-REPLAY. Mac Serial F averaged 1.30 gateway requests per completed save. The matched receipt delta is pending.

## Measurement audit

- The archive extractor checks the compressed SHA-256, ledger identity and each primary ACK. The replay checks the frozen source, population, offers and spacing, and checks the newly populated seed before releasing the driver.
- The replay binds its timing lock, reports and offers to source, slot and nonce. It checks collector and CPU count against the fresh JVM boot, exact receipt coverage and independent replay reads. PostgreSQL durability, ACK positions and resend receipts are checked. Resource samples bind the container IDs to their cleanup.
- The receipt oracle compares actual assertion IDs and values at five fresh pinned cuts against its hashed case, along with the observed conflict and receipt order. Captures are created in the newly allocated attempt directory.
- The archive results are historical. The replay is a diagnostic, and the acceptance contract is unchanged.
Image source pin changes under `packages/datomic/gateway/src/triplex/gateway/`, SHA-256 before → after.
- `lean.clj` `bafa5d00aaaf87321396674f16d6ffc03faa664100a75ce0024de7287ce58ca2` → `115812796134acf278ec30d71eabd9710fb121e7759475b28df97a43ed815fee`.
- `storage.clj` `341f45cf51ea1f785292b72eca34951d7fe10c9ace55e69af8fbe9df71234b60` → `144e4ecd3742f1323669e67ddaa14dfd3bd69e22b9366ac5d02bcad1bb2bff66`.

Pre-run ranges, the bounded server replay command and the two-core arm selector. [Forecasts](PREDICTIONS.md)
