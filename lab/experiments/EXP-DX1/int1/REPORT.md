All accounts will share one Datomic database.
The reader and gateways kept the same person-cache entries through 600,000 thin people and 40,000 deep people at fixed activity.
The last 10,000 deep people still added about 322 resident bytes each in the read gateway. We are measuring the heap and native memory behind that change.
The transactor kept adding memory after its object cache was nearly full. One deep account peaked at 2.55 GiB and loading ten peaked at 4.67 GiB on the server.
The next Mac run samples both Java heaps at three sizes while the same people stay active.
The writer, erasure safeguards, fallback reader and Publish priority are now on the shared branch. All six native runs passed 54,079 assertions each.
The pooled campaign has forecasts for all eight priorities. The small saved-output comparison is still due.
Lean storage still has open erasure and native query gaps. The campaign must keep those paths out of the judged run.

## One-database work

Pooled forecasts for the two population rungs and every bar through P8. [Forecasts](P5-PREDICTIONS.md) · [Bars](../../../TARGETS.md)

The fixed-activity census keeps three natural RSS samples at each population before requesting Java class histograms and Native Memory Tracking. The observer checks the target role, live PID and start time, challenge and image. The report reopens the compressed bytes and checks the totals, native pools, actual roster, pinned cut and unchanged admission counters. All Mac timings are diagnostic.

The transactor census uses a 840 MiB Java heap, a configured 192 MiB object cache and memory-index threshold/maximum of 8/32 MiB. The read gateway uses a 384 MiB heap, a 32 MiB peer cache, an 8 MiB row budget and a 1 MiB identity budget. Native committed bytes, live heap and OS residency have different denominators.

## Previous observations

| Role | Thin RSS MiB at 100,000 / 300,000 / 600,000 | Last B/person | Deep RSS MiB at 10,000 / 30,000 / 40,000 | Last B/person |
| --- | ---: | ---: | ---: | ---: |
| Reader | 140.68 / 140.68 / 140.68 | 0 | 140.88 / 140.88 / 141.00 | 13.1 |
| Read gateway | 310.07 / 325.21 / 324.18 | −3.6 | 314.78 / 326.00 / 329.07 | 321.5 |
| Write gateway | 325.52 / 322.20 / 324.68 | 8.7 | 329.18 / 337.62 / 327.12 | −1,100.6 |
| Transactor | 773.46 / 916.64 / 1,038.64 | 426.4 | 830.21 / 981.41 / 1,020.79 | 4,129.6 |
| PostgreSQL | 1,378.63 / 1,663.68 / 1,831.46 | 586.5 | 1,785.60 / 1,873.73 / 1,868.75 | −523.1 |
| Driver | 227.68 / 235.13 / 237.45 | 8.1 | 287.36 / 398.68 / 461.55 | 6,592.9 |

The earlier scope-cost study is complete. Its measured timing, thread counts and source bindings are preserved with the rest of part 4. [Evidence](P4-EVIDENCE.md) · [Checksums](P4-SHA256SUMS)

## Integration and campaign

The exact writer, erasure and Publish native builds each ran 27 tests with zero failures. The reader handoff changed only documentation and shared the erasure build. The SDK suite passed 426 tests with 52 opt-in tests skipped. Fourteen focused tests and the pooled TypeScript check passed. [Merge resolutions and evidence audit](P5-EVIDENCE.md) · [Checksums](P5-SHA256SUMS)

Run `bash lab/experiments/EXP-DX1/int1/everything.sh BATCH UTC_CUTOFF --overnight` for ten accounts of 10,000 people. Omit `--overnight` for both rungs. The current SCALE1 million-person image uses different entity identities and lean storage. Both rungs capture and reuse a compatible legacy seed for their matched arms. [Campaign and options](P5-EVIDENCE.md)
