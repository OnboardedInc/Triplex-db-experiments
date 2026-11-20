The reader and gateways kept the same person-cache entries throughout the thin and deep imports.
In the last 24,464 people of the earlier thin import, the read and write gateways added 14 and 25 resident bytes per person.
The smaller deep import still shows large changes in resident pages. Growth at the account sizes in the physical queue remains open.
A running gateway opened its first deep record in 132–144 ms. Fresh stacks took 342–491 ms. Most of that difference was inside the gateway.
At 128 scopes the write gateway had 565 threads and the transactor had 1,097. The last 96 scopes added about four and eight threads each.
The merged native path passed all 54,079 checks. Malformed rows and genuine write conflicts keep their expected error types.
The physical campaign uses two pairs at each deep size. The field-save tape uses measured per-account rates and the frozen tape keeps its original rules.
The larger population sweeps and the corrected campaign smoke are waiting for Mac capacity. Both archived smoke attempts stopped before driver readiness.

## Mac observations at fixed activity

| Role | Thin RSS MiB at 26,528 / 51,008 / 75,536 / 100,000 | Last interval B/person | Deep RSS MiB at 2,650 / 5,102 / 7,554 / 10,000 | Last interval B/person |
| --- | ---: | ---: | ---: | ---: |
| Reader | 168 / 168 / 168 / 168 | 0 | 138 / 138 / 138 / 138 | 0 |
| Read gateway | 294 / 296 / 304 / 304 | 14 | 296 / 300 / 309 / 316 | 3,126 |
| Write gateway | 308 / 318 / 320 / 321 | 25 | 309 / 319 / 321 / 317 | −1,670 |
| Transactor | 635 / 706 / 773 / 779 | 274 | 712 / 729 / 825 / 864 | 17,015 |
| PostgreSQL | 658 / 975 / 1,266 / 1,511 | 10,516 | 1,240 / 1,623 / 1,712 / 1,771 | 25,025 |
| Driver | 197 / 198 / 200 / 201 | 25 | 234 / 244 / 254 / 281 | 11,635 |

The four samples in each series come from `d0a909ba4`, before any remaining activity. The same 1,000 thin or 100 deep readers had opened their worlds, with the full 2% already seeded. Cache limits were 16 MiB in the reader per touched scope, 32 MiB of native peer cache per gateway, 8 MiB of gateway rows and 1 MiB / 4,096 IDs per scope. The transactor had an 8 MiB index threshold, 32 MiB index maximum, 192 MiB object cache and 840 MiB JVM heap ceiling. PostgreSQL shared buffers were 96 MiB. Summed PostgreSQL RSS can count each shared page several times. The thin gateways' last slopes were below 64 B per person. The deep slopes and the native resident plateau remain unverified at production sizes. The 100/150/200 thin pilot verified one fixed working set, PostgreSQL buffer accounting and managed cleanup. [Forecasts and refuters](PREDICTIONS.md)

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

The campaign keeps the bounded readers and gateways, exact history range, predecessor reuse at the verified scope, compact rows and the sender and reader paths in the merged branch. It excludes grouping, parallel preparation, coalescing and queue policies until the combined writer proves exact. The retained-journal and ordered-save candidates need their combined checks. The plain wire gave the better first-read timing. Activation, bulk import and failover use separate workloads. [Forecasts](PREDICTIONS.md)

## Evidence audit

- The memory collector binds raw phase bytes and ledgers to the attempt, native image and live PIDs. It checks the original people and record positions, fixed admission and gateway counters, and exact first-read and first-save rows. The heap observer binds its challenge to the active slot. The retired-image receipt checks the configured image ID, live reservations and absence of its tag.
- The combined runner validates the armed scope, original seed and trace and the observed native function on this attempt's actual receipts. The collector rederives the exact offered tape, verifies the sealed oracle files and slot input, reads both original ledgers, recomputes the matched metrics, checks owned cleanup and compares the archived bytes with the producer. An incomplete arm retains its raw output and prevents completion. Eligibility requires all frozen driver checks. Smoke requires zero receipt, read and oracle divergences. The field collector independently groups scheduled offers and actual ACKs by rate window and issues no frozen verdict.
- Prior full evidence is bound to the Part 3 report at `f06cd0a46`. Local resource observations are diagnostic. The Mac reserved all four heavy permits for another measurement through the recorded cutoff. The repaired smoke and larger census were still queued. [Prior checksums](GATEWAY-SHA256SUMS)
