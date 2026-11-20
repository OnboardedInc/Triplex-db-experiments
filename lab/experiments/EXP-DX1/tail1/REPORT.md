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

## Measurement audit

- The archive extractor checks the compressed SHA-256, ledger identity and each primary ACK. The replay checks the frozen source, population, offers and spacing, and checks the newly populated seed before releasing the driver.
- The Mac measurement requires the attempt's source, slot and nonce, PostgreSQL durability readback, all primary and resend offers, unique ACK positions, exact receipt coverage and a fresh independent replay check. It binds resource samples to the same four containers and records their cleanup.
- The archive results are historical. The replay is a diagnostic, and the acceptance contract is unchanged.
