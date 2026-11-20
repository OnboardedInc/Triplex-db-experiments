# Gateway memory study

The paths in [GATEWAY-SHA256SUMS](GATEWAY-SHA256SUMS) are relative to the durable `evidence/DX-THIN1/int1` directory. Set `SUMS` to the absolute path of the published manifest, then run `shasum -a 256 -c "$SUMS"` from that durable directory. The earlier integrated results have a separate [evidence index](EVIDENCE.md).

| Raw directory | Population and observations |
| --- | --- |
| `p3-demand-thin-b` | Matched 10,000-person bounded JVM profile with 200 first reads. |
| `p3-baseline-deep-a` | 2,000 deep people, 40 active. Both native gateway JVMs were sampled after the complete seed and again after all 40 reads and writes. |
| `p3-census-thin-b` | 100,000 thin people, 2,000 active. Includes all 1,000 cold timings, actual HTTP exchanges and an 8,000-read moving-set run at 128 KiB. |
| `p3-census-deep-b` | 10,000 deep people, 200 active. The four import samples retain unforced role RSS. All 100 measured cold reads have real HTTP timing and response sizes. |
| `p3-idle-b` | One idle scope followed by eight in the same processes. The phase source records an empty admitted set for each scope. |
| `p3-proof-c` | Native identity eviction, all 23 schedules, Python activation and pinned replay, eight accounts in two placements, and a separate 200-person deep first-read run including both 34-task people. |
| `p3-compressed-probe-a` | Fresh stack, same 200 deep people, native gzip verified on every actual response, independent probe replay and first-read timings. |
| `p3-seed-feed-deep-a` | Writer-only import of 2,000 deep people, 40 active. A third histogram follows the complete replay of the 376 original seed transactions and 320,826 facts. |
| `p3-following-deep-full`, `p3-following-thin-a` | Original following reader with 10,000 deep or 10,000 thin people and the same spread cohort. The live heap, committed V8 spaces, external buffers and charged index were sampled at fixed membership. |
| `p3-elastic-deep-a` | Same 2,000-person deep cohort, cache budgets and validated reads as the bounded G1 control. The JVM reported a generational Z heap. |
| `p3-proof-b` | The reader fingerprint changed between workers. The trial rejected the attempt before producing a result. The manager log records removal of its own volume. |
| `p3-demand-deep-b` | Matched 2,000-person bounded JVM profile with 40 first reads, including the first read to open the scope. |
| `p3-baseline-thin-a` | 10,000 thin people, 200 active. The same two phases ran on a separate reservation and fresh SQL volume. |

Each phase's compressed histogram contains every JVM class and the independent count and byte totals. The profile JSON carries the JVM start time, heap usage before collection, live weighted peer cache, histogram digest and heap-dump digest. The raw heap dump was deleted inside its slot. Shallow heap bytes and Datomic cache charge overlap. The phase file records scope, reader heap and external buffers, gateway ID and row-cache gauges, RSS, threads and SQL disk. Each first-read row identifies its subject, task class, observed rows, route, requests and duration. The original receipts, actor, record-time cut and Python replay are alongside each run.

The first instrumented runs include files captured between Git commits. Each `inputs.json` identifies the actual source and built JavaScript by digest. The content-addressed archives and indexes in `p3-sources` preserve the exact preimages. Inspecting the complete heap graph again requires a new managed run.

The full population arms also take four unforced samples during cold import. Each sample binds the durable count and position to its scope and slot. For a validated cold read, the raw latency row records the number and body bytes of actual HTTP responses, time to headers, worker time, and the gateway duration when supplied.

On the physical queue, the first wide case measures 200 previously unread deep people in a separate fresh scope after saving its wide measurements. Their source ordinals represent the 10,000-person distribution, with 20, 160, 6, 12 and 2 people with 4, 5, 10, 11 and 34 tasks. The collector recomputes membership, p50/p99, original receipt binding and Python replay. `inspect-profiles.ts DIR...` independently checks the measured JVM histogram totals, peer charges, process identities and cold-read samples.

At the original deep seed, both JVMs held exactly 27,889 live `datomic.db.Datum` objects (1,115,560 shallow bytes each). The read peer had zero parsed entity keys and no reach configuration. The write peer had one 96-byte reach configuration and one 72-byte empty ID-map object. After demand, the read peer had 1,477 parsed keys (59,080 shallow bytes), two configurations and two ID-map objects. The class histogram excludes their referents from those shallow sizes. The ID memo maps entity names to native IDs. Assertion-ID uniqueness comes from the durable history. Native storage pages can serve multiple people. The write role also served the driver's independent receipt-feed checks during import.

The optional managed `DX_INT1_PEER_GC=elastic` comparison keeps the peer cache, row and session budgets identical and uses a 96 MiB soft heap target with generational ZGC. The default bounded profile uses G1. The JVM profile records the actual collector and charge.

At the deep seed, the write gateway used 396.6 MiB RSS with ZGC and 311.4 MiB with G1. Its native cache charged 29.871 MB and 30.173 MB respectively. Median cold-read latency was 20.17 vs 12.08 ms in these 40-person samples. `DX_INT1_PEER_HEAP=128m` separately caps the G1 heap. Its profile checker measures the reserved address range of each live JVM.

The diagnostic `DX_INT1_SEED_FEED=after-sampling` stores an ordered change digest from the issued operations and their assigned IDs. It measures a writer-only seed first and then reads and verifies every original feed position. A third sample measures the same JVMs after that replay with no intervening writes. The histogram checker requires the original attempt, scope, full seed fact count and matching feed proof. The default full-population comparisons run the feed verifier during import.

| Population and policy | Stage | Read ID / rows / native / live MB | Write ID / rows / native / live MB |
| --- | --- | ---: | ---: |
| 10,000 thin, original | Seed only | 0.000 / 0.000 / 5.398 / 41.822 | 0.000 / 0.000 / 15.041 / 48.870 |
| 10,000 thin, original | 2% touched | 0.154 / 3.473 / 20.432 / 54.045 | 0.000 / 0.000 / 18.024 / 51.287 |
| 10,000 thin, bounded | Seed only | 0.000 / 0.000 / 0.063 / 34.506 | 0.000 / 0.000 / 29.845 / 58.001 |
| 10,000 thin, bounded | 2% touched | 0.154 / 3.528 / 22.375 / 50.553 | 0.000 / 0.000 / 28.901 / 54.295 |
| 2,000 deep, original | Seed only | 0.000 / 0.000 / 20.040 / 63.570 | 0.000 / 0.000 / 58.117 / 91.392 |
| 2,000 deep, original | 2% touched | 0.274 / 9.212 / 44.977 / 82.509 | 0.000 / 0.000 / 58.142 / 91.619 |
| 2,000 deep, bounded | Seed only | 0.000 / 0.000 / 0.063 / 34.487 | 0.000 / 0.000 / 30.173 / 58.763 |
| 2,000 deep, bounded | 2% touched | 0.274 / 7.102 / 28.639 / 55.089 | 0.000 / 0.000 / 29.697 / 59.056 |

ID counts the positive entity-name memo. Rows includes parsed rows, revisions and recent entries. Native is the Datomic object-cache weight. Live is the sum of the JVM class histogram. The live total includes objects in the other columns. The bounded read peer started both populations at the same 63 KB. The bounded write peer reached 29.845 MB in the thin seed and 30.173 MB in the deep seed.

## Where observations become evidence

| Check | Content, freshness and binding |
| --- | --- |
| `DatomicClient.readDemandWorld`, `reachResponse` and `validatedSubjectReader.pull` | Check the returned closure, active row positions and immutable revisions at the requested database and cut. A repair must identify the original native transaction. The two halves of a pinned split must have equal rows. |
| `Account.issue`, `verifySeedFeed` and `verify` | Compare the issued operations and assigned assertion IDs with the actual transaction, command, instant and feed changes. The deferred seal covers all seed positions and facts. Reads compare every original row at the requested position. |
| `trial.replay`, `activate`, `regularDeepProof` and `placementProof` | Rebuild the Python input from that attempt's ledger. Check the returned case binding, exact rows and guard states, complete roster, cutoff and original source position. The ordinary publisher also checks a neighboring tenant. |
| `checkSchedules`, `proveEvictedIdentities` and `deepColdProbe` | The native schedule transcript must contain every named outcome. The identity probe verifies both live evictions, three actual error codes, the pinned data and unchanged heads on distinct commands. The deep probe uses a fresh scope, validates every returned world, and records every first read. |
| `thin1/managed.ts`, `nativeMetrics`, `gatewayProfiles` and `cache-charge.ts` | Match the image, source and codec, current slot owner, nonce, fresh role challenge, PID and process start. Reconcile the complete histogram to JVM totals. Traverse the observed heap's Datomic weigher and retain its digest. |
| `inspectProfiles`, `coldReadProfiler`, `mappedReaderPages` and `summarize.ts` | Reopen the raw histograms, process evidence and independent seed ledger. Bind the live gateway and child identities to the same input. Recompute the membership, original wire samples, counters and percentiles. Optional map accounting requires one complete set of kernel counters per mapping. |
| `control.ts`, `thin1/queue-bench.ts`, `verifyCase`, `verifyPages`, `verifyLatencies` and `verifyDeepColdProbe` | Check the published tree and actual compiled files, physical placement, native inputs, case nonce, complete page/member receipts, original account intents, Python replay and each selected source world. Recompute both latency quantiles, the wire treatment and the cross-placement output comparison. |
