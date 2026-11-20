# DX-TAIL1
The write gateway stopped for garbage collection in all fifty of the slowest saves in the original deep run.
Some stops happened during the benchmark's history work. Long stops also happened in ordinary traffic.
The original write gateway used Serial GC. The read gateway and transactor used G1.
The Mac replay checks the same offers in the same order with the same gaps.
The short run covers the first four minutes, including the first burst and 5,110 saves.
The full schedule takes 98.5 minutes at its original pace.
Fresh JVM measurements are pending.

North star P2 scheduled offer to durable ACK, including the 10 ms p50 and 50 ms p99 bars at the rated reader load, and P6 quiet-account p99 / alone p99 ≤1.25. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Archived run

The archive and its ledger match their published hashes. All 58,138 scheduled events, including 1,633 resends, match the frozen generator. A fresh database assigns new assertion IDs to the same logical predecessors. The replay retains the original valid times.

| JVM | Whole-process pauses | Young / mixed / full / other | p50 / p99 / max ms |
| --- | ---: | ---: | ---: |
| Write gateway | 1,464 | 1,424 / 0 / 40 / 0 | 5.55 / 104.51 / 454.27 |
| Read gateway | 198 | 45 / 79 / 0 / 74 | 25.23 / 131.77 / 169.25 |
| Transactor | 1,397 | 292 / 543 / 0 / 562 | 12.90 / 107.97 / 251.10 |

The analyst's writer clock fit puts 244 pauses in ordinary offer windows, including eight full collections with a 449.37 ms maximum pause. It puts 27 in the five P4 history windows, including two full collections and a 454.27 ms maximum. The archived log reports allocation failure on the ten full collections. That names a collector trigger. Attribution of the initiating allocation requires a fresh profile or an overlay control. Reader and transactor totals span startup through shutdown because their archived times lack the fitted anchor.

## Collector arms

Serial is the archived write collector. Tuned G1 has a 25 ms target, 2 MiB regions, a 1 MiB humongous-object threshold and a 5–25% adaptive young generation. The Java 21 ZGC peer arm is diagnostic. Datomic documents ZGC support on Java 25 and recommends G1 at 50 ms for the transactor. Every arm uses that same transactor, SQL durability and role caps. [G1](https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-garbage-collector-tuning.html) · [Datomic defaults](https://docs.datomic.com/operation/transactor.html#running-the-transactor) · [Datomic ZGC support](https://docs.datomic.com/changes/pro.html#1-0-7705)

The allocation arm keeps Serial and decodes the existing positional row vector into a transient map. It reuses the exact row wire format and removes per-prefix Formatter allocation. Speculative transaction hints stay off in these controls.

The first Mac launch found the Datomic tag missing and released its slot before seeding. The old image ID was also absent. The retry uses the existing SCALE1 build receipt and checks the running peer JAR against the distribution pin.

## Receipt reuse

The TypeScript write adapter already skips `/begin` when every hinted live row is cached. The new opt-in keeps the deep fields eligible for that path only after a bound receipt settles. Known retirement evicts their cache entries. Datomic rechecks the exact live IDs at the serial point, and unsupported reads and conflicts use the existing snapshot path.

Eleven focused tests and the Datomic type check passed. The native gate captures a save after an intervening writer, a rejected stale receipt and five pinned reads for O-REPLAY. It also runs the protected-value erasure fixture on the native stack. The native gate and request-count comparison are pending.

## Measurement audit

- The archive extractor checks the compressed SHA-256, ledger identity and each primary ACK. The replay checks the frozen source, population, offers and spacing, and checks the newly populated seed before releasing the driver.
- The Mac measurement requires the attempt's source, slot and nonce, PostgreSQL durability readback, all primary and resend offers, unique ACK positions, exact receipt coverage and a fresh independent replay check. It binds resource samples to the same four containers and records their cleanup.
- The receipt oracle compares actual assertion IDs and values at five fresh pinned cuts against its hashed case, along with the observed conflict and receipt order. Captures are created in the newly allocated attempt directory.
- The archive results are historical. The replay is a diagnostic, and the acceptance contract is unchanged.

Image source pin changes under `packages/datomic/gateway/src/triplex/gateway/`, SHA-256 before → after.

- `lean.clj` `bafa5d00aaaf87321396674f16d6ffc03faa664100a75ce0024de7287ce58ca2` → `115812796134acf278ec30d71eabd9710fb121e7759475b28df97a43ed815fee`.
- `storage.clj` `341f45cf51ea1f785292b72eca34951d7fe10c9ace55e69af8fbe9df71234b60` → `144e4ecd3742f1323669e67ddaa14dfd3bd69e22b9366ac5d02bcad1bb2bff66`.
