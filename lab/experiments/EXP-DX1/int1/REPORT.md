The reader and gateways kept the same person-cache entries while thin imports grew to 600,000 people and the same 2,000 remained active.
From 300,000 to 600,000 people, the reader added zero resident bytes per person, the read gateway shrank slightly, and the write gateway added nine.
The transactor's cache was nearly full, while its memory still grew. The larger deep sweep is pending.
A running gateway opened its first deep record in 132–144 ms. Fresh stacks took 342–491 ms. Most of that difference was inside the gateway.
At 128 scopes the write gateway had 565 threads and the transactor had 1,097. The last 96 scopes added about four and eight threads each.
The first merged native path passed all 54,079 checks. The latest notice and reader tests passed and the refreshed native gates are queued.
The physical campaign uses two pairs at each deep size. The field-save tape uses measured per-account rates and the frozen tape keeps its original rules.
The thin sweep finished. Three campaign smokes stopped before the paired trace. The latest seeded all 40 people before SQLite refused the shared filesystem.

## Mac observations at fixed activity

| Role | Thin RSS MiB at 100,000 / 300,000 / 600,000 | Last interval B/person | Early deep RSS MiB at 2,650 / 5,102 / 7,554 / 10,000 | Last interval B/person |
| --- | ---: | ---: | ---: | ---: |
| Reader | 140.68 / 140.68 / 140.68 | 0 | 138 / 138 / 138 / 138 | 0 |
| Read gateway | 310.07 / 325.21 / 324.18 | −3.6 | 296 / 300 / 309 / 316 | 3,126 |
| Write gateway | 325.52 / 322.20 / 324.68 | 8.7 | 309 / 319 / 321 / 317 | −1,670 |
| Transactor | 773.46 / 916.64 / 1,038.64 | 426.4 | 712 / 729 / 825 / 864 | 17,015 |
| PostgreSQL | 1,378.63 / 1,663.68 / 1,831.46 | 586.5 | 1,240 / 1,623 / 1,712 / 1,771 | 25,025 |
| Driver | 227.68 / 235.13 / 237.45 | 8.1 | 234 / 244 / 254 / 281 | 11,635 |

The thin sweep on `cfec11ea1` held 2,000 touches fixed. Earlier deep snapshots on `d0a909ba4` held 100 fixed. Caps were 16 MiB per reader scope, 32 MiB per gateway peer and 8 MiB rows plus 1 MiB / 4,096 IDs per gateway scope. The transactor charged 180.42 of 181.19 MB at 600,000, against a configured 192 MiB object cache. Its 8/32 MiB index thresholds and 840 MiB heap ceiling did not establish an RSS plateau. PostgreSQL assigned all 96 MiB of shared buffers from 100,000 onward and summed RSS counts shared pages repeatedly. The thin reader and gateways met 64 B at the final interval. [Forecasts and refuters](PREDICTIONS.md)

## Mostly idle scopes

| Role | 1 scope MiB / threads | 8 scopes | 32 scopes | 128 scopes | Added MiB / threads per scope, 32→128 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Reader | 128.8 / 7 | 132.1 / 7 | 132.7 / 7 | 133.5 / 7 | 0.01 / 0 |
| Read gateway | 240.5 / 49 | 241.7 / 56 | 242.5 / 61 | 249.4 / 64 | 0.07 / 0.03 |
| Write gateway | 250.3 / 56 | 269.7 / 84 | 273.9 / 180 | 338.3 / 565 | 0.67 / 4.01 |
| Transactor | 279.6 / 76 | 306.4 / 132 | 352.0 / 326 | 516.4 / 1,097 | 1.71 / 8.03 |
| PostgreSQL | 234.2 / 15 | 238.9 / 15 | 265.9 / 16 | 318.2 / 18 | 0.54 / 0.02 |
| Driver | 118.6 / 7 | 124.7 / 7 | 133.1 / 7 | 173.8 / 7 | 0.42 / 0 |

Median cold creation time for each tranche was 688 / 238 / 155 / 120 ms. The first pinned read after at least 30 s idle took 200 / 105 / 100 / 80 ms. The following first save acknowledged in 127 / 33 / 18 / 11 ms and took 149 / 41 / 22 / 14 ms through exact feed verification. One idle scope was probed per rung.

The separate deep probes spent 307–445 ms inside a fresh read gateway and 92–113 ms in a peer that had already served another scope. The first user after a peer restart sees the larger range. After that setup, the prior deep sample measured 90.03 ms p99 over 100 cold records including both 34-task cases. The gateway retains each opened connection and feed watcher until deletion. The 128-scope PostgreSQL pool had 21.53 MiB assigned of 96 MiB. [Raw scope checks](P4-EVIDENCE.md)

## Integration and physical command

W1 kept loader timing and priority grants together with installed predecessor variants, prepared writes and service budgets. Its canonical malformed-row rejection is separate from explicitly typed write-policy refusals. HA kept the ordered deep seed witness, file import proof, strip-only snapshot types and both service metrics. ACT1 only conflicted on a field-tape type. The verified tape bytes stayed the same. STG1 keeps the durable notice census for generic source edits and the joined publisher's independently certified activation ranges. SCALE1's launcher remains shared with notice tests. The source cut, resolutions and native gate logs are indexed separately. [Integration evidence](P4-EVIDENCE.md)

From the prepared physical checkout run `bash lab/experiments/EXP-DX1/int1/everything.sh BATCH UTC_CUTOFF`. It verifies a small saved native pair for each tape before the full cases and shares the physical queue lock. The field tape offers 3.5/4.9 steady and 23.5/39.4 busy saves per second in one deep account. It preserves the task intents, duplicate and lost-response schedules and business fields, while reporting actual commanded widths. The frozen tape and contract remain byte-identical.

The campaign keeps the bounded readers and gateways, exact history range, predecessor reuse, compact rows and the sender and reader paths. Grouping, parallel preparation, coalescing and queue policies need proof under the combined schedule. The retained-journal and ordered-save candidates need combined history and feed checks. RD1's historical worker requires a separate reach replica. The plain wire gave the better first-read timing. Activation, bulk import and failover use separate workloads. [Forecasts](PREDICTIONS.md)

## Evidence audit

- The memory collector binds raw phase bytes and ledgers to the attempt, native image and live PIDs. It checks the original people and record positions, fixed admission and gateway counters, and exact first-read and first-save rows. The heap observer binds its challenge to the active slot. The retired-image receipt checks the configured image ID, live reservations and absence of its tag.
- The combined runner validates the armed scope, seed and trace. The collector reopens the native receipts, verifies the selected writer and joins each primary to its bound command. It independently checks the offered tape, sealed oracle input, slot, matched metrics, owned cleanup and producer bytes. A Mac fixture checks its recorded guest filesystem. Incomplete arms retain their output and prevent completion. Eligibility requires all frozen driver checks. The field collector reports separately from the frozen verdict.
- Prior full evidence is bound to the Part 3 report at `f06cd0a46`. Local resource observations are diagnostic. The thin sweep received a slot after the recorded contention. The deep census and the native campaign comparison still need results. [Prior checksums](GATEWAY-SHA256SUMS)
