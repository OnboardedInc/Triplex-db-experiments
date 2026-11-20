The reader and gateways kept the same person-cache entries throughout the thin and deep imports.
In the last 24,464 people of the earlier thin import, the read and write gateways added 14 and 25 resident bytes per person.
The smaller deep import still shows large changes in resident pages. Growth at the account sizes in the physical queue remains open.
A running gateway opened its first deep record in 132–144 ms. Fresh stacks took 342–491 ms. Most of that difference was inside the gateway.
Seven extra idle scopes added no read-gateway threads. Each added four write-gateway threads and about eight transactor threads.
The malformed-row error now has its expected type. The W1, HA loader and joined Publish merges passed the canonical native gate.
The physical campaign uses two pairs at each deep size. The field-save tape uses measured per-account rates and the frozen tape keeps its original rules.
Grouping stays off because the review reproduced a wrong clock in a grouped change. Larger memory and saved-output checks are in progress.

## Mac observations at fixed activity

| Role | Thin RSS MiB at 26,528 / 51,008 / 75,536 / 100,000 | Last interval B/person | Deep RSS MiB at 2,650 / 5,102 / 7,554 / 10,000 | Last interval B/person |
| --- | ---: | ---: | ---: | ---: |
| Reader | 168 / 168 / 168 / 168 | 0 | 138 / 138 / 138 / 138 | 0 |
| Read gateway | 294 / 296 / 304 / 304 | 14 | 296 / 300 / 309 / 316 | 3,126 |
| Write gateway | 308 / 318 / 320 / 321 | 25 | 309 / 319 / 321 / 317 | −1,670 |
| Transactor | 635 / 706 / 773 / 779 | 274 | 712 / 729 / 825 / 864 | 17,015 |
| PostgreSQL | 658 / 975 / 1,266 / 1,511 | 10,516 | 1,240 / 1,623 / 1,712 / 1,771 | 25,025 |
| Driver | 197 / 198 / 200 / 201 | 25 | 234 / 244 / 254 / 281 | 11,635 |

The four samples in each series come from `d0a909ba4`, before any remaining activity. The same 1,000 thin or 100 deep readers had opened their worlds, with the full 2% already seeded. Cache limits were 16 MiB in the reader per touched scope, 32 MiB of native peer cache per gateway, 8 MiB of gateway rows and 1 MiB / 4,096 IDs per scope. The transactor had an 8 MiB index threshold, 32 MiB index maximum, 192 MiB object cache and 840 MiB JVM heap ceiling. PostgreSQL shared buffers were 96 MiB. Summed PostgreSQL RSS can count each shared page several times. These samples support a plateau for the thin gateway but leave the transactor's charged memory and the deep slopes open. [Forecasts and refuters](PREDICTIONS.md)

## Mostly idle scopes

| Role | 1 scope RSS MiB / threads | 8 scopes RSS MiB / threads |
| --- | ---: | ---: |
| Reader | 129 / 7 | 129 / 7 |
| Read gateway | 242 / 49 | 242 / 49 |
| Write gateway | 241 / 56 | 257 / 84 |
| Transactor | 281 / 75 | 290 / 134 |
| PostgreSQL | 235 / 17 | 239 / 17 |
| Driver | 117 / 7 | 118 / 7 |

The fresh stacks spent 307–445 ms inside the read gateway on their first request. The fresh databases in an already-serving stack spent 92–113 ms there. After startup the deep population p99 was 90.03 ms on 100 first reads including both 34-task records. A restart or newly serving peer exposes the larger startup cost. The comparisons used separate stacks. The gateway retains each opened native connection and its feed watcher until scope deletion. Per-scope row caps bound fact caches. [Gateway evidence](GATEWAY-EVIDENCE.md)

## Integration and physical command

W1 kept loader timing and priority grants together with installed predecessor variants, prepared writes and service budgets. Its canonical malformed-row rejection is separate from explicitly typed write-policy refusals. HA kept the ordered deep seed witness, file import proof, strip-only snapshot types and both service metrics. ACT1 only conflicted on a field-tape type. The verified tape bytes stayed the same. STG1 keeps the durable notice census for generic source edits and the joined publisher's independently certified activation ranges. SCALE1's launcher remains shared with notice tests. The source cut, resolutions and native gate logs are indexed separately. [Integration evidence](P4-EVIDENCE.md)

From the prepared physical checkout run `bash lab/experiments/EXP-DX1/int1/everything.sh BATCH UTC_CUTOFF`. It verifies a small saved native pair for each tape before the full cases and shares the physical queue lock. The field tape offers 3.5/4.9 steady and 23.5/39.4 busy saves per second in one deep account. It preserves the task intents, duplicate and lost-response schedules and business fields, while reporting actual commanded widths. The frozen tape and contract remain byte-identical.

The campaign keeps the bounded readers and gateways, exact history range, predecessor reuse at the verified scope, compact rows and the sender and reader paths in the merged branch. It excludes grouping, field coalescing, prepared group reuse and priority or budget scheduling under the write audit. It uses plain responses after the latency comparison. Activation, bulk import and failover use separate workloads. [Forecasts](PREDICTIONS.md)

## Evidence audit

- The memory collector binds raw phase bytes and ledgers to the attempt, native image and live PIDs. It checks the original people and record positions, fixed admission and gateway counters, and exact first-read and first-save rows. The heap observer binds its challenge to the active slot. The retired-image receipt checks the configured image ID, live reservations and absence of its tag.
- The combined runner validates the armed scope, original seed and trace and the observed native function on this attempt's actual receipts. The collector rederives the exact offered tape, verifies the sealed oracle files and slot input, reads both original ledgers, recomputes the matched metrics, checks owned cleanup and compares the archived bytes with the producer. An incomplete arm retains its raw output and prevents completion. Eligibility requires all frozen driver checks. Smoke requires zero receipt, read and oracle divergences. The field collector independently groups scheduled offers and actual ACKs by rate window and issues no frozen verdict.
- Prior full evidence is bound to the Part 3 report at `f06cd0a46`. Local resource observations and performance remain diagnostic. Physical capacity remains unverified. [Prior checksums](GATEWAY-SHA256SUMS)
